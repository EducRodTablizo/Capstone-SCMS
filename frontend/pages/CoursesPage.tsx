import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Layers,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { courseService, Course } from '../services/courseService';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';

export const CoursesPage: React.FC = () => {
  const { user, role } = useAuth();
  const isAcademicHead = (role || user?.role) === 'ACADEMIC_HEAD';

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [code, setCode] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [units, setUnits] = useState<number>(3);
  const [lectureHours, setLectureHours] = useState<number>(3);
  const [labHours, setLabHours] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [requiresLab, setRequiresLab] = useState<boolean>(false);
  const [labType, setLabType] = useState<string>('Computer Laboratory');
  const [software, setSoftware] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Course[] }>('/courses', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });
      setCourses(res?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const softwareList = software
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await courseService.createCourse({
        course_code: code,
        title,
        credit_units: Number(units),
        lecture_hours: Number(lectureHours),
        lab_hours: Number(labHours),
        description,
        requires_lab: requiresLab,
        lab_type: requiresLab ? labType : undefined,
        special_software: requiresLab ? softwareList : undefined,
        status: 'Active',
      });
      setShowAddModal(false);
      resetForm();
      await fetchCourses();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to register course.');
    }
  };

  const handleRetire = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to retire this course? Retired courses cannot receive new assignments.'
      )
    )
      return;
    try {
      await courseService.updateCourse(id, { status: 'Retired' });
      await fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to retire course.');
    }
  };

  const handleVersion = async (id: string) => {
    try {
      await courseService.createVersion(id);
      await fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create revision.');
    }
  };

  const resetForm = () => {
    setCode('');
    setTitle('');
    setUnits(3);
    setLectureHours(3);
    setLabHours(0);
    setDescription('');
    setRequiresLab(false);
    setSoftware('');
    setErrorMsg('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-[#580000]">
              Course Master Catalogue (SMS-022)
            </h1>
            <span className="text-xs bg-[#580000]/10 text-[#580000] px-2 py-0.5 rounded font-semibold">
              SSOT
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Authoritative source for academic course specifications, contact hours calculation, lab requirements, and immutable versioning.
          </p>
        </div>

        {isAcademicHead && (
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#580000] hover:bg-[#7a0c0c] text-white flex items-center gap-2 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Course Master</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by course code (e.g. INTE 30103) or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCourses()}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#580000] focus:border-[#580000]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md text-sm px-3 py-2 bg-white text-gray-700 focus:ring-1 focus:ring-[#580000]"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Revised">Revised</option>
            <option value="Draft">Draft</option>
            <option value="Retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Course Cards / Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-[#580000] text-white text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 text-white">Course Code</th>
              <th className="px-4 py-3 text-white">Course Title</th>
              <th className="px-4 py-3 text-white">Units &amp; Hours</th>
              <th className="px-4 py-3 text-white">Lab &amp; Tools</th>
              <th className="px-4 py-3 text-white">Version &amp; Status</th>
              {isAcademicHead && <th className="px-4 py-3 text-right text-white">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Loading Course Master Catalogue...
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No courses found matching filter criteria.
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-gray-900 font-mono">
                    {course.course_code}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-900">{course.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {course.description || 'No description provided'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-semibold text-gray-800">
                        {course.credit_units} Credit Units
                      </span>
                      <span className="text-gray-500">
                        {course.lecture_hours}h Lec + {course.lab_hours}h Lab ={' '}
                        <strong className="text-[#580000]">{course.contact_hours}h Contact</strong>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {course.requires_lab ? (
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit font-medium">
                          <Cpu className="w-3 h-3" /> {course.lab_type || 'Laboratory'}
                        </span>
                        {course.special_software && course.special_software.length > 0 && (
                          <span className="text-[11px] text-gray-500 line-clamp-1 font-mono">
                            {course.special_software.join(', ')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Non-Laboratory</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono font-semibold">
                        v{course.version}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          course.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : course.status === 'Revised'
                              ? 'bg-blue-100 text-blue-800'
                              : course.status === 'Draft'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {course.status}
                      </span>
                    </div>
                  </td>
                  {isAcademicHead && (
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVersion(course.id)}
                          title="Create new immutable version"
                          className="text-xs py-1 px-2 border-gray-300"
                        >
                          <Layers className="w-3 h-3 mr-1" /> Revise
                        </Button>
                        {course.status !== 'Retired' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetire(course.id)}
                            className="text-xs py-1 px-2 border border-red-800 text-red-800 bg-transparent hover:bg-red-50"
                          >
                            Retire
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: New Course Master */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-sans font-bold text-lg text-[#580000]">
                New Course Master Specification
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded flex items-center gap-2 border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INTE 30103"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-[#580000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Credit Units *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-[#580000]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Web Systems and Technologies"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Lecture Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={lectureHours}
                    onChange={(e) => setLectureHours(Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Lab Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={labHours}
                    onChange={(e) => setLabHours(Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#580000]">
                    Contact Hours
                  </label>
                  <div className="w-full border border-[#580000]/30 rounded p-2 text-sm mt-1 font-bold text-[#580000] bg-red-50/50">
                    {Number(lectureHours) + Number(labHours)} hrs
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="labCheck"
                    checked={requiresLab}
                    onChange={(e) => setRequiresLab(e.target.checked)}
                    className="rounded text-[#580000] focus:ring-[#580000]"
                  />
                  <label htmlFor="labCheck" className="text-sm font-semibold text-gray-700">
                    Requires Specialized Laboratory (SMS-022 AC2)
                  </label>
                </div>

                {requiresLab && (
                  <div className="space-y-3 pl-6 border-l-2 border-[#580000]/30 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">
                        Laboratory Facility Type
                      </label>
                      <input
                        type="text"
                        value={labType}
                        onChange={(e) => setLabType(e.target.value)}
                        placeholder="e.g. Computer Laboratory, Multimedia Lab"
                        className="w-full border rounded p-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">
                        Special Software Requirements (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={software}
                        onChange={(e) => setSoftware(e.target.value)}
                        placeholder="e.g. VS Code, Node.js, PostgreSQL, Docker"
                        className="w-full border rounded p-2 text-sm mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Course Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Official course catalogue description and overview..."
                  className="w-full border rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-[#580000]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#580000] hover:bg-[#7a0c0c] text-white">
                  Save to Catalogue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
