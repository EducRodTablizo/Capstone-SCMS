import { resilienceService } from '../integrations/resilience.service';
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

  getResilienceStatus(req: Request, res: Response): void {
    const status = resilienceService.getHealthStatus();
    res.json({ success: true, data: status });
  }

  simulateResilienceTier(req: Request, res: Response): void {
    const { system, state } = req.body;
    resilienceService.setTierOverride(system, state || null);
    res.json({ success: true, active_tiers: resilienceService.getActiveTiers() });
  }

  reconcileFms(req: Request, res: Response): void {
    const result = resilienceService.reconcileFms();
    res.json({ success: true, ...result });
  }

  getFacultyProfile(req: Request, res: Response): void {
    const profile = resilienceService.getFacultyProfile(req.params.facultyId);
    res.json({ success: true, data: profile });
  }

  getCcmsCalendar(req: Request, res: Response): void {
    const calendar = resilienceService.getCcmsCalendar();
    res.json({ success: true, data: calendar });
  }

  dispatchCatalogWebhook(req: Request, res: Response): void {
    try {
      const result = resilienceService.dispatchCatalogWebhook(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  getCatalogWebhookLogs(req: Request, res: Response): void {
    const logs = resilienceService.getWebhookLogs();
    res.json({ success: true, count: logs.length, data: logs });
  }

  getJointSeedFixtures(req: Request, res: Response): void {
    res.json({
      success: true,
      specification: 'J1-J16 Joint Acceptance Testing Gate',
      fixtures: {
        program: { code: 'BSIT', title: 'Bachelor of Science in Information Technology' },
        course: { code: 'INTE 401', title: 'Information Assurance and Security 2', units: 3, lecture: 2, lab: 3 },
        section: { label: 'BSIT 4-1', cohort: 2023, year: 4 },
        faculty: { id: 'fac-1092', name: 'Asst. Prof. Juan Dela Cruz', rank: 'Assistant Professor I' },
        academic_term: { code: '2026-1S', label: 'A.Y. 2026-2027 1st Semester' }
      }
    });
  }
}

export const complianceController = new ComplianceController();
