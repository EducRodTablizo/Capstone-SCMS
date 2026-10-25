import React, { useState } from 'react';
import { Shield, RefreshCw, UserCheck, ArrowRightLeft, UserX, CheckCircle, AlertTriangle, Activity, Database, Clock } from 'lucide-react';
import { submissionService } from '../services/submissionService';

interface MockFacultyProfile {
  id: string;
  name: string;
  email: string;
  rank: string;
  department: string;
  consultation_hours: string;
  source: 'FMS_LIVE' | 'WARM_CACHE_24H' | 'SYNTHETIC_FIXTURE';
}

const PRESET_FACULTY: MockFacultyProfile[] = [
  {
    id: 'fac-prof-delacruz',
    name: 'Prof. Juan Dela Cruz',
    email: 'jdelacruz@pup.edu.ph',
    rank: 'Associate Professor II',
    department: 'Department of Information Technology',
    consultation_hours: 'Mon/Wed 1:00 PM - 3:00 PM (AVR / Faculty Room)',
    source: 'WARM_CACHE_24H'
  },
  {
    id: 'fac-prof-donayre',
    name: 'Prof. Juan Donayre',
    email: 'jdonayre@pup.edu.ph',
    rank: 'Assistant Professor I',
    department: 'Department of Information Technology',
    consultation_hours: 'Tue/Thu 9:00 AM - 11:00 AM via MS Teams',
    source: 'FMS_LIVE'
  },
  {
    id: 'fac-prof-santos',
    name: 'Dr. Maria Santos',
    email: 'msantos@pup.edu.ph',
    rank: 'Professor IV / Academic Head',
    department: 'Office of the Academic Head',
    consultation_hours: 'Daily by appointment via Academic Head Office',
    source: 'WARM_CACHE_24H'
  }
];

