import http from 'http';
import jwt from 'jsonwebtoken';
import { app } from './main';
import { pool } from './config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'scms_jwt_secret_dev_key_2026_super_secure';

const academicHeadToken = jwt.sign(
  { id: 'usr-ah-001', email: 'academic.head@pup.edu.ph', role: 'ACADEMIC_HEAD', first_name: 'Maria', last_name: 'Ramos' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const facultyStaffToken = jwt.sign(
  { id: 'usr-fs-002', email: 'faculty.staff@pup.edu.ph', role: 'FACULTY_STAFF', first_name: 'Juan', last_name: 'Santos' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

let server: http.Server;
const TEST_PORT = 3097;

function makeRequest(method: string, path: string, headers: Record<string, string> = {}, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: raw ? JSON.parse(raw) : {} });
          } catch {
            resolve({ status: res.statusCode || 500, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runSprint2Phase1Tests() {
  console.log('================================================================');
  console.log('  SCMS SPRINT 2 (PHASE 1) VERIFICATION TEST SUITE');
  console.log('  Target: SMS-022 (Courses), SMS-030 (Curricula), SMS-031 (Sections)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS - ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL - ${testName}`);
      if (detail) console.error(`         Reason: ${detail}`);
    }
  }

  await new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, () => {
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: SMS-022 COURSE MASTER CATALOGUE TESTS
    // -------------------------------------------------------------------------
    console.log('[Suite 1: SMS-022 Course Master Catalogue]');

    // 1. Unauthenticated request rejected
    const unauth = await makeRequest('GET', '/api/v1/courses');
    assert(unauth.status === 401, 'SMS-022 Security: Unauthenticated request rejected with HTTP 401');

    // 2. Academic Head reads courses list
    const listRes = await makeRequest('GET', '/api/v1/courses', { Authorization: `Bearer ${academicHeadToken}` });
    assert(listRes.status === 200 && Array.isArray(listRes.body.data) && listRes.body.data.length >= 4, 'SMS-022 AC1: Academic Head retrieves seeded master courses (HTTP 200)');

    // 3. Contact hours formula verification
    const webCourse = listRes.body.data.find((c: any) => c.course_code === 'INTE 30103');
    assert(
      webCourse && Number(webCourse.lecture_hours) === 2.0 && Number(webCourse.lab_hours) === 3.0 && Number(webCourse.contact_hours) === 5.0,
      'SMS-022 AC1: Contact hours formula strictly equals lecture + lab (2.0 + 3.0 = 5.0)'
    );

    // 4. Lab requirements & special software verification
    assert(
      webCourse && webCourse.requires_lab === true && webCourse.lab_type === 'Computer Laboratory' && webCourse.special_software.includes('Docker'),
      'SMS-022 AC2: Lab requirement, lab type, and special software array correctly preserved'
    );

    // 5. Faculty Staff blocked from adding course
    const facultyAdd = await makeRequest('POST', '/api/v1/courses', { Authorization: `Bearer ${facultyStaffToken}` }, {
      course_code: 'TEST 10001',
      title: 'Unauthorized Test Course',
    });
    assert(facultyAdd.status === 403, 'SMS-022 AC6: Faculty Staff blocked from adding courses (HTTP 403)');

    // 6. Academic Head creates new course
    const newCourseCode = `CSMC ${Date.now().toString().slice(-4)}`;
    const createRes = await makeRequest('POST', '/api/v1/courses', { Authorization: `Bearer ${academicHeadToken}` }, {
      course_code: newCourseCode,
      title: 'Cloud Systems Architecture',
      credit_units: 3.0,
      lecture_hours: 2.0,
      lab_hours: 3.0,
      requires_lab: true,
      lab_type: 'Cloud Systems Lab',
      special_software: ['AWS CLI', 'Terraform', 'Docker'],
      status: 'Active',
    });
    assert(createRes.status === 201 && createRes.body.data.course_code === newCourseCode, 'SMS-022 AC6: Academic Head creates course in Master Catalogue (HTTP 201)');
    const createdCourseId = createRes.body.data.id;

    // 7. Academic Head creates immutable version 2
    const versionRes = await makeRequest('POST', `/api/v1/courses/${createdCourseId}/version`, { Authorization: `Bearer ${academicHeadToken}` });
    assert(
      versionRes.status === 201 && versionRes.body.data.version === 2 && versionRes.body.data.status === 'Revised',
      'SMS-022 AC4: Official change creates immutable version 2 with status Revised (HTTP 201)'
    );

    // 8. Academic Head retires course
    const retireRes = await makeRequest('PATCH', `/api/v1/courses/${createdCourseId}`, { Authorization: `Bearer ${academicHeadToken}` }, { status: 'Retired' });
    assert(retireRes.status === 200 && retireRes.body.data.status === 'Retired', 'SMS-022 AC3/5: Course successfully retired without deleting past record (HTTP 200)');

    // -------------------------------------------------------------------------
    // SUITE 2: SMS-030 CURRICULA & COURSE MEMBERSHIP TESTS
    // -------------------------------------------------------------------------
    console.log('\n[Suite 2: SMS-030 Curricula & Course Membership]');

    // 9. List curricula
    const currList = await makeRequest('GET', '/api/v1/curricula', { Authorization: `Bearer ${academicHeadToken}` });
    assert(currList.status === 200 && Array.isArray(currList.body.data) && currList.body.data.length >= 1, 'SMS-030 AC1: List curricula returns registered curricula (HTTP 200)');

    // 10. Faculty Staff blocked from creating curriculum
    const facultyCurr = await makeRequest('POST', '/api/v1/curricula', { Authorization: `Bearer ${facultyStaffToken}` }, {
      program_id: '11111111-1111-1111-1111-111111111111',
      curriculum_code: 'ILLEGAL-CURR',
      name: 'Illegal Curriculum',
      effective_start_term: '2026-1S',
    });
    assert(facultyCurr.status === 403, 'SMS-030 AC3: Faculty Staff blocked from creating curriculum (HTTP 403)');

    // 11. Academic Head creates new curriculum
    const newCurrCode = `BSIT-${Date.now().toString().slice(-4)}-CURR`;
    const createCurr = await makeRequest('POST', '/api/v1/curricula', { Authorization: `Bearer ${academicHeadToken}` }, {
      program_id: '11111111-1111-1111-1111-111111111111',
      curriculum_code: newCurrCode,
      name: 'BSIT Specialized Cloud Track Curriculum',
      effective_start_term: '2026-1S',
      description: 'Specialized Track for Cloud & DevOps',
      status: 'Active',
    });
    assert(createCurr.status === 201 && createCurr.body.data.curriculum_code === newCurrCode, 'SMS-030 AC1: Academic Head creates curriculum (HTTP 201)');
    const createdCurrId = createCurr.body.data.id;

    // 12. Academic Head links course to curriculum
    const linkCourse = await makeRequest('POST', `/api/v1/curricula/${createdCurrId}/courses`, { Authorization: `Bearer ${academicHeadToken}` }, {
      course_id: 'caaaaaaa-1111-1111-1111-111111111111',
      year_level: 3,
      semester: 1,
      is_major: true,
    });
    assert(linkCourse.status === 201 && linkCourse.body.data.course_code === 'INTE 30103', 'SMS-030 AC2: Link course to curriculum with year level 3, semester 1 (HTTP 201)');

    // -------------------------------------------------------------------------
    // SUITE 3: SMS-031 COHORT BLOCK SECTIONS TESTS
    // -------------------------------------------------------------------------
    console.log('\n[Suite 3: SMS-031 Cohort Block Sections]');

    // 13. List block sections
    const secList = await makeRequest('GET', '/api/v1/block-sections', { Authorization: `Bearer ${academicHeadToken}` });
    assert(secList.status === 200 && Array.isArray(secList.body.data) && secList.body.data.length >= 4, 'SMS-031 AC1: List block sections returns active cohort sections (HTTP 200)');

    // 14. Academic Head registers new block section
    const randomSec = Math.floor(Math.random() * 80) + 10;
    const createSec = await makeRequest('POST', '/api/v1/block-sections', { Authorization: `Bearer ${academicHeadToken}` }, {
      program_id: '11111111-1111-1111-1111-111111111111',
      cohort_admission_year: 2024,
      year_level: 2,
      section_number: randomSec,
      display_label: `BSIT 2-${randomSec}`,
      status: 'Active',
    });
    assert(createSec.status === 201 && createSec.body.data.display_label === `BSIT 2-${randomSec}`, 'SMS-031 AC1: Register cohort block section (HTTP 201)');
    const createdSecId = createSec.body.data.id;

    // 15. Duplicate block section prevented
    const dupSec = await makeRequest('POST', '/api/v1/block-sections', { Authorization: `Bearer ${academicHeadToken}` }, {
      program_id: '11111111-1111-1111-1111-111111111111',
      cohort_admission_year: 2024,
      year_level: 2,
      section_number: randomSec,
      display_label: `BSIT 2-${randomSec}`,
    });
    assert(dupSec.status === 409, 'SMS-031 AC1: Duplicate block section cohort rejected with HTTP 409 Conflict');

    // 16. Academic Head dissolves block section
    const dissolveRes = await makeRequest('PATCH', `/api/v1/block-sections/${createdSecId}/status`, { Authorization: `Bearer ${academicHeadToken}` }, {
      status: 'Dissolved',
    });
    assert(dissolveRes.status === 200 && dissolveRes.body.data.status === 'Dissolved', 'SMS-031 AC3: Dissolving block section transitions status to Dissolved (HTTP 200)');

    console.log('\n================================================================');
    console.log(`  🎉 SUMMARY: ${passed}/${total} SPRINT 2 (PHASE 1) TESTS PASSED!`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('Fatal test runner error:', err.message);
  } finally {
    server.close();
    await pool.end();
  }
}

runSprint2Phase1Tests();
