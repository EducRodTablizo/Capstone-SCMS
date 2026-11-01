import { signatoryService } from '../signatories/signatory.service';
import { SignatoryConfig } from '../signatories/signatory.entity';
import { obtlPdfService } from './obtl-pdf.service';
import { submissionRepository } from './submission.repository';
import { Submission, SubmissionVersion, CanonicalStatus, ALLOWED_TRANSITIONS, ReviewDecision, FmsScheduleDetails } from './submission.entity';
import { auditLogService } from '../../../audit-log-service/src/audit/audit.service';
import * as http from 'http';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (SCMS-008 AC 2)
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

export class SubmissionService {
  /**
   * Dispatches audit event to Audit Log Service (:3004) and records via auditLogService.logAction()
   */
  private async dispatchAuditLog(payload: {
    actorId: string;
    actorName?: string;
    actorEmail?: string;
    actorRole: string;
    actionType: string;
    entityId: string;
    previousValue?: string;
    newValue?: string;
    details?: string;
  }): Promise<void> {
    const resolvedEmail = payload.actorEmail || payload.actorName || 'system@pup.edu.ph';
    await auditLogService.logAction({
      actorId: payload.actorId,
      actorEmail: resolvedEmail,
      actorRole: payload.actorRole,
      actionType: payload.actionType,
      entityName: 'SUBMISSION',
      entityId: payload.entityId,
      previousValue: payload.previousValue ? { status: payload.previousValue } : null,
      newValue: payload.newValue ? { status: payload.newValue } : null,
      details: payload.details ? { note: payload.details } : null,
      clientIp: '127.0.0.1'
    });

    const body = JSON.stringify({
      actorId: payload.actorId,
      actorEmail: resolvedEmail,
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
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    obeFormPayload?: Record<string, any>;
  }): Promise<Submission & { submission: Submission; version: SubmissionVersion }> {
    if (params.submissionId) {
      const resubResult = await this.resubmitSyllabus({
        submissionId: params.submissionId,
        facultyId: params.facultyId,
        facultyName: params.facultyName,
        fileId: params.fileId,
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
      file_id: params.fileId || (params.fileName ? 'file_' + Date.now() : null),
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
      reviewer_id: params.reviewerId,
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
    fileId?: string;
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

    const resolvedFileId = params.fileId || existing.file_id || ('file_' + Date.now());

    // Update submission record
    await submissionRepository.updateStatus(existing.id, 'Resubmitted', {
      file_name: params.fileName,
      file_id: resolvedFileId,
      submitted_at: serverTimestamp
    });
    const updatedSub = await submissionRepository.updateFileMetadata(
      existing.id,
      params.fileName,
      params.fileSize,
      serverTimestamp,
      resolvedFileId
    );
    if (!updatedSub) throw new Error('Resubmission update failed.');

    // Save immutable new version (SCMS-021 AC 1)
    const newVersion = await submissionRepository.createVersion({
      submission_id: existing.id,
      version_number: newVersionNum,
      version_label: newVersionLabel,
      file_id: resolvedFileId,
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

  /**
   * Reassign Teaching Assignment from FMS (SMS-023 AC 1 & AC 2)
   */
  public async reassignAssignment(params: {
    courseCode: string;
    sectionLabel: string;
    newFacultyId: string;
    newFacultyName?: string;
    assignmentVersion?: number;
    reason?: string;
  }): Promise<{ submission: Submission; reassignmentType: 'UNAPPROVED_REASSIGNED' | 'APPROVED_ADOPTED' }> {
    let existing = await submissionRepository.findByCourseAndSection(params.courseCode, params.sectionLabel);

    if (!existing) {
      existing = await submissionRepository.create({
        requirement_id: 'req-2026-1t',
        faculty_id: params.newFacultyId,
        course_code: params.courseCode,
        section_label: params.sectionLabel,
        status: 'Not Submitted',
        fms_assignment_version: params.assignmentVersion || 1
      });
    }

    const prevFacultyId = existing.faculty_id;
    const isApproved = existing.status === 'Approved';

    const updated = await submissionRepository.updateFacultyAssignment(
      existing.id,
      params.newFacultyId,
      1,
      prevFacultyId
    );
    if (!updated) throw new Error('Failed to update faculty assignment.');

    const latestVersion = await submissionRepository.getLatestVersionNumber(existing.id);
    const newVersionNum = latestVersion + 1;
    const newVersionLabel = 'v' + newVersionNum;

    if (isApproved) {
      await submissionRepository.createVersion({
        submission_id: existing.id,
        version_number: newVersionNum,
        version_label: newVersionLabel,
        file_name: existing.file_name || 'Approved_Syllabus.docx',
        submitted_by: params.newFacultyId,
        submitted_by_name: params.newFacultyName || 'New Assigned Instructor',
        status_at_version: 'Approved',
        change_summary: 'Adopted official approved syllabus upon instructor reassignment from ' + prevFacultyId
      });

      await this.dispatchAuditLog({
        actorId: 'system-fms-m2m',
        actorName: 'FMS Webhook Ingestion Engine',
        actorRole: 'SYSTEM_INTEGRATION',
        actionType: 'ASSIGNMENT_REASSIGNED_ADOPTED_APPROVED',
        entityId: existing.id,
        previousValue: prevFacultyId,
        newValue: params.newFacultyId,
        details: 'Approved syllabus adopted by new instructor ' + (params.newFacultyName || params.newFacultyId) + '. Reason: ' + (params.reason || 'Instructor reassignment')
      });

      this.dispatchComplianceEvent({
        courseCode: existing.course_code,
        sectionLabel: existing.section_label,
        status: 'Approved',
        submissionId: existing.id
      });

      return { submission: updated, reassignmentType: 'APPROVED_ADOPTED' };
    } else {
      await submissionRepository.createVersion({
        submission_id: existing.id,
        version_number: newVersionNum,
        version_label: newVersionLabel,
        file_name: existing.file_name || 'Pending_Syllabus.docx',
        submitted_by: params.newFacultyId,
        submitted_by_name: params.newFacultyName || 'New Assigned Instructor',
        status_at_version: existing.status,
        change_summary: 'Responsibility moved to ' + (params.newFacultyName || params.newFacultyId) + ' upon FMS reassignment: ' + (params.reason || 'Department scheduling update')
      });

      await this.dispatchAuditLog({
        actorId: 'system-fms-m2m',
        actorName: 'FMS Webhook Ingestion Engine',
        actorRole: 'SYSTEM_INTEGRATION',
        actionType: 'ASSIGNMENT_REASSIGNED_UNAPPROVED',
        entityId: existing.id,
        previousValue: prevFacultyId,
        newValue: params.newFacultyId,
        details: 'Unapproved syllabus moved to ' + (params.newFacultyName || params.newFacultyId) + '. Status: ' + existing.status
      });

      this.dispatchComplianceEvent({
        courseCode: existing.course_code,
        sectionLabel: existing.section_label,
        status: existing.status,
        submissionId: existing.id
      });

      return { submission: updated, reassignmentType: 'UNAPPROVED_REASSIGNED' };
    }
  }

  /**
   * Withdraw Assignment from FMS -> moves to UNASSIGNED without penalty (SMS-023 AC 3)
   */
  public async withdrawAssignment(params: {
    courseCode: string;
    sectionLabel: string;
    reason?: string;
  }): Promise<Submission> {
    const existing = await submissionRepository.findByCourseAndSection(params.courseCode, params.sectionLabel);
    if (!existing) {
      throw new Error('Record Not Found: No assignment tracking found for ' + params.courseCode + ' ' + params.sectionLabel);
    }

    const updated = await submissionRepository.updateStatus(existing.id, 'Unassigned');
    if (!updated) throw new Error('Failed to transition status to Unassigned.');

    await this.dispatchAuditLog({
      actorId: 'system-fms-m2m',
      actorName: 'FMS Webhook Ingestion Engine',
      actorRole: 'SYSTEM_INTEGRATION',
      actionType: 'ASSIGNMENT_WITHDRAWN_UNASSIGNED',
      entityId: existing.id,
      previousValue: existing.status,
      newValue: 'Unassigned',
      details: 'Assignment withdrawn by FMS without penalty. Reason: ' + (params.reason || 'Class dissolved or unassigned')
    });

    this.dispatchComplianceEvent({
      courseCode: existing.course_code,
      sectionLabel: existing.section_label,
      status: 'Unassigned',
      submissionId: existing.id
    });

    return updated;
  }

  /**
   * Assign Temporary Substitute Instructor (SMS-023 AC 4)
   */
  public async assignSubstitute(params: {
    courseCode: string;
    sectionLabel: string;
    substituteId: string;
    substituteName?: string;
    reason?: string;
  }): Promise<Submission> {
    const existing = await submissionRepository.findByCourseAndSection(params.courseCode, params.sectionLabel);
    if (!existing) {
      throw new Error('Record Not Found: No assignment found for ' + params.courseCode + ' ' + params.sectionLabel);
    }

    const updated = await submissionRepository.updateSubstitute(existing.id, params.substituteId);
    if (!updated) throw new Error('Failed to assign substitute.');

    await this.dispatchAuditLog({
      actorId: 'system-fms-m2m',
      actorName: 'FMS Webhook Ingestion Engine',
      actorRole: 'SYSTEM_INTEGRATION',
      actionType: 'SUBSTITUTE_INSTRUCTOR_ASSIGNED',
      entityId: existing.id,
      previousValue: existing.substitute_id || 'None',
      newValue: params.substituteId,
      details: 'Temporary substitute ' + (params.substituteName || params.substituteId) + ' granted co-instructor access. Primary instructor ' + existing.faculty_id + ' remains accountable.'
    });

    return updated;
  }

  /**
   * Signatory Configuration (SMS-035)
   */
  public getSignatories(): SignatoryConfig {
    return signatoryService.getSignatories();
  }

  public updateSignatories(update: Partial<SignatoryConfig>, actorName?: string): SignatoryConfig {
    return signatoryService.updateSignatories(update, actorName);
  }

  /**
   * Generate Official PUPQC OBTL Syllabus PDF (SMS-025)
   */
  public async generateObtlPdf(submissionId: string): Promise<Buffer> {
    const sub = await submissionRepository.findById(submissionId);
    if (!sub) {
      throw new Error('Record Not Found: Submission ' + submissionId + ' does not exist.');
    }
    const signatories = signatoryService.getSignatories();
    return obtlPdfService.generateObtlPdf(sub, signatories);
  }

  private resolveCourseCode(courseId: string): string {
    const map: Record<string, string> = {
      'crs-inte401': 'INTE 401',
      'crs-inte302': 'INTE 302',
      'crs-comp101': 'COMP 101',
      'crs-cs301': 'CS 301',
    };
    return map[courseId] || `Course from FMS (${courseId})`;
  }

  private resolveSectionLabel(blockSectionId: string): string {
    const map: Record<string, string> = {
      'sec-bsit-4-1': 'BSIT 4-1',
      'sec-bsit-4-2': 'BSIT 4-2',
      'sec-bsit-1-1': 'BSIT 1-1',
      'sec-bscs-3-1': 'BSCS 3-1',
    };
    return map[blockSectionId] || `Section from FMS (${blockSectionId})`;
  }

  /**
   * FMS Teaching Assignment Approved Intake (SMS-017 AC 1 - AC 5)
   */
  public async ingestApprovedAssignment(payload: {
    messageId?: string;
    fms_message_id?: string;
    assignment_id: string;
    assignment_version: number;
    academic_term_id: string;
    course_id: string;
    block_section_id: string;
    faculty_id: string;
    previous_faculty_id?: string | null;
    assignment_status?: string;
    status?: string;
    schedule?: FmsScheduleDetails | null;
  }): Promise<{
    statusCode: number;
    action: 'CREATED' | 'SCHEDULE_UPDATED' | 'UPDATED' | 'DUPLICATE_ACKNOWLEDGED';
    data: Submission;
  }> {
    // AC 5: Course Validation - ensure course_id is not empty and not retired
    if (!payload.course_id || typeof payload.course_id !== 'string' || payload.course_id.trim() === '') {
      const err: any = new Error('Unprocessable Entity (SMS-017 AC 5): course_id is required and must reference an active course.');
      err.statusCode = 422;
      throw err;
    }
    if (payload.course_id.toLowerCase().includes('retired')) {
      const err: any = new Error(`Unprocessable Entity (SMS-017 AC 5): Course '${payload.course_id}' is not Active.`);
      err.statusCode = 422;
      throw err;
    }

    if (!payload.assignment_id) {
      const err: any = new Error('Bad Request: assignment_id is required.');
      err.statusCode = 400;
      throw err;
    }

    const incomingVersion = typeof payload.assignment_version === 'number' ? payload.assignment_version : 1;
    const resolvedMessageId = payload.messageId || payload.fms_message_id || null;
    const existing = await submissionRepository.findByAssignmentId(payload.assignment_id);

    // AC 3: Idempotency & Stale Version Check
    if (existing) {
      const storedVersion = existing.fms_assignment_version ?? 1;
      if (incomingVersion === storedVersion) {
        return {
          statusCode: 200,
          action: 'DUPLICATE_ACKNOWLEDGED',
          data: existing,
        };
      }
      if (incomingVersion < storedVersion) {
        const err: any = new Error(
          `Conflict: Stale Version (SMS-017 AC 3). Incoming assignment_version (${incomingVersion}) is less than stored version (${storedVersion}).`
        );
        err.statusCode = 409;
        throw err;
      }

      const isFacultyReassigned = Boolean(payload.faculty_id && payload.faculty_id !== existing.faculty_id);
      const prevFacultyId = isFacultyReassigned ? existing.faculty_id : (existing.previous_faculty_id ?? null);

      // AC 4: Schedule Update - If assignment already exists and payload has non-null schedule,
      // update only schedule details without changing compliance status or deadline.
      if (payload.schedule !== null && payload.schedule !== undefined) {
        const updated = await submissionRepository.updateAssignmentSchedule(
          existing.id,
          payload.schedule,
          incomingVersion,
          resolvedMessageId ?? existing.fms_message_id,
          payload.faculty_id || existing.faculty_id,
          prevFacultyId
        );
        if (!updated) {
          throw new Error('Failed to update assignment schedule.');
        }

        await this.dispatchAuditLog({
          actorId: 'system-fms-m2m',
          actorName: 'FMS Assignment Ingestion Engine',
          actorRole: 'SYSTEM_INTEGRATION',
          actionType: isFacultyReassigned ? 'ASSIGNMENT_REASSIGNED_SCHEDULE_UPDATED' : 'ASSIGNMENT_SCHEDULE_UPDATED',
          entityId: updated.id,
          previousValue: isFacultyReassigned ? existing.faculty_id : existing.status,
          newValue: isFacultyReassigned ? payload.faculty_id : updated.status,
          details: `Schedule updated for assignment ${payload.assignment_id} (v${incomingVersion})${isFacultyReassigned ? ` and faculty reassigned from ${existing.faculty_id} to ${payload.faculty_id}` : ''} without altering status '${updated.status}'`
        });

        return { statusCode: 200, action: 'SCHEDULE_UPDATED', data: updated };
      }

      // Higher version without schedule update
      const updated = await submissionRepository.updateApprovedAssignment(existing.id, {
        assignment_version: incomingVersion,
        fms_assignment_version: incomingVersion,
        faculty_id: payload.faculty_id || existing.faculty_id,
        previous_faculty_id: prevFacultyId,
        ...(resolvedMessageId ? { fms_message_id: resolvedMessageId } : {}),
      });
      if (!updated) {
        throw new Error('Failed to update assignment.');
      }

      await this.dispatchAuditLog({
        actorId: 'system-fms-m2m',
        actorName: 'FMS Assignment Ingestion Engine',
        actorRole: 'SYSTEM_INTEGRATION',
        actionType: isFacultyReassigned ? 'ASSIGNMENT_REASSIGNED' : 'ASSIGNMENT_UPDATED',
        entityId: updated.id,
        previousValue: isFacultyReassigned ? existing.faculty_id : existing.status,
        newValue: isFacultyReassigned ? payload.faculty_id : updated.status,
        details: `Assignment ${payload.assignment_id} updated to version ${incomingVersion}${isFacultyReassigned ? ` and faculty reassigned from ${existing.faculty_id} to ${payload.faculty_id}` : ''}`
      });

      return { statusCode: 200, action: 'UPDATED', data: updated };
    }

    // AC 2: Creation - Create exactly ONE new submission tracking entry with status 'Not Submitted'
    const courseCode = this.resolveCourseCode(payload.course_id);
    const sectionLabel = this.resolveSectionLabel(payload.block_section_id || 'sec-default');

    const created = await submissionRepository.create({
      fms_message_id: resolvedMessageId,
      assignment_id: payload.assignment_id,
      academic_term_id: payload.academic_term_id || 'term-2026-1s',
      course_id: payload.course_id,
      block_section_id: payload.block_section_id || 'sec-bsit-4-1',
      requirement_id: `req-${payload.academic_term_id || 'term-2026-1s'}`,
      faculty_id: payload.faculty_id,
      previous_faculty_id: (payload as any).previous_faculty_id ?? null,
      assignment_version: incomingVersion,
      fms_assignment_version: incomingVersion,
      course_code: courseCode,
      section_label: sectionLabel,
      status: 'Not Submitted',
      schedule: payload.schedule ?? null,
    });

    await this.dispatchAuditLog({
      actorId: 'system-fms-m2m',
      actorName: 'FMS Assignment Ingestion Engine',
      actorRole: 'SYSTEM_INTEGRATION',
      actionType: 'TEACHING_ASSIGNMENT_APPROVED',
      entityId: created.id,
      previousValue: 'None',
      newValue: 'Not Submitted',
      details: `Provisioned compliance tracking entry for assignment ${payload.assignment_id} (v${incomingVersion}): ${courseCode} - ${sectionLabel}`
    });

    this.dispatchComplianceEvent({
      courseCode,
      sectionLabel,
      status: 'Not Submitted',
      submissionId: created.id,
    });

    return { statusCode: 201, action: 'CREATED', data: created };
  }
}

export const submissionService = new SubmissionService();
