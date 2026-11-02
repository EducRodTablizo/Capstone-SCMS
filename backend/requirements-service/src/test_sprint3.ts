import jwt from 'jsonwebtoken';
import http from 'http';
import { app } from './main';
import { calendarRepository } from './calendar/calendar.repository';
import { deadlineEngine } from './calendar/deadline.engine';

const JWT_SECRET = process.env.JWT_SECRET || 'scms_jwt_secret_dev_key_2026_super_secure';

async function runSprint3Verification() {
  console.log('================================================================');
  console.log('  SCMS SPRINT 3 VERIFICATION TEST SUITE');
  console.log('  Target: SMS-018 (Terms), SMS-032 (Calendar Push), SMS-033 (Deadlines), SMS-005 (Lifecycle)');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3097, resolve));
  const baseUrl = 'http://localhost:3097/api/v1';

  const academicHeadToken = jwt.sign(
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'academic.head@pup.edu.ph',
      role: 'ACADEMIC_HEAD',
      first_name: 'Academic',
      last_name: 'Head',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const facultyToken = jwt.sign(
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'faculty@pup.edu.ph',
      role: 'FACULTY_STAFF',
      first_name: 'Faculty',
      last_name: 'Staff',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details: string) {
    if (condition) {
      console.log(`  ✅ PASS - ${name}: ${details}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL - ${name}: ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Suite 1: SMS-032 CCMS Calendar Snapshot Push Ingestion
    // -------------------------------------------------------------
    console.log('[Suite 1: SMS-032 CCMS Calendar Ingestion]');

    const testSyncId = `test-sync-${Date.now()}`;
    const syncPayload = {
      sync_id: testSyncId,
      schema_version: '1.0.0',
      timestamp: new Date().toISOString(),
      academic_term: {
        academic_year: '2026-2027',
        semester_number: 1,
        semester_label: '1ST_SEMESTER',
        term_code: '2026-1S',
        display_label: 'A.Y. 2026-2027 1st Semester',
        start_date: '2026-09-01',
        end_date: '2027-01-30',
      },
      holidays: [
        {
          event_id: 'hol-test-01',
          date: '2026-10-30',
          name: 'Barangay and SK Elections',
          entry_type: 'SPECIAL_NON_WORKING',
          applies_to: 'BOTH',
        },
        {
          event_id: 'hol-test-02',
          date: '2026-11-01',
          name: 'All Saints Day',
          entry_type: 'SPECIAL_NON_WORKING',
          applies_to: 'BOTH',
        },
      ],
    };

    const pushRes = await fetch(`${baseUrl}/calendar/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    });
    const pushData = await pushRes.json();
    assert(
      'SMS-032 AC1/2: Ingest CCMS Calendar Snapshot',
      pushRes.status === 200 && pushData.status === 'PROCESSED',
      `Snapshot ingested with status '${pushData.status}', HTTP 200`
    );

    // Test Idempotency (SMS-032 AC3)
    const duplicatePushRes = await fetch(`${baseUrl}/calendar/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    });
    const duplicateData = await duplicatePushRes.json();
    assert(
      'SMS-032 AC3: Idempotent Push Acknowledgment',
      duplicatePushRes.status === 200 && duplicateData.status === 'ALREADY_PROCESSED',
      `Duplicate sync ID acknowledged as '${duplicateData.status}' without duplicate work`
    );

    // -------------------------------------------------------------
    // Suite 2: SMS-018 Academic Terms SSOT & Submission Window
    // -------------------------------------------------------------
    console.log('\n[Suite 2: SMS-018 Academic Terms & Submission Windows]');

    const activeTermRes = await fetch(`${baseUrl}/terms/active`, {
      headers: { Authorization: `Bearer ${academicHeadToken}` },
    });
    const activeTermData = await activeTermRes.json();
    assert(
      'SMS-018 AC1: Retrieve Active Academic Term',
      activeTermRes.status === 200 && activeTermData.data?.term_code === '2026-1S',
      `Active term code is '${activeTermData.data?.term_code}', status HTTP 200`
    );

    // Faculty blocked from editing submission window (SMS-018 AC3)
    const facultyWindowRes = await fetch(`${baseUrl}/terms/2026-1S/submission-window`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        window_start: '2026-10-01T00:00:00Z',
        window_end: '2026-11-15T23:59:59Z',
      }),
    });
    assert(
      'SMS-018 AC3: Faculty Blocked from Updating Submission Window (HTTP 403)',
      facultyWindowRes.status === 403,
      `Expected HTTP 403 Forbidden, got HTTP ${facultyWindowRes.status}`
    );

    // Academic Head updates submission window (SMS-018 AC3)
    const ahWindowRes = await fetch(`${baseUrl}/terms/2026-1S/submission-window`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        window_start: '2026-10-01T00:00:00Z',
        window_end: '2026-11-15T23:59:59Z',
      }),
    });
    const ahWindowData = await ahWindowRes.json();
    assert(
      'SMS-018 AC3: Academic Head Sets Term Submission Window',
      ahWindowRes.status === 200 && ahWindowData.data?.submission_window_start !== null,
      `Submission window configured successfully: ${ahWindowData.message}`
    );

    // -------------------------------------------------------------
    // Suite 3: SMS-033 Calendar-Aware Intelligent Deadline Engine
    // -------------------------------------------------------------
    console.log('\n[Suite 3: SMS-033 Intelligent Deadline Engine]');

    // Case A: Candidate deadline is Friday Oct 30, 2026 (Barangay Election Holiday)
    // Oct 30 (Fri Holiday) -> Oct 31 (Sat Weekend) -> Nov 1 (Sun Holiday) -> Nov 2 (Mon Working Day) at 23:59:59
    const calcHolidayRes = await fetch(`${baseUrl}/calendar/calculate-deadline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        deadline: '2026-10-30T17:00:00',
        term_code: '2026-1S',
      }),
    });
    const calcHolidayData = await calcHolidayRes.json();
    const adjDate = calcHolidayData.data?.adjusted_deadline;
    assert(
      'SMS-033 AC2/3: Multi-Day Holiday & Weekend Roll-Forward',
      adjDate && adjDate.startsWith('2026-11-02') && adjDate.includes('23:59:59'),
      `Candidate 2026-10-30 pushed out past weekend to: ${adjDate}`
    );

    assert(
      'SMS-033 AC1: Strict 23:59:59 Cut-Off Enforcement',
      adjDate && adjDate.includes('23:59:59'),
      `Deadline cutoff timestamp contains exact 23:59:59`
    );

    // Case B: Regular working day Wednesday Oct 28
    const calcRegularRes = await fetch(`${baseUrl}/calendar/calculate-deadline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        deadline: '2026-10-28T14:30:00',
        term_code: '2026-1S',
      }),
    });
    const calcRegularData = await calcRegularRes.json();
    assert(
      'SMS-033 AC1: Regular Working Day Standard Cut-Off',
      calcRegularData.data?.adjusted_deadline?.startsWith('2026-10-28T23:59:59'),
      `Regular working day preserved at 2026-10-28T23:59:59`
    );

    // -------------------------------------------------------------
    // Suite 4: SMS-005 Requirement Deadlines & Lifecycle
    // -------------------------------------------------------------
    console.log('\n[Suite 4: SMS-005 Requirement Deadlines & Lifecycle]');

    // 1. Create requirement in DRAFT
    const createReqRes = await fetch(`${baseUrl}/requirements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        program_code: 'BSIT',
        term_code: '2026-1S',
        name: 'Sprint 3 Syllabus Submission Requirement',
        description: 'Official test requirement for Sprint 3',
        deadline_at: '2026-10-30T17:00:00',
      }),
    });
    const createReqData = await createReqRes.json();
    const reqId = createReqData.data?.id;
    assert(
      'SMS-005 AC1: Requirement Created with Adjusted Deadline',
      createReqRes.status === 201 && createReqData.data?.deadline_at.startsWith('2026-11-02'),
      `Created requirement ID ${reqId} with auto-adjusted deadline ${createReqData.data?.deadline_at}`
    );

    // 2. Draft is hidden from Faculty (SMS-005 AC3)
    const facultyReqListRes = await fetch(`${baseUrl}/requirements`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const facultyReqListData = await facultyReqListRes.json();
    const hasDraft = facultyReqListData.data?.some((r: any) => r.id === reqId);
    assert(
      'SMS-005 AC3: DRAFT Requirement Hidden from Faculty Staff',
      !hasDraft,
      `Draft requirement ${reqId} is hidden from Faculty Staff list`
    );

    // 3. Academic Head publishes requirement (SMS-005 AC2)
    const publishRes = await fetch(`${baseUrl}/requirements/${reqId}/publish`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${academicHeadToken}` },
    });
    const publishData = await publishRes.json();
    assert(
      'SMS-005 AC2: Academic Head Publishes Requirement',
      publishRes.status === 200 && publishData.data?.status === 'PUBLISHED',
      `Requirement transitioned to PUBLISHED status: ${publishData.message}`
    );

    // 4. Faculty can now see published requirement (SMS-005 AC3)
    const facultyPublishedRes = await fetch(`${baseUrl}/requirements`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    const facultyPublishedData = await facultyPublishedRes.json();
    const nowVisible = facultyPublishedData.data?.some((r: any) => r.id === reqId && r.status === 'PUBLISHED');
    assert(
      'SMS-005 AC3: PUBLISHED Requirement Visible to Faculty Staff',
      nowVisible,
      `Published requirement ${reqId} is now visible to Faculty Staff`
    );

    // 5. Academic Head closes requirement (SMS-005 AC2)
    const closeRes = await fetch(`${baseUrl}/requirements/${reqId}/close`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${academicHeadToken}` },
    });
    const closeData = await closeRes.json();
    assert(
      'SMS-005 AC2: Academic Head Closes Requirement',
      closeRes.status === 200 && closeData.data?.status === 'CLOSED',
      `Requirement transitioned to CLOSED status: ${closeData.message}`
    );

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`  🎉 SUMMARY: ${passed}/${passed + failed} SPRINT 3 TESTS PASSED!`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSprint3Verification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
