import { submissionService } from './submissions/submission.service';
import { submissionRepository } from './submissions/submission.repository';
import { auditLogService } from '../../audit-log-service/src/audit/audit.service';

async function runSprint4Verification() {
  console.log('===============================================================');
  console.log('🧪 SPRINT 4 AUTOMATED VERIFICATION SUITE');
  console.log('   Modules: SCMS-008 (Syllabus Submission File/Form)');
  console.log('            SCMS-009 (Status Lifecycle Management)');
  console.log('            SCMS-015 (Read-Only Audit Log Viewer)');
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

  // Clean state before running test suite
  submissionRepository.clearForTesting();

  // -------------------------------------------------------------------------
  // TEST 1: SCMS-008 AC 1 & AC 3 - Valid File Submission
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Valid Syllabus File Submission (SCMS-008 AC 1 & AC 3) ---');
  try {
    const sub = await submissionService.submitSyllabus({
      requirementId: 'req-2026-1s-bsit',
      requirementStatus: 'PUBLISHED',
      facultyId: 'fac-prof-delacruz',
      facultyName: 'Prof. Juan Dela Cruz',
      courseCode: 'INTE 401',
      sectionLabel: 'BSIT 4-1',
      mode: 'FILE_UPLOAD',
      fileName: 'INTE_401_Syllabus_2026.pdf',
      fileSize: 4.5 * 1024 * 1024 // 4.5MB
    });

    assert(sub.status === 'Submitted', 'Initial file submission transitions status to Submitted');
    assert(!!sub.submitted_at, 'Server-side submission timestamp is automatically recorded');
    assert(sub.course_code === 'INTE 401' && sub.section_label === 'BSIT 4-1', 'Course and section bindings are accurate');
  } catch (err: any) {
    assert(false, 'Valid submission threw error: ' + err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: SCMS-008 AC 2 - File Format Validation
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing File Type & Size Rejection (SCMS-008 AC 2) ---');
  try {
    submissionService.validateFile('syllabus.exe', 1024);
    assert(false, 'Should reject .exe file format');
  } catch (err: any) {
    assert(err.message.includes('Invalid file format'), 'Rejects non-PDF/DOCX file formats with clear error');
  }

  try {
    submissionService.validateFile('syllabus.pdf', 30 * 1024 * 1024); // 30MB
    assert(false, 'Should reject file exceeding 25MB');
  } catch (err: any) {
    assert(err.message.includes('exceeds maximum allowed limit of 25MB'), 'Rejects file > 25MB limit with clear error');
  }

  // -------------------------------------------------------------------------
  // TEST 3: SCMS-008 AC 3 - Guard against Closed Requirements
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Closed Requirement Guard (SCMS-008 AC 3) ---');
  try {
    await submissionService.submitSyllabus({
      requirementId: 'req-archived',
      requirementStatus: 'CLOSED',
      facultyId: 'fac-01',
      courseCode: 'INTE 401',
      sectionLabel: 'BSIT 4-1',
      mode: 'FILE_UPLOAD',
      fileName: 'INTE_401.pdf',
      fileSize: 1024
    });
    assert(false, 'Should block submissions to CLOSED requirements');
  } catch (err: any) {
    assert(err.message.includes('CLOSED requirements are strictly prohibited'), 'Blocks submissions to closed requirements');
  }

  // -------------------------------------------------------------------------
  // TEST 4: SCMS-009 AC 1 - Status Lifecycle & State Machine Transitions
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Status Lifecycle Transitions (SCMS-009 AC 1) ---');
  const baseSub = await submissionRepository.create({
    requirement_id: 'req-01',
    faculty_id: 'fac-01',
    course_code: 'INTE 401',
    section_label: 'BSIT 4-2',
    status: 'Submitted',
    file_name: 'test.pdf'
  });

  // Submitted -> Under Review (Allowed)
  const underReview = await submissionService.transitionStatus({
    submissionId: baseSub.id,
    targetStatus: 'Under Review',
    actorId: 'acad-head-01',
    actorName: 'Dr. Maria Santos',
    actorRole: 'ACADEMIC_HEAD'
  });
  assert(underReview.status === 'Under Review', 'Valid transition: Submitted -> Under Review');

  // Under Review -> Returned with comment (Allowed)
  const reviewResult = await submissionService.recordReviewDecision({
    submissionId: baseSub.id,
    reviewerId: 'acad-head-01',
    reviewerName: 'Dr. Maria Santos',
    decision: 'Returned',
    comment: 'Please align Course Learning Outcome #3 with 2024 OBTL standard.'
  });
  assert(reviewResult.submission.status === 'Returned', 'Review decision: Under Review -> Returned');
  assert(reviewResult.review.comment.includes('align Course Learning Outcome #3'), 'Mandatory actionable comment stored');

  // Returned -> Resubmitted (Allowed revision loop)
  const resubmitted = await submissionService.submitSyllabus({
    submissionId: baseSub.id,
    requirementId: 'req-01',
    facultyId: 'fac-01',
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-2',
    mode: 'FILE_UPLOAD',
    fileName: 'INTE_401_Revision_v2.pdf',
    fileSize: 2 * 1024 * 1024
  });
  assert(resubmitted.status === 'Resubmitted', 'Revision upload transitions status to Resubmitted');

  // Resubmitted -> Under Review -> Approved
  await submissionService.transitionStatus({
    submissionId: baseSub.id,
    targetStatus: 'Under Review',
    actorId: 'acad-head-01',
    actorName: 'Dr. Maria Santos',
    actorRole: 'ACADEMIC_HEAD'
  });
  const approvedResult = await submissionService.recordReviewDecision({
    submissionId: baseSub.id,
    reviewerId: 'acad-head-01',
    reviewerName: 'Dr. Maria Santos',
    decision: 'Approved',
    comment: 'All outcomes verified compliant.'
  });
  assert(approvedResult.submission.status === 'Approved', 'Final approval: Under Review -> Approved');

  // Illegal Transition check: Approved directly to Returned is blocked
  try {
    await submissionService.transitionStatus({
      submissionId: baseSub.id,
      targetStatus: 'Returned',
      actorId: 'acad-head-01',
      actorName: 'Dr. Maria Santos',
      actorRole: 'ACADEMIC_HEAD'
    });
    assert(false, 'Approved directly to Returned must be blocked');
  } catch (err: any) {
    assert(err.message.includes('State Machine Violation'), 'Illegal transition from Approved to Returned is strictly blocked');
  }

  // -------------------------------------------------------------------------
  // TEST 5: SCMS-015 AC 1 & AC 2 - Audit Log Viewer & Append-Only Immutability
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Audit Log Immutability & Viewer (SCMS-015 AC 1 & AC 2) ---');
  // Log an action
  const auditEntry = auditLogService.logAction({
    actorId: 'acad-head-01',
    actorName: 'Dr. Maria Santos',
    actorRole: 'ACADEMIC_HEAD',
    actionType: 'REQUIREMENT_PUBLISHED',
    entityName: 'REQUIREMENT',
    entityId: 'req-01',
    details: { note: 'Verified requirement quota' }
  });
  assert(!!auditEntry.id && !!auditEntry.createdAt, 'Audit log entry created with server timestamp');

  // Attempt to update (Must throw)
  try {
    auditLogService.updateAuditRecord(auditEntry.id || 'missing-id', { details: { note: 'Tampered' } });
    assert(false, 'Should reject UPDATE on audit_logs');
  } catch (err: any) {
    assert(err.message.includes('append-only. UPDATE on record'), 'Audit log strictly rejects UPDATE operations');
  }

  // Attempt to delete (Must throw)
  try {
    auditLogService.deleteAuditRecord(auditEntry.id || 'missing-id');
    assert(false, 'Should reject DELETE on audit_logs');
  } catch (err: any) {
    assert(err.message.includes('append-only. DELETE on record'), 'Audit log strictly rejects DELETE operations');
  }

  // Filter logs
  const logs = auditLogService.getLogs({ actorId: 'acad-head-01' });
  assert(logs.length >= 1, 'Academic Head can filter audit records by actor');

  // Verify SHA-256 Hash Chaining (SMS-014)
  const secondEntry = auditLogService.logAction({
    actorId: 'acad-head-01',
    actorName: 'Dr. Maria Santos',
    actorRole: 'ACADEMIC_HEAD',
    actionType: 'DEADLINE_CHANGED',
    entityName: 'REQUIREMENT',
    entityId: 'req-01',
    newValue: { deadline: '2026-11-15' },
    details: { note: 'Extended deadline' }
  });
  assert(
    !!auditEntry.previous_hash && !!auditEntry.current_hash && secondEntry.previous_hash === auditEntry.current_hash,
    'Audit log entries form a cryptographic SHA-256 hash chain (previous_hash matches prior current_hash)'
  );
  assert(auditLogService.verifyChain() === true, 'verifyChain() confirms unbroken tamper-evident hash chain');

  console.log('\n===============================================================');
  console.log(`📊 SPRINT 4 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSprint4Verification();
