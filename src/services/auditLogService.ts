import { apiClient } from './apiClient';

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  actorRole: string;
  actionType: string;
  action?: string;
  entityName: string;
  entityId: string;
  previousValue?: Record<string, any> | string | null;
  oldValue?: Record<string, any> | string | null;
  newValue?: Record<string, any> | string | null;
  details?: Record<string, any> | string | null;
  clientIp: string;
  previous_hash?: string;
  current_hash?: string;
  createdAt: string;
}

export const auditLogService = {
  async getLogs(params?: {
    actorId?: string;
    actorEmail?: string;
    actionType?: string;
    entityName?: string;
  }) {
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
