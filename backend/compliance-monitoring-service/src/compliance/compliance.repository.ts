import { ComplianceRecord, CanonicalStatus } from './compliance.entity';
import { randomUUID } from 'crypto';

export class ComplianceRepository {
  private fallbackStore: Map<string, ComplianceRecord> = new Map();

  constructor() {
    this.seedBaselineData();
  }

  private seedBaselineData() {
    const seedItems: Omit<ComplianceRecord, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        assignment_id: 'asg-001',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSIT',
        course_code: 'INTE 401',
        course_title: 'Information Assurance and Security 2',
        section_label: 'BSIT 4-1',
        faculty_id: 'fac-prof-delacruz',
        faculty_name: 'Prof. Juan Dela Cruz',
        academic_rank: 'Associate Professor II',
        consultation_hours: 'Mon/Wed 1:00 PM - 3:00 PM',
        status: 'Approved',
        submission_id: 'a1111111-1111-4111-8111-111111111101',
        file_name: 'INTE_401_Syllabus.pdf',
        version_label: 'v1',
        submitted_at: '2026-10-18T10:00:00.000Z',
        reviewed_at: '2026-10-19T14:30:00.000Z',
        due_date: '2026-11-15T23:59:59.000Z'
      },
      {
        assignment_id: 'asg-002',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSIT',
        course_code: 'INTE 302',
        course_title: 'Information Assurance and Security 1',
        section_label: 'BSIT 3-1',
        faculty_id: 'fac-prof-delacruz',
        faculty_name: 'Prof. Juan Dela Cruz',
        academic_rank: 'Associate Professor II',
        consultation_hours: 'Mon/Wed 1:00 PM - 3:00 PM',
        status: 'Under Review',
        submission_id: 'a1111111-1111-4111-8111-111111111102',
        file_name: 'INTE_302_Syllabus.pdf',
        version_label: 'v1',
        submitted_at: '2026-10-21T08:00:00.000Z',
        due_date: '2026-11-15T23:59:59.000Z'
      },
      {
        assignment_id: 'asg-003',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSIT',
        course_code: 'COMP 201',
        course_title: 'Data Structures and Algorithms',
        section_label: 'BSIT 2-1',
        faculty_id: 'fac-prof-santos',
        faculty_name: 'Prof. Ana Santos',
        academic_rank: 'Assistant Professor I',
        status: 'Returned',
        submission_id: 'a1111111-1111-4111-8111-111111111103',
        file_name: 'COMP_201_Syllabus.pdf',
        version_label: 'v1',
        submitted_at: '2026-10-20T11:00:00.000Z',
        due_date: '2026-11-15T23:59:59.000Z'
      },
      {
        assignment_id: 'asg-004',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSIT',
        course_code: 'INTE 203',
        course_title: 'Database Systems',
        section_label: 'BSIT 2-2',
        faculty_id: 'fac-prof-reyes',
        faculty_name: 'Prof. Carlos Reyes',
        academic_rank: 'Instructor I',
        status: 'Resubmitted',
        submission_id: 'a1111111-1111-4111-8111-111111111104',
        file_name: 'INTE_203_Revised.pdf',
        version_label: 'v1',
        submitted_at: '2026-10-22T09:30:00.000Z',
        due_date: '2026-11-15T23:59:59.000Z'
      },
      {
        assignment_id: 'asg-005',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSIT',
        course_code: 'COMP 101',
        course_title: 'Introduction to Computing',
        section_label: 'BSIT 1-1',
        faculty_id: 'fac-prof-reyes',
        faculty_name: 'Prof. Carlos Reyes',
        academic_rank: 'Instructor I',
        status: 'Submitted',
        submission_id: 'a1111111-1111-4111-8111-111111111105',
        file_name: 'COMP_101_Syllabus.pdf',
        version_label: 'v1',
        submitted_at: '2026-10-24T14:15:00.000Z',
        due_date: '2026-11-15T23:59:59.000Z'
      },
      {
        assignment_id: 'asg-006',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSBA-HRM',
        course_code: 'HRMG 201',
        course_title: 'Human Resource Management Principles',
        section_label: 'BSBA 2-1',
        faculty_id: 'fac-prof-gomez',
        faculty_name: 'Prof. Elena Gomez',
        academic_rank: 'Associate Professor I',
        status: 'Approved',
        submission_id: 'a1111111-1111-4111-8111-111111111106',
        file_name: 'HRMG_201_Syllabus.docx',
        version_label: 'v1',
        submitted_at: '2026-10-17T15:00:00.000Z',
        due_date: '2026-11-15T23:59:59.000Z'
      },
      {
        assignment_id: 'asg-007',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSBA-HRM',
        course_code: 'HRMG 301',
        course_title: 'Recruitment and Selection',
        section_label: 'BSBA 3-1',
        faculty_id: 'fac-prof-gomez',
        faculty_name: 'Prof. Elena Gomez',
        academic_rank: 'Associate Professor I',
        status: 'Overdue',
        submission_id: 'a1111111-1111-4111-8111-111111111107',
        due_date: '2026-10-10T23:59:59.000Z'
      },
      {
        assignment_id: 'asg-009',
        requirement_id: '22222222-2222-2222-2222-222222222222',
        term_id: '2026-1T',
        program_code: 'BSIT',
        course_code: 'COMP 102',
        course_title: 'Computer Programming 1',
        section_label: 'BSIT 1-2',
        faculty_id: 'fac-prof-reyes',
        faculty_name: 'Prof. Carlos Reyes',
        academic_rank: 'Instructor I',
        status: 'Not Submitted',
        submission_id: 'a1111111-1111-4111-8111-111111111108',
        due_date: '2026-10-15T23:59:59.000Z'
      }
    ];

    const now = new Date().toISOString();
    for (const item of seedItems) {
      const id = item.submission_id || randomUUID();
      this.fallbackStore.set(id, {
        id,
        ...item,
        created_at: now,
        updated_at: now
      });
    }
  }

  async list(filter?: {
    term_id?: string;
    program_code?: string;
    faculty_id?: string;
    status?: string;
  }): Promise<ComplianceRecord[]> {
    let items = Array.from(this.fallbackStore.values());
    if (filter?.term_id) {
      items = items.filter(r => r.term_id === filter.term_id);
    }
    if (filter?.program_code) {
      items = items.filter(r => r.program_code === filter.program_code);
    }
    if (filter?.faculty_id) {
      items = items.filter(r => r.faculty_id === filter.faculty_id);
    }
    if (filter?.status) {
      items = items.filter(r => r.status.toLowerCase() === filter.status!.toLowerCase());
    }
    return items;
  }

  async findById(id: string): Promise<ComplianceRecord | null> {
    return this.fallbackStore.get(id) || null;
  }

  async findByAssignmentId(assignmentId: string): Promise<ComplianceRecord | null> {
    return Array.from(this.fallbackStore.values()).find(r => r.assignment_id === assignmentId) || null;
  }

  async findBySubmissionId(submissionId: string): Promise<ComplianceRecord | null> {
    return Array.from(this.fallbackStore.values()).find(r => r.submission_id === submissionId) || null;
  }

  async updateStatusByCourseSection(
    courseCode: string,
    sectionLabel: string,
    status: CanonicalStatus,
    submissionId?: string,
    fileName?: string,
    versionLabel?: string,
    submittedAt?: string
  ): Promise<ComplianceRecord | null> {
    const item = Array.from(this.fallbackStore.values()).find(
      r => r.course_code === courseCode && r.section_label === sectionLabel
    );
    if (!item) return null;

    item.status = status;
    if (submissionId) item.submission_id = submissionId;
    if (fileName) item.file_name = fileName;
    if (versionLabel) item.version_label = versionLabel;
    if (submittedAt) item.submitted_at = submittedAt;
    item.updated_at = new Date().toISOString();
    this.fallbackStore.set(item.id, item);
    return item;
  }

  async save(record: ComplianceRecord): Promise<ComplianceRecord> {
    record.updated_at = new Date().toISOString();
    this.fallbackStore.set(record.id, record);
    return record;
  }
}

export const complianceRepository = new ComplianceRepository();
