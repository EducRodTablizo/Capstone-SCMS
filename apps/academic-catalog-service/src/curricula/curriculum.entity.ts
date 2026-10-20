export type CurriculumStatus = 'Draft' | 'Active' | 'Superseded';

export interface Curriculum {
  id: string;
  program_id: string;
  curriculum_code: string;
  name: string;
  effective_start_term: string;
  description?: string;
  status: CurriculumStatus;
  courses?: CurriculumCourseItem[];
  created_at: Date;
  updated_at: Date;
}

export interface CurriculumCourseItem {
  id: string;
  curriculum_id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  credit_units: number;
  contact_hours: number;
  year_level: number;
  semester: number;
  is_major: boolean;
}

export interface CreateCurriculumDto {
  program_id: string;
  curriculum_code: string;
  name: string;
  effective_start_term: string;
  description?: string;
  status?: CurriculumStatus;
}

export interface AddCurriculumCourseDto {
  course_id: string;
  year_level: number;
  semester: number;
  is_major?: boolean;
}
