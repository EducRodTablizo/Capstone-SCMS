import { SignatoryConfig, DEFAULT_SIGNATORIES } from './signatory.entity';
import * as http from 'http';

export class SignatoryService {
  private config: SignatoryConfig = { ...DEFAULT_SIGNATORIES };

  public getSignatories(): SignatoryConfig {
    return { ...this.config };
  }

  public updateSignatories(update: Partial<SignatoryConfig>, actorName = 'Dr. Maria Santos'): SignatoryConfig {
    const previous = { ...this.config };
    this.config = {
      ...this.config,
      ...update,
      updated_at: new Date().toISOString(),
      updated_by: actorName
    };

    // Dispatch audit log (SMS-035)
    this.dispatchAuditLog({
      actorId: 'user-head-001',
      actorName,
      actorRole: 'Academic Head',
      actionType: 'SIGNATORY_AUTHORITY_UPDATED',
      previousValue: JSON.stringify(previous),
      newValue: JSON.stringify(this.config),
      details: 'Updated official PUPQC OBTL syllabus signatory authorities'
    });

    return { ...this.config };
  }

  private dispatchAuditLog(payload: {
    actorId: string;
    actorName: string;
    actorRole: string;
    actionType: string;
    previousValue?: string;
    newValue?: string;
    details?: string;
  }): void {
    const body = JSON.stringify({
      actorId: payload.actorId,
      actorName: payload.actorName,
      actorRole: payload.actorRole,
      actionType: payload.actionType,
      entityName: 'SIGNATORY_CONFIG',
      entityId: 'signatory-authority-pupqc',
      previousValue: payload.previousValue ? { snapshot: payload.previousValue } : null,
      newValue: payload.newValue ? { snapshot: payload.newValue } : null,
      details: payload.details ? { note: payload.details } : null,
      clientIp: '127.0.0.1'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3004,
      path: '/api/v1/audit/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  }
}

export const signatoryService = new SignatoryService();
