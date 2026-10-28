import http from 'http';
import jwt from 'jsonwebtoken';
import { app } from './main';
import { requirementsPool, catalogPool } from './config/db';

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
const TEST_PORT = 3096;

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

async function runSprint2Phase2Tests() {
  console.log('================================================================');
  console.log('  SCMS SPRINT 2 (PHASE 2) VERIFICATION TEST SUITE');
  console.log('  Target: SMS-004 (Program Requirement Definitions) & Active Validation');
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
    // 1. Unauthenticated request rejected
    const unauth = await makeRequest('GET', '/api/v1/requirements');
    assert(unauth.status === 401, 'SMS-004 Security: Unauthenticated request rejected with HTTP 401');

    // 2. Faculty Staff blocked from creating requirement
    const facultyCreate = await makeRequest('POST', '/api/v1/requirements', { Authorization: `Bearer ${facultyStaffToken}` }, {
      program_code: 'BSIT',
      term_code: '2026-1S',
      name: 'Unauthorized Requirement',
    });
    assert(facultyCreate.status === 403, 'SMS-004 AC3: Faculty Staff blocked from creating requirements (HTTP 403 Forbidden)');

    // 3. Reject requirement definition for phased-out program (DOMT)
    const phasedOutCreate = await makeRequest('POST', '/api/v1/requirements', { Authorization: `Bearer ${academicHeadToken}` }, {
      program_code: 'DOMT',
      term_code: '2026-1S',
      name: 'DOMT Phased-out Syllabus Requirement',
      description: 'Attempting requirement on phased-out diploma program',
    });
    assert(
      phasedOutCreate.status === 422 && phasedOutCreate.body.message.includes('phased-out'),
      'SMS-021 AC2 & SMS-004 AC1: Requirements strictly rejected for phased-out program DOMT (HTTP 422)'
    );

    // 4. Reject requirement definition for non-existent program
    const unknownProg = await makeRequest('POST', '/api/v1/requirements', { Authorization: `Bearer ${academicHeadToken}` }, {
      program_code: 'NON_EXISTENT_99',
      term_code: '2026-1S',
      name: 'Invalid Program Requirement',
    });
    assert(unknownProg.status === 422, 'SMS-004 AC1: Requirement definition rejected for unknown program code (HTTP 422)');

    // 5. Academic Head creates requirement for Active program (BSIT)
    const createReq = await makeRequest('POST', '/api/v1/requirements', { Authorization: `Bearer ${academicHeadToken}` }, {
      program_code: 'BSIT',
      term_code: '2026-1S',
      requirement_type: 'OBTL_SYLLABUS',
      name: 'AY 2026-2027 First Semester OBTL Syllabus',
      description: 'Official syllabus submission for all active BSIT course sections',
      deadline_at: '2026-10-31T23:59:59+08:00',
    });
    assert(
      createReq.status === 201 && createReq.body.data.status === 'DRAFT' && createReq.body.data.program_code === 'BSIT',
      'SMS-004 AC1/2: Academic Head creates requirement in DRAFT status for Active program BSIT (HTTP 201)'
    );
    const createdReqId = createReq.body.data.id;

    // 6. Faculty Staff cannot see DRAFT requirement
    const facultyList = await makeRequest('GET', '/api/v1/requirements', { Authorization: `Bearer ${facultyStaffToken}` });
    const draftFoundByFaculty = facultyList.body.data?.some((r: any) => r.id === createdReqId);
    assert(!draftFoundByFaculty, 'SMS-007 AC1: DRAFT requirement hidden from Faculty Staff (HTTP 200 with filtered items)');

    // 7. Academic Head publishes requirement
    const publishRes = await makeRequest('PATCH', `/api/v1/requirements/${createdReqId}`, { Authorization: `Bearer ${academicHeadToken}` }, {
      status: 'PUBLISHED',
    });
    assert(publishRes.status === 200 && publishRes.body.data.status === 'PUBLISHED', 'SMS-005 AC2: Academic Head publishes requirement to PUBLISHED status (HTTP 200)');

    // 8. Faculty Staff can now see published requirement
    const facultyListAfterPublish = await makeRequest('GET', '/api/v1/requirements', { Authorization: `Bearer ${facultyStaffToken}` });
    const publishedFoundByFaculty = facultyListAfterPublish.body.data?.some((r: any) => r.id === createdReqId);
    assert(publishedFoundByFaculty, 'SMS-007 AC1: PUBLISHED requirement is now visible to Faculty Staff (HTTP 200)');

    console.log('\n================================================================');
    console.log(`  🎉 SUMMARY: ${passed}/${total} SPRINT 2 (PHASE 2) TESTS PASSED!`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('Fatal test runner error:', err.message);
  } finally {
    server.close();
    await requirementsPool.end();
    await catalogPool.end();
  }
}

runSprint2Phase2Tests();
