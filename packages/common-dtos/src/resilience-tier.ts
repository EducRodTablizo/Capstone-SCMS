export type ResilienceCacheState =
  | 'WARM_CACHE'
  | 'EXPIRED_STALE'
  | 'SYNTHETIC_FIXTURE'
  | 'MISSING_FIELD_DEFAULT';

export interface ResilientFacultyProfile {
  faculty_id: string;
  display_name: string;
  institutional_email: string;
  academic_rank: string;
  department: string;
  consultation_hours: string;
  cache_state: ResilienceCacheState;
  cached_at: string;
  expires_at: string;
  advisory_notice?: string;
}

export interface ResilientCalendarSnapshot {
  term_code: string;
  academic_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  submission_deadline: string;
  holidays: Array<{ name: string; date: string }>;
  weather_suspensions: Array<{ date: string; reason: string }>;
  cache_state: ResilienceCacheState;
  synced_at: string;
  advisory_notice?: string;
}

export interface HealthCheckResponse {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  port: number;
  timestamp: string;
  dependencies: {
    postgres: 'CONNECTED' | 'DISCONNECTED';
    fms_connection: 'CONNECTED' | 'OFFLINE_FALLBACK';
    ccms_connection: 'CONNECTED' | 'OFFLINE_FALLBACK';
  };
  resilience: {
    fms_cache_tier: ResilienceCacheState;
    ccms_cache_tier: ResilienceCacheState;
    outbound_retry_queue_length: number;
    last_sync_timestamp: string;
  };
}
