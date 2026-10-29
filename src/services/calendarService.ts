import { apiClient } from './apiClient';

export interface AcademicTerm {
  id?: string;
  term_code: string;
  academic_year: string;
  semester_number?: number;
  semester_label?: string;
  semester?: string;
  display_label?: string;
  start_date: string;
  end_date: string;
  submission_window_start?: string;
  submission_window_end?: string;
  status: 'Upcoming' | 'Active' | 'Closed' | 'Archived' | 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
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

export const calendarService = {
  async getTerms(): Promise<AcademicTerm[]> {
    const json = await apiClient.get<{ data: AcademicTerm[] }>('/terms');
    return json.data || [];
  },

  async getActiveTerm(): Promise<AcademicTerm | null> {
    const json = await apiClient.get<{ data: AcademicTerm }>('/terms/active');
    return json.data || null;
  },

  async getEvents(termCode?: string): Promise<CalendarEvent[]> {
    const json = await apiClient.get<{ data: CalendarEvent[] }>('/calendar/events', {
      params: { term_code: termCode },
    });
    return json.data || [];
  },

  async calculateDeadline(deadline: string, termCode?: string): Promise<DeadlineAdjustmentResult | null> {
    const json = await apiClient.post<{ data: DeadlineAdjustmentResult }>('/calendar/calculate-deadline', {
      deadline,
      term_code: termCode,
    });
    return json.data || null;
  },

  async getRequirements(params?: { program_code?: string; term_code?: string }): Promise<any[]> {
    const json = await apiClient.get<{ data: any[] }>('/requirements', { params });
    return json.data || [];
  },

  async createRequirement(payload: {
    program_code: string;
    term_code: string;
    requirement_type: string;
    name: string;
    description: string;
    deadline_at: string | null;
  }): Promise<any> {
    const json = await apiClient.post<{ data: any }>('/requirements', payload);
    return json.data;
  },

  async publishRequirement(id: string): Promise<any> {
    const json = await apiClient.patch<{ data: any }>(`/requirements/${id}/publish`);
    return json.data;
  },

  async closeRequirement(id: string): Promise<any> {
    const json = await apiClient.patch<{ data: any }>(`/requirements/${id}/close`);
    return json.data;
  },
};
