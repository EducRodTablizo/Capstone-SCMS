export type AuditActionType =
  | 'REQUIREMENT_CREATED'
  | 'REQUIREMENT_UPDATED'
  | 'DEADLINE_CHANGED'
  | 'REQUIREMENT_PUBLISHED'
  | 'REQUIREMENT_CLOSED'
  | 'SYLLABUS_SUBMITTED'
  | 'REVIEW_APPROVED'
  | 'REVIEW_RETURNED'
  | 'SYLLABUS_RESUBMITTED'
  | string; // Extensible for new action types in later sprints (AC 3)

export interface AuditEntry {
  id?: string;
  actorId: string;
  actorName: string;
  actorRole: 'ACADEMIC_HEAD' | 'FACULTY_STAFF' | string;
  actionType: AuditActionType;
  entityName: 'REQUIREMENT' | 'SUBMISSION' | 'REVIEW' | string;
  entityId: string;
  previousValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  details?: Record<string, any> | null;
  clientIp?: string;
  createdAt?: string;
}

export interface AuditLogFilter {
  actorId?: string;
  actionType?: string;
  entityName?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}
