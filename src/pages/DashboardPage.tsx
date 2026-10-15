import React from 'react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../auth/AuthContext';
import { Activity, Clock, CheckCircle2, AlertTriangle, FileText, UserCheck, Shield } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, role } = useAuth();

  const isAcademicHead = role === 'ACADEMIC_HEAD';

  return (
    <div className="space-y-6">
      {/* User Welcome Banner */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-serif font-bold text-slate-900">
              Welcome, {user?.name || (isAcademicHead ? 'Dr. Maria Santos' : 'Faculty Member')}
            </h1>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              isAcademicHead ? 'bg-[#580000] text-white' : 'bg-[#C8960C] text-slate-950'
            }`}>
              {isAcademicHead ? 'Academic Head' : 'Faculty Staff'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {user?.college || 'Polytechnic University of the Philippines — Quezon City Campus'} • {user?.unit || 'Academic Department'}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full w-fit">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
          <span>Real-Time WebSocket Active</span>
        </div>
      </div>

      {/* Role-Scoped Dashboard Content (SCMS-002 AC 2) */}
      {isAcademicHead ? (
        /* Academic Head Global Campus View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Campus Syllabi</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">128</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Approved (Complied)</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">84</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Awaiting Review</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">26</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Overdue</p>
                <p className="text-2xl font-bold text-red-700 mt-1">6</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Faculty Staff Personal Scoped View */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">Your Assigned Subject Submissions</h2>
            <p className="text-xs text-slate-500 mb-4">View your assigned subjects, term deadlines, and current compliance review status.</p>
            
            <div className="divide-y divide-slate-100">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">IT 101 - Web Development Technologies</p>
                  <p className="text-xs text-slate-500">BSIT 2nd Year • Deadline: Nov 15, 2026</p>
                </div>
                <StatusBadge status="Under Review" />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">IT 204 - Database Management Systems</p>
                  <p className="text-xs text-slate-500">BSIT 2nd Year • Deadline: Nov 15, 2026</p>
                </div>
                <StatusBadge status="Approved" />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">CS 302 - Software Engineering</p>
                  <p className="text-xs text-slate-500">BSIT 3rd Year • Deadline: Nov 15, 2026</p>
                </div>
                <StatusBadge status="Returned" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
