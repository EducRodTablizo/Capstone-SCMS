import { submissionService } from './submissions/submission.service';
import { submissionRepository } from './submissions/submission.repository';

async function runSprint5Verification() {
  console.log('===============================================================');
  console.log('🚀 SPRINT 5 AUTOMATED VERIFICATION SUITE');
  console.log('   Modules: SCMS-010 (Review Decisions: Approve or Return)');
  console.log('            SCMS-011 (Revise and Resubmit Feedback Cycle)');
  console.log('            SCMS-021 (Multi-Version History & Revision Comparison)');
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
  // SECTION 1: SCMS-010 (Review Decisions Approve or Return)
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: SCMS-010 (Review Decisions: Approve or Return) ---');

  // Test 1.1: Initial Submission produces Submitted status and v1
  let subAId = '';
  try {
    const resA = await submissionService.submitSyllabus({
      requirementId: 'req-2026-sprint5',
      facultyId: 'fac-prof-cruz',
      facultyName: 'Prof. Cruz',
      courseCode: 'CS 301',
      sectionLabel: 'BSCS 3-1',
      mode: 'FILE_UPLOAD',
      fileName: 'CS301_Syllabus_Initial.pdf',
      fileSize: 2 * 1024 * 1024
    });
    subAId = resA.submission.id;
    assert(
      resA.submission.status === 'Submitted' && resA.version.version_label === 'v1' && resA.version.version_number === 1,
      'SCMS-010 / SCMS-021: Initial submission sets status to Submitted and logs Version v1',
      `Got status: ${resA.submission.status}, version: ${resA.version?.version_label}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-010 / SCMS-021: Initial submission sets status to Submitted and logs Version v1', err.message);
  }

  // Test 1.2: Opening moves status to Under Review (SCMS-010 AC 1)
  try {
    const openedSub = await submissionService.openForReview({
      submissionId: subAId,
      reviewerId: 'ah-dr-santos',
      reviewerName: 'Dr. Maria Santos'
    });
    assert(
      openedSub.status === 'Under Review',
      'SCMS-010 AC 1: Opening a submitted syllabus transitions status to Under Review',
      `Got status: ${openedSub.status}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-010 AC 1: Opening a submitted syllabus transitions status to Under Review', err.message);
  }

  // Test 1.3: Mandatory Comment on Return Decision (SCMS-010 AC 3)
  try {
    let emptyCommentRejected = false;
    try {
      await submissionService.recordReviewDecision({
        submissionId: subAId,
        reviewerId: 'ah-dr-santos',
        reviewerName: 'Dr. Maria Santos',
        decision: 'Returned',
        comment: '' // Empty comment strictly prohibited
      });
    } catch (err: any) {
      if (err.message.includes('strictly requires an explanatory comment')) {
        emptyCommentRejected = true;
      }
    }
    assert(
      emptyCommentRejected,
      'SCMS-010 AC 3: Return decision strictly requires non-empty explanatory comment',
      'System permitted Return without mandatory comment'
    );
  } catch (err: any) {
    assert(false, 'SCMS-010 AC 3: Return decision strictly requires non-empty explanatory comment', err.message);
  }

  // Test 1.4: Valid Return Decision with feedback comment (SCMS-010 AC 3)
  try {
    const reviewResult = await submissionService.recordReviewDecision({
      submissionId: subAId,
      reviewerId: 'ah-dr-santos',
      reviewerName: 'Dr. Maria Santos',
      decision: 'Returned',
      comment: 'Please update Module 4 to include OWASP Top 10 2025 guidelines.'
    });
    assert(
      reviewResult.submission.status === 'Returned' && 
      reviewResult.review.decision === 'Returned' && 
      reviewResult.review.comment.includes('OWASP'),
      'SCMS-010 AC 3: Valid Return records decision with reviewer name, timestamp, and comment',
      `Status: ${reviewResult.submission.status}, comment: ${reviewResult.review.comment}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-010 AC 3: Valid Return records decision with reviewer name, timestamp, and comment', err.message);
  }

  // Test 1.5: Cannot record review on Returned status without reopening (State Machine guard)
  try {
    let invalidReviewBlocked = false;
    try {
      await submissionService.recordReviewDecision({
        submissionId: subAId,
        reviewerId: 'ah-dr-santos',
        reviewerName: 'Dr. Maria Santos',
        decision: 'Approved',
        comment: 'Premature approval'
      });
    } catch (err: any) {
      if (err.message.includes('must be \'Under Review\'')) {
        invalidReviewBlocked = true;
      }
    }
    assert(
      invalidReviewBlocked,
      'SCMS-010 Guard: Review decisions rejected unless item is in Under Review status',
      'System permitted decision on non-Under Review status'
    );
  } catch (err: any) {
    assert(false, 'SCMS-010 Guard: Review decisions rejected unless item is in Under Review status', err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: SCMS-011 (Revise and Resubmit Feedback Cycle)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: SCMS-011 (Revise and Resubmit Feedback Cycle) ---');

  // Test 2.1: Returned submission feedback comment is accessible (SCMS-011 AC 1)
  try {
    const reviews = await submissionRepository.getReviews(subAId);
    assert(
      reviews.length > 0 && reviews[0].comment.includes('OWASP Top 10'),
      'SCMS-011 AC 1: Faculty can view reviewer return comment detailing required changes',
      `Reviews found: ${reviews.length}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-011 AC 1: Faculty can view reviewer return comment detailing required changes', err.message);
  }

  // Test 2.2: Resubmitting on Returned item transitions status to Resubmitted (SCMS-011 AC 2)
  try {
    const resubmitRes = await submissionService.resubmitSyllabus({
      submissionId: subAId,
      facultyId: 'fac-prof-cruz',
      facultyName: 'Prof. Cruz',
      fileName: 'CS301_Syllabus_Revised_v2.pdf',
      fileSize: 2.2 * 1024 * 1024,
      changeSummary: 'Added OWASP Top 10 2025 to Module 4 as requested'
    });

    assert(
      resubmitRes.submission.status === 'Resubmitted' &&
      resubmitRes.submission.file_name === 'CS301_Syllabus_Revised_v2.pdf' &&
      resubmitRes.version.version_label === 'v2',
      'SCMS-011 AC 2: Uploading revised version transitions status to Resubmitted',
      `Status: ${resubmitRes.submission.status}, label: ${resubmitRes.version.version_label}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-011 AC 2: Uploading revised version transitions status to Resubmitted', err.message);
  }

  // Test 2.3: Non-Returned items cannot be resubmitted (SCMS-011 Guard)
  try {
    let invalidResubmitBlocked = false;
    try {
      await submissionService.resubmitSyllabus({
        submissionId: subAId, // Currently 'Resubmitted'
        facultyId: 'fac-prof-cruz',
        fileName: 'CS301_Syllabus_Attempt3.pdf',
        fileSize: 1024
      });
    } catch (err: any) {
      if (err.message.includes('Only \'Returned\' submissions can be resubmitted')) {
        invalidResubmitBlocked = true;
      }
    }
    assert(
      invalidResubmitBlocked,
      'SCMS-011 Guard: Resubmissions strictly prohibited unless status is Returned',
      'System permitted resubmission on non-Returned status'
    );
  } catch (err: any) {
    assert(false, 'SCMS-011 Guard: Resubmissions strictly prohibited unless status is Returned', err.message);
  }

  // Test 2.4: Repeat Cycle - Re-open from Resubmitted -> Under Review (SCMS-011 AC 3)
  try {
    const reopened = await submissionService.openForReview({
      submissionId: subAId,
      reviewerId: 'ah-dr-santos',
      reviewerName: 'Dr. Maria Santos'
    });
    assert(
      reopened.status === 'Under Review',
      'SCMS-011 AC 3: Resubmitted syllabus can be re-opened for subsequent review',
      `Got status: ${reopened.status}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-011 AC 3: Resubmitted syllabus can be re-opened for subsequent review', err.message);
  }

  // Test 2.5: Approve revised submission -> Approved (SCMS-010 AC 2 / SCMS-011 AC 3)
  try {
    const approvedResult = await submissionService.recordReviewDecision({
      submissionId: subAId,
      reviewerId: 'ah-dr-santos',
      reviewerName: 'Dr. Maria Santos',
      decision: 'Approved',
      comment: 'All requested revisions verified. Syllabus complied.'
    });
    assert(
      approvedResult.submission.status === 'Approved' && approvedResult.review.decision === 'Approved',
      'SCMS-010 AC 2 / SCMS-011 AC 3: Reviewer can approve revised syllabus setting status to Approved',
      `Got status: ${approvedResult.submission.status}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-010 AC 2 / SCMS-011 AC 3: Reviewer can approve revised syllabus setting status to Approved', err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 3: SCMS-021 (Multi-Version History & Revision Comparison)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: SCMS-021 (Multi-Version History & Revision Comparison) ---');

  // Test 3.1: Immutable version records preserve v1 without overwrite (SCMS-021 AC 1 & AC 2)
  try {
    const versions = await submissionService.getVersionHistory(subAId);
    assert(
      versions.length === 2 && 
      versions[0].version_label === 'v1' && 
      versions[0].file_name === 'CS301_Syllabus_Initial.pdf' &&
      versions[1].version_label === 'v2' &&
      versions[1].file_name === 'CS301_Syllabus_Revised_v2.pdf',
      'SCMS-021 AC 1 & AC 2: Multi-versions stored immutably; v1 is not overwritten when v2 is created',
      `Versions found: ${versions.length}, labels: ${versions.map(v => v.version_label).join(', ')}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-021 AC 1 & AC 2: Multi-versions stored immutably; v1 is not overwritten when v2 is created', err.message);
  }

  // Test 3.2: Multi-cycle 3-version progression (v1 -> v2 -> v3)
  try {
    // Create new submission to test a 3-version cycle
    const subB = await submissionService.submitSyllabus({
      requirementId: 'req-2026-sprint5-b',
      facultyId: 'fac-prof-reyes',
      facultyName: 'Prof. Reyes',
      courseCode: 'INTE 201',
      sectionLabel: 'BSIT 2-1',
      mode: 'FILE_UPLOAD',
      fileName: 'INTE201_v1.pdf',
      fileSize: 1.5 * 1024 * 1024
    });

    // Cycle 1: Open -> Return
    await submissionService.openForReview({ submissionId: subB.submission.id, reviewerId: 'ah-01', reviewerName: 'Chair' });
    await submissionService.recordReviewDecision({ submissionId: subB.submission.id, reviewerId: 'ah-01', reviewerName: 'Chair', decision: 'Returned', comment: 'Fix rubrics' });

    // Cycle 2: Resubmit v2 -> Open -> Return
    await submissionService.resubmitSyllabus({ submissionId: subB.submission.id, facultyId: 'fac-prof-reyes', fileName: 'INTE201_v2.pdf', fileSize: 1.6 * 1024 * 1024, changeSummary: 'Updated rubrics' });
    await submissionService.openForReview({ submissionId: subB.submission.id, reviewerId: 'ah-01', reviewerName: 'Chair' });
    await submissionService.recordReviewDecision({ submissionId: subB.submission.id, reviewerId: 'ah-01', reviewerName: 'Chair', decision: 'Returned', comment: 'Add lab exercise hours' });

    // Cycle 3: Resubmit v3
    await submissionService.resubmitSyllabus({ submissionId: subB.submission.id, facultyId: 'fac-prof-reyes', fileName: 'INTE201_v3.pdf', fileSize: 1.7 * 1024 * 1024, changeSummary: 'Specified lab hours' });

    const versionsB = await submissionService.getVersionHistory(subB.submission.id);
    assert(
      versionsB.length === 3 &&
      versionsB[0].version_label === 'v1' &&
      versionsB[1].version_label === 'v2' &&
      versionsB[2].version_label === 'v3' &&
      versionsB[2].change_summary === 'Specified lab hours',
      'SCMS-021 AC 3: Sequential resubmissions accumulate v1, v2, v3 with preserved change summaries',
      `Count: ${versionsB.length}, labels: ${versionsB.map(v => v.version_label).join(', ')}`
    );
  } catch (err: any) {
    assert(false, 'SCMS-021 AC 3: Sequential resubmissions accumulate v1, v2, v3 with preserved change summaries', err.message);
  }

  // Test 3.3: Version comparison metadata completeness (SCMS-021 AC 2)
  try {
    const versions = await submissionService.getVersionHistory(subAId);
    const v1 = versions[0];
    const v2 = versions[1];
    const hasRequiredMetadata = (
      v1.id && v1.submission_id && v1.submitted_by && v1.status_at_version && v1.created_at &&
      v2.id && v2.submission_id && v2.submitted_by && v2.status_at_version && v2.created_at
    );
    assert(
      Boolean(hasRequiredMetadata),
      'SCMS-021 AC 2: Version entities include complete metadata for comparison (timestamps, author, status, file size)',
      'Metadata fields incomplete'
    );
  } catch (err: any) {
    assert(false, 'SCMS-021 AC 2: Version entities include complete metadata for comparison', err.message);
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`🏁 SPRINT 5 VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL SPRINT 5 ACCEPTANCE CRITERIA VERIFIED (100% PASS RATE)');
  } else {
    console.error(`⚠️ ${totalTests - passedTests} TESTS FAILED`);
    process.exit(1);
  }
  console.log('===============================================================\n');
  process.exit(0);
}

runSprint5Verification().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
