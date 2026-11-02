import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  CheckCircle2,
  FileText,
  Filter,
  RefreshCw,
  ExternalLink,
  Calendar,
  Search,
  BookOpen,
} from 'lucide-react';
import { StatusBadge, ComplianceStatus } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { complianceService, ComplianceMetricsData } from '../services/complianceService';
import { Program } from '../services/programService';
import { AcademicTerm } from '../services/calendarService';

export interface LiveSubmissionRecord {
  id: string;
  fms_message_id?: string | null;
  assignment_id?: string | null;
  assignment_version?: number;
  requirement_id: string;
  academic_term_id?: string | null;
  course_id?: string | null;
  block_section_id?: string | null;
  faculty_id: string;
  substitute_id?: string | null;
  course_code: string;
  section_label: string;
  status: string;
  schedule?: {
    schedule_day_time?: string;
    room_id?: string;
    room_label?: string;
  } | null;
  file_id?: string | null;
  file_name?: string | null;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

import { truncateUuid } from '../utils/formatters';
export { truncateUuid };

export const isSubmissionOwnedByFaculty = (
  sub: LiveSubmissionRecord,
  userId?: string | null
): boolean => {
  if (!userId) return false;
  const fid = sub.faculty_id;
  if (fid === userId) return true;
  if (
    userId === '22222222-2222-2222-2222-222222222222' ||
    userId === 'fac-prof-delacruz' ||
    userId === 'fac-prof-donayre' ||
    userId === 'FMS-PUPQC-0492'
  ) {
    return (
      fid === 'fac-prof-delacruz' ||
      fid === 'fac-prof-donayre' ||
      fid === '22222222-2222-2222-2222-222222222222' ||
      fid === 'FMS-PUPQC-0492'
    );
  }
  return false;
};

export const LiveCompliancePage: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAcademicHead = role === 'ACADEMIC_HEAD';

  const [selectedTerm, setSelectedTerm] = useState<string>('ALL');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [submissions, setSubmissions] = useState<LiveSubmissionRecord[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetricsData | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const toBadgeStatus = (statusStr: string): ComplianceStatus => {
    const formatted = statusStr.toLowerCase().replace(/\s+/g, '_');
    const valid = [
      'not_submitted',
      'submitted',
      'under_review',
      'returned',
      'resubmitted',
      'approved',
      'overdue',
      'unassigned',
    ];
    return valid.includes(formatted) ? (formatted as ComplianceStatus) : 'submitted';
  };

  const loadComplianceData = useCallback(async () => {
    try {
      setLoading(true);
      const [subRes, progRes, termRes, metricsRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; count: number; data: LiveSubmissionRecord[] }>(
          '/submissions',
          {
            params: !isAcademicHead && user?.id ? { faculty_id: user.id } : undefined,
          }
        ),
        apiClient.get<{ data: Program[] }>('/programs'),
        apiClient.get<{ data: AcademicTerm[] }>('/terms'),
        apiClient.get<{ data: ComplianceMetricsData }>('/compliance/metrics'),
      ]);

      if (subRes.status === 'fulfilled') {
        const response = subRes.value;
        const rawList = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? (response as unknown as LiveSubmissionRecord[])
            : [];
        const scopedList = isAcademicHead
          ? rawList
          : rawList.filter((sub) => isSubmissionOwnedByFaculty(sub, user?.id));
        setSubmissions(scopedList);
      }

      if (progRes.status === 'fulfilled' && Array.isArray(progRes.value?.data)) {
        setPrograms(progRes.value.data);
      }

      if (termRes.status === 'fulfilled' && Array.isArray(termRes.value?.data)) {
        setTerms(termRes.value.data);
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.data) {
        setMetrics(metricsRes.value.data);
      }

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load live compliance data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAcademicHead, user?.id]);

  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  useEffect(() => {
    const unsubscribe = complianceService.subscribeToComplianceUpdates((event) => {
      if (event.type === 'STATUS_UPDATED' || event.type === 'METRICS_REFRESHED') {
        loadComplianceData();
      }
    });
    return () => unsubscribe();
  }, [loadComplianceData]);

  const handleExportCsv = () => {
    const url = complianceService.getExportCsvUrl(
      selectedTerm === 'ALL' ? undefined : selectedTerm,
      selectedProgram === 'ALL' ? undefined : selectedProgram
    );
    window.open(url, '_blank');
    setExportNotice(
      'Compliance Matrix CSV export generated. Event recorded in immutable audit log (SMS-037 AC 3).'
    );
    setTimeout(() => setExportNotice(null), 6000);
  };

  const handleExportPdf = () => {
    const url = complianceService.getExportPdfUrl(
      selectedTerm === 'ALL' ? undefined : selectedTerm,
      selectedProgram === 'ALL' ? undefined : selectedProgram,
      user?.name
    );
    window.open(url, '_blank');
    setExportNotice(
      'Official Compliance Matrix PDF export generated for QA & AACCUP audit. Event recorded in audit log (SMS-037 AC 3).'
    );
    setTimeout(() => setExportNotice(null), 6000);
  };

