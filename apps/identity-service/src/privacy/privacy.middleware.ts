import { User, SafeFacultyProfile } from '../users/user.entity';

/**
 * SCMS-003 Task 1 (AC 1): Limit the faculty fields SCMS reads, stores and displays to those needed
 * (name, college, unit) in strict compliance with the Data Privacy Act (RA 10173).
 * Strips password_hash, internal tokens, and unneeded metadata.
 */
export function filterFacultyPersonalData(user: User): SafeFacultyProfile {
  return {
    id: user.id,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    college: user.college,
    unit: user.unit,
  };
}

/**
 * SCMS-003 Task 2 (AC 2): Restrict a faculty member's documents to that faculty member and the Academic Head.
 * Returns true only if caller is the owner or the single Academic Head.
 */
export function canAccessFacultyDocument(callerId: string, callerRole: string, documentOwnerId: string): boolean {
  if (callerRole === 'ACADEMIC_HEAD') {
    return true; // Academic Head has global oversight
  }
  return callerId === documentOwnerId; // Faculty Staff can only open their own documents
}
