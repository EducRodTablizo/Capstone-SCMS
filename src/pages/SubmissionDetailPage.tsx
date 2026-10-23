import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, RotateCcw, FileText, Download, 
  History, AlertCircle, MessageSquare, ShieldAlert, 
  Calendar, User, Layers, FileCheck, ExternalLink, Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { StatusBadge, ComplianceStatus } from '../components/ui/StatusBadge';
import { useAuth } from '../auth/AuthContext';
import { 
  submissionService, 
  SubmissionItem, 
  ReviewDecisionItem, 
  SubmissionVersionItem 
} from '../services/submissionService';

export const SubmissionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [reviews, setReviews] = useState<ReviewDecisionItem[]>([]);
  const [versions, setVersions] = useState<SubmissionVersionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review Dialog State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Returned'>('Approved');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [commentError, setCommentError] = useState<string | null>(null);

  // Resubmission State
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [isResubmitExpanded, setIsResubmitExpanded] = useState<boolean>(false);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (SCMS-008 AC 2)

  const toBadgeStatus = (statusStr: string): ComplianceStatus => {
    const formatted = statusStr.toLowerCase().replace(/\s+/g, '_');
    const valid = [
      'not_submitted', 'submitted', 'under_review', 'returned', 
      'resubmitted', 'approved', 'overdue', 'unassigned'
    ];
    return valid.includes(formatted) ? (formatted as ComplianceStatus) : 'submitted';
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await submissionService.getSubmissionById(id);
      if (res.data) {
        setSubmission(res.data);
        setReviews(res.reviews || []);
        setVersions(res.versions || []);

        // Auto-transition: If Academic Head opens a 'Submitted' or 'Resubmitted' item,
        // move to 'Under Review' (SCMS-010 AC 1)
        if (user?.role === 'ACADEMIC_HEAD') {
          if (res.data.status === 'Submitted' || res.data.status === 'Resubmitted') {
            try {
              const updatedRes = await submissionService.openForReview(id, {
                reviewerId: user?.id || 'reviewer_01',
                reviewerName: user?.name || 'Department Chair'
              });
              if (updatedRes.data) {
                setSubmission(updatedRes.data);
              }
            } catch (err: any) {
              console.warn('Auto-transition to Under Review notice:', err.message);
            }
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch submission details.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Review Decision Submission (SCMS-010 AC 2 & AC 3)
  const handleOpenReviewModal = (decision: 'Approved' | 'Returned') => {
    setReviewDecision(decision);
    setReviewComment(decision === 'Approved' ? 'Complied with university syllabus guidelines and course learning outcomes.' : '');
    setCommentError(null);
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!id || !submission) return;

    // SCMS-010 AC 3: Returned strictly requires explanatory comment
    if (reviewDecision === 'Returned' && (!reviewComment || reviewComment.trim().length === 0)) {
      setCommentError('Please provide a mandatory explanatory comment detailing required revisions.');
      return;
    }

    setActionLoading(true);
    setCommentError(null);
    try {
      await submissionService.reviewSubmission(id, {
        reviewerId: user?.id || 'acad_head_01',
        reviewerName: user?.name || 'Academic Evaluator',
        decision: reviewDecision,
        comment: reviewComment.trim()
      });

      setSuccessMessage(
        reviewDecision === 'Approved'
          ? 'Syllabus successfully approved as Complied!'
          : 'Syllabus returned to faculty with feedback comment.'
      );
      setIsReviewModalOpen(false);
      setReviewComment('');
      await loadData();
    } catch (err: any) {
      setCommentError(err.message || 'Failed to submit review decision.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resubmission (SCMS-011 AC 2 & SCMS-021 AC 1)
  const handleResubmitFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResubmitError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = '.' + selected.name.split('.').pop()?.toLowerCase();
      if (!['.pdf', '.docx'].includes(ext)) {
        setResubmitError(`Invalid format '${ext}'. Only PDF and DOCX files are accepted.`);
        setResubmitFile(null);
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setResubmitError(`File size exceeds 25MB limit (${(selected.size / (1024 * 1024)).toFixed(1)}MB).`);
        setResubmitFile(null);
        return;
      }
      setResubmitFile(selected);
    }
  };

  const handleConfirmResubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !resubmitFile) {
      setResubmitError('Please select a revised syllabus file (PDF or DOCX).');
      return;
    }

    setActionLoading(true);
    setResubmitError(null);
    try {
      await submissionService.resubmitSyllabus(id, {
        facultyId: user?.id || submission?.faculty_id || 'fac_01',
        facultyName: user?.name || 'Assigned Faculty',
        fileName: resubmitFile.name,
        fileSize: resubmitFile.size,
        changeSummary: changeSummary.trim() || 'Revised syllabus addressing feedback'
      });

      setSuccessMessage('Revised version successfully submitted. Status updated to Resubmitted.');
      setResubmitFile(null);
      setChangeSummary('');
      setIsResubmitExpanded(false);
      await loadData();
    } catch (err: any) {
      setResubmitError(err.message || 'Resubmission failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-[#580000] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading syllabus submission details...</p>
      </div>
    );
  }

  if (errorMessage || !submission) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="font-bold text-lg">Unable to Load Submission</h3>
          <p className="text-sm">{errorMessage || 'The requested submission could not be found.'}</p>
          <Button onClick={() => navigate(-1)} className="bg-red-800 text-white mt-2">
            Return to Submissions
          </Button>
        </div>
      </div>
    );
  }

  const latestReturnReview = reviews.find(r => r.decision === 'Returned');
  const isReturned = submission.status === 'Returned';
  const isUnderReview = submission.status === 'Under Review';
  const isApproved = submission.status === 'Approved';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/submit')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Submissions Workspace</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Compliance Lifecycle:</span>
          <StatusBadge status={toBadgeStatus(submission.status)} />
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg flex items-start space-x-3 text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Action Successfully Completed</h4>
            <p className="text-xs mt-0.5">{successMessage}</p>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Submission Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-[#580000]/10 text-[#580000] rounded">
              {submission.course_code}
            </span>
            <span className="text-xs text-slate-500 font-medium">Section {submission.section_label}</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            Syllabus Evaluation & Version Control
          </h1>
          <p className="text-xs text-slate-500 flex items-center space-x-4 pt-1">
            <span className="flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Faculty ID: <strong>{submission.faculty_id}</strong></span>
            </span>
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Versions Logged: <strong>{versions.length}</strong></span>
            </span>
          </p>
        </div>

        {/* Action Controls for Evaluators */}
        <div className="flex flex-wrap items-center gap-2">
          {isUnderReview && (
            <>
              <Button
                onClick={() => handleOpenReviewModal('Returned')}
                disabled={actionLoading}
                className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-4 py-2 flex items-center space-x-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Return for Revision</span>
              </Button>
              <Button
                onClick={() => handleOpenReviewModal('Approved')}
                disabled={actionLoading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 flex items-center space-x-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span>Approve (Complied)</span>
              </Button>
            </>
          )}

          {!isUnderReview && !isApproved && (
            <Button
              onClick={async () => {
                if (!id) return;
                try {
                  setActionLoading(true);
                  await submissionService.openForReview(id, {
                    reviewerId: user?.id || 'evaluator_01',
                    reviewerName: user?.name || 'Department Chair'
                  });
                  await loadData();
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="bg-[#580000] hover:bg-[#430000] text-white text-xs font-semibold px-4 py-2 flex items-center space-x-1.5"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1" />
              <span>Move to Under Review</span>
            </Button>
          )}

          {isApproved && (
            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Syllabus Fully Approved</span>
            </div>
          )}
        </div>
      </div>

      {/* Returned Notice & Revision Box (SCMS-011 AC 1 & AC 2) */}
      {isReturned && latestReturnReview && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-lg">
              <RotateCcw className="w-5 h-5 text-amber-800" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-amber-950">
                  Revision Required by {latestReturnReview.reviewer_name}
                </h3>
                <span className="text-xs text-amber-800 font-medium">
                  {new Date(latestReturnReview.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 font-semibold">
                This submission was Returned for revision. Please review the feedback below and upload a revised version.
              </p>
              <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed shadow-inner">
                {latestReturnReview.comment}
              </div>
            </div>
          </div>

          {/* Revise & Resubmit Form */}
          <div className="pt-2 border-t border-amber-200">
            {!isResubmitExpanded ? (
              <Button
                onClick={() => setIsResubmitExpanded(true)}
                className="bg-[#580000] hover:bg-[#430000] text-white text-xs font-semibold px-4 py-2 flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                <span>Upload Revised Syllabus (v{versions.length + 1})</span>
              </Button>
            ) : (
              <form onSubmit={handleConfirmResubmission} className="bg-white p-5 rounded-lg border border-amber-300 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">
                    Upload Revision (Creates Version v{versions.length + 1})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsResubmitExpanded(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Cancel
                  </button>
                </div>

                {resubmitError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                    {resubmitError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Revised Syllabus File (PDF or DOCX, Max 25MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleResubmitFileChange}
                    className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#580000] file:text-white hover:file:bg-[#430000] cursor-pointer"
                  />
                  {resubmitFile && (
                    <p className="text-xs text-emerald-700 font-semibold mt-1">
                      Selected: {resubmitFile.name} ({(resubmitFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Summary of Changes / Responses to Reviewer
                  </label>
                  <textarea
                    rows={3}
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Describe how review comments were addressed in this revision..."
                    className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#580000]"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsResubmitExpanded(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading || !resubmitFile}
                    className="bg-[#580000] hover:bg-[#430000] text-white text-xs font-semibold px-4 py-2"
                  >
                    {actionLoading ? 'Uploading...' : 'Confirm & Resubmit Version'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Grid Layout: Active File Viewer / Details & Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Current Active Version Metadata & Review Thread */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active File Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#580000]" />
              <span>Current Active Document</span>
            </h3>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-800 break-all">
                  {submission.file_name || 'OBE_Form.pdf'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                  v{versions.length > 0 ? versions[versions.length - 1].version_number : 1}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Mode: <strong>{submission.submission_mode || 'FILE_UPLOAD'}</strong>
              </p>
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => alert('Simulating secure download for: ' + submission.file_name)}
                  className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          </div>

          {/* Review Decisions Log */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-[#580000]" />
              <span>Evaluation Comments & History</span>
            </h3>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No formal review decisions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div 
                    key={rev.id} 
                    className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                      rev.decision === 'Approved' 
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center space-x-1">
                        {rev.decision === 'Approved' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{rev.decision}</span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">Reviewer: <strong>{rev.reviewer_name}</strong></p>
                    <p className="text-xs pt-1 border-t border-slate-200/60 whitespace-pre-wrap">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Immutable Version History Table (SCMS-021) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center space-x-2">
                  <History className="w-5 h-5 text-[#580000]" />
                  <span>Immutable Version History (SCMS-021)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every submission and resubmission creates a permanent, non-overwriting revision record.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-300">
                {versions.length} Version{versions.length === 1 ? '' : 's'} Logged
              </span>
            </div>

            {/* Versions Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">File Name</th>
                    <th className="px-4 py-3">Author</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Summary / Notes</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {versions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        No version history available for this record.
                      </td>
                    </tr>
                  ) : (
                    versions.map((ver, idx) => {
                      const isLatest = idx === versions.length - 1;
                      return (
                        <tr 
                          key={ver.id} 
                          className={`hover:bg-slate-50 transition-colors ${
                            isLatest ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            <span className="inline-flex items-center space-x-1">
                              <span>{ver.version_label}</span>
                              {isLatest && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#580000] text-white rounded">
                                  LATEST
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            <div className="truncate max-w-[150px]" title={ver.file_name}>
                              {ver.file_name}
                            </div>
                            {ver.file_size ? (
                              <span className="text-[10px] text-slate-400">
                                ({(ver.file_size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {ver.submitted_by_name || ver.submitted_by}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(ver.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={toBadgeStatus(ver.status_at_version)} />
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={ver.change_summary || ''}>
                            {ver.change_summary || 'Initial upload'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => alert('Simulating inspection for ' + ver.version_label + ': ' + ver.file_name)}
                              className="text-xs font-semibold text-[#580000] hover:text-[#430000] underline inline-flex items-center space-x-0.5"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Revision Diff / Summary Note */}
            {versions.length > 1 && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start space-x-3">
                <Layers className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800">Revision Integrity Verified (SCMS-021)</h4>
                  <p className="mt-0.5">
                    Earlier revisions remain permanently preserved and immutable. The faculty resubmitted syllabus is stored as <strong>v{versions.length}</strong> without overwriting previous versions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Decision Modal (SCMS-010 AC 2 & AC 3) */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center space-x-2">
                {reviewDecision === 'Approved' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Approve Syllabus (Complied)</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5 text-red-600" />
                    <span>Return Syllabus for Revision</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {commentError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span>{commentError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                {reviewDecision === 'Returned' ? (
                  <span className="text-red-700 font-bold">Mandatory Feedback / Required Changes *</span>
                ) : (
                  <span>Review Comments / Commendations (Optional)</span>
                )}
              </label>
              <textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => {
                  setReviewComment(e.target.value);
                  setCommentError(null);
                }}
                placeholder={
                  reviewDecision === 'Returned'
                    ? 'Enter clear revision guidelines for the faculty (e.g. update course assessment schedule, replace reference textbooks)...'
                    : 'Add any positive feedback or remarks regarding syllabus compliance...'
                }
                className="w-full text-xs border border-slate-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#580000]"
              />
              {reviewDecision === 'Returned' && (
                <p className="text-[11px] text-slate-500 mt-1">
                  * As per SCMS-010 AC 3, return decisions require an explanatory note so instructors understand required revisions.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setIsReviewModalOpen(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReview}
                disabled={actionLoading}
                className={`text-xs text-white font-semibold px-4 py-2 ${
                  reviewDecision === 'Approved'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                {actionLoading ? 'Recording...' : `Confirm ${reviewDecision}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
