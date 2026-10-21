export interface AcademicTerm {
  term_code: string;
  academic_year: string;
  semester_number: number;
  semester_label: string;
  display_label: string;
  start_date: string;
  end_date: string;
  submission_window_start?: string;
  submission_window_end?: string;
  status: 'Upcoming' | 'Active' | 'Closed' | 'Archived';
}

export interface CalendarEvent {
  id: string;
  event_id: string;
  term_code: string;
  date: string;
  name: string;
  entry_type: 'REGULAR_HOLIDAY' | 'SPECIAL_NON_WORKING' | 'SUSPENSION' | 'ACADEMIC_EVENT';
  applies_to: 'CLASSES' | 'WORK' | 'BOTH';
}

export interface DeadlineAdjustmentResult {
  original_deadline: string;
  adjusted_deadline: string;
  was_adjusted: boolean;
  shifts_applied: number;
  reasons: string[];
}

const API_BASE = 'http://localhost:3002/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('scms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const calendarService = {
  async getActiveTerm(): Promise<AcademicTerm | null> {
    try {
      const res = await fetch(`${API_BASE}/terms/active`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  },

  async getEvents(termCode: string = '2026-1S'): Promise<CalendarEvent[]> {
    try {
      const res = await fetch(`${API_BASE}/calendar/events?term_code=${termCode}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async calculateDeadline(deadline: string, termCode: string = '2026-1S'): Promise<DeadlineAdjustmentResult | null> {
    try {
      const res = await fetch(`${API_BASE}/calendar/calculate-deadline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ deadline, term_code: termCode }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  },

  async publishRequirement(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/requirements/${id}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  },

  async closeRequirement(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/requirements/${id}/close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  },
};
