const AUDIT_API_URL = import.meta.env.VITE_AUDIT_API_URL || 'http://localhost:3004/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('scms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  createdAt: string;
}

export const auditLogService = {
  async getLogs(params?: { actorId?: string; actionType?: string; entityName?: string }) {
    try {
      const url = new URL(`${AUDIT_API_URL}/audit/logs`);
      if (params?.actorId) url.searchParams.append('actorId', params.actorId);
      if (params?.actionType) url.searchParams.append('actionType', params.actionType);
      if (params?.entityName) url.searchParams.append('entityName', params.entityName);

      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch {
      return { success: true, data: [] };
    }
  }
};
