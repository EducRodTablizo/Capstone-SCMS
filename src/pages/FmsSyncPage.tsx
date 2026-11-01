import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  RefreshCw,
  UserCheck,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Send,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { submissionService } from '../services/submissionService';
import { complianceService } from '../services/complianceService';
import { Course } from '../services/courseService';
import { BlockSection } from '../services/blockSectionService';

interface FmsFacultyProfile {
  id: string;
  name: string;
  email: string;
  rank: string;
  department: string;
  consultation_hours: string;
  source: string;
  advisory_notice?: string;
}

export const FmsSyncPage: React.FC = () => {
  const [facultyList, setFacultyList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [profile, setProfile] = useState<FmsFacultyProfile | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string>('WARM_CACHE');
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);

  // Dynamic Catalog Lists
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<BlockSection[]>([]);

  // Inbound simulation form state
  const [simAction, setSimAction] = useState<'REASSIGN' | 'SUBSTITUTE' | 'WITHDRAW'>('REASSIGN');
  const [courseCode, setCourseCode] = useState<string>('');
  const [sectionLabel, setSectionLabel] = useState<string>('');
  const [newFacultyId, setNewFacultyId] = useState<string>('');
  const [newFacultyName, setNewFacultyName] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Outbound Catalog Webhook state (SMS-027)
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);

  const fetchProfile = useCallback(async (id: string) => {
    if (!id) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await apiClient.get<{ data: any }>(`/integrations/fms/profile/${id}`);
      const data = res.data || res;
      setProfile({
        id: data.faculty_id,
        name: data.display_name,
        email: data.institutional_email,
        rank: data.academic_rank,
        department: data.department,
        consultation_hours: data.consultation_hours,
        source: data.cache_state,
        advisory_notice: data.advisory_notice,
      });
      setActiveTier(data.cache_state);
    } catch (err: any) {
      setProfile(null);
      setLookupError(err.message || 'Failed to fetch faculty profile from FMS integration endpoint.');
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const loadWebhookLogs = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: any[] }>('/catalog/webhooks/fms/logs');
      setWebhookLogs(res.data || []);
    } catch {
      setWebhookLogs([]);
    }
  }, []);

  const loadInitialFmsData = useCallback(async () => {
    try {
      const [subsRes, fixturesRes, coursesRes, sectionsRes] = await Promise.allSettled([
        apiClient.get<{ data: any[] }>('/submissions'),
        apiClient.get<{ fixtures: any }>('/integrations/fixtures/catalog'),
        apiClient.get<{ data: Course[] }>('/courses'),
        apiClient.get<{ data: BlockSection[] }>('/block-sections'),
      ]);

      const discoveredIds = new Set<string>();
      if (fixturesRes.status === 'fulfilled' && fixturesRes.value?.fixtures?.faculty?.id) {
        discoveredIds.add(fixturesRes.value.fixtures.faculty.id);
      }
      if (subsRes.status === 'fulfilled' && Array.isArray(subsRes.value?.data)) {
        for (const sub of subsRes.value.data) {
          if (sub.faculty_id && sub.faculty_id !== 'UNASSIGNED') {
            discoveredIds.add(sub.faculty_id);
          }
        }
      }

      const idsArray = Array.from(discoveredIds);
      const loadedProfiles: Array<{ id: string; name: string }> = [];
      for (const fId of idsArray) {
        try {
          const profRes = await apiClient.get<{ data: any }>(`/integrations/fms/profile/${fId}`);
          const pData = profRes.data || profRes;
          loadedProfiles.push({
            id: fId,
            name: pData?.display_name || fId,
          });
        } catch {
          loadedProfiles.push({ id: fId, name: fId });
        }
      }

      setFacultyList(loadedProfiles);
      if (loadedProfiles.length > 0) {
        setSelectedFacultyId((prev) => prev || loadedProfiles[0].id);
        const secondFaculty = loadedProfiles[1] || loadedProfiles[0];
        setNewFacultyId((prev) => prev || secondFaculty.id);
        setNewFacultyName((prev) => prev || secondFaculty.name);
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
    } catch (err) {
      console.error('Failed to load initial FMS integration data:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialFmsData();
    loadWebhookLogs();
  }, [loadInitialFmsData, loadWebhookLogs]);

  useEffect(() => {
    if (selectedFacultyId) {
      fetchProfile(selectedFacultyId);
    }
  }, [selectedFacultyId, fetchProfile]);

  const handleSimulateTier = async (tier: string | null) => {
    try {
      await complianceService.simulateResilienceTier('FMS', tier);
      if (selectedFacultyId) {
        await fetchProfile(selectedFacultyId);
      }
      setReconcileNotice(
        tier
          ? `FMS Cache Tier simulated as: ${tier} (SMS-020)`
          : 'FMS Cache Tier reset to live WARM_CACHE.'
      );
      setTimeout(() => setReconcileNotice(null), 5000);
    } catch (err: any) {
      setReconcileNotice(err.message || 'Failed to switch FMS cache tier.');
    }
  };

  const handleReconcile = async () => {
    try {
      const res = await complianceService.reconcileFms();
      if (selectedFacultyId) {
        await fetchProfile(selectedFacultyId);
      }
      setReconcileNotice(
        `Manual operator reconciliation successful: ${res.message} (Joint Rehearsal Rule 9)`
      );
      setTimeout(() => setReconcileNotice(null), 6000);
    } catch (err: any) {
      setReconcileNotice(err.message);
    }
  };

  const handleDispatchCatalogWebhook = async (simulateFailure = false) => {
    setDispatchLoading(true);
    try {
      const targetCourse = courses.find((c) => c.course_code === courseCode) || courses[0];
      if (!targetCourse) return;

      await complianceService.dispatchCatalogWebhook({
        eventType: 'COURSE_UPDATED',
        courseId: targetCourse.id,
        courseCode: targetCourse.course_code,
        courseTitle: targetCourse.title,
        creditUnits: Number(targetCourse.credit_units),
        lectureHours: Number(targetCourse.lecture_hours),
        labHours: Number(targetCourse.lab_hours),
        requiresLaboratory: Boolean(targetCourse.requires_lab),
        status: targetCourse.status.toUpperCase(),
        simulateFailure,
      });
      await loadWebhookLogs();
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimResult(null);

    try {
      if (simAction === 'REASSIGN') {
        const res = await submissionService.reassignAssignment({
          courseCode,
          sectionLabel,
          newFacultyId,
          newFacultyName,
          reason,
        });
        setSimResult({
          status: 'SUCCESS',
          message:
            res.reassignmentType === 'APPROVED_ADOPTED'
              ? 'Approved Syllabus Adopted: Target section has an approved syllabus. The new instructor has successfully adopted it (SMS-023 AC 2).'
              : 'Unapproved Responsibility Shifted: Syllabus draft responsibility moved immediately to new instructor with immutable version bump (SMS-023 AC 1).',
          details: res,
        });
      } else if (simAction === 'SUBSTITUTE') {
        const res = await submissionService.assignSubstitute({
          courseCode,
          sectionLabel,
          substituteId: newFacultyId,
          substituteName: newFacultyName,
          reason,
        });
        setSimResult({
          status: 'SUCCESS',
          message:
            'Substitute Co-Instructor Assigned: Substitute granted co-instructor read-only access while primary instructor remains accountable (SMS-023 AC 4).',
          details: res,
        });
      } else {
        const res = await submissionService.withdrawAssignment({
          courseCode,
          sectionLabel,
          reason,
        });
        setSimResult({
          status: 'SUCCESS',
          message:
            'Assignment Withdrawn: Status transitioned to UNASSIGNED without penalty or overdue calculation (SMS-023 AC 3).',
          details: res,
        });
      }
    } catch (err: any) {
      setSimResult({
        status: 'ERROR',
        message: err.message || 'Webhook simulation failed.',
      });
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#580000]" />
            <h1 className="text-2xl font-serif font-bold text-[#580000]">
              FMS Integration &amp; 4-Tier Resilience Gateway
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Faculty Management System (Group 2) • 4-Tier Offline Fallback, Reassignment Engine &amp; Catalog Webhook Queue (SMS-016, SMS-020, SMS-023, SMS-027)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              activeTier === 'WARM_CACHE'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : activeTier === 'EXPIRED_STALE'
                  ? 'bg-amber-50 text-amber-900 border border-amber-300'
                  : 'bg-purple-50 text-purple-900 border border-purple-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                activeTier === 'WARM_CACHE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>FMS State: {activeTier.replace(/_/g, ' ')}</span>
          </span>
          <button
            type="button"
            onClick={handleReconcile}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-full shadow-sm transition-colors"
            title="Manual Operator Reconcile Path (Joint Rehearsal Rule 9)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#580000]" />
            <span>Operator Reconcile</span>
          </button>
        </div>
      </div>

      {/* Reconcile / Notification Banner */}
      {reconcileNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reconcileNotice}</span>
          </div>
          <button
            onClick={() => setReconcileNotice(null)}
            className="font-bold text-xs text-emerald-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4-Tier Cache Demonstration Switcher (For Capstone Defense J1-J16) */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#C8960C]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Interactive 4-Tier Outage Fallback Simulator (SMS-020 / REQ-INT-02)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Joint Demo Gate Control</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSimulateTier(null)}
            className={`py-2 px-3 rounded text-xs font-semibold text-center border transition-all ${
              activeTier === 'WARM_CACHE'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            1. Warm Cache (&lt;5ms)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateTier('EXPIRED_STALE')}
            className={`py-2 px-3 rounded text-xs font-semibold text-center border transition-all ${
              activeTier === 'EXPIRED_STALE'
                ? 'bg-amber-600 text-white border-amber-500 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            2. Expired Stale Banner
          </button>
          <button
            type="button"
            onClick={() => handleSimulateTier('SYNTHETIC_FIXTURE')}
            className={`py-2 px-3 rounded text-xs font-semibold text-center border transition-all ${
              activeTier === 'SYNTHETIC_FIXTURE'
                ? 'bg-purple-600 text-white border-purple-500 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            3. Synthetic Fixtures
          </button>
          <button
            type="button"
            onClick={() => handleSimulateTier('MISSING_FIELD_DEFAULT')}
            className={`py-2 px-3 rounded text-xs font-semibold text-center border transition-all ${
              activeTier === 'MISSING_FIELD_DEFAULT'
                ? 'bg-blue-600 text-white border-blue-500 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            4. Default Fallback
          </button>
        </div>
      </div>

      {/* Main Grid: Profile Lookup & Assignment Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Faculty Profile Lookup */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#580000]" />
              FMS Faculty Profile Ingestion (SMS-016)
            </h2>
            <span className="text-xs text-gray-500">24h Resilient Cache</span>
          </div>

          <p className="text-xs text-gray-600">
            Per Single Source of Truth rules, author identities are read-only and cached. In the event of an FMS outage, syllabus authoring proceeds without interruption.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select FMS Faculty Profile (Fetched from Backend API):
            </label>
            <div className="flex gap-2">
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#580000]"
              >
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fetchProfile(selectedFacultyId)}
                disabled={lookupLoading || !selectedFacultyId}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#580000] text-white text-xs font-semibold rounded-md hover:bg-[#430000] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${lookupLoading ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>
          </div>

          {lookupError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {lookupError}
            </div>
          )}

          {/* Advisory Notice Banner for Stale/Fixture Tier */}
          {profile?.advisory_notice && (
            <div
              className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                profile.source === 'EXPIRED_STALE'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-purple-50 border-purple-300 text-purple-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{profile.advisory_notice}</span>
            </div>
          )}

          {/* Profile Details Card */}
          {profile && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{profile.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{profile.id}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    profile.source === 'WARM_CACHE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : profile.source === 'EXPIRED_STALE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {profile.source.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-200">
                <div>
                  <span className="text-gray-500 block">Academic Rank:</span>
                  <span className="font-semibold text-gray-800">{profile.rank}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Institutional Email:</span>
                  <span className="font-semibold text-gray-800">{profile.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block">Department:</span>
                  <span className="font-semibold text-gray-800">{profile.department}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block">Official Consultation Hours:</span>
                  <span className="font-semibold text-gray-800">{profile.consultation_hours}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Inbound Assignment & Reassignment Simulator */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#580000]" />
              FMS Teaching Assignment Simulator (SMS-023)
            </h2>
            <span className="text-xs text-gray-500">Inbound M2M Webhook</span>
          </div>

          <form onSubmit={handleSimulateWebhook} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                FMS Event Type:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSimAction('REASSIGN')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded border text-center transition-colors ${
                    simAction === 'REASSIGN'
                      ? 'bg-[#580000] text-white border-[#580000]'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  Reassign
                </button>
                <button
                  type="button"
                  onClick={() => setSimAction('SUBSTITUTE')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded border text-center transition-colors ${
                    simAction === 'SUBSTITUTE'
                      ? 'bg-[#580000] text-white border-[#580000]'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  Substitute
                </button>
                <button
                  type="button"
                  onClick={() => setSimAction('WITHDRAW')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded border text-center transition-colors ${
                    simAction === 'WITHDRAW'
                      ? 'bg-[#580000] text-white border-[#580000]'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Course Code</label>
                <select
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs font-mono"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.course_code}>
                      {c.course_code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Block Section
                </label>
                <select
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs font-mono"
                  required
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.display_label}>
                      {s.display_label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {simAction !== 'WITHDRAW' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {simAction === 'SUBSTITUTE' ? 'Substitute ID' : 'New Faculty ID'}
                  </label>
                  <select
                    value={newFacultyId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewFacultyId(val);
                      const found = facultyList.find((f) => f.id === val);
                      if (found) setNewFacultyName(found.name);
                    }}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs font-mono"
                    required
                  >
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.id} ({f.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {simAction === 'SUBSTITUTE' ? 'Substitute Name' : 'New Faculty Name'}
                  </label>
                  <input
                    type="text"
                    value={newFacultyName}
                    onChange={(e) => setNewFacultyName(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter official reason for assignment update..."
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={simLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-2 bg-[#580000] text-white text-xs font-bold rounded hover:bg-[#430000] transition-colors"
            >
              {simLoading ? 'Transmitting...' : 'Trigger Inbound FMS Assignment Webhook'}
            </button>
          </form>

          {simResult && (
            <div
              className={`p-3 rounded border text-xs space-y-1.5 ${
                simResult.status === 'SUCCESS'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>FMS Event Verified</span>
              </div>
              <p>{simResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel 3: Outbound Catalog Change Webhook & Retry Queue (SMS-027) */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#580000]" />
              Outbound Catalog Change Webhook Dispatcher &amp; Retry Queue (SMS-027)
            </h3>
            <p className="text-xs text-gray-500">
              When courses change in SCMS, outbound webhooks notify FMS with automatic 1m, 5m, 15m retry intervals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDispatchCatalogWebhook(false)}
              disabled={dispatchLoading}
              className="px-3 py-1.5 bg-[#580000] text-white text-xs font-bold rounded hover:bg-[#430000] shadow-sm transition-colors"
            >
              Simulate Successful Push
            </button>
            <button
              type="button"
              onClick={() => handleDispatchCatalogWebhook(true)}
              disabled={dispatchLoading}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 shadow-sm transition-colors"
              title="Simulates 503 outage triggering 1m, 5m, 15m retry queue"
            >
              Simulate Failure (Retry Queue)
            </button>
          </div>
        </div>

        {webhookLogs.length === 0 ? (
          <p className="text-xs text-gray-500 py-3 text-center italic">
            No outbound catalog change webhooks recorded yet. Click one of the buttons above to test outbound dispatch.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#580000] text-white">
                <tr>
                  <th className="px-3 py-2">Event ID</th>
                  <th className="px-3 py-2">Event Type</th>
                  <th className="px-3 py-2">Target Course</th>
                  <th className="px-3 py-2">Delivery Status</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Next Retry</th>
                  <th className="px-3 py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {webhookLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{log.event_id}</td>
                    <td className="px-3 py-2 font-bold text-gray-800">{log.event_type}</td>
                    <td className="px-3 py-2 font-semibold text-gray-700">
                      {log.payload?.course_code}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {log.attempt_count}/{log.max_attempts}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-500">
                      {log.next_retry_at ? new Date(log.next_retry_at).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FmsSyncPage;
