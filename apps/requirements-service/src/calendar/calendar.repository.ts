import { pool, Pool } from '../config/db';
import {
  AcademicTerm,
  CalendarEntryDto,
  CalendarEvent,
  CalendarSnapshot,
  CalendarSnapshotPayload,
  TermStatus,
} from './calendar.entity';
import { TermRepository, termRepository } from './term.repository';

export class CalendarRepository {
  private readonly termRepo: TermRepository;

  constructor(private readonly db: Pool = pool) {
    this.termRepo = db === pool ? termRepository : new TermRepository(db);
  }

  async init(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS calendar_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_id VARCHAR(100) UNIQUE NOT NULL,
        term_code VARCHAR(20) NOT NULL,
        payload JSONB NOT NULL,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(100),
        sync_id VARCHAR(100),
        term_code VARCHAR(20) NOT NULL,
        date VARCHAR(10) NOT NULL,
        name VARCHAR(255) NOT NULL,
        entry_type VARCHAR(50) NOT NULL,
        applies_to VARCHAR(50) DEFAULT 'CLASSES',
        effect VARCHAR(50) DEFAULT 'SUSPENDED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(term_code, date, name)
      );
    `);
  }

  // ---------------------------------------------------------------------------
  // Full CRUD for `calendar_snapshots`
  // ---------------------------------------------------------------------------

  async findAllSnapshots(termCode?: string): Promise<CalendarSnapshot[]> {
    if (termCode) {
      const res = await this.db.query(
        'SELECT * FROM calendar_snapshots WHERE term_code = $1 ORDER BY received_at DESC',
        [termCode]
      );
      return res.rows;
    }
    const res = await this.db.query('SELECT * FROM calendar_snapshots ORDER BY received_at DESC');
    return res.rows;
  }

  async findSnapshotById(id: string): Promise<CalendarSnapshot | null> {
    const res = await this.db.query('SELECT * FROM calendar_snapshots WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findSnapshotBySyncId(syncId: string): Promise<CalendarSnapshot | null> {
    const res = await this.db.query('SELECT * FROM calendar_snapshots WHERE sync_id = $1', [syncId]);
    return res.rows[0] || null;
  }

  async createSnapshot(data: {
    sync_id: string;
    term_code: string;
    payload: CalendarSnapshotPayload | Record<string, any>;
  }): Promise<CalendarSnapshot> {
    const res = await this.db.query(
      `INSERT INTO calendar_snapshots (sync_id, term_code, payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.sync_id, data.term_code, JSON.stringify(data.payload)]
    );
    return res.rows[0];
  }

  async updateSnapshot(
    idOrSyncId: string,
    data: { term_code?: string; payload?: CalendarSnapshotPayload | Record<string, any> }
  ): Promise<CalendarSnapshot | null> {
    const res = await this.db.query(
      `UPDATE calendar_snapshots
       SET term_code = COALESCE($1, term_code),
           payload = COALESCE($2, payload)
       WHERE id::text = $3 OR sync_id = $3
       RETURNING *`,
      [
        data.term_code ?? null,
        data.payload !== undefined ? JSON.stringify(data.payload) : undefined,
        idOrSyncId,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteSnapshot(idOrSyncId: string): Promise<boolean> {
    const res = await this.db.query(
      'DELETE FROM calendar_snapshots WHERE id::text = $1 OR sync_id = $1',
      [idOrSyncId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------------------------------------------------------------------
  // Idempotent CCMS Snapshot Processing (SMS-032)
  // ---------------------------------------------------------------------------

  async saveSnapshot(payload: CalendarSnapshotPayload): Promise<{
    sync_id: string;
    status: 'PROCESSED' | 'ALREADY_PROCESSED';
    term_code: string;
    events_count: number;
    counts: { added: number; updated: number; removed: number };
  }> {
    const syncId = payload.sync_id || payload.syncId || `sync-${Date.now()}`;
    const termCode = payload.academic_term?.term_code || payload.term_code || payload.termId || '2026-1S';

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // SMS-032 AC3: Idempotent push check
      const existing = await client.query(
        'SELECT sync_id FROM calendar_snapshots WHERE sync_id = $1',
        [syncId]
      );
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return {
          sync_id: syncId,
          status: 'ALREADY_PROCESSED',
          term_code: termCode,
          events_count: 0,
          counts: { added: 0, updated: 0, removed: 0 },
        };
      }

      // 1. Insert Raw Snapshot
      await client.query(
        'INSERT INTO calendar_snapshots (sync_id, term_code, payload) VALUES ($1, $2, $3)',
        [syncId, termCode, JSON.stringify(payload)]
      );

      // 2. Upsert Academic Term (SMS-018: Term dates come from CCMS calendar)
      if (payload.academic_term) {
        const term = payload.academic_term;
        await client.query(
          `INSERT INTO academic_terms (term_code, academic_year, semester_number, semester_label, display_label, start_date, end_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
           ON CONFLICT (term_code) DO UPDATE SET
             academic_year = EXCLUDED.academic_year,
             semester_number = EXCLUDED.semester_number,
             semester_label = EXCLUDED.semester_label,
             display_label = EXCLUDED.display_label,
             start_date = EXCLUDED.start_date,
             end_date = EXCLUDED.end_date,
             updated_at = CURRENT_TIMESTAMP`,
          [
            term.term_code || termCode,
            term.academic_year || '2026-2027',
            term.semester_number || 1,
            term.semester_label || '1ST_SEMESTER',
            term.display_label || term.term_name || `A.Y. ${term.academic_year || '2026-2027'} Term ${termCode}`,
            term.start_date || '2026-09-01',
            term.end_date || '2027-01-31',
          ]
        );
      }

      // 3. Extract and normalize calendar entries
      const allEvents: CalendarEntryDto[] = payload.entries || [
        ...(payload.holidays || []),
        ...(payload.suspensions || []),
      ];

      let added = 0;
      let updated = 0;
      let removed = 0;

      // Snapshot replacement logic:
      // If snapshot is true (default in snapshot mode unless explicitly false),
      // missing entries for this term are withdrawn.
      const isSnapshot = payload.snapshot !== false;
      if (isSnapshot && allEvents.length > 0) {
        const currentEvents = await client.query(
          'SELECT name, date FROM calendar_events WHERE term_code = $1',
          [termCode]
        );
        const incomingKeys = new Set(
          allEvents.map((e) => `${e.date}:${e.name || e.reason || ''}`)
        );
        for (const curr of currentEvents.rows) {
          if (!incomingKeys.has(`${curr.date}:${curr.name}`)) {
            await client.query(
              'DELETE FROM calendar_events WHERE term_code = $1 AND date = $2 AND name = $3',
              [termCode, curr.date, curr.name]
            );
            removed++;
          }
        }
      }

      for (const ev of allEvents) {
        const eventId = ev.event_id || ev.entity_id || ev.id || `ev-${Date.now()}`;
        const name = ev.name || ev.reason || 'Campus Event';
        const entryType = ev.entry_type || ev.type || 'ACADEMIC_EVENT';

        // Normalize appliesTo: supports string, array, or object
        let appliesTo = 'CLASSES';
        if (ev.appliesTo) {
          appliesTo = Array.isArray(ev.appliesTo) ? ev.appliesTo.join(',') : String(ev.appliesTo);
        } else if (ev.applies_to) {
          appliesTo = Array.isArray(ev.applies_to) ? ev.applies_to.join(',') : String(ev.applies_to);
        }

        // Effect field: SUSPENDED | ONLINE | null
        let effect: string | null = null;
        if (ev.effect !== undefined && ev.effect !== null) {
          effect = String(ev.effect).toUpperCase();
        } else if (['SUSPENDED', 'REGULAR_HOLIDAY', 'SPECIAL_NON_WORKING', 'LOCAL_HOLIDAY'].includes(String(entryType).toUpperCase())) {
          effect = 'SUSPENDED';
        }

        const existingEv = await client.query(
          'SELECT id FROM calendar_events WHERE term_code = $1 AND date = $2 AND name = $3',
          [termCode, ev.date, name]
        );

        if (existingEv.rows.length > 0) {
          updated++;
        } else {
          added++;
        }

        await client.query(
          `INSERT INTO calendar_events (event_id, sync_id, term_code, date, name, entry_type, applies_to, effect)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (term_code, date, name) DO UPDATE SET
             event_id = EXCLUDED.event_id,
             sync_id = EXCLUDED.sync_id,
             entry_type = EXCLUDED.entry_type,
             applies_to = EXCLUDED.applies_to,
             effect = EXCLUDED.effect`,
          [eventId, syncId, termCode, ev.date, name, entryType, appliesTo, effect]
        );
      }

      await client.query('COMMIT');

      return {
        sync_id: syncId,
        status: 'PROCESSED',
        term_code: termCode,
        events_count: allEvents.length,
        counts: { added, updated, removed },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Term Delegation & Calendar Events
  // ---------------------------------------------------------------------------

  async getTerms(): Promise<AcademicTerm[]> {
    return this.termRepo.findAll();
  }

  async getTermByCode(termCode: string): Promise<AcademicTerm | null> {
    return this.termRepo.findByCode(termCode);
  }

  async updateSubmissionWindow(
    termCode: string,
    windowStart: string,
    windowEnd: string
  ): Promise<AcademicTerm | null> {
    return this.termRepo.updateSubmissionWindow(termCode, windowStart, windowEnd);
  }

  async updateTermStatus(termCode: string, status: TermStatus): Promise<AcademicTerm | null> {
    return this.termRepo.updateStatus(termCode, status);
  }

  async getEventsByTerm(termCode: string): Promise<CalendarEvent[]> {
    const res = await this.db.query(
      'SELECT * FROM calendar_events WHERE term_code = $1 ORDER BY date ASC',
      [termCode]
    );
    return res.rows;
  }

  async isNonWorkingDay(
    termCode: string,
    dateStr: string
  ): Promise<{ isNonWorking: boolean; reason?: string }> {
    const d = new Date(dateStr + 'T12:00:00Z');
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek === 0) return { isNonWorking: true, reason: 'Sunday Weekend' };
    if (dayOfWeek === 6) return { isNonWorking: true, reason: 'Saturday Weekend' };

    const res = await this.db.query(
      `SELECT name, entry_type, applies_to, effect FROM calendar_events 
       WHERE term_code = $1 AND date = $2 AND entry_type IN ('REGULAR_HOLIDAY', 'SPECIAL_NON_WORKING', 'LOCAL_HOLIDAY', 'SUSPENSION')`,
      [termCode, dateStr]
    );

    for (const ev of res.rows) {
      // 1. AppliesTo Check: Deadlines ONLY move if appliesTo includes "CLASSES" or "BOTH"
      const applies = String(ev.applies_to || 'CLASSES').toUpperCase();
      const isClassAffecting = applies.includes('CLASSES') || applies === 'BOTH';
      if (!isClassAffecting) {
        // Appears only for WORK (office) -> do NOT push syllabus deadline
        continue;
      }

      // 2. Effect Check (SUSPENDED | ONLINE | null):
      // If effect is ONLINE -> classes continue via distance learning; do NOT push deadline!
      const effect = ev.effect ? String(ev.effect).toUpperCase() : null;
      if (effect === 'ONLINE') {
        continue;
      }

      // If effect is SUSPENDED (or null default on class-affecting entry) -> PUSH DEADLINE
      return {
        isNonWorking: true,
        reason: `${ev.name} (${ev.entry_type}${effect ? ' - ' + effect : ''})`,
      };
    }

    return { isNonWorking: false };
  }
}

export const calendarRepository = new CalendarRepository(pool);
