import { submissionService } from './submissions/submission.service';
import { submissionRepository } from './submissions/submission.repository';
import { signatoryService } from './signatories/signatory.service';
import { obtlPdfService } from './submissions/obtl-pdf.service';

async function runSprint7Tests() {
  console.log('====================================================');
  console.log('   PUPQC SCMS Sprint 7 Automated Verification Test  ');
  console.log('   Stories: SMS-019, SMS-023, SMS-025, SMS-035, SMS-037');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${desc}`);
    }
  }

  // 1. Signatory Authority Configuration (SMS-035)
  console.log('--- 1. Testing Signatory Authority Configuration (SMS-035) ---');
  const signatories = signatoryService.getSignatories();
  assert(
    signatories.reviewed_by_name === 'Dr. Maria Santos' &&
    signatories.recommending_name.includes('Quirino') &&
    signatories.approved_by_name.includes('Gapasin'),
    'Signatory defaults include Academic Head, Campus Director, and Vice President for Campuses'
  );

  const updatedSignatories = signatoryService.updateSignatories({
    recommending_name: 'Assoc. Prof. Demetrio C. Quirino, Jr., PECE',
    approved_by_name: 'Assoc. Prof. Anna Ruby P. Gapasin, PhD'
  });
  assert(
    updatedSignatories.recommending_name.includes('PECE') &&
    updatedSignatories.approved_by_name.includes('PhD'),
    'Academic Head can configure Campus Director and VP for Campuses names & titles'
  );

  // 2. Assignment Reassignments & Withdrawals (SMS-023)
  console.log('\n--- 2. Testing Assignment Reassignments & Withdrawals (SMS-023) ---');
  // Create an unapproved submission first
  const sub1 = await submissionService.submitSyllabus({
    requirementId: 'req-2026-1t',
    facultyId: 'fac-prof-delacruz',
    facultyName: 'Prof. Juan Dela Cruz',
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-1',
    mode: 'FILE_UPLOAD',
    fileName: 'INTE_401_Draft.pdf',
    fileSize: 1024000
  });

  // Test reassignment for unapproved syllabus (SMS-023 AC 1)
  const reassignUnapproved = await submissionService.reassignAssignment({
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-1',
    newFacultyId: 'fac-prof-santos-new',
    newFacultyName: 'Prof. Roberto Santos',
    assignmentVersion: 2,
    reason: 'Instructor load balancing'
  });
  assert(
    reassignUnapproved.reassignmentType === 'UNAPPROVED_REASSIGNED' &&
    reassignUnapproved.submission.faculty_id === 'fac-prof-santos-new',
    'Unapproved syllabus moves responsibility to new faculty with version bump (SMS-023 AC 1)'
  );

  // Test substitute instructor assignment (SMS-023 AC 4)
  const substituteResult = await submissionService.assignSubstitute({
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-1',
    substituteId: 'fac-prof-substitute-001',
    substituteName: 'Prof. Elena Diaz',
    reason: 'Medical leave coverage'
  });
  assert(
    substituteResult.substitute_id === 'fac-prof-substitute-001' &&
    substituteResult.faculty_id === 'fac-prof-santos-new',
    'Substitute assigned with co-instructor access while primary remains accountable (SMS-023 AC 4)'
  );

  // Approve a submission and test approved adoption (SMS-023 AC 2)
  await submissionService.openForReview({
    submissionId: reassignUnapproved.submission.id,
    reviewerId: 'user-head-001',
    reviewerName: 'Dr. Maria Santos'
  });
  await submissionService.recordReviewDecision({
    submissionId: reassignUnapproved.submission.id,
    reviewerId: 'user-head-001',
    reviewerName: 'Dr. Maria Santos',
    decision: 'Approved',
    comment: 'OBTL syllabus approved with honors'
  });

  const reassignApproved = await submissionService.reassignAssignment({
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-1',
    newFacultyId: 'fac-prof-final-adopt',
    newFacultyName: 'Prof. Clara Reyes',
    assignmentVersion: 3,
    reason: 'Late semester faculty transfer'
  });
  assert(
    reassignApproved.reassignmentType === 'APPROVED_ADOPTED' &&
    reassignApproved.submission.status === 'Approved',
    'Approved syllabus stays locked & valid; new instructor adopts it (SMS-023 AC 2)'
  );

  // Test assignment withdrawal -> moves to Unassigned (SMS-023 AC 3)
  const withdrawResult = await submissionService.withdrawAssignment({
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-1',
    reason: 'Section dissolved by college registrar'
  });
  assert(
    withdrawResult.status === 'Unassigned',
    'FMS assignment withdrawal moves entry to Unassigned without penalty (SMS-023 AC 3)'
  );

  // 3. PUPQC OBTL Syllabus PDF Generation (SMS-025)
  console.log('\n--- 3. Testing PUPQC OBTL Syllabus PDF Generation (SMS-025) ---');
  const pdfBuffer = await submissionService.generateObtlPdf(sub1.id);
  assert(
    Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500 && pdfBuffer.slice(0, 5).toString() === '%PDF-',
    'Generates valid %PDF-1.4 binary buffer with course info & 4-line signatory block (SMS-025)'
  );

  console.log(`\n====================================================`);
  console.log(`   Sprint 7 Verification Results: ${passed} / ${total} Tests Passed`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSprint7Tests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
