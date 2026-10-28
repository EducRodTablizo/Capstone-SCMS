import { apiClient } from './apiClient';

export interface SubmissionPayload {
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
  fileContentBase64?: string;
  obeFormPayload?: Record<string, any>;
}

export interface SubmissionItem {
  id: string;
  requirement_id: string;
  faculty_id: string;
  substitute_id?: string | null;
  fms_assignment_version?: number;
  course_code: string;
  section_label: string;
  status: string;
  file_id?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  submission_mode?: 'FILE_UPLOAD' | 'OBE_FORM';
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionVersionItem {
  id: string;
  submission_id: string;
  version_number: number;
  version_label: string;
  file_id?: string | null;
  file_name: string;
  file_size?: number | null;
  submitted_by: string;
  submitted_by_name?: string | null;
  status_at_version: string;
  change_summary?: string | null;
  created_at: string;
}

export interface ReviewDecisionItem {
  id: string;
  submission_id: string;
  reviewer_name: string;
  decision: string;
  comment: string;
  created_at: string;
}

export interface SignatoryDetails {
  prepared_by_title: string;
  reviewed_by_name: string;
  reviewed_by_title: string;
  recommending_name: string;
  recommending_title: string;
  approved_by_name: string;
  approved_by_title: string;
  updated_at: string;
  updated_by?: string;
}

export const submissionService = {
  async submitSyllabus(payload: SubmissionPayload): Promise<any> {
    return apiClient.post('/submissions', payload);
  },

  async getSubmissions(params?: { requirement_id?: string; status?: string; course_code?: string }): Promise<any> {
    return apiClient.get('/submissions', { params });
  },

  async getSubmissionById(id: string): Promise<any> {
    return apiClient.get(`/submissions/${id}`);
  },

  async openForReview(id: string, reviewer?: { reviewerId?: string; reviewerName?: string }): Promise<any> {
    return apiClient.patch(`/submissions/${id}/open-review`, reviewer || {});
  },

  async reviewSubmission(
    id: string,
    payload: { reviewerId?: string; reviewerName?: string; decision: 'Approved' | 'Returned'; comment: string }
  ): Promise<any> {
    return apiClient.post(`/submissions/${id}/review`, payload);
  },

  async resubmitSyllabus(
    id: string,
    payload: { facultyId?: string; facultyName?: string; fileName: string; fileSize?: number; changeSummary?: string }
  ): Promise<any> {
    return apiClient.post(`/submissions/${id}/resubmit`, payload);
  },

  async getVersions(id: string): Promise<any> {
    return apiClient.get(`/submissions/${id}/versions`);
  },

  getFileDownloadUrl(id: string): string {
    return apiClient.buildUrl(`/submissions/${id}/file`);
  },

  getObtlPdfUrl(id: string): string {
    return apiClient.buildUrl(`/submissions/${id}/pdf`);
  },

  async getPreview(id: string): Promise<any> {
    const data = await apiClient.get(`/submissions/${id}/preview`);
    return data.data;
  },

  /**
   * Signatory Authorities (SMS-035)
   */
  async getSignatories(): Promise<SignatoryDetails> {
    const data = await apiClient.get('/signatories');
    return data.data;
  },

  async updateSignatories(update: Partial<SignatoryDetails>): Promise<SignatoryDetails> {
    const data = await apiClient.put('/signatories', update);
    return data.data;
  },

  /**
   * FMS Teaching Assignment Integration Simulation (SMS-017, SMS-023)
   */
  async approveAssignment(payload: {
    assignment_id: string;
    assignment_version: number;
    academic_term_id: string;
    course_id: string;
    block_section_id: string;
    faculty_id: string;
    assignment_status?: string;
    schedule?: Record<string, any> | null;
  }): Promise<any> {
    return apiClient.post('/integrations/fms/assignments/approved', payload);
  },

  async reassignAssignment(payload: {
    courseCode: string;
    sectionLabel: string;
    newFacultyId: string;
    newFacultyName?: string;
    assignmentVersion?: number;
    reason?: string;
  }): Promise<any> {
    return apiClient.post('/integrations/fms/assignments/reassign', payload);
  },

  async withdrawAssignment(payload: {
    courseCode: string;
    sectionLabel: string;
    reason?: string;
  }): Promise<any> {
    return apiClient.post('/integrations/fms/assignments/withdraw', payload);
  },

  async assignSubstitute(payload: {
    courseCode: string;
    sectionLabel: string;
    substituteId: string;
    substituteName?: string;
    reason?: string;
  }): Promise<any> {
    return apiClient.post('/integrations/fms/assignments/substitute', payload);
  }
};
