import { AuditEntry, AuditLogFilter } from './audit.types';
import { createHash } from 'crypto';
import { Pool, pool } from '../config/db';

const INIT_AUDIT_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(100) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    details JSONB,
    client_ip VARCHAR(50),
    previous_hash VARCHAR(64) NOT NULL DEFAULT 'GENESIS',
    current_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION reject_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SCMS Security Violation: audit_logs table is append-only. Modification or deletion is strictly rejected.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_update ON audit_logs;
CREATE TRIGGER trg_protect_audit_update
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION reject_audit_modification();
`;

export class AuditLogService {
  private static instance: AuditLogService;
  private isInitialized = false;

  constructor(private readonly db: Pool = pool) {}

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService(pool);
    }
    return AuditLogService.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    const client = await this.db.connect();
    try {
      await client.query(INIT_AUDIT_SCHEMA_SQL);
      this.isInitialized = true;
      console.log('Connected to PostgreSQL sms_audit');
    } finally {
      client.release();
    }
  }

  private mapRowToEntry(row: any): AuditEntry {
    const createdAtIso =
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);

    return {
      id: row.id,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      actorRole: row.actor_role,
      actionType: row.action_type,
      entityName: row.entity_name,
      entityId: row.entity_id,
      previousValue: row.previous_value ?? null,
      newValue: row.new_value ?? null,
      details: row.details ?? null,
      clientIp: row.client_ip || '127.0.0.1',
      previous_hash: row.previous_hash,
      current_hash: row.current_hash,
      createdAt: createdAtIso,
    };
  }

  private computeHash(
    previousHash: string,
    actorId: string,
    actorEmail: string,
    actionType: string,
    entityName: string,
    entityId: string,
    newValue: Record<string, any> | null | undefined,
    timestamp: string
  ): string {
    const payload =
      previousHash +
      actorId +
      actorEmail +
      actionType +
      entityName +
      entityId +
      JSON.stringify(newValue ?? null) +
      timestamp;
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Reusable logging call (SCMS-014 AC 1 & AC 3)
   * Queries latest hash from PostgreSQL `audit_logs`, computes SHA-256 chain hash,
   * and inserts the immutable record into PostgreSQL.
   */
  public async logAction(
    entry: Omit<AuditEntry, 'id' | 'createdAt' | 'previous_hash' | 'current_hash'>
  ): Promise<AuditEntry> {
    await this.init();

    const timestamp = new Date().toISOString();
    const lastRes = await this.db.query(
      'SELECT current_hash FROM audit_logs ORDER BY created_at DESC LIMIT 1'
    );
    const previous_hash =
      lastRes.rows && lastRes.rows.length > 0 && lastRes.rows[0].current_hash
        ? lastRes.rows[0].current_hash
        : 'GENESIS';

    const normalizedNewValue = entry.newValue ?? null;
    const normalizedPreviousValue = entry.previousValue ?? null;
    const normalizedDetails = entry.details ?? null;
    const clientIp = entry.clientIp || '127.0.0.1';

    const current_hash = this.computeHash(
      previous_hash,
      entry.actorId,
      entry.actorEmail,
      entry.actionType,
      entry.entityName,
      entry.entityId,
      normalizedNewValue,
      timestamp
    );

    const insertRes = await this.db.query(
      `INSERT INTO audit_logs (
        actor_id,
        actor_email,
        actor_role,
        action_type,
        entity_name,
        entity_id,
        previous_value,
        new_value,
        details,
        client_ip,
        previous_hash,
        current_hash,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        entry.actorId,
        entry.actorEmail,
        entry.actorRole,
        entry.actionType,
        entry.entityName,
        entry.entityId,
        normalizedPreviousValue ? JSON.stringify(normalizedPreviousValue) : null,
        normalizedNewValue ? JSON.stringify(normalizedNewValue) : null,
        normalizedDetails ? JSON.stringify(normalizedDetails) : null,
        clientIp,
        previous_hash,
        current_hash,
        timestamp,
      ]
    );

    return this.mapRowToEntry(insertRes.rows[0]);
  }

  /**
   * Verify tamper-evident SHA-256 hash chain across all audit logs in PostgreSQL (SMS-014)
   */
  public async verifyChain(): Promise<boolean> {
    await this.init();

    const res = await this.db.query('SELECT * FROM audit_logs ORDER BY created_at ASC');
    const logs = (res.rows || []).map((r) => this.mapRowToEntry(r));

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      const expectedPreviousHash = i === 0 ? 'GENESIS' : logs[i - 1].current_hash;

      if (current.previous_hash !== expectedPreviousHash) {
        return false;
      }

      const recalculatedHash = this.computeHash(
        current.previous_hash,
        current.actorId,
        current.actorEmail,
        current.actionType,
        current.entityName,
        current.entityId,
        current.newValue ?? null,
        current.createdAt || ''
      );

      if (current.current_hash !== recalculatedHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Enforce append-only at code & database level (SCMS-014 AC 2)
   * Executes UPDATE against audit_logs which triggers reject_audit_modification()
   */
  public async updateAuditRecord(id: string, _updates: Partial<AuditEntry>): Promise<never> {
    await this.init();
    await this.db.query('UPDATE audit_logs SET details = $1 WHERE id = $2', [
      JSON.stringify(_updates.details ?? {}),
      id,
    ]);
    throw new Error(
      `SCMS Security Violation: audit_logs table is append-only. Modification or deletion is strictly rejected.`
    );
  }

  /**
   * Enforce append-only at code & database level (SCMS-014 AC 2)
   * Executes DELETE against audit_logs which triggers reject_audit_modification()
   */
  public async deleteAuditRecord(id: string): Promise<never> {
    await this.init();
    await this.db.query('DELETE FROM audit_logs WHERE id = $1', [id]);
    throw new Error(
      `SCMS Security Violation: audit_logs table is append-only. Modification or deletion is strictly rejected.`
    );
  }

  /**
   * Retrieve audit records with dynamic SQL filters (using actor_email instead of actor_name)
   */
  public async getLogs(filters?: AuditLogFilter): Promise<AuditEntry[]> {
    await this.init();

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.actorId) {
      params.push(filters.actorId);
      conditions.push(`actor_id = $${params.length}`);
    }
    if (filters?.actorEmail) {
      params.push(filters.actorEmail);
      conditions.push(`actor_email = $${params.length}`);
    }
    if (filters?.actionType) {
      params.push(filters.actionType);
      conditions.push(`action_type = $${params.length}`);
    }
    if (filters?.entityName) {
      params.push(filters.entityName);
      conditions.push(`entity_name = $${params.length}`);
    }
    if (filters?.entityId) {
      params.push(filters.entityId);
      conditions.push(`entity_id = $${params.length}`);
    }
    if (filters?.startDate) {
      params.push(filters.startDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (filters?.endDate) {
      params.push(filters.endDate);
      conditions.push(`created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC`;

    const res = await this.db.query(sql, params);
    return (res.rows || []).map((r) => this.mapRowToEntry(r));
  }

  public async getLogById(id: string): Promise<AuditEntry | undefined> {
    await this.init();
    const res = await this.db.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    if (!res.rows || res.rows.length === 0) return undefined;
    return this.mapRowToEntry(res.rows[0]);
  }

  public async count(): Promise<number> {
    await this.init();
    const res = await this.db.query('SELECT COUNT(*) FROM audit_logs');
    return parseInt(res.rows[0]?.count || '0', 10);
  }

  public clearForTesting(): void {
    this.db.resetEmbeddedForTest();
  }
}

export const auditLogService = AuditLogService.getInstance();
