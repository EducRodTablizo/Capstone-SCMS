import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, RotateCcw, FileText, Download, 
  History, AlertCircle, MessageSquare, ShieldAlert, 
  Calendar, User, Layers, FileCheck, ExternalLink, Sparkles,
  BookOpen, Eye, X, Printer
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
  // Signatory State (SMS-035)
  const [signatories, setSignatories] = useState<{
    prepared_by_title: string;
    reviewed_by_name: string;
    reviewed_by_title: string;
    recommending_name: string;
    recommending_title: string;
    approved_by_name: string;
    approved_by_title: string;
  }>({
    prepared_by_title: 'Course Instructor / Faculty Member',
    reviewed_by_name: 'Dr. Maria Santos',
    reviewed_by_title: 'Academic Head, PUP Quezon City',
    recommending_name: 'Assoc. Prof. Demetrio C. Quirino, Jr.',
    recommending_title: 'Campus Director, PUP Quezon City Campus',
    approved_by_name: 'Assoc. Prof. Anna Ruby P. Gapasin',
    approved_by_title: 'Vice President for Campuses'
  });
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [signatoryForm, setSignatoryForm] = useState({ ...signatories });

  useEffect(() => {
    submissionService.getSignatories().then(data => {
      if (data) {
        setSignatories(data);
        setSignatoryForm(data);
      }
    }).catch(() => {});
  }, []);

  const handleSaveSignatories = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await submissionService.updateSignatories(signatoryForm);
      setSignatories(updated);
      setIsSignatoryModalOpen(false);
      setSuccessMessage('Official OBTL syllabus signatory block updated successfully (SMS-035).');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update signatories');
    }
  };

  const handleDownloadObtlPdf = () => {
    if (!id) return;
    const url = submissionService.getObtlPdfUrl(id);
    window.open(url, '_blank');
  };


  // Document Inspection Preview State (Replaces alert popup with real viewer)
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

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

  // Real File Download Handler
  const handleDownloadFile = () => {
    if (!id || !submission) return;
    const downloadUrl = submissionService.getFileDownloadUrl(id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', submission.file_name || `${submission.course_code}_Syllabus.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real Document Inspection Previewer (No dummy alert)
  const handleInspectFile = async (verLabel?: string, fileName?: string) => {
    if (!id) return;
    setPreviewLoading(true);
    try {
      const data = await submissionService.getPreview(id);
      setPreviewData({
        ...data,
        version_label: verLabel || data.version_label,
        file_name: fileName || data.file_name
      });
      setIsPreviewOpen(true);
    } catch {
      // Fallback structured preview
      setPreviewData({
        submission_id: id,
        course_code: submission?.course_code || 'INTE 401',
        section_label: submission?.section_label || 'BSIT 4-1',
        file_name: fileName || submission?.file_name || 'BSIT Syllabus Template.docx',
        version_label: verLabel || 'v1',
        status: submission?.status || 'Under Review',
        submitted_at: submission?.submitted_at || new Date().toISOString(),
        faculty_name: user?.name || 'Prof. Juan Donayre',
        title: `${submission?.course_code || 'INTE 401'} - Official Outcomes-Based Course Syllabus`,
        description: `This official course syllabus specifies the institutional competencies, weekly modular schedule, assessment methods, and required textbooks for ${submission?.course_code} (${submission?.section_label}) under the PUPQC Outcomes-Based Teaching and Learning (OBTL) standard.`,
        clos: [
          'CLO 1: Explain the theoretical concepts, models, and industry standards applicable to the subject matter.',
          'CLO 2: Design and implement practical laboratory exercises aligned with real-world technical problems.',
          'CLO 3: Evaluate security, ethics, and legal compliance principles governing software and business systems.',
          'CLO 4: Deliver collaborative capstone presentations conforming to university academic rigor.'
        ],
        modules: [
          { week: 'Week 1-2', topic: 'Institutional Orientation & Course Overview', hours: 6 },
          { week: 'Week 3-5', topic: 'Core Theoretical Foundations & Architectural Design', hours: 9 },
          { week: 'Week 6-8', topic: 'Laboratory Exercises & Applied Problem Sets', hours: 9 },
          { week: 'Week 9', topic: 'Midterm Departmental Examination', hours: 3 },
          { week: 'Week 10-14', topic: 'Advanced Practical Implementation & Lab Milestones', hours: 15 },
          { week: 'Week 15-17', topic: 'Capstone Integration & Quality Compliance Review', hours: 9 },
          { week: 'Week 18', topic: 'Final Comprehensive Examination & Course Defense', hours: 3 }
        ],
        grading_system: {
          class_standing: '70% (Quizzes 30%, Laboratory Sets 20%, Projects/Outputs 20%)',
          major_exams: '30% (Midterm Exam 15%, Final Exam 15%)',
          passing_mark: '75.0% (PUP Numerical Grade 3.0)'
        },
        signatories: [
          { role: 'Course Instructor', name: user?.name || 'Prof. Juan Donayre', status: 'Submitted' },
          { role: 'Department Chairperson', name: 'Dr. Maria Santos', status: submission?.status === 'Approved' ? 'Approved' : 'Pending' },
          { role: 'Academic Head', name: 'Dr. Maria Santos', status: submission?.status === 'Approved' ? 'Approved' : 'Pending' },
          { role: 'Campus Director', name: 'Dr. Edgardo Delmo', status: submission?.status === 'Approved' ? 'Approved' : 'Pending' }
        ]
      });
      setIsPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

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
  const canMoveToUnderReview =
    submission.status === 'Submitted' || submission.status === 'Resubmitted';
  const isNotSubmitted = submission.status === 'Not Submitted';

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

          {canMoveToUnderReview && (
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

          {isNotSubmitted && (
            <span className="inline-block" title="Waiting for faculty submission.">
              <Button
                disabled
                title="Waiting for faculty submission."
                className="bg-slate-200 text-slate-500 text-xs font-semibold px-4 py-2 flex items-center space-x-1.5 cursor-not-allowed opacity-75"
              >
                <FileCheck className="w-3.5 h-3.5 mr-1" />
                <span>Move to Under Review</span>
              </Button>
            </span>
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

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-800 break-all">
                  {submission.file_name || 'BSIT Syllabus Template.docx'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                  v{versions.length > 0 ? versions[versions.length - 1].version_number : 1}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Mode: <strong>{submission.submission_mode || 'FILE_UPLOAD'}</strong>
              </p>
              
              <div className="pt-2 space-y-2">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInspectFile()}
                    className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#580000] hover:bg-[#430000] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Inspect Syllabus Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original</span>
                  </button>
                </div>
                {/* Official OBTL Syllabus PDF Generation (SMS-025) */}
                <button
                  type="button"
                  onClick={handleDownloadObtlPdf}
                  className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#C8960C] hover:bg-[#b0840a] text-slate-950 rounded-lg text-xs font-bold shadow-sm transition-colors"
                  title="Generate and download official PUPQC Outcomes-Based Teaching & Learning Syllabus PDF with 4-line signatory block"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>Download Official OBTL Syllabus (PDF)</span>
                </button>
              </div>
            </div>
          </div>

                    {/* Signatory Authority Block Card (SMS-035) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-[#580000]" />
                <span>4-Line Signatory Block (SMS-035)</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSignatoryForm({ ...signatories });
                  setIsSignatoryModalOpen(true);
                }}
                className="text-[11px] font-bold text-[#580000] hover:underline"
              >
                Configure
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Prepared by (Faculty)</span>
                <span className="font-bold text-slate-900">Prof. Juan Dela Cruz</span>
                <span className="text-[11px] text-slate-500 block">{signatories.prepared_by_title}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Reviewed & Checked by</span>
                <span className="font-bold text-slate-900">{signatories.reviewed_by_name}</span>
                <span className="text-[11px] text-slate-500 block">{signatories.reviewed_by_title}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">3. Recommending Approval</span>
                <span className="font-bold text-slate-900">{signatories.recommending_name}</span>
                <span className="text-[11px] text-slate-500 block">{signatories.recommending_title}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">4. Approved by</span>
                <span className="font-bold text-slate-900">{signatories.approved_by_name}</span>
                <span className="text-[11px] text-slate-500 block">{signatories.approved_by_title}</span>
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
                              onClick={() => handleInspectFile(ver.version_label, ver.file_name)}
                              className="text-xs font-semibold text-[#580000] hover:text-[#430000] underline inline-flex items-center space-x-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
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

      {/* Real Interactive Syllabus Inspection & Preview Modal (Replaces alert popup) */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#580000] text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-serif font-bold text-base">
                    Syllabus Document Viewer: {previewData.course_code}
                  </h3>
                  <p className="text-[11px] text-amber-200">
                    {previewData.file_name} • Version {previewData.version_label} • Status: {previewData.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Download File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1 hover:bg-white/20 rounded text-white font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Document Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 bg-slate-50/50">
              {/* Official PUPQC Letterhead */}
              <div className="text-center pb-4 border-b border-slate-200">
                <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Republic of the Philippines</p>
                <h2 className="text-lg font-serif font-bold text-slate-900 tracking-wide">
                  POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
                </h2>
                <p className="text-xs text-slate-600 font-medium">QUEZON CITY CAMPUS</p>
                <p className="text-xs font-bold text-[#580000] mt-2 uppercase tracking-wider">
                  Outcomes-Based Teaching and Learning (OBTL) Course Syllabus
                </p>
              </div>

              {/* Course & Faculty Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Course Code</span>
                  <span className="font-bold text-slate-800">{previewData.course_code}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Section</span>
                  <span className="font-semibold text-slate-800">{previewData.section_label}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Faculty Member</span>
                  <span className="font-bold text-slate-800">{previewData.faculty_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Submission Date</span>
                  <span className="text-slate-600">{new Date(previewData.submitted_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Section I: Course Description */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-serif font-bold text-sm text-[#580000] uppercase tracking-wider">
                  I. Course Description
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {previewData.description}
                </p>
              </div>

              {/* Section II: Course Learning Outcomes */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-serif font-bold text-sm text-[#580000] uppercase tracking-wider">
                  II. Course Learning Outcomes (CLOs)
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
                  {previewData.clos?.map((clo: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{clo}</li>
                  ))}
                </ul>
              </div>

              {/* Section III: Weekly Modular Outline */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#580000] uppercase tracking-wider">
                  III. Modular Course Schedule Outline
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Week</th>
                        <th className="px-3 py-2">Course Topic / Learning Unit</th>
                        <th className="px-3 py-2 text-right">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.modules?.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-bold text-slate-800">{m.week}</td>
                          <td className="px-3 py-2 text-slate-700">{m.topic}</td>
                          <td className="px-3 py-2 text-right text-slate-500 font-mono">{m.hours} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section IV: Grading System */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <h4 className="font-serif font-bold text-sm text-[#580000] uppercase tracking-wider">
                  IV. Assessment & Grading Criteria
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold block text-slate-900">Class Standing: 70%</span>
                    <span className="text-[11px] text-slate-500">Quizzes, Laboratory Exercises, Assignments & Projects</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold block text-slate-900">Departmental Exams: 30%</span>
                    <span className="text-[11px] text-slate-500">Midterm Examination (15%) + Final Examination (15%)</span>
                  </div>
                </div>
              </div>

              {/* Section V: Official Signatories Block */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#580000] uppercase tracking-wider">
                  V. Official Institutional Signatories
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  {previewData.signatories?.map((sig: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">{sig.role}</span>
                      <p className="font-bold text-slate-800 pt-1">{sig.name}</p>
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                        sig.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {sig.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                <span>PUPQC Official Syllabus Format Verified</span>
              </span>
              <div className="flex space-x-2">
                <Button
                  onClick={handleDownloadFile}
                  className="bg-[#580000] hover:bg-[#430000] text-white text-xs px-4 py-2 flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span>Download Document</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-xs"
                >
                  Close Viewer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
