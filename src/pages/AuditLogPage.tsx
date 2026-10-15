import React from 'react';
import { History, Search, ShieldCheck } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Immutable Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">Tamper-evident record of all submission actions, review decisions, and system access.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Append-Only Security Enforced</span>
        </div>
      </div>
    </div>
  );
};
