import { apiClient } from './apiClient';

export interface Program {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: 'Active' | 'Phased out';
  created_at: string;
  updated_at: string;
}

export const programService = {
  async getPrograms(statusFilter?: string): Promise<{ data: Program[]; count: number }> {
    try {
      return await apiClient.get<{ data: Program[]; count: number }>('/programs', {
        params: { status: statusFilter },
      });
    } catch (err: any) {
      console.error('Failed to fetch programs:', err);
      throw err;
    }
  },

  async createProgram(data: { code: string; title: string; description?: string; status?: 'Active' | 'Phased out' }): Promise<Program> {
    const json = await apiClient.post<{ data: Program }>('/programs', data);
    return json.data;
  },

  async updateProgram(id: string, data: { title?: string; description?: string; status?: 'Active' | 'Phased out' }): Promise<Program> {
    const json = await apiClient.patch<{ data: Program }>(`/programs/${id}`, data);
    return json.data;
  },
};
