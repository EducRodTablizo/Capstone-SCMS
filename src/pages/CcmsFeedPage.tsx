import React, { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Send,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Layers,
  Radio,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import {
  complianceService,
  CcmsSummaryPayload,
  CcmsPushLogItem,
} from '../services/complianceService';
import { AcademicTerm } from '../services/calendarService';
import { useAuth } from '../auth/AuthContext';

export const CcmsFeedPage: React.FC = () => {
  const { user } = useAuth();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermCode, setSelectedTermCode] = useState<string>('');
  const [summary, setSummary] = useState<CcmsSummaryPayload | null>(null);
  const [pushLogs, setPushLogs] = useState<CcmsPushLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pushing, setPushing] = useState<boolean>(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  // CCMS Calendar Fallback State (SMS-034)
  const [calendarSnapshot, setCalendarSnapshot] = useState<any>(null);
  const [activeCcmsTier, setActiveCcmsTier] = useState<string>('WARM_CACHE');

  const loadData = useCallback(async (termOverride?: string) => {
    setLoading(true);
    try {
      const termsRes = await apiClient.get<{ data: AcademicTerm[] }>('/terms');
      const termList = termsRes?.data || [];
      setTerms(termList);
      const activeCode = termOverride || selectedTermCode || termList[0]?.term_code;
      if (activeCode && !selectedTermCode) {
        setSelectedTermCode(activeCode);
      }

      const [summaryRes, logsRes, calRes] = await Promise.all([
        apiClient.get<{ data: CcmsSummaryPayload }>('/compliance/ccms/summary', {
          params: { term_code: activeCode },
        }),
        apiClient.get<{ data: CcmsPushLogItem[] }>('/compliance/ccms/logs'),
        apiClient.get<{ data: any }>('/integrations/ccms/calendar'),
      ]);

      setSummary(summaryRes?.data || null);
      setPushLogs(logsRes?.data || []);
      const calData = calRes?.data || null;
      setCalendarSnapshot(calData);
      if (calData?.cache_state) {
        setActiveCcmsTier(calData.cache_state);
      }
    } catch (err) {
      console.error('Failed to load CCMS feed data:', err);
      setSummary(null);
      setCalendarSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTermCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSimulateCcmsTier = async (tier: string | null) => {
    try {
      await complianceService.simulateResilienceTier('CCMS', tier);
      const calRes = await apiClient.get<{ data: any }>('/integrations/ccms/calendar');
      const cal = calRes?.data || calRes;
      setCalendarSnapshot(cal);
      if (cal?.cache_state) {
        setActiveCcmsTier(cal.cache_state);
      }
    } catch (err) {
      console.error('Failed to simulate CCMS tier:', err);
    }
  };

  const handlePushNow = async () => {
    setPushing(true);
    setPushMessage(null);
    try {
      const res = await complianceService.pushCcmsSummary(user?.name);
      setPushMessage(
        `Successfully transmitted compliance summary to CCMS Gateway! Status: ${res.status} (HTTP ${res.http_status})`
      );
      const logsRes = await apiClient.get<{ data: CcmsPushLogItem[] }>('/compliance/ccms/logs');
      setPushLogs(logsRes?.data || []);
    } catch (err: any) {
      setPushMessage(err.message || 'Transmission failed.');
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-7 h-7 text-[#800000]" />
            <h1 className="text-2xl font-serif font-bold text-gray-900">
              CCMS Integration &amp; 4-Tier Resilience Gateway
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Citizen&apos;s Charter Compliance System (Group 3) • Calendar SSOT, Offline Fallback &amp; Outbound Compliance Push (SMS-018, SMS-019, SMS-034)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {terms.length > 0 && (
            <select
              value={selectedTermCode}
              onChange={(e) => {
                setSelectedTermCode(e.target.value);
                loadData(e.target.value);
              }}
              className="text-xs font-semibold border border-gray-300 rounded-full px-3 py-1 bg-white text-gray-700"
            >
              {terms.map((t) => (
                <option key={t.term_code} value={t.term_code}>
                  Term: {t.term_code} ({t.academic_year})
                </option>
              ))}
            </select>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Zero-PII Certified
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${activeCcmsTier === 'WARM_CACHE'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : activeCcmsTier === 'EXPIRED_STALE'
                  ? 'bg-amber-50 text-amber-900 border border-amber-300'
                  : 'bg-purple-50 text-purple-900 border border-purple-200'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            CCMS Calendar: {activeCcmsTier.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* 4-Tier Calendar Outage Simulator (SMS-034) */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#C8960C]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              CCMS Calendar Outage Fallback Simulator (SMS-034)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Defense Demo Control</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleSimulateCcmsTier(null)}
            className={`py-2 px-3 rounded text-xs font-semibold text-center border transition-all ${activeCcmsTier === 'WARM_CACHE'
                ? 'bg-blue-600 text-white border-blue-500 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
          >
            1. Warm Cache (Live Synced)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateCcmsTier('EXPIRED_STALE')}
            className={`py-2 px-3 rounded text-xs font-semibold text-center border transition-all ${activeCcmsTier === 'EXPIRED_STALE'
                ? 'bg-amber-600 text-white border-amber-500 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
          >
            2. Expired Stale Notice Banner
          </button>
          <button
            type="button"
            onClick={() => handleSimulateCcmsTier('SYNTHETIC_FIXTURE')}
            className={`py-2 px-3 rounded text-xs font-semibold text-center border transition-all ${activeCcmsTier === 'SYNTHETIC_FIXTURE'
                ? 'bg-purple-600 text-white border-purple-500 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
          >
            3. Cold Start Synthetic Sample
          </button>
        </div>
      </div>

      {/* Advisory Notice Banner for Stale Calendar */}
      {calendarSnapshot?.advisory_notice && (
        <div
          className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${calendarSnapshot.cache_state === 'EXPIRED_STALE'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-purple-50 border-purple-300 text-purple-900'
            }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{calendarSnapshot.advisory_notice}</span>
        </div>
      )}

      {/* Grid: Calendar Ingestion & Outbound Push Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: CCMS Calendar Ingestion & Intelligent Deadlines */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#800000]" />
              CCMS Academic Calendar Feed (SMS-018, SMS-034)
            </h2>
            <span className="text-xs text-gray-500">Inbound Calendar SSOT</span>
          </div>

          <p className="text-xs text-gray-600">
            Term dates and statutory holidays originate strictly from CCMS. SCMS executes intelligent server-side deadline calculations without altering institutional dates.
          </p>

          {loading ? (
            <div className="p-4 text-center text-xs text-gray-500">
              Loading CCMS calendar snapshot...
            </div>
          ) : calendarSnapshot ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Canonical Term Code:</span>
                <span className="font-bold text-gray-900 font-mono">
                  {calendarSnapshot.term_code} ({calendarSnapshot.academic_year}{' '}
                  {calendarSnapshot.semester})
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Official Term Duration:</span>
                <span className="font-semibold text-gray-800">
                  {calendarSnapshot.start_date} — {calendarSnapshot.end_date}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Submission Deadline:</span>
                <span className="font-semibold text-gray-800">
                  {calendarSnapshot.submission_deadline}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Intelligent Cut-Off Rule:</span>
                <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  23:59:59 Asia/Manila (SMS-033)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-gray-500">
              No calendar snapshot available.
            </div>
          )}

          <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2 text-xs">
            <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-700" />
              Intraday Suspension Pushout Engine (SMS-033)
            </h4>
            <p className="text-blue-800">
              Per university policy, Sundays and statutory holidays are excluded from deadline calculations. In the event of typhoon or heat-index class suspensions declared via CCMS, deadlines push out automatically to the next regular class day at 23:59:59.
            </p>
          </div>
        </div>

        {/* Panel 2: Outbound CCMS Compliance Summary Push */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-[#800000]" />
              Outbound Compliance Summary Push (SMS-019)
            </h2>
            <button
              onClick={handlePushNow}
              disabled={pushing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#800000] text-white text-xs font-bold rounded hover:bg-[#600000] transition-colors disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${pushing ? 'animate-spin' : ''}`} />
              {pushing ? 'Transmitting...' : 'Push to CCMS Now'}
            </button>
          </div>

          {/* Metric cards */}
          {summary && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 border border-gray-200 p-2.5 rounded">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Assigned</span>
                <span className="text-lg font-bold text-gray-900">
                  {summary.total_courses_offered}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                  Approved
                </span>
                <span className="text-lg font-bold text-emerald-700">
                  {summary.total_syllabi_approved}
                </span>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-2.5 rounded">
                <span className="text-[10px] text-purple-800 uppercase font-bold block">
                  Compliance
                </span>
                <span className="text-lg font-bold text-purple-700">
                  {summary.compliance_rate_percentage}%
                </span>
              </div>
            </div>
          )}

          {/* Push Result Banner */}
          {pushMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pushMessage}</span>
            </div>
          )}

          {/* JSON Payload Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <span>M2M Payload Structure (HMAC SHA-256 Signed):</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">
                Zero-PII Validated ({pushLogs.length} logs)
              </span>
            </div>
            <pre className="bg-gray-900 text-emerald-400 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed">
              {summary ? JSON.stringify(summary, null, 2) : 'Loading CCMS summary payload...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CcmsFeedPage;
