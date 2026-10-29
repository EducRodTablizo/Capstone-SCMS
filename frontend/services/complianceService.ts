import { apiClient } from './apiClient';

const COMPLIANCE_WS_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_COMPLIANCE_WS_URL) ||
  'ws://localhost:3005/ws';

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
  async getMetrics(params?: {
    term_id?: string;
    program_code?: string;
    faculty_id?: string;
  }): Promise<ComplianceMetricsData> {
    const body = await apiClient.get('/compliance/metrics', { params });
    return body.data;
  },

  async getRecords(params?: {
    term_id?: string;
    program_code?: string;
    faculty_id?: string;
    status?: string;
  }): Promise<ComplianceRecordItem[]> {
    const body = await apiClient.get('/compliance/records', { params });
    return body.data;
  },

  async getSyllabusHeader(assignmentId: string): Promise<SyllabusHeaderDetails> {
    const body = await apiClient.get(`/compliance/syllabus-header/${assignmentId}`);
    return body.data;
  },

  async evaluateOverdue(referenceDate?: string) {
    return apiClient.post('/compliance/evaluate-overdue', { referenceDate });
  },

  getExportCsvUrl(term_id?: string, program_code?: string): string {
    return apiClient.buildUrl('/compliance/export/csv', { term_id, program_code });
  },

  getExportPdfUrl(term_id?: string, program_code?: string, actor_name?: string): string {
    return apiClient.buildUrl('/compliance/export/pdf', { term_id, program_code, actor_name });
  },

  async getCcmsSummary(termCode?: string): Promise<CcmsSummaryPayload> {
    const body = await apiClient.get('/compliance/ccms/summary', {
      params: { term_code: termCode },
    });
    return body.data;
  },

  async pushCcmsSummary(actorName?: string): Promise<CcmsPushLogItem> {
    const body = await apiClient.post('/compliance/ccms/push', {
      trigger: 'MANUAL_ON_DEMAND',
      actorName,
    });
    return body.data;
  },

  async getCcmsPushLogs(): Promise<CcmsPushLogItem[]> {
    const body = await apiClient.get('/compliance/ccms/logs');
    return body.data || [];
  },

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

        ws.onerror = () => {};

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

  async getResilienceStatus(): Promise<any> {
    const body = await apiClient.get('/integrations/resilience/status');
    return body.data;
  },

  async simulateResilienceTier(system: 'FMS' | 'CCMS', state: string | null): Promise<any> {
    return apiClient.post('/integrations/resilience/simulate', { system, state });
  },

  async reconcileFms(): Promise<any> {
    return apiClient.post('/integrations/fms/reconcile');
  },

  async getFacultyProfileWithFallback(facultyId: string): Promise<any> {
    const body = await apiClient.get(`/integrations/fms/profile/${facultyId}`);
    return body.data;
  },

  async getCcmsCalendarWithFallback(): Promise<any> {
    const body = await apiClient.get('/integrations/ccms/calendar');
    return body.data;
  },

  async getCatalogWebhookLogs(): Promise<any[]> {
    const body = await apiClient.get('/catalog/webhooks/fms/logs');
    return body.data || [];
  },

  async dispatchCatalogWebhook(payload: any): Promise<any> {
    return apiClient.post('/catalog/webhooks/fms/dispatch', payload);
  },

  async getJointSeedFixtures(): Promise<any> {
    const body = await apiClient.get('/integrations/fixtures/catalog');
    return body.fixtures || body.data || body;
  },
};
