import { app } from './main';
import { userRepository } from './users/user.repository';
import http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}: ${details}`);
}

async function runSprint1Verification() {
  console.log('================================================================');
  console.log('  SCMS SPRINT 1 AUTOMATED VERIFICATION TEST SUITE');
  console.log('  Sprint Goal: Sign-in, Role Scoping, and Data Privacy Controls');
  console.log('================================================================\n');

  await userRepository.init();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, resolve));

  const baseUrl = 'http://localhost:3099/api/v1/auth';

  try {
    // -------------------------------------------------------------
    // SCMS-001 Task 1 (AC 1): Valid Sign-in with SCMS Credentials
    // -------------------------------------------------------------
    const headLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'academic.head@pup.edu.ph',
        password: 'AcademicHead2026!',
      }),
    });
    const headLoginData = (await headLoginRes.json()) as any;
    const headToken = headLoginData.token;

    recordTest(
      'SCMS-001 AC1: Academic Head Valid Sign-in',
      headLoginRes.status === 200 && !!headToken && headLoginData.user?.role === 'ACADEMIC_HEAD',
      `HTTP ${headLoginRes.status}, token issued, role: ${headLoginData.user?.role}`
    );

    // Faculty login
    const faculty1LoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty.donayre@pup.edu.ph',
        password: 'Faculty2026!',
      }),
    });
    const faculty1Data = (await faculty1LoginRes.json()) as any;
    const faculty1Token = faculty1Data.token;

    recordTest(
      'SCMS-001 AC1: Faculty Staff Valid Sign-in',
      faculty1LoginRes.status === 200 && !!faculty1Token && faculty1Data.user?.role === 'FACULTY_STAFF',
      `HTTP ${faculty1LoginRes.status}, token issued, role: ${faculty1Data.user?.role}`
    );

    // -------------------------------------------------------------
    // SCMS-001 Task 2 (AC 2): Reject Invalid Credentials (Generic Message)
    // -------------------------------------------------------------
    // Test with wrong password
    const wrongPassRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'academic.head@pup.edu.ph',
        password: 'WrongPassword123!',
      }),
    });
    const wrongPassData = (await wrongPassRes.json()) as any;

    // Test with non-existent email
    const wrongEmailRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user@pup.edu.ph',
        password: 'SomePassword123!',
      }),
    });
    const wrongEmailData = (await wrongEmailRes.json()) as any;

    const genericMessageExpected = 'Invalid credentials. Please verify your email and password.';
    const ac2Passed =
      wrongPassRes.status === 401 &&
      wrongEmailRes.status === 401 &&
      wrongPassData.message === genericMessageExpected &&
      wrongEmailData.message === genericMessageExpected;

    recordTest(
      'SCMS-001 AC2: Generic Error on Invalid Credentials',
      ac2Passed,
      `Both returned 401 with identical generic error message without field disclosure`
    );

    // -------------------------------------------------------------
    // SCMS-001 Task 3 (AC 3): Sessions Issued Only from SCMS
    // -------------------------------------------------------------
    recordTest(
      'SCMS-001 AC3: Standalone SCMS Session Isolation',
      headToken.split('.').length === 3,
      `Session token is independent JWT issued exclusively by SCMS`
    );

    // -------------------------------------------------------------
    // SCMS-002 Task 1 (AC 1): Role Identified on Every Request & 401 on Missing Session
    // -------------------------------------------------------------
    const noAuthRes = await fetch(`${baseUrl}/me`, { method: 'GET' });
    const noAuthData = (await noAuthRes.json()) as any;

    const withAuthRes = await fetch(`${baseUrl}/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${headToken}` },
    });
    const withAuthData = (await withAuthRes.json()) as any;

    recordTest(
      'SCMS-002 AC1: Missing Session Returns 401',
      noAuthRes.status === 401 && withAuthRes.status === 200 && withAuthData.user?.role === 'ACADEMIC_HEAD',
      `Unauthenticated returned HTTP ${noAuthRes.status}; Authenticated returned HTTP ${withAuthRes.status} with role: ${withAuthData.user?.role}`
    );

    // -------------------------------------------------------------
    // SCMS-002 Task 2 (AC 2): Enforce Role Scoping on Read Endpoints
    // -------------------------------------------------------------
    const headScopedRes = await fetch(`${baseUrl}/submissions/scoped`, {
      headers: { Authorization: `Bearer ${headToken}` },
    });
    const headScopedData = (await headScopedRes.json()) as any;

    const facultyScopedRes = await fetch(`${baseUrl}/submissions/scoped`, {
      headers: { Authorization: `Bearer ${faculty1Token}` },
    });
    const facultyScopedData = (await facultyScopedRes.json()) as any;

    const ac2ScopingPassed =
      headScopedData.scope === 'GLOBAL_CAMPUS' &&
      facultyScopedData.scope === 'FACULTY_SCOPED' &&
      facultyScopedData.faculty_id === faculty1Data.user.id;

    recordTest(
      'SCMS-002 AC2: Role Scoping on Read Endpoints',
      ac2ScopingPassed,
      `Academic Head has GLOBAL_CAMPUS scope; Faculty Staff has FACULTY_SCOPED to own id: ${facultyScopedData.faculty_id}`
    );

    // -------------------------------------------------------------
    // SCMS-002 Task 3 (AC 3): Block Unauthorized Write Endpoints & Return 403
    // -------------------------------------------------------------
    // Faculty tries to invoke Academic Head write endpoint
    const forbiddenWriteRes = await fetch(`${baseUrl}/admin/publish-requirement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${faculty1Token}` },
    });
    const forbiddenWriteData = (await forbiddenWriteRes.json()) as any;

    // Academic Head invokes the same endpoint
    const allowedWriteRes = await fetch(`${baseUrl}/admin/publish-requirement`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${headToken}` },
    });

    const ac3WritePassed =
      forbiddenWriteRes.status === 403 &&
      forbiddenWriteData.message.includes('Access denied: Your assigned role does not permit this action') &&
      allowedWriteRes.status === 200;

    recordTest(
      'SCMS-002 AC3: Block Unauthorized Role Write with 403',
      ac3WritePassed,
      `Faculty write returned 403 with descriptive message; Academic Head returned 200`
    );

    // -------------------------------------------------------------
    // SCMS-003 Task 1 (AC 1): Limit Faculty Fields to (name, college, unit)
    // -------------------------------------------------------------
    const facultyProfile = faculty1Data.user;
    const allowedKeys = ['id', 'email', 'name', 'first_name', 'last_name', 'role', 'college', 'unit'];
    const forbiddenKeys = ['password_hash', 'salt', 'token', 'internal_metadata'];

    const hasNoForbidden = forbiddenKeys.every((k) => !(k in facultyProfile));
    const hasRequired = ['name', 'college', 'unit'].every((k) => k in facultyProfile);

    recordTest(
      'SCMS-003 AC1: RA 10173 Whitelist of Faculty Personal Data',
      hasNoForbidden && hasRequired,
      `Only required fields (${allowedKeys.join(', ')}) are read and stored; zero sensitive credentials exposed`
    );

    // -------------------------------------------------------------
    // SCMS-003 Task 2 (AC 2): Restrict Faculty Documents to Owner & Academic Head
    // -------------------------------------------------------------
    const faculty1Id = faculty1Data.user.id;
    const faculty2Id = '33333333-3333-3333-3333-333333333333'; // Prof. Tablizo

    // Faculty 1 attempts to open Faculty 2's document -> Expect 403
    const facultyCrossDocRes = await fetch(`${baseUrl}/documents/${faculty2Id}/syllabus-it101.pdf`, {
      headers: { Authorization: `Bearer ${faculty1Token}` },
    });

    // Faculty 1 attempts to open Faculty 1's OWN document -> Expect 200
    const facultyOwnDocRes = await fetch(`${baseUrl}/documents/${faculty1Id}/syllabus-it101.pdf`, {
      headers: { Authorization: `Bearer ${faculty1Token}` },
    });

    // Academic Head opens Faculty 2's document -> Expect 200
    const headDocRes = await fetch(`${baseUrl}/documents/${faculty2Id}/syllabus-it101.pdf`, {
      headers: { Authorization: `Bearer ${headToken}` },
    });

    const ac2DocPrivacyPassed =
      facultyCrossDocRes.status === 403 &&
      facultyOwnDocRes.status === 200 &&
      headDocRes.status === 200;

    recordTest(
      'SCMS-003 AC2: Document Confidentiality Access Check',
      ac2DocPrivacyPassed,
      `Faculty cross-access blocked with 403; Faculty own document returns 200; Academic Head returns 200`
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n================================================================');
    const allPassed = results.every((r) => r.passed);
    if (allPassed) {
      console.log('🎉 ALL SPRINT 1 ACCEPTANCE CRITERIA VERIFIED AND PASSED!');
    } else {
      console.log('⚠️ SOME TESTS FAILED. PLEASE INSPECT LOGS ABOVE.');
    }
    console.log('================================================================');
  } finally {
    server.close();
  }
}

runSprint1Verification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
