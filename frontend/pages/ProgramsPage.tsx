import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit3, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw, X, Filter, BookOpen } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { programService, Program } from '../services/programService';

export const ProgramsPage: React.FC = () => {
  const { user } = useAuth();
  const isAcademicHead = user?.role === 'ACADEMIC_HEAD';

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Phased out'>('All');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    status: 'Active' as 'Active' | 'Phased out',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPrograms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await programService.getPrograms(filter === 'All' ? undefined : filter);
      setPrograms(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load programs. Backend service may be starting up.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [filter]);

  const handleOpenAdd = () => {
    setEditingProgram(null);
    setFormData({ code: '', title: '', description: '', status: 'Active' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prog: Program) => {
    setEditingProgram(prog);
    setFormData({
      code: prog.code,
      title: prog.title,
      description: prog.description || '',
      status: prog.status,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProgram(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingProgram) {
        await programService.updateProgram(editingProgram.id, {
          title: formData.title,
          description: formData.description,
          status: formData.status,
        });
        setSuccessMsg(`Program '${editingProgram.code}' updated successfully.`);
      } else {
        await programService.createProgram({
          code: formData.code,
          title: formData.title,
          description: formData.description,
          status: formData.status,
        });
        setSuccessMsg(`Program '${formData.code.toUpperCase()}' created successfully.`);
      }
      setIsModalOpen(false);
      fetchPrograms();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickToggleStatus = async (prog: Program) => {
    if (!isAcademicHead) return;
    const nextStatus = prog.status === 'Active' ? 'Phased out' : 'Active';
    try {
      await programService.updateProgram(prog.id, { status: nextStatus });
      setSuccessMsg(`Program '${prog.code}' status changed to '${nextStatus}'.`);
      fetchPrograms();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    }
  };

  const activeCount = programs.filter(p => p.status === 'Active').length;
  const phasedOutCount = programs.filter(p => p.status === 'Phased out').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#800000]/10 text-[#800000] rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Programs Catalogue</h1>
              <p className="text-sm text-slate-500 font-medium">
                PUPQC Authoritative Program Master SSOT (User Story: SMS-021)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPrograms}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {isAcademicHead ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#800000] hover:bg-[#660000] shadow-sm rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Program
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Read-Only View (Faculty Scoped)
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Programs</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{programs.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Active Programs</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Phased Out Programs</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{phasedOutCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-rose-500" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4 text-emerald-500" /></button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {(['All', 'Active', 'Phased out'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              filter === tab
                ? 'bg-[#800000] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab} Programs
          </button>
        ))}
      </div>

      {/* Program Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-4 px-6">Program Code</th>
              <th className="py-4 px-6">Official Title</th>
              <th className="py-4 px-6">College / Description</th>
              <th className="py-4 px-6">Lifecycle Status</th>
              {isAcademicHead && <th className="py-4 px-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading academic programs...
                </td>
              </tr>
            ) : programs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No programs found matching filter.
                </td>
              </tr>
            ) : (
              programs.map((prog) => (
                <tr key={prog.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900 tracking-wide font-mono">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                      {prog.code}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">{prog.title}</td>
                  <td className="py-4 px-6 text-slate-500">{prog.description || '—'}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        prog.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${prog.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {prog.status}
                    </span>
                  </td>
                  {isAcademicHead && (
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleQuickToggleStatus(prog)}
                          title="Toggle Status (Active <-> Phased out)"
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          {prog.status === 'Active' ? 'Phase out' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(prog)}
                          title="Edit Program Details"
                          className="p-1.5 text-slate-500 hover:text-[#800000] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Program Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProgram ? `Edit Program: ${editingProgram.code}` : 'Add New Academic Program'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Program Code (e.g. BSIT) *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingProgram}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. BSIT"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm font-semibold uppercase disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Official Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Bachelor of Science in Information Technology"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  College / Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. College of Computer and Information Sciences"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Status (SMS-021 AC1)
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Phased out' })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#800000] text-sm font-semibold bg-white"
                >
                  <option value="Active">Active (Accepts Requirements)</option>
                  <option value="Phased out">Phased out (Archived / Legacy)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#800000] hover:bg-[#660000] rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingProgram ? 'Update Program' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramsPage;
