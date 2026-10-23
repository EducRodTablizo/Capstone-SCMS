import { complianceRepository } from './compliance.repository';
import { ComplianceRecord, ComplianceMetrics, SyllabusHeaderDetails, CanonicalStatus } from './compliance.entity';

export class ComplianceService {
  /**
   * Aggregate compliance metrics across all 8 canonical statuses (SMS-012 AC 1 & AC 3)
   */
  public async getMetrics(filter?: {
    term_id?: string;
    program_code?: string;
    faculty_id?: string;
  }): Promise<ComplianceMetrics> {
    const termId = filter?.term_id || '2026-1T';
    const records = await complianceRepository.list({
      term_id: termId,
      program_code: filter?.program_code,
      faculty_id: filter?.faculty_id
    });

    const counts = {
      not_submitted: 0,
      submitted: 0,
      under_review: 0,
      returned: 0,
      resubmitted: 0,
      approved: 0,
      overdue: 0,
      unassigned: 0
    };

    for (const r of records) {
      switch (r.status) {
        case 'Not Submitted':
          counts.not_submitted++;
          break;
        case 'Submitted':
          counts.submitted++;
          break;
        case 'Under Review':
          counts.under_review++;
          break;
        case 'Returned':
          counts.returned++;
          break;
        case 'Resubmitted':
          counts.resubmitted++;
          break;
        case 'Approved':
          counts.approved++;
          break;
        case 'Overdue':
          counts.overdue++;
          break;
        case 'Unassigned':
          counts.unassigned++;
          break;
      }
    }

    const total = records.length;
    const submittedCount = counts.submitted + counts.under_review + counts.returned + counts.resubmitted + counts.approved;
    const complianceRate = total > 0 ? parseFloat(((counts.approved / total) * 100).toFixed(1)) : 0;
    const submissionRate = total > 0 ? parseFloat(((submittedCount / total) * 100).toFixed(1)) : 0;

    return {
      term_id: termId,
      program_code: filter?.program_code,
      total_assigned: total,
      total_submitted: submittedCount,
      compliance_rate: complianceRate,
      submission_rate: submissionRate,
      status_counts: counts,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Filterable records roster (SMS-012 AC 2)
   */
  public async listRecords(filter?: {
    term_id?: string;
    program_code?: string;
    faculty_id?: string;
    status?: string;
  }): Promise<ComplianceRecord[]> {
    return complianceRepository.list(filter);
  }

  /**
   * Ingest submission/review event and update live state (SMS-013 AC 1 & AC 2)
   */
  public async handleStatusEvent(event: {
    courseCode: string;
    sectionLabel: string;
    status: CanonicalStatus;
    submissionId?: string;
    fileName?: string;
    versionLabel?: string;
    submittedAt?: string;
  }): Promise<ComplianceRecord | null> {
    return complianceRepository.updateStatusByCourseSection(
      event.courseCode,
      event.sectionLabel,
      event.status,
      event.submissionId,
      event.fileName,
      event.versionLabel,
      event.submittedAt
    );
  }

  /**
   * Automated Overdue Detection Evaluator (SMS-006, SMS-012)
   * Flags 'Not Submitted' items whose deadline has passed
   */
  public async evaluateOverdue(referenceDate?: Date): Promise<{ evaluated: number; flagged: number; records: ComplianceRecord[] }> {
    const now = referenceDate || new Date();
    const records = await complianceRepository.list();
    let flaggedCount = 0;
    const updatedRecords: ComplianceRecord[] = [];

    for (const r of records) {
      if (r.status === 'Not Submitted') {
        const due = new Date(r.due_date);
        if (now > due) {
          r.status = 'Overdue';
          await complianceRepository.save(r);
          flaggedCount++;
          updatedRecords.push(r);
        }
      }
    }

    return {
      evaluated: records.length,
      flagged: flaggedCount,
      records: updatedRecords
    };
  }

  /**
   * Generate Pre-Filled Locked Syllabus Header from FMS Assignment (SMS-024 AC 1, AC 2 & AC 3)
   */
  public async getSyllabusHeader(assignmentId: string): Promise<SyllabusHeaderDetails> {
    const record = await complianceRepository.findByAssignmentId(assignmentId);
    if (!record) {
      throw new Error(`Record Not Found: Assignment '${assignmentId}' does not exist.`);
    }

    // Default consultation hours if missing (SMS-024 AC 3)
    const consultationHours = record.consultation_hours || 'Mon/Wed 1:00 PM - 3:00 PM (AVR / Faculty Room)';
    const academicRank = record.academic_rank || 'Instructor I';
    const email = record.faculty_name.toLowerCase().replace(/[^a-z]/g, '') + '@pup.edu.ph';

    return {
      course_code: record.course_code,
      course_title: record.course_title,
      section_label: record.section_label,
      term_label: 'A.Y. 2026-2027 1st Semester',
      class_schedule: 'Mon/Wed 8:00 AM - 10:00 AM',
      room_assignment: 'Room 304, PUPQC Academic Bldg',
      faculty_name: record.faculty_name,
      academic_rank: academicRank,
      email,
      consultation_hours: consultationHours,
      locked: true // Locked in SMS (SMS-024 AC 2)
    };
  }
}

export const complianceService = new ComplianceService();
