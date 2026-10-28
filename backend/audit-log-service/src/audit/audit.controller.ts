import { Request, Response } from 'express';
import { auditLogService } from './audit.service';
import { AuditActionType } from './audit.types';

export class AuditLogController {
  async log(req: Request, res: Response): Promise<void> {
    try {
      const {
        actorId,
        actorEmail,
        actorName,
        actorRole,
        actionType,
        entityName,
        entityId,
        previousValue,
        newValue,
        details,
        clientIp,
      } = req.body;

      if (!actorId || !actionType || !entityName || !entityId) {
        res.status(400).json({ error: 'Missing mandatory audit fields: actorId, actionType, entityName, entityId' });
        return;
      }

      const entry = await auditLogService.logAction({
        actorId,
        actorEmail: actorEmail || actorName || 'unknown@pup.edu.ph',
        actorRole: actorRole || 'FACULTY_STAFF',
        actionType: actionType as AuditActionType,
        entityName,
        entityId,
        previousValue,
        newValue,
        details,
        clientIp: clientIp || req.ip || '127.0.0.1',
      });

      res.status(201).json({ success: true, data: entry });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const { actorId, actorEmail, actionType, entityName, entityId } = req.query;
      const logs = await auditLogService.getLogs({
        actorId: actorId as string,
        actorEmail: actorEmail as string,
        actionType: actionType as AuditActionType,
        entityName: entityName as string,
        entityId: entityId as string,
      });

      res.json({ success: true, count: logs.length, data: logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const log = await auditLogService.getLogById(req.params.id);
      if (!log) {
        res.status(404).json({ error: 'Audit log entry not found' });
        return;
      }
      res.json({ success: true, data: log });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async verify(_req: Request, res: Response): Promise<void> {
    try {
      const valid = await auditLogService.verifyChain();
      res.json({ valid });
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err.message });
    }
  }

  rejectModification(_req: Request, res: Response): void {
    res.status(405).json({
      error: 'Method Not Allowed',
      message:
        'SCMS Security Violation (SCMS-015 AC 2): audit_logs is append-only. Modification and deletion are strictly rejected.',
    });
  }
}

export const auditLogController = new AuditLogController();
