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
  created_at: string;
  updated_at: string;
}

export const courseService = {
  async getCourses(status?: string, search?: string): Promise<Course[]> {
    try {
      const json = await apiClient.get<{ data: Course[] }>('/courses', {
        params: { status, search },
      });
      return json.data || [];
    } catch {
      return [
        {
          id: 'caaaaaaa-1111-1111-1111-111111111111',
          course_code: 'INTE 30103',
          version: 1,
          title: 'Web Systems and Technologies',
          credit_units: 3.0,
          lecture_hours: 2.0,
          lab_hours: 3.0,
          contact_hours: 5.0,
          description: 'Full-stack web application development',
          requires_lab: true,
          lab_type: 'Computer Laboratory',
          special_software: ['VS Code', 'Node.js', 'PostgreSQL', 'Docker'],
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }
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
