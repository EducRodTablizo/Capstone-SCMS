import { complianceService } from './compliance/compliance.service';
import { complianceRepository } from './compliance/compliance.repository';
import WebSocket from 'ws';

async function runSprint6Verification() {
  console.log('===============================================================');
  console.log('🚀 SPRINT 6 AUTOMATED VERIFICATION SUITE');
  console.log('   Modules: SMS-012 (Live Compliance View & Aggregation)');
  console.log('            SMS-013 (Real-Time WebSocket Gateway)');
  console.log('            SMS-024 (Pre-Filled Locked Syllabus Header)');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, failureDetail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${failureDetail || 'Assertion failed'}`);
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: SMS-012 (Live Compliance View & Aggregation)
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: SMS-012 (Live Compliance View & Aggregation) ---');

  // Test 1.1: Aggregation across all 8 canonical statuses (SMS-012 AC 1 & AC 3)
  try {
    const metrics = await complianceService.getMetrics({ term_id: '2026-1T' });
    const c = metrics.status_counts;
    const hasAll8Statuses = (
      typeof c.not_submitted === 'number' &&
      typeof c.submitted === 'number' &&
      typeof c.under_review === 'number' &&
      typeof c.returned === 'number' &&
      typeof c.resubmitted === 'number' &&
      typeof c.approved === 'number' &&
      typeof c.overdue === 'number' &&
      typeof c.unassigned === 'number'
    );
    const sumCounts = (
      c.not_submitted + c.submitted + c.under_review + c.returned + 
      c.resubmitted + c.approved + c.overdue + c.unassigned
    );

    assert(
      hasAll8Statuses && sumCounts === metrics.total_assigned && metrics.total_assigned > 0,
      'SMS-012 AC 1 & AC 3: Aggregation accurately computes counts across all 8 canonical statuses',
      `Total: ${metrics.total_assigned}, Sum of 8 states: ${sumCounts}`
    );
  } catch (err: any) {
    assert(false, 'SMS-012 AC 1 & AC 3: Aggregation accurately computes counts across all 8 canonical statuses', err.message);
  }

  // Test 1.2: Compliance percentage calculation (SMS-012 AC 3)
  try {
    const metrics = await complianceService.getMetrics({ term_id: '2026-1T' });
    const expectedRate = parseFloat(((metrics.status_counts.approved / metrics.total_assigned) * 100).toFixed(1));
    assert(
      metrics.compliance_rate === expectedRate,
      'SMS-012 AC 3: Official compliance rate calculation is mathematically accurate ((Approved / Total) * 100%)',
      `Expected ${expectedRate}%, got ${metrics.compliance_rate}%`
    );
  } catch (err: any) {
    assert(false, 'SMS-012 AC 3: Official compliance rate calculation is mathematically accurate', err.message);
  }

  // Test 1.3: Multi-dimensional filtering by Term & Program (SMS-012 AC 2)
  try {
    const bsitRecords = await complianceService.listRecords({
      term_id: '2026-1T',
      program_code: 'BSIT'
    });
    const allAreBsit = bsitRecords.every(r => r.program_code === 'BSIT' && r.term_id === '2026-1T');
    assert(
      bsitRecords.length > 0 && allAreBsit,
      'SMS-012 AC 2: Compliance roster successfully filters records by Term and Degree Program (BSIT)',
      `Found ${bsitRecords.length} records, all BSIT: ${allAreBsit}`
    );
  } catch (err: any) {
    assert(false, 'SMS-012 AC 2: Compliance roster successfully filters records by Term and Degree Program', err.message);
  }

  // Test 1.4: Filtering by Canonical Status (SMS-012 AC 2)
  try {
    const approvedRecords = await complianceService.listRecords({
      term_id: '2026-1T',
      status: 'Approved'
    });
    const allApproved = approvedRecords.every(r => r.status === 'Approved');
    assert(
      approvedRecords.length > 0 && allApproved,
      'SMS-012 AC 2: Filter by status accurately returns only Approved records',
      `Found ${approvedRecords.length} approved records, all Approved: ${allApproved}`
    );
  } catch (err: any) {
    assert(false, 'SMS-012 AC 2: Filter by status accurately returns only Approved records', err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: SMS-013 (Real-Time Status Synchronizer & Gateway)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: SMS-013 (Real-Time Status Synchronizer & Gateway) ---');

  // Test 2.1: Event Ingestion updates status and recalculates metrics (SMS-013 AC 2)
  try {
    const updatedRecord = await complianceService.handleStatusEvent({
      courseCode: 'COMP 101',
      sectionLabel: 'BSIT 1-1',
      status: 'Submitted',
      submissionId: 'sub-comp101-test',
      fileName: 'COMP_101_Syllabus.pdf',
      versionLabel: 'v1',
      submittedAt: new Date().toISOString()
    });

    const refreshedMetrics = await complianceService.getMetrics({ term_id: '2026-1T' });

    assert(
      updatedRecord !== null && 
      updatedRecord.status === 'Submitted' && 
      updatedRecord.submission_id === 'sub-comp101-test' &&
      refreshedMetrics.status_counts.submitted >= 1,
      'SMS-013 AC 2: Ingested status event immediately updates record status and recalculates metrics',
      `Updated status: ${updatedRecord?.status}`
    );
  } catch (err: any) {
    assert(false, 'SMS-013 AC 2: Ingested status event immediately updates record status', err.message);
  }

  // Test 2.2: Live WebSocket Gateway Connection (SMS-013 AC 1 & AC 3)
  await new Promise<void>((resolve) => {
    try {
      const ws = new WebSocket('ws://localhost:3005/ws');
      let connectedReceived = false;

      ws.on('open', () => {
        // Connected
      });

      ws.on('message', (data: any) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'CONNECTED') {
          connectedReceived = true;
          assert(
            true,
            'SMS-013 AC 1 & AC 3: WebSocket client connects successfully to Live Gateway on ws://localhost:3005/ws'
          );
          ws.close();
          resolve();
        }
      });

      ws.on('error', (err: any) => {
        assert(false, 'SMS-013 AC 1 & AC 3: WebSocket client connects successfully to Live Gateway', err.message);
        resolve();
      });

      // Timeout after 3s
      setTimeout(() => {
        if (!connectedReceived) {
          assert(false, 'SMS-013 AC 1 & AC 3: WebSocket gateway connection timed out');
          ws.close();
          resolve();
        }
      }, 3000);
    } catch (err: any) {
      assert(false, 'SMS-013 AC 1 & AC 3: WebSocket gateway connection error', err.message);
      resolve();
    }
  });

  // -------------------------------------------------------------------------
  // SECTION 3: SMS-024 (Pre-Filled Locked Syllabus Header)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: SMS-024 (Pre-Filled Locked Syllabus Header) ---');

  // Test 3.1: Complete pre-filled header generation (SMS-024 AC 1)
  try {
    const header = await complianceService.getSyllabusHeader('asg-001');
    const hasRequiredFields = (
      header.course_code === 'INTE 401' &&
      header.section_label === 'BSIT 4-1' &&
      header.faculty_name === 'Prof. Juan Dela Cruz' &&
      header.academic_rank === 'Associate Professor II' &&
      Boolean(header.email) &&
      Boolean(header.class_schedule) &&
      Boolean(header.room_assignment)
    );
    assert(
      hasRequiredFields,
      'SMS-024 AC 1: Pre-filled header populates course, section, schedule, room, rank, and faculty profile',
      `Header fields: ${JSON.stringify(header)}`
    );
  } catch (err: any) {
    assert(false, 'SMS-024 AC 1: Pre-filled header populates course, section, schedule, room, rank, and faculty profile', err.message);
  }

  // Test 3.2: Fields are strictly locked in SMS (SMS-024 AC 2)
  try {
    const header = await complianceService.getSyllabusHeader('asg-001');
    assert(
      header.locked === true,
      'SMS-024 AC 2: Pre-filled syllabus header metadata is strictly locked against client edits',
      `Locked value: ${header.locked}`
    );
  } catch (err: any) {
    assert(false, 'SMS-024 AC 2: Pre-filled syllabus header metadata is strictly locked against client edits', err.message);
  }

  // Test 3.3: Default consultation hours fallback when missing from FMS (SMS-024 AC 3)
  try {
    const headerWithMissingHours = await complianceService.getSyllabusHeader('asg-003'); // asg-003 has no consultation_hours
    assert(
      headerWithMissingHours.consultation_hours === 'Mon/Wed 1:00 PM - 3:00 PM (AVR / Faculty Room)',
      'SMS-024 AC 3: Missing consultation hours accurately fall back to standard institutional default',
      `Got consultation hours: '${headerWithMissingHours.consultation_hours}'`
    );
  } catch (err: any) {
    assert(false, 'SMS-024 AC 3: Missing consultation hours accurately fall back to standard institutional default', err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: OVERDUE EVALUATOR (SMS-006, SMS-012)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: AUTOMATED OVERDUE EVALUATION (SMS-006, SMS-012) ---');

  // Test 4.1: Automated overdue detection flags past-due Not Submitted items
  try {
    // Reference date set to future (2026-11-20), past due date (2026-11-15)
    const futureDate = new Date('2026-11-20T00:00:00.000Z');
    const result = await complianceService.evaluateOverdue(futureDate);
    assert(
      result.flagged > 0 && result.records.every(r => r.status === 'Overdue'),
      'SMS-006 / SMS-012: Automated overdue evaluation flags unsubmitted items past deadline as Overdue',
      `Flagged: ${result.flagged}, total evaluated: ${result.evaluated}`
    );
  } catch (err: any) {
    assert(false, 'SMS-006 / SMS-012: Automated overdue evaluation flags unsubmitted items past deadline as Overdue', err.message);
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`🏁 SPRINT 6 VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL SPRINT 6 ACCEPTANCE CRITERIA VERIFIED (100% PASS RATE)');
  } else {
    console.error(`⚠️ ${totalTests - passedTests} TESTS FAILED`);
    process.exit(1);
  }
  console.log('===============================================================\n');
  process.exit(0);
}

runSprint6Verification().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
