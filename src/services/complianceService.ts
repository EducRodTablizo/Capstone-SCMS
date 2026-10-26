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

export interface CcmsSummaryPayload {
  institution: string;
  source_system: string;
  contract_version: string;
  term_code: string;
  academic_year: string;
  semester: string;
  total_courses_offered: number;
  total_syllabi_required: number;
  total_syllabi_submitted: number;
  total_syllabi_approved: number;
  status_distribution: Record<string, number>;
  compliance_rate_percentage: number;
  submission_rate_percentage: number;
  zero_pii_certified: boolean;
  generated_at: string;
  digest_signature: string;
}

export interface CcmsPushLogItem {
  id: string;
  timestamp: string;
  term_id: string;
  compliance_rate: number;
  target_url: string;
  http_status: number;
  status: 'DELIVERED' | 'FAILED' | 'RETRY_SCHEDULED';
  attempt_count: number;
  payload: CcmsSummaryPayload;
  response_body?: string;
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
   * Export Compliance Matrix to CSV (SMS-037)
   */
  getExportCsvUrl(term_id?: string, program_code?: string): string {
    const url = new URL(`${COMPLIANCE_API_URL}/export/csv`);
    if (term_id) url.searchParams.append('term_id', term_id);
    if (program_code) url.searchParams.append('program_code', program_code);
    return url.toString();
  },

  /**
   * Export Compliance Matrix to PDF (SMS-037)
   */
  getExportPdfUrl(term_id?: string, program_code?: string, actor_name = 'Dr. Maria Santos'): string {
    const url = new URL(`${COMPLIANCE_API_URL}/export/pdf`);
    if (term_id) url.searchParams.append('term_id', term_id);
    if (program_code) url.searchParams.append('program_code', program_code);
    if (actor_name) url.searchParams.append('actor_name', actor_name);
    return url.toString();
  },

  /**
   * Outbound CCMS Integration (SMS-019)
   */
  async getCcmsSummary(termCode?: string): Promise<CcmsSummaryPayload> {
    const url = new URL(`${COMPLIANCE_API_URL}/ccms/summary`);
    if (termCode) url.searchParams.append('term_code', termCode);
    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async pushCcmsSummary(actorName = 'Dr. Maria Santos'): Promise<CcmsPushLogItem> {
    const res = await fetch(`${COMPLIANCE_API_URL}/ccms/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ trigger: 'MANUAL_ON_DEMAND', actorName })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async getCcmsPushLogs(): Promise<CcmsPushLogItem[]> {
    const res = await fetch(`${COMPLIANCE_API_URL}/ccms/logs`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data || [];
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
            setTimeout(connect, 3000);
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
  },

  /**
   * Sprint 8 Resilience & Integration Methods (SMS-020, SMS-027, SMS-029, SMS-034)
   */
  async getResilienceStatus(): Promise<any> {
    const res = await fetch('http://localhost:3005/api/v1/integrations/resilience/status', {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async simulateResilienceTier(system: 'FMS' | 'CCMS', state: string | null): Promise<any> {
    const res = await fetch('http://localhost:3005/api/v1/integrations/resilience/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ system, state })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async reconcileFms(): Promise<any> {
    const res = await fetch('http://localhost:3005/api/v1/integrations/fms/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getFacultyProfileWithFallback(facultyId: string): Promise<any> {
    const res = await fetch(`http://localhost:3005/api/v1/integrations/fms/profile/${facultyId}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async getCcmsCalendarWithFallback(): Promise<any> {
    const res = await fetch('http://localhost:3005/api/v1/integrations/ccms/calendar', {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data;
  },

  async getCatalogWebhookLogs(): Promise<any[]> {
    const res = await fetch('http://localhost:3005/api/v1/catalog/webhooks/fms/logs', {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body.data || [];
  },

  async dispatchCatalogWebhook(payload: any): Promise<any> {
    const res = await fetch('http://localhost:3005/api/v1/catalog/webhooks/fms/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};
