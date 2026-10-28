import { apiClient } from './apiClient';

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  entityName: string;
  entityId: string;
  previousValue?: string | null;
  newValue?: string | null;
  details?: string | null;
  clientIp: string;
  previous_hash?: string;
  current_hash?: string;
  createdAt: string;
}

export const auditLogService = {
  async getLogs(params?: { actorId?: string; actionType?: string; entityName?: string }) {
    try {
      return await apiClient.get('/audit-logs', { params });
    } catch {
      return { success: true, data: [] };
    }
  },

  async verifyChain(): Promise<{ valid: boolean }> {
    return apiClient.get('/audit-logs/verify');
  }
};
