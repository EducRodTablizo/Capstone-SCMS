import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3000/api/v1';

async function run() {
  console.log('--- STARTING E2E TEST ---');
  try {
    const login = await axios.post(GATEWAY_URL + '/auth/login', {
      email: 'academic.head@pup.edu.ph',
      password: 'AcademicHead2026!'
    });
    console.log('[PASS] Login successful.');
    const token = login.data.token;
    
    const headers = { headers: { Authorization: 'Bearer ' + token } };

    const courses = await axios.get(GATEWAY_URL + '/courses', headers);
    console.log('[PASS] Courses fetched. Status:', courses.status);

    const reqs = await axios.get(GATEWAY_URL + '/requirements', headers);
    console.log('[PASS] Requirements fetched. Status:', reqs.status);

    const subs = await axios.get(GATEWAY_URL + '/submissions', headers);
    console.log('[PASS] Submissions fetched. Status:', subs.status);

    const audit = await axios.get(GATEWAY_URL + '/audit-logs', headers);
    console.log('[PASS] Audit logs fetched. Status:', audit.status);

    const verify = await axios.get(GATEWAY_URL + '/audit-logs/verify', headers);
    console.log('[PASS] Audit verify fetched. Status:', verify.status);

    console.log('--- E2E TEST COMPLETE ---');
  } catch (err: any) {
    console.error('[FAIL]', err.message);
    if (err.response) console.error('Response:', err.response.data);
  }
}

run();
