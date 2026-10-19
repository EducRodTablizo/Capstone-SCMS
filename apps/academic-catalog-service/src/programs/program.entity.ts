export type ProgramStatus = 'Active' | 'Phased out';

export interface Program {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: ProgramStatus;
  created_at: string;
  updated_at: string;
}
