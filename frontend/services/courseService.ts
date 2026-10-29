import { apiClient } from './apiClient';

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
  requires_lab: boolean;
  lab_type?: string;
  special_software?: string[];
  status: 'Draft' | 'Active' | 'Revised' | 'Retired';
  replaced_by_course_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const courseService = {
  async getCourses(status?: string, search?: string): Promise<Course[]> {
    const json = await apiClient.get<{ data: Course[] }>('/courses', {
      params: { status, search },
    });
    return json.data || [];
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    const json = await apiClient.post<{ data: Course }>('/courses', data);
    return json.data;
  },

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const json = await apiClient.patch<{ data: Course }>(`/courses/${id}`, data);
    return json.data;
  },

  async createVersion(id: string): Promise<Course> {
    const json = await apiClient.post<{ data: Course }>(`/courses/${id}/version`);
    return json.data;
  },
};
