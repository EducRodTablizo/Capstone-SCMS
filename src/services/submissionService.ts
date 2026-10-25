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
    const res = await fetch(`${SUBMISSION_API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to submit syllabus (HTTP ${res.status})`);
    }

    return res.json();
  },

  async getSubmissions(params?: { requirement_id?: string; status?: string; course_code?: string }): Promise<any> {
    const url = new URL(`${SUBMISSION_API_URL}/submissions`);
    if (params?.requirement_id) url.searchParams.append('requirement_id', params.requirement_id);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.course_code) url.searchParams.append('course_code', params.course_code);

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch submissions (HTTP ${res.status})`);
    }

    return res.json();
  },

  async getSubmissionById(id: string): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch submission details (HTTP ${res.status})`);
    }

    return res.json();
  },

  async openForReview(id: string, reviewer?: { reviewerId?: string; reviewerName?: string }): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/open-review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(reviewer || {}),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to open submission for review`);
    }

    return res.json();
  },

  async reviewSubmission(
    id: string,
    payload: { reviewerId?: string; reviewerName?: string; decision: 'Approved' | 'Returned'; comment: string }
  ): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to record review decision`);
    }

    return res.json();
  },

  async resubmitSyllabus(
    id: string,
    payload: { facultyId?: string; facultyName?: string; fileName: string; fileSize?: number; changeSummary?: string }
  ): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/resubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to resubmit syllabus revision`);
    }

    return res.json();
  },

  async getVersions(id: string): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/versions`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch versions`);
    }

    return res.json();
  },

  getFileDownloadUrl(id: string): string {
    return `${SUBMISSION_API_URL}/submissions/${id}/file`;
  },

  getObtlPdfUrl(id: string): string {
    return `${SUBMISSION_API_URL}/submissions/${id}/pdf`;
  },

  async getPreview(id: string): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/submissions/${id}/preview`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch preview details`);
    }
    const data = await res.json();
    return data.data;
  },

  /**
   * Signatory Authorities (SMS-035)
   */
  async getSignatories(): Promise<SignatoryDetails> {
    const res = await fetch(`${SUBMISSION_API_URL}/signatories`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch signatories');
    const data = await res.json();
    return data.data;
  },

  async updateSignatories(update: Partial<SignatoryDetails>): Promise<SignatoryDetails> {
    const res = await fetch(`${SUBMISSION_API_URL}/signatories`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error('Failed to update signatories');
    const data = await res.json();
    return data.data;
  },

  /**
   * FMS Teaching Assignment Integration Simulation (SMS-023)
   */
  async reassignAssignment(payload: {
    courseCode: string;
    sectionLabel: string;
    newFacultyId: string;
    newFacultyName?: string;
    assignmentVersion?: number;
    reason?: string;
  }): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/integrations/fms/assignments/reassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reassign assignment');
    }
    return res.json();
  },

  async withdrawAssignment(payload: {
    courseCode: string;
    sectionLabel: string;
    reason?: string;
  }): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/integrations/fms/assignments/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to withdraw assignment');
    }
    return res.json();
  },

  async assignSubstitute(payload: {
    courseCode: string;
    sectionLabel: string;
    substituteId: string;
    substituteName?: string;
    reason?: string;
  }): Promise<any> {
    const res = await fetch(`${SUBMISSION_API_URL}/integrations/fms/assignments/substitute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to assign substitute');
    }
    return res.json();
  }
};
