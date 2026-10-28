export type BlockSectionStatus = 'Active' | 'Dissolved' | 'Merged';

export interface BlockSection {
  id: string;
  program_id: string;
  cohort_admission_year: number;
  year_level: number;
  section_number: number;
  display_label: string;
  status: BlockSectionStatus;
  merged_into_section_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBlockSectionDto {
  program_id: string;
  cohort_admission_year: number;
  year_level: number;
  section_number: number;
  display_label: string;
  status?: BlockSectionStatus;
}

export interface UpdateBlockSectionStatusDto {
  status: BlockSectionStatus;
  merged_into_section_id?: string;
}
