import { submissionRepository } from './submission.repository';
import { Submission, SubmissionVersion, CanonicalStatus, ALLOWED_TRANSITIONS, ReviewDecision } from './submission.entity';
import * as http from 'http';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (SCMS-008 AC 2)
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

export class SubmissionService {
  /**
   * Dispatches audit event to Audit Log Service (:3004)
   */
  private async dispatchAuditLog(payload: {
    actorId: string;
    actorName: string;
    actorRole: string;
    actionType: string;
    entityId: string;
    previousValue?: string;
    newValue?: string;
    details?: string;
  }): Promise<void> {
    const body = JSON.stringify({
      actorId: payload.actorId,
      actorName: payload.actorName,
      actorRole: payload.actorRole,
      actionType: payload.actionType,
      entityName: 'SUBMISSION',
      entityId: payload.entityId,
      previousValue: payload.previousValue ? { status: payload.previousValue } : null,
      newValue: payload.newValue ? { status: payload.newValue } : null,
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

  
  /**
   * Dispatches live status event to Compliance Monitoring Service (:3005) for WebSocket broadcasting (SMS-013)
   */
  private async dispatchComplianceEvent(payload: {
    courseCode: string;
    sectionLabel: string;
    status: CanonicalStatus;
    submissionId?: string;
    fileName?: string;
    versionLabel?: string;
    submittedAt?: string;
  }): Promise<void> {
    const body = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3005,
      path: '/api/v1/compliance/events',
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

  public validateFile(fileName?: string, fileSize?: number): void {
    if (!fileName) {
      throw new Error('Validation Error: A file name is required for document submissions.');
    }
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`Validation Error: Invalid file format '${ext}'. Only PDF and DOCX documents are accepted.`);
    }
    if (fileSize !== undefined && fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Validation Error: File size (${Math.round(fileSize / (1024 * 1024))}MB) exceeds maximum allowed limit of 25MB.`);
    }
  }

  /**
   * Initial Syllabus Submission (SCMS-008 AC 1 & AC 3, SCMS-021 AC 1)
   */
  public async submitSyllabus(params: {
    submissionId?: string;
    requirementId: string;
    requirementStatus?: string;
    facultyId: string;
    facultyName?: string;
    courseCode: string;
    sectionLabel: string;
    mode: 'FILE_UPLOAD' | 'OBE_FORM';
    fileName?: string;
    fileSize?: number;
    obeFormPayload?: Record<string, any>;
  }): Promise<Submission & { submission: Submission; version: SubmissionVersion }> {
    if (params.submissionId) {
      const resubResult = await this.resubmitSyllabus({
        submissionId: params.submissionId,
        facultyId: params.facultyId,
        facultyName: params.facultyName,
        fileName: params.fileName || 'OBE_Form.pdf',
        fileSize: params.fileSize || 1024,
        changeSummary: 'Resubmitted revision'
      });
      return Object.assign({}, resubResult.submission, {
        submission: resubResult.submission,
        version: resubResult.version
      }) as any;
    }
    if (params.requirementStatus && params.requirementStatus.toUpperCase() === 'CLOSED') {
      throw new Error('Business Violation: Submissions to CLOSED requirements are strictly prohibited.');
    }

    if (params.mode === 'FILE_UPLOAD') {
      this.validateFile(params.fileName, params.fileSize);
    } else {
      if (!params.obeFormPayload || Object.keys(params.obeFormPayload).length === 0) {
        throw new Error('Validation Error: Missing required OBE form payload.');
      }
    }

    const serverTimestamp = new Date().toISOString();

    const created = await submissionRepository.create({
      requirement_id: params.requirementId,
      faculty_id: params.facultyId,
      course_code: params.courseCode,
      section_label: params.sectionLabel,
      status: 'Submitted',
      file_id: params.fileName ? 'file_' + Date.now() : null,
      file_name: params.fileName || 'OBE_Form.pdf',
      file_size: params.fileSize || 0,
      submission_mode: params.mode,
      obe_form_payload: params.obeFormPayload || null,
      submitted_at: serverTimestamp
    });

    // Create Version v1 (SCMS-021 AC 1)
    const version = await submissionRepository.createVersion({
      submission_id: created.id,
      version_number: 1,
      version_label: 'v1',
      file_id: created.file_id,
      file_name: created.file_name || 'OBE_Form.pdf',
      file_size: created.file_size,
      submitted_by: params.facultyId,
      submitted_by_name: params.facultyName || 'Faculty Staff',
      status_at_version: 'Submitted',
      change_summary: 'Initial submission'
    });

    this.dispatchComplianceEvent({
      courseCode: params.courseCode,
      sectionLabel: params.sectionLabel,
      status: 'Submitted',
      submissionId: created.id,
      fileName: created.file_name || undefined,
      versionLabel: 'v1',
      submittedAt: serverTimestamp
    });

    await this.dispatchAuditLog({
      actorId: params.facultyId,
      actorName: params.facultyName || 'Faculty Staff',
      actorRole: 'FACULTY_STAFF',
      actionType: 'SYLLABUS_SUBMITTED',
      entityId: created.id,
      previousValue: 'Not Submitted',
      newValue: 'Submitted',
      details: `Initial submission v1: ${created.file_name} for ${params.courseCode} ${params.sectionLabel}`
    });

    return Object.assign({}, created, { submission: created, version }) as any;
  }

  /**
   * Reviewer opens submission -> moves to 'Under Review' (SCMS-010 AC 1)
   */
  
  /**
   * Status Lifecycle Transition (SCMS-009)
   */
  public async transitionStatus(params: {
    submissionId: string;
    targetStatus: CanonicalStatus;
    actorId: string;
    actorName: string;
    actorRole: string;
    details?: string;
  }): Promise<Submission> {
    const existing = await submissionRepository.findById(params.submissionId);
    if (!existing) {
      throw new Error(`Record Not Found: Submission '${params.submissionId}' does not exist.`);
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(params.targetStatus)) {
      throw new Error(`State Machine Violation: Transition from '${existing.status}' to '${params.targetStatus}' is invalid.`);
    }

    const updated = await submissionRepository.updateStatus(existing.id, params.targetStatus);
    if (!updated) throw new Error('Status transition update failed.');

    await this.dispatchAuditLog({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      actionType: `STATUS_TRANSITION_${params.targetStatus.toUpperCase().replace(/\s+/g, '_')}`,
      entityId: existing.id,
      previousValue: existing.status,
      newValue: params.targetStatus,
      details: params.details || `Status transitioned from ${existing.status} to ${params.targetStatus}`
    });

    return updated;
  }

  public async openForReview(params: {
    submissionId: string;
    reviewerId: string;
    reviewerName: string;
  }): Promise<Submission> {
    const existing = await submissionRepository.findById(params.submissionId);
    if (!existing) {
      throw new Error(`Record Not Found: Submission '${params.submissionId}' does not exist.`);
    }

    if (existing.status !== 'Submitted' && existing.status !== 'Resubmitted') {
      // If already under review, return as-is
      if (existing.status === 'Under Review') return existing;
      throw new Error(`State Machine Violation: Only 'Submitted' or 'Resubmitted' items can be opened for review. Current status is '${existing.status}'.`);
    }

    const updated = await submissionRepository.updateStatus(existing.id, 'Under Review');
    if (!updated) throw new Error('Status update failed.');

    this.dispatchComplianceEvent({
      courseCode: existing.course_code,
      sectionLabel: existing.section_label,
      status: 'Under Review',
      submissionId: existing.id
    });

    await this.dispatchAuditLog({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'ACADEMIC_HEAD',
      actionType: 'REVIEW_OPENED',
      entityId: existing.id,
      previousValue: existing.status,
      newValue: 'Under Review',
      details: `Review opened for ${existing.course_code} ${existing.section_label}`
    });

    return updated;
  }

  /**
   * Record Review Decision (Approve or Return) (SCMS-010 AC 2 & AC 3)
   */
  public async recordReviewDecision(params: {
    submissionId: string;
    reviewerId: string;
    reviewerName: string;
    decision: 'Approved' | 'Returned';
    comment: string;
  }): Promise<{ submission: Submission; review: ReviewDecision }> {
    const existing = await submissionRepository.findById(params.submissionId);
    if (!existing) {
      throw new Error(`Record Not Found: Submission '${params.submissionId}' does not exist.`);
    }

    if (existing.status !== 'Under Review') {
      throw new Error(`State Machine Violation: Cannot record review decision on status '${existing.status}'. Item must be 'Under Review'.`);
    }

    // SCMS-010 AC 3: Require comment before returning
    if (params.decision === 'Returned' && (!params.comment || params.comment.trim().length === 0)) {
      throw new Error('Business Violation (SCMS-010 AC 3): A return decision strictly requires an explanatory comment.');
    }

    const targetStatus: CanonicalStatus = params.decision === 'Approved' ? 'Approved' : 'Returned';
    const updated = await submissionRepository.updateStatus(existing.id, targetStatus);
    if (!updated) throw new Error('Review status update failed.');

    const review = await submissionRepository.createReviewDecision({
      submission_id: existing.id,
      reviewer_name: params.reviewerName,
      decision: params.decision,
      comment: params.comment
    });

    this.dispatchComplianceEvent({
      courseCode: existing.course_code,
      sectionLabel: existing.section_label,
      status: targetStatus,
      submissionId: existing.id
    });

    await this.dispatchAuditLog({
      actorId: params.reviewerId,
      actorName: params.reviewerName,
      actorRole: 'ACADEMIC_HEAD',
      actionType: params.decision === 'Approved' ? 'REVIEW_APPROVED' : 'REVIEW_RETURNED',
      entityId: existing.id,
      previousValue: 'Under Review',
      newValue: targetStatus,
      details: `Decision: ${params.decision}. Comment: ${params.comment}`
    });

    return { submission: updated, review };
  }

  /**
   * Revise and Resubmit Syllabus (SCMS-011 AC 2 & AC 3, SCMS-021 AC 1)
   */
  public async resubmitSyllabus(params: {
    submissionId: string;
    facultyId: string;
    facultyName?: string;
    fileName: string;
    fileSize: number;
    changeSummary?: string;
  }): Promise<{ submission: Submission; version: SubmissionVersion }> {
    const existing = await submissionRepository.findById(params.submissionId);
    if (!existing) {
      throw new Error(`Record Not Found: Submission '${params.submissionId}' does not exist.`);
    }

    if (existing.status !== 'Returned') {
      throw new Error(`State Machine Violation: Only 'Returned' submissions can be resubmitted. Current status is '${existing.status}'.`);
    }

    this.validateFile(params.fileName, params.fileSize);

    const serverTimestamp = new Date().toISOString();
    const latestVersion = await submissionRepository.getLatestVersionNumber(existing.id);
    const newVersionNum = latestVersion + 1;
    const newVersionLabel = 'v' + newVersionNum;

    // Update submission record
    const updatedSub = await submissionRepository.updateStatus(existing.id, 'Resubmitted', serverTimestamp);
    await submissionRepository.updateFileMetadata(existing.id, params.fileName, params.fileSize, serverTimestamp);
    if (!updatedSub) throw new Error('Resubmission update failed.');

    // Save immutable new version (SCMS-021 AC 1)
    const newVersion = await submissionRepository.createVersion({
      submission_id: existing.id,
      version_number: newVersionNum,
      version_label: newVersionLabel,
      file_id: 'file_' + Date.now(),
      file_name: params.fileName,
      file_size: params.fileSize,
      submitted_by: params.facultyId,
      submitted_by_name: params.facultyName || 'Faculty Staff',
      status_at_version: 'Resubmitted',
      change_summary: params.changeSummary || 'Revision addressing review comments'
    });

    this.dispatchComplianceEvent({
      courseCode: existing.course_code,
      sectionLabel: existing.section_label,
      status: 'Resubmitted',
      submissionId: existing.id,
      fileName: params.fileName,
      versionLabel: newVersionLabel,
      submittedAt: serverTimestamp
    });

    await this.dispatchAuditLog({
      actorId: params.facultyId,
      actorName: params.facultyName || 'Faculty Staff',
      actorRole: 'FACULTY_STAFF',
      actionType: 'SYLLABUS_RESUBMITTED',
      entityId: existing.id,
      previousValue: 'Returned',
      newValue: 'Resubmitted',
      details: `Uploaded version ${newVersionLabel} (${params.fileName})`
    });

    return { submission: updatedSub, version: newVersion };
  }

  /**
   * Get Version History for Comparison (SCMS-021 AC 2)
   */
  public async getVersionHistory(submissionId: string): Promise<SubmissionVersion[]> {
    return submissionRepository.getVersions(submissionId);
  }
}

export const submissionService = new SubmissionService();
