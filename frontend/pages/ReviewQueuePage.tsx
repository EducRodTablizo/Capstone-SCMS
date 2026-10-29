import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  RefreshCw,
  ExternalLink,
  Filter,
  Search,
  FileText,
} from 'lucide-react';
import { StatusBadge, ComplianceStatus } from '../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { LiveSubmissionRecord } from './LiveCompliancePage';

export const ReviewQueuePage: React.FC = () => {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<LiveSubmissionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const fetchReviewQueue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{
        success: boolean;
        count: number;
        data: LiveSubmissionRecord[];
      }>('/submissions');
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? (response as unknown as LiveSubmissionRecord[])
          : [];
      setSubmissions(list);
    } catch (err: any) {
      console.error('Failed to load review queue:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewQueue();
  }, [fetchReviewQueue]);

  const filteredQueue = submissions.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#580000]/10 rounded-lg text-[#580000]">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">
              Academic Head Syllabus Review Queue
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Evaluate, approve, or return faculty syllabus submissions stored in PostgreSQL (
              <code>sms_submissions</code>).
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchReviewQueue()}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
          >
            <option value="ALL">All Submissions ({submissions.length})</option>
            <option value="Submitted">Submitted (Needs Review)</option>
            <option value="Under Review">Under Review</option>
            <option value="Resubmitted">Resubmitted</option>
            <option value="Returned">Returned</option>
            <option value="Approved">Approved</option>
            <option value="Not Submitted">Not Submitted</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by course, section, or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-[#580000]"
          />
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Submission UUID</th>
                <th className="px-4 py-3">Course & Section</th>
                <th className="px-4 py-3">Faculty ID</th>
                <th className="px-4 py-3">Syllabus File</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading submissions from PostgreSQL...
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No submissions found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((submission) => (
                  <tr key={submission.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {submission.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">
                        {submission.course_code}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Section {submission.section_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {submission.faculty_id}
                    </td>
                    <td className="px-4 py-3">
                      {submission.file_name ? (
                        <span className="inline-flex items-center space-x-1 text-slate-800 font-medium">
                          <FileText className="w-3.5 h-3.5 text-[#580000]" />
                          <span>{submission.file_name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No document uploaded</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {submission.submitted_at
                        ? new Date(submission.submitted_at).toLocaleString()
                        : 'Pending'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={toBadgeStatus(submission.status)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/submissions/${submission.id}/review`)}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-[#580000] text-white hover:bg-[#430000] transition-colors inline-flex items-center space-x-1"
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

export default ReviewQueuePage;

