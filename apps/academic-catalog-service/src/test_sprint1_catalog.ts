import { app } from './main';
import { programRepository } from './programs/program.repository';
import http from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'scms_jwt_secret_dev_key_2026_super_secure';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} - ${name}: ${details}`);
}

async function runSprint1CatalogVerification() {
  console.log('================================================================');
  console.log('  SCMS SPRINT 1 VERIFICATION: SMS-021 PROGRAM CATALOGUE');
  console.log('  Service: apps/academic-catalog-service (Port 3098)');
  console.log('================================================================\n');

  await programRepository.init();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3098, resolve));

  const baseUrl = 'http://localhost:3098/api/v1/programs';

  // Mock Tokens
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
      last_name: 'Member',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    // -------------------------------------------------------------
    // Test 1: Unauthenticated request returns 401
    // -------------------------------------------------------------
    const unauthRes = await fetch(baseUrl);
    recordTest(
      'SMS-021 Security: Missing Session Token',
      unauthRes.status === 401,
      `Expected HTTP 401, got HTTP ${unauthRes.status}`
    );

    // -------------------------------------------------------------
    // Test 2: Academic Head can list programs (HTTP 200)
    // -------------------------------------------------------------
    const listRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${academicHeadToken}` },
    });
    const listData = await listRes.json();
    recordTest(
      'SMS-021 AC1: List Programs as Academic Head',
      listRes.status === 200 && Array.isArray(listData.data) && listData.data.length >= 1,
      `Returned ${listData.count} programs, status HTTP ${listRes.status}`
    );

    // -------------------------------------------------------------
    // Test 3: Faculty Staff can list programs (Read-only HTTP 200)
    // -------------------------------------------------------------
    const facultyListRes = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    recordTest(
      'SMS-021 AC1: List Programs as Faculty Staff',
      facultyListRes.status === 200,
      `Faculty read access granted, HTTP ${facultyListRes.status}`
    );

    // -------------------------------------------------------------
    // Test 4: SMS-021 AC1 - Academic Head can create a new program
    // -------------------------------------------------------------
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        code: 'BSCS-TEST',
        title: 'Bachelor of Science in Computer Science',
        description: 'New computing program under CCIS',
        status: 'Active',
      }),
    });
    const createData = await createRes.json();
    const createdId = createData.data?.id;
    recordTest(
      'SMS-021 AC1: Academic Head Creates Program',
      createRes.status === 201 && createData.data?.code === 'BSCS-TEST' && createData.data?.status === 'Active',
      `Created ${createData.data?.code} with ID ${createdId}, status HTTP ${createRes.status}`
    );

    // -------------------------------------------------------------
    // Test 5: SMS-021 AC1 - Academic Head can edit program status (Active -> Phased out)
    // -------------------------------------------------------------
    const patchRes = await fetch(`${baseUrl}/${createdId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        status: 'Phased out',
      }),
    });
    const patchData = await patchRes.json();
    recordTest(
      'SMS-021 AC1: Academic Head Edits Program Status',
      patchRes.status === 200 && patchData.data?.status === 'Phased out',
      `Updated program status to '${patchData.data?.status}', status HTTP ${patchRes.status}`
    );

    // -------------------------------------------------------------
    // Test 6: SMS-021 AC2 - Status validation rejects invalid values with 422
    // -------------------------------------------------------------
    const invalidStatusRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        code: 'BSECE',
        title: 'Bachelor of Science in Electronics Engineering',
        status: 'PendingApproval', // INVALID status
      }),
    });
    recordTest(
      'SMS-021 AC2: Reject Invalid Status with 422',
      invalidStatusRes.status === 422,
      `Invalid status 'PendingApproval' correctly rejected with HTTP ${invalidStatusRes.status}`
    );

    // -------------------------------------------------------------
    // Test 7: SMS-021 AC3 - Faculty Staff is BLOCKED from creating program (403 Forbidden)
    // -------------------------------------------------------------
    const facultyCreateRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        code: 'HACK-PROG',
        title: 'Unauthorized Program Creation Attempt',
        status: 'Active',
      }),
    });
    recordTest(
      'SMS-021 AC3: Faculty Staff Blocked from Adding Program (403)',
      facultyCreateRes.status === 403,
      `Faculty unauthorized write blocked with HTTP ${facultyCreateRes.status}`
    );

    // -------------------------------------------------------------
    // Test 8: SMS-021 AC3 - Faculty Staff is BLOCKED from editing program (403 Forbidden)
    // -------------------------------------------------------------
    const facultyPatchRes = await fetch(`${baseUrl}/${createdId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyToken}`,
      },
      body: JSON.stringify({
        title: 'Tampered Program Title',
      }),
    });
    recordTest(
      'SMS-021 AC3: Faculty Staff Blocked from Editing Program (403)',
      facultyPatchRes.status === 403,
      `Faculty unauthorized edit blocked with HTTP ${facultyPatchRes.status}`
    );

    // -------------------------------------------------------------
    // Test 9: Conflict check on duplicate program code (409 Conflict)
    // -------------------------------------------------------------
    const duplicateRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${academicHeadToken}`,
      },
      body: JSON.stringify({
        code: 'BSCS-TEST', // Already created in Test 4
        title: 'Duplicate BSCS Entry',
        status: 'Active',
      }),
    });
    recordTest(
      'SMS-021 Integrity: Block Duplicate Program Code (409)',
      duplicateRes.status === 409,
      `Duplicate program code 'BSCS-TEST' rejected with HTTP ${duplicateRes.status}`
    );

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log('🎉 ALL 9 SMS-021 ACCEPTANCE CRITERIA TESTS PASSED WITH EVIDENCE!');
  } else {
    console.error('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('================================================================\n');
}

runSprint1CatalogVerification().catch(console.error);
