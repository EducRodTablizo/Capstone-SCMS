const SUBMISSION_API_URL = import.meta.env.VITE_SUBMISSION_API_URL || 'http://localhost:3003/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('scms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  decision: 'Approved' | 'Returned';
  comment: string;
  created_at: string;
}

export const submissionService = {
  async submitSyllabus(payload: SubmissionPayload) {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getSubmissions(params?: { requirement_id?: string; status?: string; course_code?: string }) {
    try {
      const url = new URL(`${SUBMISSION_API_URL}/submissions`);
      if (params?.requirement_id) url.searchParams.append('requirement_id', params.requirement_id);
      if (params?.status) url.searchParams.append('status', params.status);
      if (params?.course_code) url.searchParams.append('course_code', params.course_code);

      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch {
      return { success: true, data: [] };
    }
  },

  async getSubmissionById(id: string): Promise<{ success: boolean; data: SubmissionItem; reviews: ReviewDecisionItem[]; versions: SubmissionVersionItem[] }> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async openForReview(id: string, reviewer?: { reviewerId?: string; reviewerName?: string }) {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/open-review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(reviewer || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async reviewSubmission(id: string, payload: { reviewerId?: string; reviewerName?: string; decision: 'Approved' | 'Returned'; comment: string }) {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async resubmitSyllabus(id: string, payload: { facultyId?: string; facultyName?: string; fileName: string; fileSize?: number; changeSummary?: string }) {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/resubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

    async getVersions(id: string): Promise<{ success: boolean; count: number; data: SubmissionVersionItem[] }> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/versions`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  getFileDownloadUrl(id: string): string {
    return `${SUBMISSION_API_URL}/submissions/${id}/file`;
  },

  async getPreview(id: string): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/preview`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  }
};
