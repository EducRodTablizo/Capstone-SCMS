import { apiClient } from './apiClient';

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

export const blockSectionService = {
  async getSections(programId?: string, status?: string): Promise<BlockSection[]> {
    try {
      const json = await apiClient.get<{ data: BlockSection[] }>('/block-sections', {
        params: { program_id: programId, status },
      });
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
    const json = await apiClient.post<{ data: BlockSection }>('/block-sections', data);
    return json.data;
  },

  async updateStatus(id: string, status: 'Active' | 'Dissolved' | 'Merged', mergedIntoSectionId?: string): Promise<BlockSection> {
    const json = await apiClient.patch<{ data: BlockSection }>(`/block-sections/${id}/status`, {
      status,
      merged_into_section_id: mergedIntoSectionId,
    });
    return json.data;
  },
};
