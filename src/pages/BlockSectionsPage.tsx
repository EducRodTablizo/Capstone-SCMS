import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { blockSectionService, BlockSection } from '../services/blockSectionService';
import { Program } from '../services/programService';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';

export const BlockSectionsPage: React.FC = () => {
  const { user, role } = useAuth();
  const isAcademicHead = (role || user?.role) === 'ACADEMIC_HEAD';

  const [sections, setSections] = useState<BlockSection[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [progId, setProgId] = useState<string>('');
  const [cohortYear, setCohortYear] = useState<number>(new Date().getFullYear());
  const [yearLevel, setYearLevel] = useState<number>(1);
  const [sectionNumber, setSectionNumber] = useState<number>(1);
  const [label, setLabel] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [secsRes, progsRes] = await Promise.all([
        apiClient.get<{ data: BlockSection[] }>('/block-sections', {
          params: {
            program_id: selectedProgram || undefined,
            status: statusFilter || undefined,
          },
        }),
        apiClient.get<{ data: Program[] }>('/programs', {
          params: { status: 'Active' },
        }),
      ]);

      setSections(secsRes?.data || []);
      const progList = progsRes?.data || [];
      setPrograms(progList);
      if (progList.length > 0 && !progId) {
        setProgId(progList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch block sections:', err);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProgram, statusFilter, progId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await blockSectionService.createSection({
        program_id: progId,
        cohort_admission_year: Number(cohortYear),
        year_level: Number(yearLevel),
        section_number: Number(sectionNumber),
        display_label: label,
        status: 'Active',
      });
      setShowAddModal(false);
      setLabel('');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to register block section cohort.'
      );
    }
  };

  const handleDissolve = async (id: string, currentLabel: string) => {
    if (
      !confirm(
        `Dissolve section '${currentLabel}'? Its assigned teaching load will be moved to Unassigned without faculty penalty (SMS-031 AC3).`
      )
    )
      return;
    try {
      await blockSectionService.updateStatus(id, 'Dissolved');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dissolve section.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#580000]">
              Cohort Block Sections (SMS-031)
            </h1>
            <span className="text-xs bg-[#580000]/10 text-[#580000] px-2 py-0.5 rounded font-semibold">
              SSOT
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Maintains stable block section identities across terms. Dissolving sections cleanly moves loads to Unassigned without faculty penalty.
          </p>
        </div>

        {isAcademicHead && (
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#580000] hover:bg-[#7a0c0c] text-white flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Cohort Section</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 bg-white text-gray-700 focus:ring-1 focus:ring-[#580000]"
          >
            <option value="">All Academic Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 bg-white text-gray-700 focus:ring-1 focus:ring-[#580000]"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Dissolved">Dissolved</option>
            <option value="Merged">Merged</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-[#580000] text-white text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 text-white">Section Label</th>
              <th className="px-4 py-3 text-white">Cohort Admission</th>
              <th className="px-4 py-3 text-white">Year &amp; Section</th>
              <th className="px-4 py-3 text-white">Lifecycle Status</th>
              {isAcademicHead && <th className="px-4 py-3 text-right text-white">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Loading Cohort Block Sections...
                </td>
              </tr>
            ) : sections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No block sections registered for this filter.
                </td>
              </tr>
            ) : (
              sections.map((sec) => (
                <tr key={sec.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-gray-900 font-mono text-base">
                    {sec.display_label}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-gray-800">
                      Batch {sec.cohort_admission_year}
                    </span>
                    <p className="text-xs text-gray-500">Admission Year</p>
                  </td>
                  <td className="px-4 py-3.5">
                    Year {sec.year_level}, Section {sec.section_number}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        sec.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sec.status === 'Dissolved'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {sec.status}
                    </span>
                  </td>
                  {isAcademicHead && (
                    <td className="px-4 py-3.5 text-right">
                      {sec.status === 'Active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDissolve(sec.id, sec.display_label)}
                          className="text-xs border border-red-800 text-red-800 bg-transparent hover:bg-red-50"
                        >
                          Dissolve Section
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: New Block Section */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-sans font-bold text-lg text-[#580000]">
                Register Cohort Block Section
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Program *
                </label>
                <select
                  value={progId}
                  onChange={(e) => setProgId(e.target.value)}
                  required
                  className="w-full border rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-[#580000]"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Admission Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={cohortYear}
                    onChange={(e) => setCohortYear(Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Year Level *
                  </label>
                  <select
                    value={yearLevel}
                    onChange={(e) => setYearLevel(Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm mt-1"
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Section Number *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sectionNumber}
                    onChange={(e) => setSectionNumber(Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSIT 4-1"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full border rounded p-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#580000] hover:bg-[#7a0c0c] text-white">
                  Save Section
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockSectionsPage;
