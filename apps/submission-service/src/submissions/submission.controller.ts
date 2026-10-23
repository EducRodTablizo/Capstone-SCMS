import { Request, Response } from 'express';
import { submissionService } from './submission.service';
import { submissionRepository } from './submission.repository';

export class SubmissionController {
  async submit(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId, requirementStatus, facultyId, facultyName, courseCode, sectionLabel, mode, fileName, fileSize, obeFormPayload } = req.body;
      if (!requirementId || !facultyId || !courseCode || !sectionLabel) {
        res.status(400).json({ error: 'Missing required fields: requirementId, facultyId, courseCode, sectionLabel' });
        return;
      }
      const result = await submissionService.submitSyllabus({
        requirementId,
        requirementStatus,
        facultyId,
        facultyName,
        courseCode,
        sectionLabel,
        mode: mode || 'FILE_UPLOAD',
        fileName,
        fileSize: fileSize ? parseInt(fileSize, 10) : undefined,
        obeFormPayload
      });
      res.status(201).json({ success: true, data: result.submission, version: result.version });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const { requirement_id, status, course_code } = req.query;
      const list = await submissionRepository.listAll({
        requirement_id: requirement_id as string,
        status: status as string,
        course_code: course_code as string
      });
      res.json({ success: true, count: list.length, data: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const sub = await submissionRepository.findById(req.params.id);
      if (!sub) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }
      const reviews = await submissionRepository.getReviews(sub.id);
      const versions = await submissionRepository.getVersions(sub.id);
      res.json({ success: true, data: sub, reviews, versions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async openReview(req: Request, res: Response): Promise<void> {
    try {
      const { reviewerId, reviewerName } = req.body;
      const updated = await submissionService.openForReview({
        submissionId: req.params.id,
        reviewerId: reviewerId || 'acad_head_01',
        reviewerName: reviewerName || 'Academic Head'
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async review(req: Request, res: Response): Promise<void> {
    try {
      const { reviewerId, reviewerName, decision, comment } = req.body;
      const result = await submissionService.recordReviewDecision({
        submissionId: req.params.id,
        reviewerId: reviewerId || 'acad_head_01',
        reviewerName: reviewerName || 'Academic Head',
        decision,
        comment
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async resubmit(req: Request, res: Response): Promise<void> {
    try {
      const { facultyId, facultyName, fileName, fileSize, changeSummary } = req.body;
      if (!fileName) {
        res.status(400).json({ error: 'File name is required for resubmission.' });
        return;
      }
      const result = await submissionService.resubmitSyllabus({
        submissionId: req.params.id,
        facultyId: facultyId || 'fac_01',
        facultyName: facultyName || 'Faculty Staff',
        fileName,
        fileSize: fileSize ? parseInt(fileSize, 10) : 1024,
        changeSummary
      });
      res.json({ success: true, data: result.submission, version: result.version });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const versions = await submissionService.getVersionHistory(req.params.id);
      res.json({ success: true, count: versions.length, data: versions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const submissionController = new SubmissionController();
