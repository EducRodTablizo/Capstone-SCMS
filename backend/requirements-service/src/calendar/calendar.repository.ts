import { pool, Pool } from '../config/db';
import {
  AcademicTerm,
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
  }> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // SMS-032 AC3: Idempotent push: push with processed sync ID acknowledged without duplicate work
      const existing = await client.query(
        'SELECT sync_id FROM calendar_snapshots WHERE sync_id = $1',
        [payload.sync_id]
      );
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return {
          sync_id: payload.sync_id,
          status: 'ALREADY_PROCESSED',
          term_code: payload.academic_term.term_code,
          events_count: 0,
        };
      }

      // 1. Insert Raw Snapshot
      await client.query(
        'INSERT INTO calendar_snapshots (sync_id, term_code, payload) VALUES ($1, $2, $3)',
        [payload.sync_id, payload.academic_term.term_code, JSON.stringify(payload)]
      );

      // 2. Upsert Academic Term (SMS-018: Term dates come from CCMS calendar and cannot be edited in SMS)
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
          term.term_code,
          term.academic_year,
          term.semester_number,
          term.semester_label,
          term.display_label || term.term_name || `A.Y. ${term.academic_year} Semester ${term.semester_number}`,
          term.start_date,
          term.end_date,
        ]
      );

      // 3. Upsert Calendar Events (Holidays + Suspensions)
      const allEvents = [...(payload.holidays || []), ...(payload.suspensions || [])];
      for (const ev of allEvents) {
        await client.query(
          `INSERT INTO calendar_events (event_id, sync_id, term_code, date, name, entry_type, applies_to)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (term_code, date, name) DO UPDATE SET
             event_id = EXCLUDED.event_id,
             sync_id = EXCLUDED.sync_id,
             entry_type = EXCLUDED.entry_type,
             applies_to = EXCLUDED.applies_to`,
          [ev.event_id, payload.sync_id, term.term_code, ev.date, ev.name, ev.entry_type, ev.applies_to]
        );
      }

      await client.query('COMMIT');

      return {
        sync_id: payload.sync_id,
        status: 'PROCESSED',
        term_code: term.term_code,
        events_count: allEvents.length,
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
      `SELECT name, entry_type, applies_to FROM calendar_events 
       WHERE term_code = $1 AND date = $2 AND entry_type IN ('REGULAR_HOLIDAY', 'SPECIAL_NON_WORKING', 'SUSPENSION')`,
      [termCode, dateStr]
    );

    if (res.rows.length > 0) {
      const ev = res.rows[0];
      return { isNonWorking: true, reason: `${ev.name} (${ev.entry_type})` };
    }

    return { isNonWorking: false };
  }
}

export const calendarRepository = new CalendarRepository(pool);
