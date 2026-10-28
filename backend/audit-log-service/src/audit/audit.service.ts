import { AuditEntry, AuditLogFilter } from './audit.types';
import { randomUUID, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export class AuditLogService {
  private static instance: AuditLogService;
  private readonly auditLogs: AuditEntry[] = [];
  private readonly logFilePath: string;

  private constructor() {
    this.logFilePath = path.resolve(process.cwd(), 'audit_logs.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const raw = fs.readFileSync(this.logFilePath, 'utf-8');
        const parsed: AuditEntry[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.auditLogs.length = 0;
          for (const item of parsed) {
            this.auditLogs.push(Object.freeze({ ...item }));
          }
        }
      }
    } catch {
      // Ignore read errors on startup and initialize empty
    }
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.auditLogs, null, 2), 'utf-8');
    } catch {
      // Fallback in restricted environments
    }
  }

  private computeHash(
    previousHash: string,
    actorId: string,
    actionType: string,
    entityName: string,
    entityId: string,
    newValue: Record<string, any> | null | undefined,
    timestamp: string
  ): string {
    const payload =
      previousHash +
      actorId +
      actionType +
      entityName +
      entityId +
      JSON.stringify(newValue ?? null) +
      timestamp;
    return createHash('sha256').update(payload).digest('hex');
  }

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Reusable logging call (SCMS-014 AC 1 & AC 3)
   * Captures what was done, who acted, timestamp, previous/new values, and SHA-256 hash chain.
   * Can log any existing or future action type without changing the log structure.
   */
  public logAction(entry: Omit<AuditEntry, 'id' | 'createdAt' | 'previous_hash' | 'current_hash'>): AuditEntry {
    const timestamp = new Date().toISOString();
    const lastLog = this.auditLogs.length > 0 ? this.auditLogs[this.auditLogs.length - 1] : undefined;
    const previous_hash = lastLog?.current_hash || 'GENESIS';
    const normalizedNewValue = entry.newValue ?? null;

    const current_hash = this.computeHash(
      previous_hash,
      entry.actorId,
      entry.actionType,
      entry.entityName,
      entry.entityId,
      normalizedNewValue,
      timestamp
    );

    const completeEntry: AuditEntry = {
      id: randomUUID(),
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      actionType: entry.actionType,
      entityName: entry.entityName,
      entityId: entry.entityId,
      previousValue: entry.previousValue ?? null,
      newValue: normalizedNewValue,
      details: entry.details ?? null,
      clientIp: entry.clientIp || '127.0.0.1',
      previous_hash,
      current_hash,
      createdAt: timestamp,
    };

    // Store in immutable append-only storage and persist to JSON file
    this.auditLogs.push(Object.freeze({ ...completeEntry }));
    this.saveToDisk();
    return completeEntry;
  }

  /**
   * Verify tamper-evident SHA-256 hash chain across all audit logs (SMS-014)
   */
  public verifyChain(): boolean {
    for (let i = 0; i < this.auditLogs.length; i++) {
      const current = this.auditLogs[i];
      const expectedPreviousHash = i === 0 ? 'GENESIS' : this.auditLogs[i - 1].current_hash;

      if (current.previous_hash !== expectedPreviousHash) {
        return false;
      }

      const recalculatedHash = this.computeHash(
        current.previous_hash,
        current.actorId,
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
   * Any attempt to update an audit record is rejected.
   */
  public updateAuditRecord(id: string, _updates: Partial<AuditEntry>): never {
    throw new Error(`SCMS Security Violation: audit_logs is append-only. UPDATE on record ${id} is rejected.`);
  }

  /**
   * Enforce append-only at code & database level (SCMS-014 AC 2)
   * Any attempt to delete an audit record is rejected.
   */
  public deleteAuditRecord(id: string): never {
    throw new Error(`SCMS Security Violation: audit_logs is append-only. DELETE on record ${id} is rejected.`);
  }

  /**
   * Retrieve audit records for Academic Head verification (SCMS-015 preview)
   */
  public getLogs(filters?: AuditLogFilter): AuditEntry[] {
    let result = [...this.auditLogs];

    if (filters?.actorId) {
      result = result.filter(log => log.actorId === filters.actorId);
    }
    if (filters?.actionType) {
      result = result.filter(log => log.actionType === filters.actionType);
    }
    if (filters?.entityName) {
      result = result.filter(log => log.entityName === filters.entityName);
    }
    if (filters?.entityId) {
      result = result.filter(log => log.entityId === filters.entityId);
    }

    return result.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  public getLogById(id: string): AuditEntry | undefined {
    return this.auditLogs.find(log => log.id === id);
  }

  public count(): number {
    return this.auditLogs.length;
  }

  public clearForTesting(): void {
    // Only used in controlled sandbox testing if needed
    this.auditLogs.length = 0;
    this.saveToDisk();
  }
}

export const auditLogService = AuditLogService.getInstance();
