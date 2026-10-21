import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, CheckCircle2, Lock, AlertCircle, Clock, BookOpen, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { programService, Program } from '../services/programService';
import { calendarService, DeadlineAdjustmentResult } from '../services/calendarService';

export interface UIRequirement {
  id: string;
  program_code: string;
  term_code: string;
  requirement_type: string;
  name: string;
  description: string;
  deadline_at: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

export const RequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const isAcademicHead = user?.role === 'ACADEMIC_HEAD';

  const [requirements, setRequirements] = useState<UIRequirement[]>([]);
  const [activePrograms, setActivePrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState<string>('2026-1S');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [progCode, setProgCode] = useState<string>('BSIT');
  const [termCode, setTermCode] = useState<string>('2026-1S');
  const [reqType, setReqType] = useState<string>('OBTL_SYLLABUS');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('2026-10-31T23:59:59');
  const [adjustmentPreview, setAdjustmentPreview] = useState<DeadlineAdjustmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    fetchRequirements();
    fetchActivePrograms();
  }, [selectedProgram, selectedTerm]);

  useEffect(() => {
    if (deadline && showAddModal) {
      calendarService.calculateDeadline(deadline, termCode).then(setAdjustmentPreview);
    } else {
      setAdjustmentPreview(null);
    }
  }, [deadline, termCode, showAddModal]);

  const fetchActivePrograms = async () => {
    try {
      const progs = await programService.getPrograms('Active');
      setActivePrograms(progs.data || []);
      if (progs.data && progs.data.length > 0) setProgCode(progs.data[0].code);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProgram !== 'ALL') params.program_code = selectedProgram;
      if (selectedTerm) params.term_code = selectedTerm;
      const url = new URL('http://localhost:3002/api/v1/requirements');
      if (selectedProgram !== 'ALL') url.searchParams.append('program_code', selectedProgram);
      if (selectedTerm) url.searchParams.append('term_code', selectedTerm);
      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('scms_token') ? { Authorization: `Bearer ${localStorage.getItem('scms_token')}` } : {}) }
      });
      const json = await res.json();
      setRequirements(json.data || []);
    } catch {
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await fetch('http://localhost:3002/api/v1/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('scms_token') ? { Authorization: `Bearer ${localStorage.getItem('scms_token')}` } : {}) },
        body: JSON.stringify({
          program_code: progCode,
          term_code: termCode,
          requirement_type: reqType,
          name,
          description,
          deadline_at: deadline ? new Date(deadline).toISOString() : null,
        }),
      });
      setShowAddModal(false);
      setName('');
      setDescription('');
      await fetchRequirements();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create requirement definition.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await calendarService.publishRequirement(id);
      await fetchRequirements();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to publish requirement.');
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Close this requirement? Faculty Staff will no longer be able to submit new syllabi.')) return;
    try {
      await calendarService.closeRequirement(id);
      await fetchRequirements();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to close requirement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#580000]">Program Requirements & Deadlines (SMS-004 & SMS-005)</h1>
            <span className="text-xs bg-[#580000]/10 text-[#580000] px-2 py-0.5 rounded font-semibold">Active Programs Only</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">SMS-033 Calendar Aware</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Define term submission requirements strictly for active programs in the academic catalog. Cut-off times strictly enforce 23:59:59 with automatic holiday and suspension pushouts.
          </p>
        </div>

        {isAcademicHead && (
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#580000] hover:bg-[#7a0c0c] text-white flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Requirement Definition</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <BookOpen className="w-4 h-4 text-gray-500" />
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 bg-white text-gray-700 focus:ring-1 focus:ring-[#580000]"
          >
            <option value="ALL">All Active Programs</option>
            {activePrograms.map((p) => (
              <option key={p.id} value={p.code}>{p.code} - {p.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 bg-white text-gray-700 focus:ring-1 focus:ring-[#580000]"
          >
            <option value="2026-1S">A.Y. 2026-2027 1st Semester</option>
            <option value="2026-2S">A.Y. 2026-2027 2nd Semester</option>
          </select>
        </div>
      </div>

      {/* Requirements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-gray-500">Loading requirement definitions...</div>
        ) : requirements.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-gray-500">No requirements defined for this filter.</div>
        ) : (
          requirements.map((req) => (
            <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#580000]/10 text-[#580000] px-2 py-0.5 rounded">
                      {req.program_code}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">{req.term_code}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      req.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mt-2 text-base">{req.name}</h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{req.description || 'No description provided'}</p>
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    Deadline: {req.deadline_at ? new Date(req.deadline_at).toLocaleDateString() + ' (23:59:59)' : 'Not Set'}
                  </span>
                </div>

                {isAcademicHead && (
                  <div className="flex items-center gap-2">
                    {req.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(req.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7 px-2.5"
                      >
                        Publish to Faculty
                      </Button>
                    )}
                    {req.status === 'PUBLISHED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClose(req.id)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100 text-xs h-7 px-2"
                      >
                        Close
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: New Requirement Definition */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif font-bold text-lg text-[#580000]">New Requirement Definition</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Active Program *</label>
                  <select
                    value={progCode}
                    onChange={(e) => setProgCode(e.target.value)}
                    required
                    className="w-full border rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-[#580000]"
                  >
                    {activePrograms.map((p) => (
                      <option key={p.id} value={p.code}>{p.code} - {p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Term *</label>
                  <input
                    type="text"
                    required
                    value={termCode}
                    onChange={(e) => setTermCode(e.target.value)}
                    className="w-full border rounded p-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Requirement Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PUPQC Outcomes-Based Teaching & Learning Syllabus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Requirement Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed instructions for Faculty Staff submissions..."
                  className="w-full border rounded p-2 text-sm mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Submission Deadline</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full border rounded p-2 text-sm mt-1"
                />
              </div>

              {/* SMS-033 Calendar Adjustment Alert Preview */}
              {adjustmentPreview && adjustmentPreview.was_adjusted && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Intelligent Calendar Adjustment (SMS-033):</span>
                  </div>
                  <p>
                    Target date falls on a weekend, holiday, or campus suspension. Pushed out to:
                  </p>
                  <p className="font-mono font-bold text-amber-950 text-sm">
                    {adjustmentPreview.adjusted_deadline.replace('+08:00', ' PHT')}
                  </p>
                  <p className="text-[11px] text-amber-700 italic">
                    Reason: {adjustmentPreview.reasons[0]}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#580000] hover:bg-[#7a0c0c] text-white">Save in DRAFT</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsPage;
