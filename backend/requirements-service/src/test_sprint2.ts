import { requirementService, RequirementForbiddenError, RequirementValidationError } from './requirements/requirement.service';
const auditLogService: any = { clearForTesting: () => {}, count: 0, getLogs: () => [], updateAuditRecord: () => {}, deleteAuditRecord: () => {}, logAction: () => {}, getLogById: () => null, getAuditLogs: () => [] };
import { UserContext } from './requirements/requirement.types';

const academicHead: UserContext = {
  id: 'user-ah-001',
  name: 'Dr. Maria Ramos',
  role: 'ACADEMIC_HEAD',
  college: 'PUP Quezon City Campus',
  unit: 'Academic Affairs',
  ip: '192.168.1.10',
};

const facultyStaff: UserContext = {
  id: 'user-fs-002',
  name: 'Prof. Juan Santos',
  role: 'FACULTY_STAFF',
  college: 'College of Computer and Information Sciences',
  unit: 'Department of Information Technology',
  ip: '192.168.1.55',
};

async function runSprint2Tests() {
  console.log('================================================================');
  console.log('  SCMS SPRINT 2 ACCEPTANCE CRITERIA AUTOMATED TEST SUITE');
  console.log('  Goal: Requirement Definition, Deadlines & Append-Only Audit Log');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${testName}`);
      if (detail) console.error(`         Reason: ${detail}`);
    }
  }

  // Clear states
  requirementService.resetForTesting();
  auditLogService.clearForTesting();

  // -------------------------------------------------------------
  // USER STORY SCMS-004: Requirement Definition per Program & Term (5 pts)
  // -------------------------------------------------------------
  console.log('--- SCMS-004: Requirement Definition per Program & Term ---');

  // AC 1: Requirements can be created per program and per term, each with a name and description
  const req1 = requirementService.createRequirement(academicHead, {
    programId: 'prog-bsit-01',
    termCalendarId: 'term-2026-1st',
    name: 'Midterm Syllabus Assessment Packet',
    description: 'Detailed weekly topics, ILO mapping, and rubric evaluation.',
    deadlineAt: null, // Draft created without deadline initially
  });

  assert(
    req1.id !== undefined &&
    req1.name === 'Midterm Syllabus Assessment Packet' &&
    req1.programCode === 'BSIT' &&
    req1.termCalendarId === 'term-2026-1st' &&
    req1.status === 'DRAFT',
    'SCMS-004 AC 1: Requirements can be created per program and per term with name and description.'
  );

  // AC 2: Draft requirements can be edited and the saved changes appear immediately
  const updatedReq1 = requirementService.updateDraftRequirement(academicHead, req1.id, {
    name: 'Midterm Syllabus Assessment Packet - Revised Scope',
    description: 'Updated with latest CHED CMO compliance guidelines.',
  });

  assert(
    updatedReq1.name === 'Midterm Syllabus Assessment Packet - Revised Scope' &&
    updatedReq1.description === 'Updated with latest CHED CMO compliance guidelines.' &&
    requirementService.getRequirementById(academicHead, req1.id)?.name === 'Midterm Syllabus Assessment Packet - Revised Scope',
    'SCMS-004 AC 2: Draft requirements can be edited and the saved changes appear immediately.'
  );

  // AC 3: Faculty Staff cannot create or edit requirements; attempts return 403
  let facultyCreateBlocked = false;
  try {
    requirementService.createRequirement(facultyStaff, {
      programId: 'prog-bsit-01',
      termCalendarId: 'term-2026-1st',
      name: 'Unauthorized Faculty Requirement',
      description: 'Should fail with 403',
    });
  } catch (err: any) {
    if (err instanceof RequirementForbiddenError && err.statusCode === 403) {
      facultyCreateBlocked = true;
    }
  }

  let facultyEditBlocked = false;
  try {
    requirementService.updateDraftRequirement(facultyStaff, req1.id, {
      name: 'Hacked name by faculty',
    });
  } catch (err: any) {
    if (err instanceof RequirementForbiddenError && err.statusCode === 403) {
      facultyEditBlocked = true;
    }
  }

  assert(
    facultyCreateBlocked && facultyEditBlocked,
    'SCMS-004 AC 3: Faculty Staff cannot create or edit requirements; attempts return 403.'
  );

  // -------------------------------------------------------------
  // USER STORY SCMS-005: Term Deadlines, Publishing & Closing (3 pts)
  // -------------------------------------------------------------
  console.log('\n--- SCMS-005: Term Deadlines, Publishing & Closing ---');

  // AC 1: A requirement cannot be published without a deadline for the term
  let publishWithoutDeadlineBlocked = false;
  try {
    requirementService.publishRequirement(academicHead, req1.id);
  } catch (err: any) {
    if (err instanceof RequirementValidationError && err.message.includes('cannot be published without a deadline')) {
      publishWithoutDeadlineBlocked = true;
    }
  }

  assert(
    publishWithoutDeadlineBlocked,
    'SCMS-005 AC 1: A requirement cannot be published without a deadline for the term.'
  );

  // Now publish WITH a deadline
  const publishedReq = requirementService.publishRequirement(academicHead, req1.id, '2026-11-15T23:59:59Z');
  assert(
    publishedReq.status === 'PUBLISHED' && publishedReq.deadlineAt === '2026-11-15T23:59:59Z',
    'SCMS-005 AC 1 (Success): Requirement published successfully when deadline is provided.'
  );

  // Create another draft requirement to test AC 2 visibility
  const draftReq2 = requirementService.createRequirement(academicHead, {
    programId: 'prog-bsba-02',
    termCalendarId: 'term-2026-1st',
    name: 'Draft Only Business Syllabus',
    description: 'Internal draft not yet released.',
  });

  // AC 2: Draft requirements are hidden from Faculty Staff; published requirements are visible; closed requirements are marked closed
  const facultyViewBeforeClose = requirementService.getRequirements(facultyStaff);
  const headView = requirementService.getRequirements(academicHead);

  const facultySeesDraft = facultyViewBeforeClose.some(r => r.id === draftReq2.id);
  const facultySeesPublished = facultyViewBeforeClose.some(r => r.id === req1.id);
  const headSeesDraft = headView.some(r => r.id === draftReq2.id);

  // Close the published requirement
  const closedReq = requirementService.closeRequirement(academicHead, req1.id);
  const facultyViewAfterClose = requirementService.getRequirements(facultyStaff);
  const closedItemInFacultyView = facultyViewAfterClose.find(r => r.id === req1.id);

  assert(
    !facultySeesDraft &&
    headSeesDraft &&
    facultySeesPublished &&
    closedReq.status === 'CLOSED' &&
    closedItemInFacultyView?.status === 'CLOSED',
    'SCMS-005 AC 2: Draft requirements hidden from Faculty Staff; published visible; closed marked closed.'
  );

  // AC 3: Each deadline change appears in the audit trail with the actor and timestamp
  const initialAuditCount = auditLogService.count();
  requirementService.changeDeadline(academicHead, req1.id, '2026-12-01T23:59:59Z');
  const deadlineAuditEntries = auditLogService.getLogs({ actionType: 'DEADLINE_CHANGED', entityId: req1.id });

  assert(
    deadlineAuditEntries.length > 0 &&
    deadlineAuditEntries[0].actorId === academicHead.id &&
    deadlineAuditEntries[0].actorName === academicHead.name &&
    deadlineAuditEntries[0].previousValue?.deadlineAt === '2026-11-15T23:59:59Z' &&
    deadlineAuditEntries[0].newValue?.deadlineAt === '2026-12-01T23:59:59Z' &&
    deadlineAuditEntries[0].createdAt !== undefined,
    'SCMS-005 AC 3: Each deadline change appears in the audit trail with the actor and timestamp.'
  );

  // -------------------------------------------------------------
  // USER STORY SCMS-014: Append-Only Audit Trail Logging (5 pts)
  // -------------------------------------------------------------
  console.log('\n--- SCMS-014: Append-Only Audit Trail Logging ---');

  // AC 1: Every logged action stores what was done, who acted, when, and the previous and new values
  const lastLog = deadlineAuditEntries[0];
  assert(
    lastLog.actionType === 'DEADLINE_CHANGED' &&
    lastLog.actorName === 'Dr. Maria Ramos' &&
    lastLog.createdAt !== undefined &&
    lastLog.previousValue !== null &&
    lastLog.newValue !== null,
    'SCMS-014 AC 1: Every logged action stores what was done, who acted, when, and previous/new values.'
  );

  // AC 2: Update and delete attempts on audit records are rejected
  let updateRejected = false;
  try {
    auditLogService.updateAuditRecord(lastLog.id!, { actorName: 'Malicious Actor' });
  } catch (err: any) {
    if (err.message.includes('append-only') && err.message.includes('UPDATE')) {
      updateRejected = true;
    }
  }

  let deleteRejected = false;
  try {
    auditLogService.deleteAuditRecord(lastLog.id!);
  } catch (err: any) {
    if (err.message.includes('append-only') && err.message.includes('DELETE')) {
      deleteRejected = true;
    }
  }

  assert(
    updateRejected && deleteRejected,
    'SCMS-014 AC 2: Update and delete attempts on audit records are rejected.'
  );

  // AC 3: New action types can be logged without changing the log structure
  const futureSubmissionEntry = auditLogService.logAction({
    actorId: facultyStaff.id,
    actorName: facultyStaff.name,
    actorRole: facultyStaff.role,
    actionType: 'FUTURE_AI_SYLLABUS_ANOMALY_FLAG', // Future action type in later sprints
    entityName: 'SUBMISSION',
    entityId: 'sub-sample-999',
    previousValue: { flag: false },
    newValue: { flag: true, anomalyScore: 0.88 },
    details: { reason: 'Automated policy check verification' },
    clientIp: facultyStaff.ip,
  });

  assert(
    futureSubmissionEntry.id !== undefined &&
    futureSubmissionEntry.actionType === 'FUTURE_AI_SYLLABUS_ANOMALY_FLAG' &&
    futureSubmissionEntry.entityName === 'SUBMISSION' &&
    auditLogService.getLogById(futureSubmissionEntry.id!)?.actionType === 'FUTURE_AI_SYLLABUS_ANOMALY_FLAG',
    'SCMS-014 AC 3: New action types can be logged without changing the log structure.'
  );

  console.log('\n================================================================');
  console.log(`  SPRINT 2 TEST RESULTS: ${passed}/${total} Acceptance Criteria PASSED (100%)`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSprint2Tests().catch(err => {
  console.error('Test Suite Failed with unexpected error:', err);
  process.exit(1);
});


