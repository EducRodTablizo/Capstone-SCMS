export type CourseStatus = 'Draft' | 'Active' | 'Revised' | 'Retired';

export interface Course {
  id: string;
  course_code: string;
  version: number;
  title: string;
  credit_units: number;
  lecture_hours: number;
  lab_hours: number;
  contact_hours: number;
  description?: string;
  prerequisites?: string[];
  co_requisites?: string[];
  requires_lab: boolean;
  lab_type?: string;
  special_software?: string[];
  status: CourseStatus;
  root_course_id?: string;
  replacement_course_id?: string;
  effective_end_term?: string;
  is_assignable?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCourseDto {
  course_code: string;
  title: string;
  credit_units?: number;
  lecture_hours?: number;
  lab_hours?: number;
  description?: string;
  prerequisites?: string[];
  co_requisites?: string[];
  requires_lab?: boolean;
  lab_type?: string;
  special_software?: string[];
  status?: CourseStatus;
}

export interface UpdateCourseDto {
  title?: string;
  credit_units?: number;
  lecture_hours?: number;
  lab_hours?: number;
  description?: string;
  prerequisites?: string[];
  co_requisites?: string[];
  requires_lab?: boolean;
  lab_type?: string;
  special_software?: string[];
  status?: CourseStatus;
  replacement_course_id?: string;
  effective_end_term?: string;
}
