import React, { useState } from 'react';
import { History, Search, ShieldCheck, Filter, Clock, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface UIAuditLog {
  id: string;
  actionType: string;
  actorName: string;
  actorRole: string;
  entityName: string;
  entityId: string;
  previousValue: string;
  newValue: string;
  timestamp: string;
  clientIp: string;
}

const SAMPLE_LOGS: UIAuditLog[] = [
  {
    id: 'aud-101',
    actionType: 'DEADLINE_CHANGED',
    actorName: 'Dr. Maria Ramos',
    actorRole: 'ACADEMIC_HEAD',
    entityName: 'REQUIREMENT',
    entityId: 'req-bsit-01',
    previousValue: 'Deadline: 2026-10-15',
    newValue: 'Deadline: 2026-10-31',
    timestamp: '2026-10-15T08:30:15Z',
    clientIp: '192.168.1.10',
  },
  {
    id: 'aud-102',
    actionType: 'REQUIREMENT_PUBLISHED',
    actorName: 'Dr. Maria Ramos',
    actorRole: 'ACADEMIC_HEAD',
    entityName: 'REQUIREMENT',
    entityId: 'req-bsit-01',
    previousValue: 'Status: DRAFT',
    newValue: 'Status: PUBLISHED',
    timestamp: '2026-10-15T08:25:00Z',
    clientIp: '192.168.1.10',
  },
  {
    id: 'aud-103',
    actionType: 'REQUIREMENT_CREATED',
    actorName: 'Dr. Maria Ramos',
    actorRole: 'ACADEMIC_HEAD',
    entityName: 'REQUIREMENT',
    entityId: 'req-bsit-01',
    previousValue: 'null',
    newValue: 'OBE Course Syllabus Submission (BSIT)',
    timestamp: '2026-10-15T08:15:00Z',
    clientIp: '192.168.1.10',
  },
  {
    id: 'aud-104',
    actionType: 'LOGIN_SUCCESS',
    actorName: 'Prof. Juan Santos',
    actorRole: 'FACULTY_STAFF',
    entityName: 'SESSION',
    entityId: 'sess-8823',
    previousValue: 'null',
    newValue: 'JWT HttpOnly session issued',
    timestamp: '2026-10-15T08:00:22Z',
    clientIp: '192.168.1.55',
  },
];

export const AuditLogPage: React.FC = () => {
  const { user } = useAuth();
  const isAcademicHead = user?.role === 'ACADEMIC_HEAD';
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = SAMPLE_LOGS.filter(log => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.newValue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || log.actionType === actionFilter;
    return matchesSearch && matchesAction;
  });

  if (!isAcademicHead) {
    return (
      <div className="bg-white p-8 rounded-lg border border-red-200 text-center max-w-lg mx-auto shadow-sm my-12">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h2 className="text-xl font-serif font-bold text-slate-900">Access Restricted (SCMS-002 AC 3)</h2>
        <p className="text-sm text-slate-600 mt-2">
          The system audit trail is strictly reserved for the Academic Head for governance and institutional compliance inspection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-serif font-bold text-slate-900">Immutable Audit Trail</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              SCMS-014 Append-Only
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident record of requirement creations, deadline changes, submissions, and review decisions.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>DB-Level Immutability Enforced</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by actor or action..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#580000]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-[#580000]"
          >
            <option value="ALL">All Logged Actions</option>
            <option value="DEADLINE_CHANGED">Deadline Changed</option>
            <option value="REQUIREMENT_PUBLISHED">Requirement Published</option>
            <option value="REQUIREMENT_CREATED">Requirement Created</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#580000] text-white font-semibold">
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Acting User</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Previous Value</th>
                <th className="p-3">New Value</th>
                <th className="p-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {log.actionType}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-900">
                    <div>{log.actorName}</div>
                    <div className="text-[10px] text-slate-500">{log.actorRole}</div>
                  </td>
                  <td className="p-3 text-slate-600 font-mono">{log.entityName}</td>
                  <td className="p-3 text-slate-500 italic max-w-xs truncate">{log.previousValue}</td>
                  <td className="p-3 font-semibold text-slate-800 max-w-xs truncate">{log.newValue}</td>
                  <td className="p-3 font-mono text-slate-500">{log.clientIp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
