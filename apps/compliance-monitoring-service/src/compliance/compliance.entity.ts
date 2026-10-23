export type CanonicalStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Under Review'
  | 'Returned'
  | 'Resubmitted'
  | 'Approved'
  | 'Overdue'
  | 'Unassigned';

export interface ComplianceRecord {
  id: string;
  assignment_id: string;
  requirement_id: string;
  term_id: string; // e.g., '2026-1T'
  program_code: string; // e.g., 'BSIT', 'BSBA-HRM', 'BSENTREP'
  course_code: string;
  course_title: string;
  section_label: string;
  faculty_id: string;
  faculty_name: string;
  academic_rank?: string;
  consultation_hours?: string;
  status: CanonicalStatus;
  submission_id?: string | null;
  file_name?: string | null;
  version_label?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceMetrics {
  term_id: string;
  program_code?: string;
  total_assigned: number;
  total_submitted: number;
  compliance_rate: number; // percentage (Approved / total)
  submission_rate: number; // percentage (Submitted, Under Review, Returned, Resubmitted, Approved / total)
  status_counts: {
    not_submitted: number;
    submitted: number;
    under_review: number;
    returned: number;
    resubmitted: number;
    approved: number;
    overdue: number;
    unassigned: number;
  };
  generated_at: string;
}

export interface SyllabusHeaderDetails {
  course_code: string;
  course_title: string;
  section_label: string;
  term_label: string;
  class_schedule: string;
  room_assignment: string;
  faculty_name: string;
  academic_rank: string;
  email: string;
  consultation_hours: string;
  locked: boolean;
}
