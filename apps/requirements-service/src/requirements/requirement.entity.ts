export type RequirementStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface Requirement {
  id: string;
  program_code: string;
  term_code: string;
  requirement_type: string;
  name: string;
  description?: string;
  deadline_at?: Date | null;
  status: RequirementStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRequirementDto {
  program_code: string;
  term_code: string;
  requirement_type?: string;
  name: string;
  description?: string;
  deadline_at?: string | null;
}

export interface UpdateRequirementDto {
  name?: string;
  description?: string;
  deadline_at?: string | null;
  status?: RequirementStatus;
}