export const FmsSyncPage: React.FC = () => {
  const [selectedFacultyId, setSelectedFacultyId] = useState(PRESET_FACULTY[0].id);
  const [profile, setProfile] = useState<MockFacultyProfile>(PRESET_FACULTY[0]);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Simulation form state
  const [simAction, setSimAction] = useState<'REASSIGN' | 'SUBSTITUTE' | 'WITHDRAW'>('REASSIGN');
  const [courseCode, setCourseCode] = useState('INTE 401');
  const [sectionLabel, setSectionLabel] = useState('BSIT 4-1');
  const [newFacultyId, setNewFacultyId] = useState('fac-prof-donayre');
  const [newFacultyName, setNewFacultyName] = useState('Prof. Juan Donayre');
  const [reason, setReason] = useState('Department faculty load rebalancing');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const handleLookup = (id: string) => {
    setSelectedFacultyId(id);
    setLookupLoading(true);
    setTimeout(() => {
      const found = PRESET_FACULTY.find(f => f.id === id) || {
        id,
        name: 'Faculty Staff Member (' + id + ')',
        email: id + '@pup.edu.ph',
        rank: 'Instructor I',
        department: 'Department of Information Technology',
        consultation_hours: 'By appointment via MS Teams (Default)',
        source: 'SYNTHETIC_FIXTURE'
      };
      setProfile(found);
      setLookupLoading(false);
    }, 400);
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
          reason
        });
        setSimResult({
          status: 'SUCCESS',
          message: res.reassignmentType === 'APPROVED_ADOPTED'
            ? 'Approved Syllabus Adopted: Target section has an approved syllabus. The new instructor has successfully adopted it (SMS-023 AC 2).'
            : 'Unapproved Responsibility Shifted: Syllabus draft responsibility moved immediately to new instructor with immutable version bump (SMS-023 AC 1).',
          details: res
        });
      } else if (simAction === 'SUBSTITUTE') {
        const res = await submissionService.assignSubstitute({
          courseCode,
          sectionLabel,
          substituteId: newFacultyId,
          substituteName: newFacultyName,
          reason
        });
        setSimResult({
          status: 'SUCCESS',
          message: 'Substitute Co-Instructor Assigned: Substitute granted co-instructor read-only access while primary instructor remains accountable (SMS-023 AC 4).',
          details: res
        });
      } else {
        const res = await submissionService.withdrawAssignment({
          courseCode,
          sectionLabel,
          reason
        });
        setSimResult({
          status: 'SUCCESS',
          message: 'Assignment Withdrawn: Status transitioned to UNASSIGNED without penalty or overdue calculation (SMS-023 AC 3).',
          details: res
        });
      }
    } catch (err: any) {
      setSimResult({
        status: 'ERROR',
        message: err.message || 'Webhook simulation failed.'
      });
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#800000]" />
            <h1 className="text-2xl font-serif font-bold text-gray-900">
              FMS Integration & Profile Lookup
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Faculty Management System (Group 2) M2M Ingestion Gateway • 24h Profile Cache & Teaching Assignment Sync (SMS-016, SMS-023)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            M2M Contract: ACTIVE (TLS 1.3)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            24h Profile Cache: WARM
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Faculty Profile Lookup */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#800000]" />
              FMS Faculty Profile Ingestion (SMS-016)
            </h2>
            <span className="text-xs text-gray-500">Read-Only Cached Master</span>
          </div>

          <p className="text-xs text-gray-600">
            Per Single Source of Truth (SSOT) rules, faculty profiles cannot be modified in SCMS. Author details are read-only and cached for 24 hours.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select or Enter FMS Faculty ID:
            </label>
            <div className="flex gap-2">
              <select
                value={selectedFacultyId}
                onChange={(e) => handleLookup(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
              >
                {PRESET_FACULTY.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleLookup(selectedFacultyId)}
                disabled={lookupLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#800000] text-white text-xs font-semibold rounded-md hover:bg-[#600000] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${lookupLoading ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>
          </div>

          {/* Render Profile Card */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{profile.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{profile.id}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                profile.source === 'FMS_LIVE' ? 'bg-emerald-100 text-emerald-800' :
                profile.source === 'WARM_CACHE_24H' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
              }`}>
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

          <div className="text-[11px] text-gray-500 bg-amber-50 p-2.5 rounded border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>SSOT Policy:</strong> Faculty profile updates made in FMS propagate to SCMS automatically on the next scheduled cache poll or on-demand PDF generation.
            </span>
          </div>
        </div>

        {/* Panel 2: Inbound Assignment & Reassignment Simulator */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#800000]" />
              FMS Teaching Assignment Simulator (SMS-023)
            </h2>
            <span className="text-xs text-gray-500">Inbound M2M Webhook</span>
          </div>

          <p className="text-xs text-gray-600">
            Simulate incoming teaching assignment changes from FMS to verify automated responsibility transfer, substitute permissions, and unassigned status handling.
          </p>

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
                      ? 'bg-[#800000] text-white border-[#800000]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Reassign
                </button>
                <button
                  type="button"
                  onClick={() => setSimAction('SUBSTITUTE')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded border text-center transition-colors ${
                    simAction === 'SUBSTITUTE'
                      ? 'bg-[#800000] text-white border-[#800000]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Substitute
                </button>
                <button
                  type="button"
                  onClick={() => setSimAction('WITHDRAW')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded border text-center transition-colors ${
                    simAction === 'WITHDRAW'
                      ? 'bg-[#800000] text-white border-[#800000]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Course Code</label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Block Section</label>
                <input
                  type="text"
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {simAction !== 'WITHDRAW' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {simAction === 'SUBSTITUTE' ? 'Substitute Faculty ID' : 'New Faculty ID'}
                  </label>
                  <input
                    type="text"
                    value={newFacultyId}
                    onChange={(e) => setNewFacultyId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs font-mono"
                    required
                  />
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">Change Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={simLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-2 bg-[#800000] text-white text-xs font-bold rounded hover:bg-[#600000] transition-colors"
            >
              {simLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Transmitting M2M Webhook Event...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Trigger Inbound FMS Webhook Event
                </>
              )}
            </button>
          </form>

          {/* Simulation Result Box */}
          {simResult && (
            <div className={`p-3 rounded border text-xs space-y-1.5 ${
              simResult.status === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {simResult.status === 'SUCCESS' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{simResult.status === 'SUCCESS' ? 'FMS Webhook Ingested & Verified' : 'Simulation Error'}</span>
              </div>
              <p>{simResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contract & Architecture Reference */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#800000]" />
          FMS $\longleftrightarrow$ SCMS Integration Contract Architecture (J1–J16 Compliance)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div className="bg-white p-3 rounded border border-gray-200">
            <p className="font-bold text-gray-800 mb-1">1. Academic Catalog SSOT</p>
            <p>SCMS is the sole owner of Degree Programs (SMS-021), Course Master records (SMS-022), and Block Sections (SMS-031). FMS consumes catalog records via cursor-paged endpoints.</p>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <p className="font-bold text-gray-800 mb-1">2. Faculty & Assignments SSOT</p>
            <p>FMS is the sole owner of Faculty Profiles and Teaching Assignments. Teaching assignment changes push to SCMS via webhooks to auto-create and update compliance records.</p>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <p className="font-bold text-gray-800 mb-1">3. 4-Tier Offline Resiliency</p>
            <p>If FMS is unreachable, SCMS operates uninterrupted across 4 tiers: Warm Cache $\rightarrow$ Expired Stale Notice $\rightarrow$ Certified Synthetic Fixtures $\rightarrow$ Default Fallbacks.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FmsSyncPage;
