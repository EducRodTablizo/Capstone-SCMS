/**
 * SCMS-002: Exactly Two Roles Allowed in SCMS
 * AC 1: The role is correctly identified on every request; no other role exists.
 */
export type UserRole = 'ACADEMIC_HEAD' | 'FACULTY_STAFF';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  fms_faculty_id?: string;
  college?: string;
  unit?: string;
  is_active: boolean;
  created_at: Date;
}

/**
 * SCMS-003: Faculty Personal Data Whitelist (RA 10173 Data Privacy Act)
 * AC 1: Only the required faculty fields are read, stored, and displayed (name, college, unit).
 */
export interface SafeFacultyProfile {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  college?: string;
  unit?: string;
}
