export interface BlockSection {
  id: string;
  program_id: string;
  cohort_admission_year: number;
  year_level: number;
  section_number: number;
  display_label: string;
  status: 'Active' | 'Dissolved' | 'Merged';
  merged_into_section_id?: string;
  created_at: string;
  updated_at: string;
}

const API_BASE = 'http://localhost:3006/api/v1/block-sections';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('scms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const blockSectionService = {
  async getSections(programId?: string, status?: string): Promise<BlockSection[]> {
    try {
      const url = new URL(API_BASE);
      if (programId) url.searchParams.append('program_id', programId);
      if (status) url.searchParams.append('status', status);

      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [
        {
          id: 'daaaaaaa-1111-1111-1111-111111111111',
          program_id: '11111111-1111-1111-1111-111111111111',
          cohort_admission_year: 2023,
          year_level: 4,
          section_number: 1,
          display_label: 'BSIT 4-1',
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }
  },

  async createSection(data: Partial<BlockSection>): Promise<BlockSection> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  },

  async updateStatus(id: string, status: 'Active' | 'Dissolved' | 'Merged', mergedIntoSectionId?: string): Promise<BlockSection> {
    const res = await fetch(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, merged_into_section_id: mergedIntoSectionId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  },
};
