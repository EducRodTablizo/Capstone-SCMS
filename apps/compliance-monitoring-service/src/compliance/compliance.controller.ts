import { Request, Response } from 'express';
import { complianceService } from './compliance.service';

export class ComplianceController {
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { term_id, program_code, faculty_id } = req.query;
      const metrics = await complianceService.getMetrics({
        term_id: term_id as string,
        program_code: program_code as string,
        faculty_id: faculty_id as string
      });
      res.json({ success: true, data: metrics });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async listRecords(req: Request, res: Response): Promise<void> {
    try {
      const { term_id, program_code, faculty_id, status } = req.query;
      const records = await complianceService.listRecords({
        term_id: term_id as string,
        program_code: program_code as string,
        faculty_id: faculty_id as string,
        status: status as string
      });
      res.json({ success: true, count: records.length, data: records });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async ingestEvent(req: Request, res: Response): Promise<void> {
    try {
      const { courseCode, sectionLabel, status, submissionId, fileName, versionLabel, submittedAt } = req.body;
      if (!courseCode || !sectionLabel || !status) {
        res.status(400).json({ error: 'Missing required event fields: courseCode, sectionLabel, status' });
        return;
      }
      const updated = await complianceService.handleStatusEvent({
        courseCode,
        sectionLabel,
        status,
        submissionId,
        fileName,
        versionLabel,
        submittedAt
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async evaluateOverdue(req: Request, res: Response): Promise<void> {
    try {
      const { referenceDate } = req.body;
      const result = await complianceService.evaluateOverdue(referenceDate ? new Date(referenceDate) : undefined);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getSyllabusHeader(req: Request, res: Response): Promise<void> {
    try {
      const header = await complianceService.getSyllabusHeader(req.params.assignmentId);
      res.json({ success: true, data: header });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  async exportCsv(req: Request, res: Response): Promise<void> {
    try {
      const { term_id, program_code } = req.query;
      const csv = await complianceService.exportMatrixCsv({
        term_id: term_id as string,
        program_code: program_code as string
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="PUPQC_Compliance_Matrix_' + (term_id || '2026-1T') + '.csv"');
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async exportPdf(req: Request, res: Response): Promise<void> {
    try {
      const { term_id, program_code, actor_name } = req.query;
      const pdf = await complianceService.exportMatrixPdf({
        term_id: term_id as string,
        program_code: program_code as string
      }, actor_name as string);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="PUPQC_Compliance_Matrix_' + (term_id || '2026-1T') + '.pdf"');
      res.send(pdf);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getCcmsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { term_code } = req.query;
      const summary = await complianceService.getCcmsSummary(term_code as string);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async pushCcmsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { trigger, actorName } = req.body;
      const result = await complianceService.pushCcmsSummary({ trigger, actorName });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  getCcmsPushLogs(req: Request, res: Response): void {
    const logs = complianceService.getCcmsPushLogs();
    res.json({ success: true, count: logs.length, data: logs });
  }

  async syncReassignment(req: Request, res: Response): Promise<void> {
    try {
      const { courseCode, sectionLabel, newFacultyId, newFacultyName } = req.body;
      const updated = await complianceService.syncAssignmentReassignment({
        courseCode,
        sectionLabel,
        newFacultyId,
        newFacultyName
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async syncWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { courseCode, sectionLabel } = req.body;
      const updated = await complianceService.syncAssignmentWithdrawal({
        courseCode,
        sectionLabel
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const complianceController = new ComplianceController();
