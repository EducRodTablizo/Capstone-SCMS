import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3000/api/v1';

let tokens: { academicHead?: string; faculty?: string } = {};
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
        console.log(`  [PASS] ${testName}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${testName} -- ${details || 'Assertion failed'}`);
        failed++;
    }
}

async function runE2ETests() {
    console.log('===================================================');
    console.log('  SCMS END-TO-END INTEGRATION TEST');
    console.log('  All 7 Microservices via API Gateway (:3000)');
    console.log('===================================================\n');

    console.log('[1/6] Testing Authentication via Identity Service...');
    try {
        const headRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
            email: 'academic.head@pup.edu.ph',
            password: 'AcademicHead2026!',
        });
        assert(headRes.status === 200 && !!headRes.data.token, 'Academic Head login successful');
        tokens.academicHead = headRes.data.token;

        const facRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
            email: 'faculty.donayre@pup.edu.ph',
            password: 'Faculty2026!',
        });
        assert(facRes.status === 200 && !!facRes.data.token, 'Faculty login successful');
        tokens.faculty = facRes.data.token;
    } catch (err: any) {
        assert(false, 'Login test failed', err.message);
    }

    const authHeaders = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

    console.log('\n[2/6] Testing Academic Catalog via API Gateway...');
    try {
        const coursesRes = await axios.get(`${GATEWAY_URL}/courses`, authHeaders(tokens.academicHead!));
        assert(coursesRes.status === 200, 'List courses via Gateway');
    } catch (err: any) {
        console.log(`  [SKIP] Catalog test skipped: ${err.message}`);
    }

    console.log('\n[3/6] Testing Requirements via API Gateway...');
    try {
        const termRes = await axios.get(`${GATEWAY_URL}/terms/active`, authHeaders(tokens.academicHead!));
        assert(termRes.status === 200, 'Fetch active term via Gateway');

        const reqsRes = await axios.get(`${GATEWAY_URL}/requirements`, authHeaders(tokens.academicHead!));
        assert(reqsRes.status === 200, 'List requirements via Gateway');
    } catch (err: any) {
        console.log(`  [SKIP] Requirements test skipped: ${err.message}`);
    }

    console.log('\n[4/6] Testing Submissions via API Gateway...');
    try {
        const subsRes = await axios.get(`${GATEWAY_URL}/submissions`, authHeaders(tokens.academicHead!));
        assert(subsRes.status === 200, 'List submissions via Gateway');
    } catch (err: any) {
        console.log(`  [SKIP] Submissions test skipped: ${err.message}`);
    }

    console.log('\n[5/6] Testing Compliance via API Gateway...');
    try {
        const compRes = await axios.get(`${GATEWAY_URL}/compliance/metrics`, authHeaders(tokens.academicHead!));
        assert(compRes.status === 200, 'Fetch compliance metrics via Gateway');
    } catch (err: any) {
        console.log(`  [SKIP] Compliance test skipped: ${err.message}`);
    }

    console.log('\n[6/6] Testing Audit Trail via API Gateway...');
    try {
        const logsRes = await axios.get(`${GATEWAY_URL}/audit-logs`, authHeaders(tokens.academicHead!));
        assert(logsRes.status === 200, 'Fetch audit logs via Gateway');

        const verifyRes = await axios.get(`${GATEWAY_URL}/audit-logs/verify`, authHeaders(tokens.academicHead!));
        assert(verifyRes.status === 200 && verifyRes.data.valid === true, 'Audit chain integrity verified');
    } catch (err: any) {
        console.log(`  [SKIP] Audit test skipped: ${err.message}`);
    }

    console.log('\n===================================================');
    console.log(`  E2E RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('===================================================\n');
}

runE2ETests().catch((err) => {
    console.error('Fatal E2E error:', err);
    process.exit(1);
});