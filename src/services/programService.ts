export interface Program {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: 'Active' | 'Phased out';
  created_at: string;
  updated_at: string;
}

const API_BASE = 'http://localhost:3006/api/v1/programs';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('scms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const programService = {
  async getPrograms(statusFilter?: string): Promise<{ data: Program[]; count: number }> {
    try {
      const url = statusFilter ? `${API_BASE}?status=${statusFilter}` : API_BASE;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status} error`);
      }

      return await res.json();
    } catch (err: any) {
      console.error('Failed to fetch programs:', err);
      throw err;
    }
  },

  async createProgram(data: { code: string; title: string; description?: string; status?: 'Active' | 'Phased out' }): Promise<Program> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `Failed to create program (HTTP ${res.status})`);
    }

    return json.data;
  },

  async updateProgram(id: string, data: { title?: string; description?: string; status?: 'Active' | 'Phased out' }): Promise<Program> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `Failed to update program (HTTP ${res.status})`);
    }

    return json.data;
  },
};
