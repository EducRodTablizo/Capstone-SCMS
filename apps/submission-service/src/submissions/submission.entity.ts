export type CanonicalStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Under Review'
  | 'Returned'
  | 'Resubmitted'
  | 'Approved'
  | 'Overdue'
  | 'Unassigned';

export interface Submission {
  id: string;
  requirement_id: string;
  faculty_id: string;
  substitute_id?: string | null;
  fms_assignment_version?: number;
  course_code: string;
  section_label: string;
  status: CanonicalStatus;
  file_id?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  submission_mode?: 'FILE_UPLOAD' | 'OBE_FORM';
  obe_form_payload?: Record<string, any> | null;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionVersion {
  id: string;
  submission_id: string;
  version_number: number;
  version_label: string; // 'v1', 'v2', etc.
  file_id?: string | null;
  file_name: string;
  file_size?: number | null;
  submitted_by: string;
  submitted_by_name?: string | null;
  status_at_version: CanonicalStatus;
  change_summary?: string | null;
  created_at: string;
}

export interface ReviewDecision {
  id: string;
  submission_id: string;
  reviewer_name: string;
  decision: 'Approved' | 'Returned';
  comment: string;
  created_at: string;
}

export const ALLOWED_TRANSITIONS: Record<CanonicalStatus, CanonicalStatus[]> = {
  'Not Submitted': ['Submitted', 'Overdue', 'Unassigned'],
  'Submitted': ['Under Review', 'Overdue', 'Unassigned'],
  'Under Review': ['Approved', 'Returned', 'Unassigned'],
  'Returned': ['Resubmitted', 'Overdue', 'Unassigned'],
  'Resubmitted': ['Under Review', 'Overdue', 'Unassigned'],
  'Approved': ['Unassigned'],
  'Overdue': ['Submitted', 'Unassigned'],
  'Unassigned': ['Not Submitted']
};
