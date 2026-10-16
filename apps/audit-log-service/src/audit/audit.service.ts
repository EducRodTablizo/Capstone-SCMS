import { AuditEntry, AuditLogFilter } from './audit.types';
import { randomUUID } from 'crypto';

export class AuditLogService {
  private static instance: AuditLogService;
  private readonly auditLogs: AuditEntry[] = [];

  private constructor() {}

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Reusable logging call (SCMS-014 AC 1 & AC 3)
   * Captures what was done, who acted, timestamp, and previous/new values.
   * Can log any existing or future action type without changing the log structure.
   */
  public logAction(entry: Omit<AuditEntry, 'id' | 'createdAt'>): AuditEntry {
    const completeEntry: AuditEntry = {
      id: randomUUID(),
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      actionType: entry.actionType,
      entityName: entry.entityName,
      entityId: entry.entityId,
      previousValue: entry.previousValue ?? null,
      newValue: entry.newValue ?? null,
      details: entry.details ?? null,
      clientIp: entry.clientIp || '127.0.0.1',
      createdAt: new Date().toISOString(),
    };

    // Store in immutable append-only storage
    this.auditLogs.push(Object.freeze({ ...completeEntry }));
    return completeEntry;
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
  }
}

export const auditLogService = AuditLogService.getInstance();
