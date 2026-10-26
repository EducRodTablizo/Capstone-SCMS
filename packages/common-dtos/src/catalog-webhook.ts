export type CatalogEventType =
  | 'COURSE_CREATED'
  | 'COURSE_UPDATED'
  | 'COURSE_RETIRED'
  | 'CURRICULUM_PUBLISHED';

export interface CatalogWebhookPayload {
  event_id: string;
  event_type: CatalogEventType;
  course_id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  lecture_hours: number;
  lab_hours: number;
  contact_hours_per_week: number;
  requires_laboratory: boolean;
  status: 'ACTIVE' | 'REVISED' | 'RETIRED';
  effective_term: string;
  timestamp: string;
  digest_signature: string;
}

export interface CatalogWebhookLog {
  id: string;
  event_id: string;
  event_type: CatalogEventType;
  target_url: string;
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: string | null;
  status: 'DELIVERED' | 'RETRY_1M' | 'RETRY_5M' | 'RETRY_15M' | 'FAILED_EXHAUSTED';
  http_status?: number;
  payload: CatalogWebhookPayload;
  created_at: string;
  updated_at: string;
}
