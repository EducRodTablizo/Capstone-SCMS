export type RequirementStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface Program {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface TermCalendar {
  id: string;
  academicYear: string;
  semester: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Requirement {
  id: string;
  programId: string;
  programCode: string;
  programName: string;
  termCalendarId: string;
  termName: string;
  requirementType: string;
  name: string;
  description: string;
  deadlineAt: string | null;
  status: RequirementStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequirementDto {
  programId: string;
  termCalendarId: string;
  requirementType?: string;
  name: string;
  description: string;
  deadlineAt?: string | null;
}

export interface UpdateDraftRequirementDto {
  name?: string;
  description?: string;
  deadlineAt?: string | null;
  requirementType?: string;
}

export interface UserContext {
  id: string;
  name: string;
  role: 'ACADEMIC_HEAD' | 'FACULTY_STAFF';
  college?: string;
  unit?: string;
  ip?: string;
}
