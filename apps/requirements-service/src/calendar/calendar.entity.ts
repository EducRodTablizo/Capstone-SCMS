export type TermStatus =
  | 'UPCOMING'
  | 'ACTIVE'
  | 'CLOSED'
  | 'ARCHIVED'
  | 'Upcoming'
  | 'Active'
  | 'Closed'
  | 'Archived';

export type CalendarEntryType = 'REGULAR_HOLIDAY' | 'SPECIAL_NON_WORKING' | 'LOCAL_HOLIDAY' | 'SUSPENSION' | 'ACADEMIC_EVENT';
export type AppliesToScope = 'CLASSES' | 'WORK' | 'BOTH' | string[] | string;
export type ClassEffect = 'SUSPENDED' | 'ONLINE' | null;

export interface AcademicTerm {
  id?: string;
  term_code: string;
  academic_year: string;
  semester_number: number;
  semester_label: string;
  display_label: string;
  start_date: string;
  end_date: string;
  submission_window_start?: string | null;
  submission_window_end?: string | null;
  status: TermStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTermDto {
  term_code: string;
  academic_year: string;
  semester_number: number;
  semester_label: string;
  display_label?: string;
  start_date?: string | null;
  end_date?: string | null;
  submission_window_start?: string | null;
  submission_window_end?: string | null;
  status?: TermStatus;
}

export interface UpdateTermDto {
  academic_year?: string;
  semester_number?: number;
  semester_label?: string;
  display_label?: string;
  start_date?: string | null;
  end_date?: string | null;
  submission_window_start?: string | null;
  submission_window_end?: string | null;
  status?: TermStatus;
}

export interface CalendarSnapshot {
  id: string;
  sync_id: string;
  term_code: string;
  payload: CalendarSnapshotPayload;
  received_at: string;
}

export interface CalendarEvent {
  id: string;
  event_id: string;
  sync_id: string;
  term_code: string;
  date: string;
  name: string;
  entry_type: CalendarEntryType;
  applies_to: string;
  effect?: ClassEffect;
  interval_start?: string | null;
  interval_end?: string | null;
  created_at: string;
}

export interface CalendarEntryDto {
  event_id?: string;
  entity_id?: string;
  id?: string;
  revision?: number;
  change_kind?: 'ADDED' | 'UPDATED' | 'REMOVED';
  date: string;
  name?: string;
  reason?: string;
  entry_type?: CalendarEntryType;
  type?: CalendarEntryType;
  applies_to?: AppliesToScope;
  appliesTo?: AppliesToScope;
  effect?: ClassEffect;
  interval?: { start?: string; end?: string };
  start_time?: string;
  end_time?: string;
}

export interface CalendarSnapshotPayload {
  sync_id?: string;
  syncId?: string;
  snapshot?: boolean;
  schema_version?: string;
  timestamp?: string;
  academic_term?: {
    academic_term_id?: string;
    academic_year?: string;
    semester_number?: number;
    semester_label?: string;
    term_code: string;
    term_name?: string;
    display_label?: string;
    start_date?: string;
    end_date?: string;
  };
  term_code?: string;
  termId?: string;
  entries?: CalendarEntryDto[];
  holidays?: CalendarEntryDto[];
  suspensions?: CalendarEntryDto[];
}
