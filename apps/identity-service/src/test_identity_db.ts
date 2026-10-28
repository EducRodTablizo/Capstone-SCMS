import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { pool, dbConfig } from './config/db';
import { userRepository } from './users/user.repository';
import { authService } from './auth/auth.service';
import { hashPassword } from './auth/password.util';
import { requireAuth, requireRole } from './guards/role.guard';
import { canAccessFacultyDocument } from './privacy/privacy.middleware';

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

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

async function runIdentityDbTests() {
  console.log('================================================================');
  console.log('  SCMS IDENTITY SERVICE - POSTGRESQL MIGRATION TEST SUITE');
  console.log(`  Database: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
  console.log('================================================================\n');

  // Ensure users.json is deleted before running tests
  const jsonPaths = [
    path.resolve(process.cwd(), 'users.json'),
    path.resolve(__dirname, '../users.json'),
    path.resolve(__dirname, '../../users.json'),
  ];
  for (const p of jsonPaths) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  }

  // 1. Initialize PostgreSQL repository & verify connection
  await userRepository.init();

  const countRes = await pool.query('SELECT COUNT(*) FROM users');
  const totalSeeded = parseInt(countRes.rows[0]?.count || '0', 10);
  recordTest(
    'PostgreSQL Connection & Seed Script Initialization',
    totalSeeded >= 3 && !fs.existsSync(jsonPaths[0]),
    `Connected to PostgreSQL ${dbConfig.database}; users table has ${totalSeeded} rows; users.json absent`
  );

  // 2. Verify findByEmail() for all 3 seeded accounts
  const headUser = await userRepository.findByEmail('academic.head@pup.edu.ph');
  const faculty1 = await userRepository.findByEmail('faculty.donayre@pup.edu.ph');
  const faculty2 = await userRepository.findByEmail('faculty.tablizo@pup.edu.ph');

  recordTest(
    'PostgreSQL SELECT via findByEmail() for Seeded Users',
    !!headUser &&
      headUser.role === 'ACADEMIC_HEAD' &&
      !!faculty1 &&
      faculty1.role === 'FACULTY_STAFF' &&
      !!faculty2 &&
      faculty2.role === 'FACULTY_STAFF',
    `Resolved ${headUser?.email} (${headUser?.role}), ${faculty1?.email} (${faculty1?.role}), ${faculty2?.email} (${faculty2?.role})`
  );

  // 3. Verify findById()
  const foundById = await userRepository.findById('11111111-1111-1111-1111-111111111111');
  recordTest(
    'PostgreSQL SELECT via findById()',
    !!foundById && foundById.email === 'academic.head@pup.edu.ph',
    `Found user id=${foundById?.id} (${foundById?.first_name} ${foundById?.last_name})`
  );

  // 4. Verify create() and update() SQL queries
  const tempId = randomUUID();
  const tempEmail = `faculty.test.${Date.now()}@pup.edu.ph`;
  const tempHash = await hashPassword('Faculty2026!');

  const createdUser = await userRepository.create({
    id: tempId,
    email: tempEmail,
    password_hash: tempHash,
    first_name: 'Prof. Elena',
    last_name: 'Reyes',
    role: 'FACULTY_STAFF',
    fms_faculty_id: 'FMS-PUPQC-0999',
    college: 'College of Computer and Information Sciences',
    unit: 'Information Technology Department',
    is_active: true,
    created_at: new Date(),
  });

  const updatedUser = await userRepository.update(tempId, {
    unit: 'Data Science Unit',
    is_active: false,
  });

  await pool.query('DELETE FROM users WHERE email = $1', [tempEmail]);

  recordTest(
    'PostgreSQL INSERT & UPDATE via create() and update()',
    createdUser.id === tempId &&
      updatedUser?.unit === 'Data Science Unit' &&
      updatedUser?.is_active === false &&
      !fs.existsSync(jsonPaths[0]),
    `Created user ${createdUser.email}, updated unit='${updatedUser?.unit}', is_active=${updatedUser?.is_active}`
  );

  // 5. Verify Argon2id Login for Academic Head & Faculty Staff
  const headLogin = await authService.login('academic.head@pup.edu.ph', 'AcademicHead2026!');
  const facultyLogin = await authService.login('faculty.donayre@pup.edu.ph', 'Faculty2026!');
  const invalidLogin = await authService.login('academic.head@pup.edu.ph', 'WrongPassword!');

  recordTest(
    'SCMS-001 Argon2id Authentication against PostgreSQL Users',
    headLogin.success === true &&
      !!headLogin.token &&
      headLogin.user?.role === 'ACADEMIC_HEAD' &&
      facultyLogin.success === true &&
      !!facultyLogin.token &&
      facultyLogin.user?.role === 'FACULTY_STAFF' &&
      invalidLogin.success === false,
    `Academic Head & Faculty login succeeded with JWT; invalid password rejected`
  );

  // 6. Verify RBAC Guards (Two Roles Only: ACADEMIC_HEAD & FACULTY_STAFF)
  const headReq: any = { headers: { authorization: `Bearer ${headLogin.token}` }, cookies: {} };
  const headRes = createMockRes();
  let headNextCalled = false;
  requireAuth(headReq, headRes, () => {
    headNextCalled = true;
  });

  let headRoleAllowed = false;
  requireRole('ACADEMIC_HEAD')(headReq, headRes, () => {
    headRoleAllowed = true;
  });

  const facReq: any = { headers: { authorization: `Bearer ${facultyLogin.token}` }, cookies: {} };
  const facRes = createMockRes();
  requireAuth(facReq, facRes, () => {});
  requireRole('ACADEMIC_HEAD')(facReq, facRes, () => {});

  const docPrivacyOk =
    canAccessFacultyDocument(facultyLogin.user!.id, 'FACULTY_STAFF', facultyLogin.user!.id) === true &&
    canAccessFacultyDocument(facultyLogin.user!.id, 'FACULTY_STAFF', '33333333-3333-3333-3333-333333333333') === false &&
    canAccessFacultyDocument(headLogin.user!.id, 'ACADEMIC_HEAD', '33333333-3333-3333-3333-333333333333') === true;

  recordTest(
    'SCMS-002 & SCMS-003 RBAC & RA 10173 Data Privacy Enforcement',
    headNextCalled && headRoleAllowed && facRes.statusCode === 403 && docPrivacyOk,
    `Academic Head permitted (200); Faculty write blocked (${facRes.statusCode}); Document privacy verified`
  );

  console.log('\n================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`  RESULT: ${passedCount}/${results.length} TESTS PASSED`);
  console.log('================================================================');

  await pool.end();

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runIdentityDbTests().catch((err) => {
  console.error('Fatal error in test_identity_db.ts:', err);
  process.exit(1);
});