  const filteredSubmissions = submissions.filter((item) => {
    if (selectedTerm !== 'ALL' && item.academic_term_id && item.academic_term_id !== selectedTerm) {
      return false;
    }
    if (selectedProgram !== 'ALL' && !item.section_label.toUpperCase().includes(selectedProgram)) {
      return false;
    }
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.course_code.toLowerCase().includes(q) ||
        item.section_label.toLowerCase().includes(q) ||
        item.faculty_id.toLowerCase().includes(q) ||
        (item.file_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    approved: submissions.filter((s) => s.status === 'Approved').length,
    under_review: submissions.filter((s) => s.status === 'Under Review').length,
    submitted: submissions.filter((s) => s.status === 'Submitted').length,
    resubmitted: submissions.filter((s) => s.status === 'Resubmitted').length,
    returned: submissions.filter((s) => s.status === 'Returned').length,
    not_submitted: submissions.filter((s) => s.status === 'Not Submitted').length,
    overdue: submissions.filter((s) => s.status === 'Overdue').length,
    unassigned: submissions.filter((s) => s.status === 'Unassigned').length,
  };

  const totalCount = submissions.length;
  const activeSubmittedCount =
    counts.submitted + counts.under_review + counts.returned + counts.resubmitted + counts.approved;
  const complianceRate =
    totalCount > 0
      ? parseFloat(((counts.approved / totalCount) * 100).toFixed(1))
      : isAcademicHead
        ? metrics?.compliance_rate ?? 0
        : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* User Welcome Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-serif font-bold text-[#580000]">
              {isAcademicHead ? 'Live Compliance Monitoring View' : 'My Compliance Status'}
            </h1>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isAcademicHead ? 'bg-[#580000] text-white' : 'bg-[#C8960C] text-slate-950'
              }`}
            >
              {isAcademicHead ? 'Academic Head' : 'Faculty Staff'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {user?.college || 'Polytechnic University of the Philippines — Quezon City Campus'} •{' '}
            {user?.unit || 'Academic Affairs'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Sync Active (PostgreSQL sms_submissions)</span>
          </div>
          <button
            onClick={() => loadComplianceData()}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Manual Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metric Cards: 8 Canonical Statuses (SMS-012 AC 1 & AC 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Approved
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.approved}</p>
          <span className="text-[10px] text-slate-400">Complied</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
            Under Review
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{counts.under_review}</p>
          <span className="text-[10px] text-slate-400">In Evaluation</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
            Submitted
          </span>
          <p className="text-2xl font-bold text-blue-700 mt-1">{counts.submitted}</p>
          <span className="text-[10px] text-slate-400">Initial Draft</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-sm">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
            Resubmitted
          </span>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{counts.resubmitted}</p>
          <span className="text-[10px] text-slate-400">Revision Loop</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
            Returned
          </span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{counts.returned}</p>
          <span className="text-[10px] text-slate-400">Needs Changes</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            NOT SUBMITTED
          </span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{counts.not_submitted}</p>
          <span className="text-[10px] text-slate-400">Awaiting Syllabus</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-red-300 shadow-sm bg-red-50/20">
          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
            Overdue
          </span>
          <p className="text-2xl font-bold text-red-700 mt-1">{counts.overdue}</p>
          <span className="text-[10px] text-red-500 font-semibold">Past Due</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
            Unassigned
          </span>
          <p className="text-2xl font-bold text-purple-700 mt-1">{counts.unassigned}</p>
          <span className="text-[10px] text-slate-400">No Instructor</span>
        </div>
      </div>

      {/* Compliance Rate & Executive Stats Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {isAcademicHead ? 'Official Campus Compliance Performance' : 'My Compliance Status'}
          </span>
          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-bold text-[#580000]">{complianceRate}%</span>
            <span className="text-xs text-slate-600 font-medium">
              Approved Syllabi Compliance Rate ({counts.approved} of {totalCount} sections)
            </span>
          </div>
          <div className="w-full md:w-80 h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#580000] rounded-full transition-all duration-500"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Total Tracked
            </span>
            <span className="text-base font-bold text-slate-900">{totalCount} Syllabi</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Total Submitted
            </span>
            <span className="text-base font-bold text-slate-900">{activeSubmittedCount} Active</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Last Synced
            </span>
            <span className="text-base font-bold text-slate-900">{lastSyncTime}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
            >
              <option value="ALL">All Academic Terms</option>
              {terms.map((t) => (
                <option key={t.term_code} value={t.term_code}>
                  {t.academic_year} {t.semester || t.semester_label || ''} ({t.term_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
            >
              <option value="ALL">All Academic Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} - {p.title}
                </option>
              ))}
            </select>
          </div>

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

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search course, section, or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#580000]"
          />
        </div>
      </div>

      {/* Live Submissions Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-sans font-bold text-base text-slate-900">
              {isAcademicHead
                ? `Campus Compliance Roster (${filteredSubmissions.length} Sections)`
                : `My Assigned Course Sections (${filteredSubmissions.length} Sections)`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fetched directly from PostgreSQL <code>/api/v1/submissions</code>.
            </p>
          </div>

          {isAcademicHead && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#580000] text-white hover:bg-[#400000] shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#C8960C]" />
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>

        {exportNotice && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportNotice}</span>
            </div>
            <button
              onClick={() => setExportNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#580000] text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3 text-white">Course Code</th>
                <th className="px-4 py-3 text-white">Section</th>
                <th className="px-4 py-3 text-white">Assigned Faculty</th>
                <th className="px-4 py-3 text-white">Syllabus Document</th>
                <th className="px-4 py-3 text-white">Status</th>
                <th className="px-4 py-3 text-white">Last Submission</th>
                <th className="px-4 py-3 text-right text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading live submissions from database...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No submission records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{sub.course_code}</span>
                      <span className="text-[10px] font-mono text-slate-400" title={sub.id}>
                        {truncateUuid(sub.id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{sub.section_label}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">{sub.faculty_id}</td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {sub.file_name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={toBadgeStatus(sub.status)} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'None'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {!isAcademicHead && (
                        <Button
                          onClick={() => navigate('/submit')}
                          variant="outline"
                          className="text-xs px-2.5 py-1"
                        >
                          Upload / Revise
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/submissions/${sub.id}/review`)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-[#580000] text-white hover:bg-[#430000] transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Inspect / Review</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveCompliancePage;
