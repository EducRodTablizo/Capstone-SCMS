import { SignatoryConfig, DEFAULT_SIGNATORIES } from './signatory.entity';
import { submissionRepository } from '../submissions/submission.repository';
import { auditLogService } from '../../../audit-log-service/src/audit/audit.service';
import * as http from 'http';

export class SignatoryService {
  private config: SignatoryConfig = { ...DEFAULT_SIGNATORIES };

  public getSignatories(): SignatoryConfig {
    void submissionRepository.getSignatories().then((row) => {
      if (row) {
        this.config = {
          ...this.config,
          reviewed_by_name: row.reviewed_by_name,
          recommending_name: row.recommending_name,
          approved_by_name: row.approving_name,
          updated_at: row.updated_at,
        };
      }
    });
    return { ...this.config };
  }

  public updateSignatories(
    update: Partial<SignatoryConfig>,
    actorEmail = 'academic.head@pup.edu.ph'
  ): SignatoryConfig {
    const previous = { ...this.config };
    this.config = {
      ...this.config,
      ...update,
      updated_at: new Date().toISOString(),
      updated_by: actorEmail,
    };

    void submissionRepository.updateSignatories({
      reviewed_by_name: this.config.reviewed_by_name,
      recommending_name: this.config.recommending_name,
      approving_name: this.config.approved_by_name,
    });

    void auditLogService.logAction({
      actorId: 'user-head-001',
      actorEmail,
      actorRole: 'ACADEMIC_HEAD',
      actionType: 'SIGNATORY_AUTHORITY_UPDATED',
      entityName: 'SIGNATORY_CONFIG',
      entityId: 'signatory-authority-pupqc',
      previousValue: { snapshot: JSON.stringify(previous) },
      newValue: { snapshot: JSON.stringify(this.config) },
      details: { note: 'Updated official PUPQC OBTL syllabus signatory authorities' },
      clientIp: '127.0.0.1',
    });

    this.dispatchAuditLog({
      actorId: 'user-head-001',
      actorEmail,
      actorRole: 'ACADEMIC_HEAD',
      actionType: 'SIGNATORY_AUTHORITY_UPDATED',
      previousValue: JSON.stringify(previous),
      newValue: JSON.stringify(this.config),
      details: 'Updated official PUPQC OBTL syllabus signatory authorities',
    });

    return { ...this.config };
  }

  private dispatchAuditLog(payload: {
    actorId: string;
    actorEmail: string;
    actorRole: string;
    actionType: string;
    previousValue?: string;
    newValue?: string;
    details?: string;
  }): void {
    const body = JSON.stringify({
      actorId: payload.actorId,
      actorEmail: payload.actorEmail,
      actorRole: payload.actorRole,
      actionType: payload.actionType,
      entityName: 'SIGNATORY_CONFIG',
      entityId: 'signatory-authority-pupqc',
      previousValue: payload.previousValue ? { snapshot: payload.previousValue } : null,
      newValue: payload.newValue ? { snapshot: payload.newValue } : null,
      details: payload.details ? { note: payload.details } : null,
      clientIp: '127.0.0.1',
    });

    const req = http.request({
      hostname: process.env.AUDIT_SERVICE_HOST || 'audit-log-service',
      port: parseInt(process.env.AUDIT_SERVICE_PORT || '3004', 10),
      path: '/api/v1/audit/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    });
    req.on('error', () => {});
    req.write(body);
    req.end();
  }
}

export const signatoryService = new SignatoryService();
