import React, { useState, useEffect } from 'react';
import { Shield, Lock, Search, Filter } from 'lucide-react';
import { auditLogService, AuditLogItem } from '../services/auditLogService';
import { truncateUuid } from './LiveCompliancePage';

const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditLogService.getLogs({
        actionType: actionFilter || undefined,
      });
      if (res && Array.isArray(res.data)) {
        setLogs(res.data);
      } else if (Array.isArray(res)) {
        setLogs(res);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const actor = String(log.actorEmail || log.actorName || log.actorId || '').toLowerCase();
    const action = String(log.actionType || log.action || '').toLowerCase();
    const entity = String(log.entityName || '').toLowerCase();
    const detailsStr = formatAuditValue(log.details).toLowerCase();
    const newValueStr = formatAuditValue(log.newValue).toLowerCase();

    return (
      actor.includes(q) ||
      action.includes(q) ||
      entity.includes(q) ||
      detailsStr.includes(q) ||
      newValueStr.includes(q)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-serif font-bold text-[#580000]">
              Institutional Audit Ledger
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white uppercase tracking-wider flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              Append-Only (Read-Only)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative, tamper-evident audit trail for PUPQC campus academic operations (ISO 27001 &amp; RA 10173 compliant).
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full w-fit">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>SCMS-015 Immutable Log Viewer</span>
        </div>
      </div>

      {/* Filter Toolbar (SCMS-015 AC 1) */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by actor, action, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#580000]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
          >
            <option value="">All Action Types</option>
            <option value="SYLLABUS_SUBMITTED">SYLLABUS_SUBMITTED</option>
            <option value="SYLLABUS_RESUBMITTED">SYLLABUS_RESUBMITTED</option>
            <option value="SYLLABUS_UNDER_REVIEW">SYLLABUS_UNDER_REVIEW</option>
            <option value="SYLLABUS_APPROVED">SYLLABUS_APPROVED</option>
            <option value="SYLLABUS_RETURNED">SYLLABUS_RETURNED</option>
            <option value="REQUIREMENT_PUBLISHED">REQUIREMENT_PUBLISHED</option>
            <option value="CREATE_TEST">CREATE_TEST</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table (SCMS-015 AC 2: Strictly Read-Only) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Actor &amp; Role</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">New Value / Details</th>
                <th className="px-4 py-3">SHA-256 Chain Hash</th>
                <th className="px-4 py-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading immutable audit ledger...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const actorDisplay = String(
                    log.actorEmail || log.actorName || log.actorId || 'unknown@pup.edu.ph'
                  );
                  const roleDisplay = String(log.actorRole || 'FACULTY_STAFF');
                  const actionDisplay = String(log.actionType || log.action || 'UNKNOWN_ACTION');
                  const truncatedEntityId = log.entityId
                    ? truncateUuid(String(log.entityId))
                    : '';
                  const entityDisplay = `${String(log.entityName || '-')}${
                    truncatedEntityId ? ` (${truncatedEntityId})` : ''
                  }`;
                  const newValueDisplay = log.newValue
                    ? JSON.stringify(log.newValue)
                    : log.details
                      ? typeof log.details === 'object'
                        ? JSON.stringify(log.details)
                        : String(log.details)
                      : log.oldValue || log.previousValue
                        ? JSON.stringify(log.oldValue || log.previousValue)
                        : '-';
                  const hashDisplay = log.current_hash ? String(log.current_hash) : '-';

                  return (
                    <tr key={log.id || `audit-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{actorDisplay}</p>
                        <span className="text-[10px] text-slate-400 uppercase">{roleDisplay}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          {actionDisplay}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-[11px] text-slate-700"
                        title={
                          log.entityId
                            ? `${log.entityName || '-'} (${log.entityId})`
                            : String(log.entityName || '-')
                        }
                      >
                        {entityDisplay}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-[11px] text-slate-700 max-w-xs truncate"
                        title={newValueDisplay}
                      >
                        {newValueDisplay}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-[11px] text-emerald-700 max-w-[140px] truncate"
                        title={hashDisplay}
                      >
                        {hashDisplay !== '-' ? `${hashDisplay.slice(0, 8)}...${hashDisplay.slice(-4)}` : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {String(log.clientIp || '127.0.0.1')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
