export type TermStatus = 'Upcoming' | 'Active' | 'Closed' | 'Archived';
export type CalendarEntryType = 'REGULAR_HOLIDAY' | 'SPECIAL_NON_WORKING' | 'SUSPENSION' | 'ACADEMIC_EVENT';
export type AppliesToScope = 'CLASSES' | 'WORK' | 'BOTH';

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
  status: TermStatus;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  event_id: string;
  sync_id: string;
  term_code: string;
  date: string;
  name: string;
  entry_type: CalendarEntryType;
  applies_to: AppliesToScope;
  created_at: string;
}

export interface CalendarSnapshotPayload {
  sync_id: string;
  schema_version: string;
  timestamp: string;
  academic_term: {
    academic_term_id?: string;
    academic_year: string;
    semester_number: number;
    semester_label: string;
    term_code: string;
    term_name?: string;
    display_label?: string;
    start_date: string;
    end_date: string;
  };
  holidays?: Array<{
    event_id: string;
    date: string;
    name: string;
    entry_type: CalendarEntryType;
    applies_to: AppliesToScope;
  }>;
  suspensions?: Array<{
    event_id: string;
    date: string;
    name: string;
    entry_type: CalendarEntryType;
    applies_to: AppliesToScope;
  }>;
}
