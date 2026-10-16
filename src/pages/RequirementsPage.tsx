import React, { useState } from 'react';
import { Calendar, Plus, Edit2, CheckCircle2, Lock, AlertCircle, Clock, BookOpen, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';

export interface UIRequirement {
  id: string;
  programCode: string;
  programName: string;
  termName: string;
  name: string;
  description: string;
  deadlineAt: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

const INITIAL_REQUIREMENTS: UIRequirement[] = [
  {
    id: 'req-bsit-01',
    programCode: 'BSIT',
    programName: 'Bachelor of Science in Information Technology',
    termName: 'A.Y. 2026-2027 1st Semester',
    name: 'OBE Course Syllabus Submission (INTE 401)',
    description: 'Submission of OBE-aligned course syllabus for INTE 401 (Information Assurance and Security 2) with 18-week OBTL plan, CLO mappings, and 70/30 grading system.',
    deadlineAt: '2026-10-31T23:59:59Z',
    status: 'PUBLISHED',
  },
  {
    id: 'req-bsba-02',
    programCode: 'BSBA-HRM',
    programName: 'BSBA Major in Human Resource Management',
    termName: 'A.Y. 2026-2027 1st Semester',
    name: 'Departmental Syllabus & TOS Alignment',
    description: 'Aligned Table of Specifications and syllabus instructional plans for major subjects.',
    deadlineAt: '2026-11-15T23:59:59Z',
    status: 'PUBLISHED',
  },
  {
    id: 'req-draft-03',
    programCode: 'DOMT',
    programName: 'Diploma in Office Management Technology',
    termName: 'A.Y. 2026-2027 1st Semester',
    name: 'Draft Practicum Syllabus Requirement',
    description: 'Internal draft awaiting CHED revised guidelines review before publishing.',
    deadlineAt: null,
    status: 'DRAFT',
  },
  {
    id: 'req-closed-04',
    programCode: 'BSENTREP',
    programName: 'Bachelor of Science in Entrepreneurship',
    termName: 'A.Y. 2025-2026 2nd Semester',
    name: 'Prior Term Syllabus Archive',
    description: 'Completed term requirement now permanently closed.',
    deadlineAt: '2026-06-30T23:59:59Z',
    status: 'CLOSED',
  },
];

export const RequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const isAcademicHead = user?.role === 'ACADEMIC_HEAD';

  const [requirements, setRequirements] = useState<UIRequirement[]>(INITIAL_REQUIREMENTS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReq, setEditingReq] = useState<UIRequirement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programCode, setProgramCode] = useState('BSIT');
  const [deadlineAt, setDeadlineAt] = useState('');

  // SCMS-005 AC 2: Draft requirements are hidden from Faculty Staff
  const visibleRequirements = isAcademicHead
    ? requirements
    : requirements.filter(r => r.status !== 'DRAFT');

  const handleOpenCreate = () => {
    // SCMS-004 AC 3: Restrict creating to Academic Head
    if (!isAcademicHead) {
      setErrorMessage('Access Denied (403): Faculty Staff cannot create or edit requirements; access is restricted to Academic Head.');
      return;
    }
    setName('');
    setDescription('');
    setProgramCode('BSIT');
    setDeadlineAt('');
    setErrorMessage(null);
    setShowCreateModal(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAcademicHead) {
      setErrorMessage('Access Denied (403): Faculty Staff cannot create or edit requirements.');
      return;
    }

    if (!name.trim() || !description.trim()) {
      setErrorMessage('Requirement name and description are required.');
      return;
    }

    const programNames: Record<string, string> = {
      BSIT: 'Bachelor of Science in Information Technology',
      'BSBA-HRM': 'BSBA Major in Human Resource Management',
      DOMT: 'Diploma in Office Management Technology',
      BSENTREP: 'Bachelor of Science in Entrepreneurship',
    };

    const newReq: UIRequirement = {
      id: `req-${Date.now()}`,
      programCode,
      programName: programNames[programCode] || programCode,
      termName: 'A.Y. 2026-2027 1st Semester',
      name: name.trim(),
      description: description.trim(),
      deadlineAt: deadlineAt || null,
      status: 'DRAFT',
    };

    setRequirements(prev => [newReq, ...prev]);
    setShowCreateModal(false);
    setSuccessMessage(`Created draft requirement "${newReq.name}" successfully.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleOpenEdit = (req: UIRequirement) => {
    // SCMS-004 AC 3: Faculty Staff cannot edit
    if (!isAcademicHead) {
      setErrorMessage('Access Denied (403): Faculty Staff cannot edit requirements.');
      return;
    }
    if (req.status !== 'DRAFT') {
      setErrorMessage(`Cannot edit requirement with status ${req.status}. Only DRAFT requirements can be edited.`);
      return;
    }
    setEditingReq(req);
    setName(req.name);
    setDescription(req.description);
    setDeadlineAt(req.deadlineAt ? req.deadlineAt.slice(0, 10) : '');
    setErrorMessage(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq || !isAcademicHead) return;

    // SCMS-004 AC 2: Saved changes appear immediately
    setRequirements(prev =>
      prev.map(r =>
        r.id === editingReq.id
          ? {
              ...r,
              name: name.trim(),
              description: description.trim(),
              deadlineAt: deadlineAt ? `${deadlineAt}T23:59:59Z` : null,
            }
          : r
      )
    );
    setEditingReq(null);
    setSuccessMessage('Draft requirement updated successfully. Saved changes appeared immediately.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // SCMS-005 AC 1 & AC 2: Publish action requiring deadline
  const handlePublish = (req: UIRequirement) => {
    if (!isAcademicHead) {
      setErrorMessage('Access Denied (403): Faculty Staff cannot publish requirements.');
      return;
    }

    if (!req.deadlineAt) {
      setErrorMessage(`Cannot publish "${req.name}": A requirement cannot be published without a deadline for the term.`);
      return;
    }

    setRequirements(prev =>
      prev.map(r => (r.id === req.id ? { ...r, status: 'PUBLISHED' } : r))
    );
    setSuccessMessage(`Requirement "${req.name}" is now PUBLISHED and visible to Faculty Staff.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // SCMS-005 AC 2: Close action
  const handleClose = (req: UIRequirement) => {
    if (!isAcademicHead) return;
    setRequirements(prev =>
      prev.map(r => (r.id === req.id ? { ...r, status: 'CLOSED' } : r))
    );
    setSuccessMessage(`Requirement "${req.name}" has been CLOSED. Submissions are now locked.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-serif font-bold text-slate-900">Academic Requirements & Deadlines</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
              Sprint 2
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isAcademicHead
              ? 'Define syllabus requirements per program and term, manage publication, and enforce term deadlines.'
              : 'Official term submission requirements and deadlines assigned to your academic programs.'}
          </p>
        </div>

        {isAcademicHead && (
          <Button
            onClick={handleOpenCreate}
            className="bg-[#580000] hover:bg-[#430000] text-white flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Requirement</span>
          </Button>
        )}
      </div>

      {/* Alert Notices */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start space-x-3 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Action Blocked</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-3 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Success</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Role Notice */}
      {!isAcademicHead && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>
            <strong>Faculty Staff Scoped View (SCMS-005 AC 2):</strong> Only published requirements with active or closed deadlines are displayed. Draft requirements are restricted to the Academic Head.
          </span>
        </div>
      )}

      {/* Requirements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visibleRequirements.map(req => {
          const isDraft = req.status === 'DRAFT';
          const isPublished = req.status === 'PUBLISHED';
          const isClosed = req.status === 'CLOSED';

          return (
            <div
              key={req.id}
              className={`bg-white rounded-lg border p-5 shadow-sm transition-all flex flex-col justify-between ${
                isClosed
                  ? 'border-slate-200 bg-slate-50/60 opacity-90'
                  : isDraft
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200 hover:border-[#580000]/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {req.programCode}
                    </span>
                    <span className="text-xs text-slate-500">{req.termName}</span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isPublished
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isDraft
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-slate-900 mt-2.5">{req.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{req.programName}</p>
                <p className="text-sm text-slate-600 mt-2.5 line-clamp-2">{req.description}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deadline:</span>
                  </div>
                  <span className={`font-semibold ${req.deadlineAt ? 'text-slate-800' : 'text-amber-600 italic'}`}>
                    {req.deadlineAt ? new Date(req.deadlineAt).toLocaleDateString() : 'No deadline set (Draft)'}
                  </span>
                </div>

                {/* Academic Head Actions */}
                {isAcademicHead && (
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    {isDraft && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(req)}
                          className="text-xs h-8 text-slate-700 border-slate-300"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit Draft
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePublish(req)}
                          className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Publish
                        </Button>
                      </>
                    )}

                    {isPublished && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClose(req)}
                        className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-100"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Close Requirement
                      </Button>
                    )}

                    {isClosed && (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        Requirement Closed & Archived
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Requirement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">Create Requirement (SCMS-004)</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Academic Program</label>
                <select
                  value={programCode}
                  onChange={e => setProgramCode(e.target.value)}
                  className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-[#580000]"
                >
                  <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                  <option value="BSBA-HRM">BSBA-HRM - Major in Human Resource Management</option>
                  <option value="DOMT">DOMT - Diploma in Office Management Technology</option>
                  <option value="BSENTREP">BSENTREP - Bachelor of Science in Entrepreneurship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Requirement Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Final OBE Syllabus Submission"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide instructions and rubric expectations for faculty staff..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Submission Deadline (Optional for Draft, Required for Publishing)
                </label>
                <input
                  type="date"
                  value={deadlineAt}
                  onChange={e => setDeadlineAt(e.target.value)}
                  className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#580000] hover:bg-[#430000] text-white">
                  Create Draft Requirement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Draft Requirement Modal */}
      {editingReq && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">Edit Draft Requirement (SCMS-004 AC 2)</h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Requirement Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={deadlineAt}
                  onChange={e => setDeadlineAt(e.target.value)}
                  className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingReq(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#580000] hover:bg-[#430000] text-white">
                  Save Changes Immediately
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
