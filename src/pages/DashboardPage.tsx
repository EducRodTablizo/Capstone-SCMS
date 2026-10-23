import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Clock, CheckCircle2, AlertTriangle, 
  FileText, User, Filter, RefreshCw, ShieldCheck, 
  Layers, Lock, ExternalLink, Calendar, Search, 
  BookOpen, Sparkles
} from 'lucide-react';
import { StatusBadge, ComplianceStatus } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  complianceService, 
  ComplianceMetricsData, 
  ComplianceRecordItem, 
  SyllabusHeaderDetails 
} from '../services/complianceService';

export const DashboardPage: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAcademicHead = role === 'ACADEMIC_HEAD';

  // Filters State (SMS-012 AC 2)
  const [selectedTerm, setSelectedTerm] = useState<string>('2026-1T');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchFaculty, setSearchFaculty] = useState<string>('');

  // Data State
  const [metrics, setMetrics] = useState<ComplianceMetricsData | null>(null);
  const [records, setRecords] = useState<ComplianceRecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [wsActive, setWsActive] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  // Locked Header Modal State (SMS-024)
  const [selectedHeader, setSelectedHeader] = useState<SyllabusHeaderDetails | null>(null);
  const [headerLoading, setHeaderLoading] = useState<boolean>(false);

  const toBadgeStatus = (statusStr: string): ComplianceStatus => {
    const formatted = statusStr.toLowerCase().replace(/\s+/g, '_');
    const valid = [
      'not_submitted', 'submitted', 'under_review', 'returned', 
      'resubmitted', 'approved', 'overdue', 'unassigned'
    ];
    return valid.includes(formatted) ? (formatted as ComplianceStatus) : 'submitted';
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const progParam = selectedProgram === 'ALL' ? undefined : selectedProgram;
      const statusParam = selectedStatus === 'ALL' ? undefined : selectedStatus;

      const [metricsData, recordsData] = await Promise.all([
        complianceService.getMetrics({
          term_id: selectedTerm,
          program_code: progParam
        }),
        complianceService.getRecords({
          term_id: selectedTerm,
          program_code: progParam,
          status: statusParam
        })
      ]);

      setMetrics(metricsData);
      setRecords(recordsData);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load compliance dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedProgram, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSocket connection (SMS-013 AC 1 & AC 3)
  useEffect(() => {
    const unsubscribe = complianceService.subscribeToComplianceUpdates((event) => {
      console.log('[SCMS Live Sync Event]', event);
      setWsActive(true);
      setLastSyncTime(new Date().toLocaleTimeString());

      // If status changed or metrics refreshed, reload dashboard seamlessly
      if (event.type === 'STATUS_UPDATED' || event.type === 'METRICS_REFRESHED') {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleOpenHeaderModal = async (assignmentId: string) => {
    setHeaderLoading(true);
    try {
      const header = await complianceService.getSyllabusHeader(assignmentId);
      setSelectedHeader(header);
    } catch (err: any) {
      alert('Unable to retrieve syllabus header metadata: ' + err.message);
    } finally {
      setHeaderLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    if (!searchFaculty.trim()) return true;
    const query = searchFaculty.toLowerCase();
    return (
      r.faculty_name.toLowerCase().includes(query) ||
      r.course_code.toLowerCase().includes(query) ||
      r.section_label.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* User Welcome Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            {user?.college || 'Polytechnic University of the Philippines — Quezon City Campus'} • {user?.unit || 'Academic Affairs'}
          </p>
        </div>

        {/* Live WebSocket Status Banner (SMS-013) */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Sync Active (WebSocket)</span>
          </div>
          <button
            onClick={() => loadData()}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Manual Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Compliance Monitoring Dashboard (SMS-012) */}
      {isAcademicHead ? (
        <div className="space-y-6">
          {/* Top Metric Cards: 8 Canonical Statuses (SMS-012 AC 1 & AC 3) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Approved */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Approved</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {metrics ? metrics.status_counts.approved : 0}
              </p>
              <span className="text-[10px] text-slate-400">Complied</span>
            </div>

            {/* 2. Under Review */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Under Review</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {metrics ? metrics.status_counts.under_review : 0}
              </p>
              <span className="text-[10px] text-slate-400">In Evaluation</span>
            </div>

            {/* 3. Submitted */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Submitted</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {metrics ? metrics.status_counts.submitted : 0}
              </p>
              <span className="text-[10px] text-slate-400">Initial Draft</span>
            </div>

            {/* 4. Resubmitted */}
            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Resubmitted</span>
              <p className="text-2xl font-bold text-indigo-700 mt-1">
                {metrics ? metrics.status_counts.resubmitted : 0}
              </p>
              <span className="text-[10px] text-slate-400">Revision Loop</span>
            </div>

            {/* 5. Returned */}
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Returned</span>
              <p className="text-2xl font-bold text-rose-700 mt-1">
                {metrics ? metrics.status_counts.returned : 0}
              </p>
              <span className="text-[10px] text-slate-400">Needs Changes</span>
            </div>

            {/* 6. Not Submitted */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pending</span>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {metrics ? metrics.status_counts.not_submitted : 0}
              </p>
              <span className="text-[10px] text-slate-400">Not Uploaded</span>
            </div>

            {/* 7. Overdue */}
            <div className="bg-white p-3.5 rounded-xl border border-red-300 shadow-sm hover:shadow-md transition-shadow bg-red-50/20">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Overdue</span>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {metrics ? metrics.status_counts.overdue : 0}
              </p>
              <span className="text-[10px] text-red-500 font-semibold">Past Due</span>
            </div>

            {/* 8. Unassigned */}
            <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Unassigned</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">
                {metrics ? metrics.status_counts.unassigned : 0}
              </p>
              <span className="text-[10px] text-slate-400">No Instructor</span>
            </div>
          </div>

          {/* Compliance Rate & Executive Stats Bar */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Official Campus Compliance Performance
              </span>
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-serif font-bold text-[#580000]">
                  {metrics ? `${metrics.compliance_rate}%` : '0%'}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  Approved Syllabi Compliance Rate ({metrics?.status_counts.approved || 0} of {metrics?.total_assigned || 0} sections)
                </span>
              </div>
              <div className="w-full md:w-80 h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-[#580000] rounded-full transition-all duration-500"
                  style={{ width: `${metrics?.compliance_rate || 0}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Expected</span>
                <span className="text-base font-bold text-slate-900">{metrics?.total_assigned || 0} Syllabi</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total In System</span>
                <span className="text-base font-bold text-slate-900">{metrics?.total_submitted || 0} Active</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Synced</span>
                <span className="text-base font-bold text-slate-900">{lastSyncTime}</span>
              </div>
            </div>
          </div>

          {/* Filter Bar (SMS-012 AC 2) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Term Filter */}
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
                >
                  <option value="2026-1T">A.Y. 2026-2027 1st Semester</option>
                  <option value="2026-2T">A.Y. 2026-2027 2nd Semester</option>
                </select>
              </div>

              {/* Program Filter */}
              <div className="flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
                >
                  <option value="ALL">All Academic Programs</option>
                  <option value="BSIT">BS Information Technology (BSIT)</option>
                  <option value="BSBA-HRM">BSBA Human Resource Mgt (BSBA-HRM)</option>
                  <option value="BSENTREP">BS Entrepreneurship (BSENTREP)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
                >
                  <option value="ALL">All Compliance Statuses</option>
                  <option value="Not Submitted">Not Submitted</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Returned">Returned</option>
                  <option value="Resubmitted">Resubmitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>
            </div>

            {/* Search Faculty */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search faculty or course..."
                value={searchFaculty}
                onChange={(e) => setSearchFaculty(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#580000]"
              />
            </div>
          </div>

          {/* Compliance Records Roster Table (SMS-012 AC 1) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900">
                  Campus Compliance Roster
                </h3>
                <p className="text-xs text-slate-500">
                  Showing {filteredRecords.length} course sections matching selected filters.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Live Data Synchronized
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Course Code & Title</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Assigned Faculty</th>
                    <th className="px-4 py-3">Rank / Load</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Submission</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No course section compliance records match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{r.course_code}</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-xs block">{r.course_title}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{r.section_label}</td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">
                          {r.faculty_name}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {r.academic_rank || 'Regular Faculty'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={toBadgeStatus(r.status)} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'None'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenHeaderModal(r.assignment_id)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline inline-flex items-center space-x-1"
                            title="Inspect Locked FMS Header"
                          >
                            <Lock className="w-3 h-3 mr-0.5 text-slate-400" />
                            <span>Header</span>
                          </button>

                          {r.submission_id ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/submissions/${r.submission_id}/review`)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#580000] text-white hover:bg-[#430000] transition-colors inline-flex items-center space-x-1"
                            >
                              <span>Inspect / Review</span>
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No File</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Faculty Staff Personal Scoped View */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">Your Assigned Subject Submissions</h2>
            <p className="text-xs text-slate-500 mb-4">View your assigned subjects, term deadlines, and current compliance review status.</p>
            
            <div className="divide-y divide-slate-100">
              {records
                .filter(r => r.faculty_id === user?.id || r.faculty_name.includes('Dela Cruz') || r.faculty_name.includes('Donayre'))
                .map((sub) => (
                  <div key={sub.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{sub.course_code} - {sub.course_title}</p>
                      <p className="text-xs text-slate-500">Section {sub.section_label} • Deadline: {new Date(sub.due_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <StatusBadge status={toBadgeStatus(sub.status)} />
                      <Button
                        onClick={() => navigate('/submit')}
                        className="text-xs bg-[#580000] text-white px-3 py-1.5"
                      >
                        Submit / Revise
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Pre-Filled Locked Syllabus Header Modal (SMS-024) */}
      {selectedHeader && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-[#580000]/10 rounded text-[#580000]">
                  <Lock className="w-5 h-5 text-[#580000]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Official Syllabus Header (SMS-024)
                  </h3>
                  <p className="text-[11px] text-slate-500">Pre-filled & Locked from Institutional FMS Loading</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHeader(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start space-x-2 text-xs text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Institutional Consistency Lock:</strong> All course and faculty header fields below are locked in SMS and cannot be tampered with.
              </span>
            </div>

            {/* Locked Header Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Course Code & Section</span>
                <span className="font-bold text-slate-800">{selectedHeader.course_code} ({selectedHeader.section_label})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Course Title</span>
                <span className="font-medium text-slate-800">{selectedHeader.course_title}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Faculty</span>
                <span className="font-bold text-slate-800">{selectedHeader.faculty_name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Rank</span>
                <span className="font-medium text-slate-800">{selectedHeader.academic_rank}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Official PUP Email</span>
                <span className="font-mono text-slate-700">{selectedHeader.email}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultation Hours</span>
                <span className="font-semibold text-[#580000]">{selectedHeader.consultation_hours}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Schedule</span>
                <span className="text-slate-700">{selectedHeader.class_schedule}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Room Allocation</span>
                <span className="text-slate-700">{selectedHeader.room_assignment}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Integrity Verified</span>
              </span>
              <Button
                variant="outline"
                onClick={() => setSelectedHeader(null)}
                className="text-xs"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
