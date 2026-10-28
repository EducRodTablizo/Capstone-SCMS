import { submissionService } from './submissions/submission.service';
import { submissionRepository } from './submissions/submission.repository';

async function runSprint17IntakeTests() {
  console.log('===============================================================');
  console.log('🧪 SMS-017 FMS TEACHING ASSIGNMENT INTAKE VERIFICATION SUITE');
  console.log('   Endpoint: POST /api/v1/integrations/fms/assignments/approved');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // Reset repository state before running tests
  submissionRepository.clearForTesting();

  // -------------------------------------------------------------------------
  // TEST 1: Successful creation of a Not Submitted entry (SMS-017 AC 1 & AC 2)
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Initial Approved Assignment Creation (SMS-017 AC 1 & AC 2) ---');
  try {
    const initialPayload = {
      assignment_id: 'ta-2026-0081',
      assignment_version: 2,
      academic_term_id: 'term-2026-1s',
      course_id: 'crs-inte401',
      block_section_id: 'sec-bsit-4-1',
      faculty_id: 'fac-1092',
      assignment_status: 'APPROVED',
      schedule: null,
    };

    const res = await submissionService.ingestApprovedAssignment(initialPayload);
    const allEntries = await submissionRepository.listAll();

    assert(
      res.statusCode === 201 && res.action === 'CREATED',
      'Returns HTTP 201 Created for new approved teaching assignment'
    );
    assert(
      res.data.status === 'Not Submitted',
      'Sets initial compliance status to Not Submitted (AC 2)'
    );
    assert(
      res.data.course_code === 'INTE 401' && res.data.section_label === 'BSIT 4-1',
      'Resolves course_code (INTE 401) and section_label (BSIT 4-1) accurately'
    );
    assert(
      allEntries.length === 1 && allEntries[0].assignment_id === 'ta-2026-0081',
      'Creates exactly ONE tracking entry in PostgreSQL submissions table (AC 2)'
    );
  } catch (err: any) {
    assert(false, 'Initial Approved Assignment Creation failed', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Idempotency - Sending the same version returns 409 (SMS-017 AC 3)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Idempotency / Same Version Rejection (SMS-017 AC 3) ---');
  try {
    let statusCode = 0;
    try {
      await submissionService.ingestApprovedAssignment({
        assignment_id: 'ta-2026-0081',
        assignment_version: 2,
        academic_term_id: 'term-2026-1s',
        course_id: 'crs-inte401',
        block_section_id: 'sec-bsit-4-1',
        faculty_id: 'fac-1092',
        assignment_status: 'APPROVED',
        schedule: null,
      });
    } catch (err: any) {
      statusCode = err.statusCode;
    }

    const allEntries = await submissionRepository.listAll();
    assert(
      statusCode === 409 && allEntries.length === 1,
      'Sending the same assignment_version returns HTTP 409 Conflict and does not duplicate records'
    );
  } catch (err: any) {
    assert(false, 'Same version check failed', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Stale Version - Sending older version returns 409 (SMS-017 AC 3)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Stale Version Rejection (SMS-017 AC 3) ---');
  try {
    let statusCode = 0;
    try {
      await submissionService.ingestApprovedAssignment({
        assignment_id: 'ta-2026-0081',
        assignment_version: 1, // Older than stored v2
        academic_term_id: 'term-2026-1s',
        course_id: 'crs-inte401',
        block_section_id: 'sec-bsit-4-1',
        faculty_id: 'fac-1092',
        assignment_status: 'APPROVED',
        schedule: null,
      });
    } catch (err: any) {
      statusCode = err.statusCode;
    }

    assert(
      statusCode === 409,
      'Sending an older assignment_version (< stored version) returns HTTP 409 Conflict (Stale Version)'
    );
  } catch (err: any) {
    assert(false, 'Stale version check failed', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Schedule Update - Updates schedule only, status remains (SMS-017 AC 4)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Schedule Finalization Update (SMS-017 AC 4) ---');
  try {
    const scheduleRes = await submissionService.ingestApprovedAssignment({
      assignment_id: 'ta-2026-0081',
      assignment_version: 3,
      academic_term_id: 'term-2026-1s',
      course_id: 'crs-inte401',
      block_section_id: 'sec-bsit-4-1',
      faculty_id: 'fac-1092',
      assignment_status: 'SCHEDULE_FINALIZED',
      schedule: {
        schedule_day_time: 'Mon/Thu 1:00 PM - 3:30 PM',
        room_id: 'room-lab-03',
        room_label: 'Computer Lab 3',
      },
    });

    assert(
      scheduleRes.statusCode === 200 && scheduleRes.action === 'SCHEDULE_UPDATED',
      'Schedule update with higher version returns HTTP 200 OK (SCHEDULE_UPDATED)'
    );
    assert(
      scheduleRes.data.status === 'Not Submitted',
      'Compliance status remains untouched as Not Submitted (AC 4)'
    );
    assert(
      scheduleRes.data.schedule?.room_label === 'Computer Lab 3' &&
      scheduleRes.data.schedule?.schedule_day_time === 'Mon/Thu 1:00 PM - 3:30 PM' &&
      scheduleRes.data.fms_assignment_version === 3,
      'Schedule details and assignment_version (v3) are persisted in submission record (AC 4)'
    );
  } catch (err: any) {
    assert(false, 'Schedule update check failed', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Course Validation - Empty course_id returns 422 (SMS-017 AC 5)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Empty Course ID Validation (SMS-017 AC 5) ---');
  try {
    let statusCode = 0;
    try {
      await submissionService.ingestApprovedAssignment({
        assignment_id: 'ta-2026-0099',
        assignment_version: 1,
        academic_term_id: 'term-2026-1s',
        course_id: '',
        block_section_id: 'sec-bsit-4-1',
        faculty_id: 'fac-1092',
        assignment_status: 'APPROVED',
        schedule: null,
      });
    } catch (err: any) {
      statusCode = err.statusCode;
    }

    assert(
      statusCode === 422,
      'Empty course_id is rejected with HTTP 422 Unprocessable Entity (AC 5)'
    );
  } catch (err: any) {
    assert(false, 'Empty course_id check failed', err.message);
  }

  console.log('\n===============================================================');
  console.log(`📊 SMS-017 INTAKE VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runSprint17IntakeTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

