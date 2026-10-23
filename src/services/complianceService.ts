const COMPLIANCE_API_URL = import.meta.env.VITE_COMPLIANCE_API_URL || 'http://localhost:3005/api/v1/compliance';
const COMPLIANCE_WS_URL = import.meta.env.VITE_COMPLIANCE_WS_URL || 'ws://localhost:3005/ws';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('scms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ComplianceMetricsData {
  term_id: string;
  program_code?: string;
  total_assigned: number;
  total_submitted: number;
  compliance_rate: number;
  submission_rate: number;
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

export interface ComplianceRecordItem {
  id: string;
  assignment_id: string;
  requirement_id: string;
  term_id: string;
  program_code: string;
  course_code: string;
  course_title: string;
  section_label: string;
  faculty_id: string;
  faculty_name: string;
  academic_rank?: string;
  consultation_hours?: string;
  status: string;
  submission_id?: string | null;
  file_name?: string | null;
  version_label?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  due_date: string;
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

export const complianceService = {
  async getMetrics(params?: { term_id?: string; program_code?: string; faculty_id?: string }): Promise<ComplianceMetricsData> {
    const url = new URL(`${COMPLIANCE_API_URL}/metrics`);
    if (params?.term_id) url.searchParams.append('term_id', params.term_id);
    if (params?.program_code) url.searchParams.append('program_code', params.program_code);
    if (params?.faculty_id) url.searchParams.append('faculty_id', params.faculty_id);

    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async getRecords(params?: { term_id?: string; program_code?: string; faculty_id?: string; status?: string }): Promise<ComplianceRecordItem[]> {
    const url = new URL(`${COMPLIANCE_API_URL}/records`);
    if (params?.term_id) url.searchParams.append('term_id', params.term_id);
    if (params?.program_code) url.searchParams.append('program_code', params.program_code);
    if (params?.faculty_id) url.searchParams.append('faculty_id', params.faculty_id);
    if (params?.status) url.searchParams.append('status', params.status);

    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async getSyllabusHeader(assignmentId: string): Promise<SyllabusHeaderDetails> {
    const res = await fetch(`${COMPLIANCE_API_URL}/syllabus-header/${assignmentId}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async evaluateOverdue(referenceDate?: string) {
    const res = await fetch(`${COMPLIANCE_API_URL}/evaluate-overdue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ referenceDate })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Real-Time WebSocket Connection (SMS-013)
   */
  subscribeToComplianceUpdates(onEvent: (event: any) => void): () => void {
    let ws: WebSocket | null = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;
      try {
        ws = new WebSocket(COMPLIANCE_WS_URL);

        ws.onopen = () => {
          console.log('[SCMS Gateway] Connected to Live Compliance WebSocket');
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            onEvent(data);
          } catch {
            // Ignore non-json
          }
        };

        ws.onerror = () => {
          // Fallback or retry
        };

        ws.onclose = () => {
          if (!isClosed) {
            setTimeout(connect, 3000); // Reconnect after 3s
          }
        };
      } catch {
        // Fallback
      }
    };

    connect();

    return () => {
      isClosed = true;
      if (ws) ws.close();
    };
  }
};
