import assert from 'assert';
import { submissionService } from '../apps/submission-service/src/submissions/submission.service';
import { submissionRepository } from '../apps/submission-service/src/submissions/submission.repository';
import { courseRepository } from '../apps/academic-catalog-service/src/courses/course.repository';
import { courseRouter } from '../apps/academic-catalog-service/src/courses/course.controller';

async function runTests() {
  console.log('===============================================================');
  console.log('   FMS CONTRACT ALIGNMENT VERIFICATION SUITE');
  console.log('===============================================================');

  // -------------------------------------------------------------------------
  // TEST 1: Retired Courses HTTP 200 OK (course.controller.ts)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Retired Courses HTTP 200 OK ---');

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testCourse = await courseRepository.create({
    course_code: `RET-${uniqueSuffix}`,
    title: 'Testing Retired Course Handling',
    credit_units: 3,
    lecture_hours: 3,
    lab_hours: 0,
    status: 'Active',
  });

  const replacementCourse = await courseRepository.create({
    course_code: `REP-${uniqueSuffix}`,
    title: 'Replacement Course',
    credit_units: 3,
    lecture_hours: 3,
    lab_hours: 0,
    status: 'Active',
  });

  // Retire the course
  await courseRepository.update(testCourse.id, {
    status: 'Retired',
    effective_end_term: '2026-1S',
    replacement_course_id: replacementCourse.id,
  });

  // Verify controller response via route handler
  let statusCode = 0;
  let responseBody: any = null;
  const mockReq: any = { params: { id: testCourse.id } };
  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      responseBody = body;
      return this;
    },
  };

  const routeLayer = (courseRouter as any).stack.find((l: any) => l.route && l.route.path === '/:id');
  const getHandler = routeLayer.route.stack[routeLayer.route.stack.length - 1].handle;
  await getHandler(mockReq, mockRes);
  if (statusCode !== 200) {
    console.log('Error status:', statusCode, 'Body:', responseBody, 'testCourse:', testCourse);
  }

  assert.strictEqual(statusCode, 200, `Expected HTTP 200 for retired course, got ${statusCode}`);
  assert.strictEqual(responseBody.status, 'RETIRED', 'Expected status to be RETIRED');
  assert.strictEqual(responseBody.is_assignable, false, 'Expected is_assignable to be false');
  assert.strictEqual(responseBody.effective_end_term, '2026-1S', 'Expected effective_end_term to be 2026-1S');
  assert.strictEqual(responseBody.replaced_by_course_id, replacementCourse.id, 'Expected replaced_by_course_id');
  console.log('  [PASS] Retired course returns HTTP 200 with status RETIRED, is_assignable: false, effective_end_term, and replaced_by_course_id');

  // -------------------------------------------------------------------------
  // TEST 2: Structured JSON Schedule (submission.entity.ts & submission.service.ts)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Structured JSON Schedule ---');

  const structuredSchedule = {
    timeZone: 'Asia/Manila',
    meetings: [
      {
        startsAt: '2026-11-05T13:00:00+08:00',
        endsAt: '2026-11-05T15:30:00+08:00',
        mode: 'FACE_TO_FACE',
        roomId: 'ROOM-101',
        roomLabel: 'Room 101',
      },
    ],
  };

  const assignmentId = 'asg-fms-align-' + Date.now();
  const initialIntake = await submissionService.ingestApprovedAssignment({
    assignment_id: assignmentId,
    assignment_version: 1,
    academic_term_id: 'term-2026-1s',
    course_id: testCourse.id,
    block_section_id: 'sec-bsit-4-1',
    faculty_id: 'fac-initial-001',
    schedule: structuredSchedule,
  });

  assert.strictEqual(initialIntake.statusCode, 201);
  assert.deepStrictEqual(initialIntake.data.schedule, structuredSchedule);
  console.log('  [PASS] Structured JSON schedule persisted and retrieved accurately upon creation');

  // -------------------------------------------------------------------------
  // TEST 3: Reassignment & previous_faculty_id (submission.service.ts)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing previous_faculty_id in Reassignment ---');

  // Reassignment via ingestApprovedAssignment with higher version and different faculty
  const reassignedIntake = await submissionService.ingestApprovedAssignment({
    assignment_id: assignmentId,
    assignment_version: 2,
    academic_term_id: 'term-2026-1s',
    course_id: testCourse.id,
    block_section_id: 'sec-bsit-4-1',
    faculty_id: 'fac-reassigned-002',
    schedule: structuredSchedule,
  });

  assert.strictEqual(reassignedIntake.data.faculty_id, 'fac-reassigned-002');
  assert.strictEqual(reassignedIntake.data.previous_faculty_id, 'fac-initial-001');
  console.log('  [PASS] ingestApprovedAssignment saves previous_faculty_id upon faculty change');

  // Reassignment via explicit reassignAssignment service method
  const reassignResult = await submissionService.reassignAssignment({
    courseCode: initialIntake.data.course_code,
    sectionLabel: initialIntake.data.section_label,
    newFacultyId: 'fac-reassigned-003',
    newFacultyName: 'Prof. Third Instructor',
    reason: 'Department load re-balancing',
  });

  assert.strictEqual(reassignResult.submission.faculty_id, 'fac-reassigned-003');
  assert.strictEqual(reassignResult.submission.previous_faculty_id, 'fac-reassigned-002');
  console.log('  [PASS] reassignAssignment saves previous_faculty_id upon instructor reassignment');

  console.log('\n===============================================================');
  console.log('ALL FMS ALIGNMENT VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
