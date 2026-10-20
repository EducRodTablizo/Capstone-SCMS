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

const API_BASE = 'http://localhost:3006/api/v1/courses';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('scms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const courseService = {
  async getCourses(status?: string, search?: string): Promise<Course[]> {
    try {
      const url = new URL(API_BASE);
      if (status) url.searchParams.append('status', status);
      if (search) url.searchParams.append('search', search);

      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
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
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  },

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  },

  async createVersion(id: string): Promise<Course> {
    const res = await fetch(`${API_BASE}/${id}/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  },
};
