import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../services/apiClient';
import { submissionService } from '../services/submissionService';
import { Course } from '../services/courseService';
import { BlockSection } from '../services/blockSectionService';
import { StatusBadge } from '../components/ui/StatusBadge';

export const SyllabusUploadPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<BlockSection[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [courseCode, setCourseCode] = useState<string>('');
  const [sectionLabel, setSectionLabel] = useState<string>('');
  const [requirementId, setRequirementId] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);

  const MAX_BYTES = 25 * 1024 * 1024; // 25MB (SCMS-008 AC 2)

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const [subsRes, coursesRes, sectionsRes, reqsRes] = await Promise.allSettled([
        apiClient.get<{ data: any[] }>('/submissions'),
        apiClient.get<{ data: Course[] }>('/courses'),
        apiClient.get<{ data: BlockSection[] }>('/block-sections'),
        apiClient.get<{ data: any[] }>('/requirements'),
      ]);

      if (subsRes.status === 'fulfilled' && Array.isArray(subsRes.value?.data)) {
        setMySubmissions(subsRes.value.data);
      }

      if (coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value?.data)) {
        const cList = coursesRes.value.data;
        setCourses(cList);
        if (cList.length > 0) {
          setCourseCode((prev) => prev || cList[0].course_code);
        }
      }

      if (sectionsRes.status === 'fulfilled' && Array.isArray(sectionsRes.value?.data)) {
        const sList = sectionsRes.value.data;
        setSections(sList);
        if (sList.length > 0) {
          setSectionLabel((prev) => prev || sList[0].display_label);
        }
      }

      if (reqsRes.status === 'fulfilled' && Array.isArray(reqsRes.value?.data)) {
        const rList = reqsRes.value.data;
        setRequirements(rList);
        if (rList.length > 0) {
          setRequirementId((prev) => prev || rList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load syllabus submission workspace data:', err);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = '.' + selected.name.split('.').pop()?.toLowerCase();

      if (!['.pdf', '.docx'].includes(ext)) {
        setValidationError(`Invalid format '${ext}'. Only PDF and DOCX documents are accepted.`);
        setFile(null);
        return;
      }

      if (selected.size > MAX_BYTES) {
        setValidationError(
          `File size (${(selected.size / (1024 * 1024)).toFixed(1)}MB) exceeds 25MB limit.`
        );
        setFile(null);
        return;
      }

      setFile(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setValidationError('Please select a valid PDF or DOCX file to submit.');
      return;
    }

    setLoading(true);
    setValidationError(null);
    setSuccessResult(null);

    try {
      const res = await submissionService.submitSyllabus({
        requirementId,
        facultyId: user?.id || 'fac-1092',
        facultyName: user?.name,
        courseCode,
        sectionLabel,
        mode: 'FILE_UPLOAD',
        fileName: file.name,
        fileSize: file.size,
      });

      setSuccessResult(res.data);
      setFile(null);
      await fetchWorkspaceData();
    } catch (err: any) {
      setValidationError(err.response?.data?.error || err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            Syllabus Submission Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit your syllabus for assigned course sections (PDF/DOCX, Max 25MB). Auto-timestamped and tracked.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>SCMS-008 &amp; SCMS-009 Active</span>
        </div>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg flex items-start space-x-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Syllabus Successfully Submitted!</h4>
            <p className="text-xs mt-0.5">
              Status set to <strong>Submitted</strong> at{' '}
              {new Date(successResult.submitted_at || successResult.created_at).toLocaleString()}.
              Audit log record generated.
            </p>
          </div>
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg flex items-start space-x-3 text-red-800">
          <AlertCircle className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Submission Validation Failed</h4>
            <p className="text-xs mt-0.5">{validationError}</p>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Course Selection
              </label>
              <select
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.course_code}>
                    {c.course_code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Allocated Section
              </label>
              <select
                value={sectionLabel}
                onChange={(e) => setSectionLabel(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.display_label}>
                    {s.display_label} (Cohort {s.cohort_admission_year})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Requirement Definition
              </label>
              <select
                value={requirementId}
                onChange={(e) => setRequirementId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#580000]"
              >
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.program_code} ({r.term_code}) - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div className="mt-4 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-[#580000] transition-colors bg-slate-50">
            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Choose a syllabus file or drag it here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Accepted: PDF or DOCX (Strict maximum: 25MB)
            </p>
            <input
              type="file"
              id="fileInput"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="fileInput"
              className="mt-4 inline-block px-4 py-2 bg-[#580000] text-white text-xs font-semibold rounded cursor-pointer hover:bg-[#430000]"
            >
              Select File
            </label>
            {file && (
              <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full border border-emerald-300">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading || !file}
              className="bg-[#580000] hover:bg-[#430000] text-white px-6 py-2 text-sm"
            >
              {loading ? 'Submitting...' : 'Confirm & Submit Syllabus'}
            </Button>
          </div>
        </form>
      </div>

      {/* Submissions History Table */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-lg text-slate-900">
          Recent Submissions for this Term
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mySubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No submissions recorded yet for this semester.
                  </td>
                </tr>
              ) : (
                mySubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{sub.course_code}</td>
                    <td className="px-4 py-3">{sub.section_label}</td>
                    <td className="px-4 py-3">{sub.file_name || 'OBE Form'}</td>
                    <td className="px-4 py-3">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status.toLowerCase().replace(/\s+/g, '_')} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/submissions/${sub.id}/review`)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded inline-flex items-center space-x-1 transition-colors ${
                          sub.status === 'Returned'
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
                        }`}
                      >
                        <span>
                          {sub.status === 'Returned' ? 'Revise & Resubmit' : 'View / Inspect'}
                        </span>
                        <ArrowRight className="w-3 h-3 ml-1" />
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
