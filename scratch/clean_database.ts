import { Client } from 'pg';
import { MongoClient } from 'mongodb';
import { createHash } from 'crypto';

const PG_PASSWORD = 'scms_secure_pass_2026';
const PG_USER = 'scms_admin';
const PG_HOST = '127.0.0.1';

async function cleanCatalog() {
  console.log('\n--- Cleaning Academic Catalog (sms_catalog:5435) ---');
  const client = new Client({
    host: PG_HOST,
    port: 5435,
    user: PG_USER,
    password: PG_PASSWORD,
    database: 'sms_catalog',
  });
  await client.connect();

  // 1. Remove courses with "Replacement Course" or "Testing Retired Course Handling" or codes TEST/RET/REP
  const delCoursesRes = await client.query(`
    DELETE FROM courses 
    WHERE title IN ('Testing Retired Course Handling', 'Replacement Course')
       OR course_code LIKE 'TEST-%'
       OR course_code LIKE 'RET-%'
       OR course_code LIKE 'REP-%'
    RETURNING course_code, title;
  `);
  console.log(`Removed ${delCoursesRes.rowCount} test course(s):`, delCoursesRes.rows.map(r => `${r.course_code} (${r.title})`));

  // 2. Remove program with code 'IT' (Title: "Cha")
  const delProgRes = await client.query(`
    DELETE FROM programs WHERE code = 'IT' RETURNING code, name;
  `);
  console.log(`Removed ${delProgRes.rowCount} test program(s):`, delProgRes.rows.map(r => `${r.code} (${r.name})`));

  // 3. Ensure the standard realistic programs exist with correct status and descriptions
  await client.query(`
    UPDATE programs SET status = 'Active', description = 'College of Computer and Information Sciences' WHERE code = 'BSIT';
    UPDATE programs SET status = 'Active', description = 'College of Business Administration' WHERE code = 'BSBA-HRM';
    UPDATE programs SET status = 'Active', description = 'College of Business Administration' WHERE code = 'BSBA-MM';
    UPDATE programs SET status = 'Active', description = 'College of Business Administration' WHERE code = 'BSENTREP';
    UPDATE programs SET status = 'Phased out', description = 'College of Communication' WHERE code = 'DOMT';
  `);

  const progs = await client.query(`SELECT code, name, status FROM programs ORDER BY code ASC;`);
  console.log('Current Academic Programs:');
  progs.rows.forEach(p => console.log(`  - [${p.status}] ${p.code}: ${p.name}`));

  const courses = await client.query(`SELECT course_code, title, credit_units, contact_hours, status FROM courses ORDER BY course_code ASC;`);
  console.log('Current Courses:');
  courses.rows.forEach(c => console.log(`  - [${c.status}] ${c.course_code}: ${c.title} (${c.credit_units}u, ${c.contact_hours}h)`));

  await client.end();
}

async function cleanSubmissions() {
  console.log('\n--- Cleaning Submissions (sms_submissions:5437) ---');
  const client = new Client({
    host: PG_HOST,
    port: 5437,
    user: PG_USER,
    password: PG_PASSWORD,
    database: 'sms_submissions',
  });
  await client.connect();

  const CANONICAL_IDS = [
    'a1111111-1111-4111-8111-111111111101',
    'a1111111-1111-4111-8111-111111111102',
    'a1111111-1111-4111-8111-111111111103',
    'a1111111-1111-4111-8111-111111111104',
    'a1111111-1111-4111-8111-111111111105',
    'a1111111-1111-4111-8111-111111111106',
    'a1111111-1111-4111-8111-111111111107',
    'a1111111-1111-4111-8111-111111111108',
  ];

  // Delete non-canonical submissions
  const delSubRes = await client.query(`
    DELETE FROM submissions 
    WHERE id NOT IN (${CANONICAL_IDS.map(id => `'${id}'`).join(', ')})
       OR file_name LIKE 'SYLLABUS_TEST_%'
       OR file_name LIKE 'GATEWAY_TEST_%'
       OR file_name LIKE '%.md.pdf'
    RETURNING id, course_code, section_label, file_name;
  `);
  console.log(`Removed ${delSubRes.rowCount} test submission(s):`, delSubRes.rows);

  const remaining = await client.query(`
    SELECT id, course_code, section_label, status, file_name, submitted_at 
    FROM submissions 
    ORDER BY course_code ASC;
  `);
  console.log(`Remaining pristine submissions (${remaining.rowCount}):`);
  remaining.rows.forEach(s => console.log(`  - ${s.course_code} (${s.section_label}): [${s.status}] ${s.file_name || 'NO FILE'}`));

  await client.end();
}

async function cleanMongoGridFS() {
  console.log('\n--- Cleaning MongoDB GridFS (scms_documents:27017) ---');
  const uri = 'mongodb://scms_admin:scms_mongo_pass_2026@127.0.0.1:27017/scms_documents?authSource=admin';
  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db('scms_documents');
    const filesColl = db.collection('fs.files');
    const chunksColl = db.collection('fs.chunks');

    const testFiles = await filesColl.find({
      $or: [
        { filename: { $regex: '^SYLLABUS_TEST_' } },
        { filename: { $regex: '^GATEWAY_TEST_' } },
        { filename: { $regex: '\\.md\\.pdf$' } },
      ]
    }).toArray();

    if (testFiles.length > 0) {
      const fileIds = testFiles.map(f => f._id);
      await chunksColl.deleteMany({ files_id: { $in: fileIds } });
      await filesColl.deleteMany({ _id: { $in: fileIds } });
      console.log(`Deleted ${testFiles.length} test GridFS document(s):`, testFiles.map(f => f.filename));
    } else {
      console.log('No test GridFS documents found.');
    }
  } catch (err: any) {
    console.warn('GridFS cleanup note:', err.message);
  } finally {
    await mongo.close();
  }
}

async function cleanAuditLogs() {
  console.log('\n--- Cleaning & Reseeding Audit Logs (sms_audit:5438) ---');
  const client = new Client({
    host: PG_HOST,
    port: 5438,
    user: PG_USER,
    password: PG_PASSWORD,
    database: 'sms_audit',
  });
  await client.connect();

  // Truncate audit_logs
  await client.query('TRUNCATE TABLE audit_logs;');
  console.log('Truncated audit_logs table.');
  await client.end();

  // Obtain token and seed via API Gateway so SHA-256 hash chain is dynamically generated
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'academic.head@pup.edu.ph', password: 'AcademicHead2026!' })
  });
  const loginData = await loginRes.json() as any;
  const token = loginData.token;

  const seedActions = [
    {
      actorId: '11111111-1111-1111-1111-111111111111',
      actorEmail: 'academic.head@pup.edu.ph',
      actorRole: 'ACADEMIC_HEAD',
      actionType: 'ACADEMIC_TERM_ACTIVATED',
      entityName: 'ACADEMIC_TERM',
      entityId: '1de50a83-7c72-4d7d-97dc-3ecd153dccf9',
      details: { term_code: '2026-1S', academic_year: '2026-2027', note: 'Term activated for syllabus submission' },
      clientIp: '127.0.0.1',
    },
    {
      actorId: '11111111-1111-1111-1111-111111111111',
      actorEmail: 'academic.head@pup.edu.ph',
      actorRole: 'ACADEMIC_HEAD',
      actionType: 'REQUIREMENT_PUBLISHED',
      entityName: 'REQUIREMENT_DEFINITION',
      entityId: '22222222-2222-2222-2222-222222222222',
      details: { program: 'BSIT', deadline: '2026-11-15T23:59:59Z', name: 'BSIT 1st Sem Outcomes-Based Syllabus' },
      clientIp: '127.0.0.1',
    },
    {
      actorId: '22222222-2222-2222-2222-222222222222',
      actorEmail: 'faculty.donayre@pup.edu.ph',
      actorRole: 'FACULTY_STAFF',
      actionType: 'SYLLABUS_SUBMITTED',
      entityName: 'SUBMISSION_RECORD',
      entityId: 'a1111111-1111-4111-8111-111111111101',
      details: { course_code: 'INTE 401', section_label: 'BSIT 4-1', file_name: 'INTE_401_Syllabus.pdf' },
      clientIp: '127.0.0.1',
    },
    {
      actorId: '11111111-1111-1111-1111-111111111111',
      actorEmail: 'academic.head@pup.edu.ph',
      actorRole: 'ACADEMIC_HEAD',
      actionType: 'REVIEW_DECISION_RECORDED',
      entityName: 'SUBMISSION_RECORD',
      entityId: 'a1111111-1111-4111-8111-111111111101',
      details: { decision: 'Approved', course_code: 'INTE 401', remarks: 'OBTL matrix and syllabus outline fully compliant with CHED CMO 25 s. 2015.' },
      clientIp: '127.0.0.1',
    },
    {
      actorId: '11111111-1111-1111-1111-111111111111',
      actorEmail: 'academic.head@pup.edu.ph',
      actorRole: 'ACADEMIC_HEAD',
      actionType: 'SIGNATORY_AUTHORITY_CONFIRMED',
      entityName: 'SIGNATORY_CONFIG',
      entityId: '99999999-9999-9999-9999-999999999999',
      details: { reviewed_by: 'Dr. Maria Santos', recommending: 'Assoc. Prof. Demetrio C. Quirino, Jr., PECE', approving: 'Assoc. Prof. Anna Ruby P. Gapasin, PhD' },
      clientIp: '127.0.0.1',
    },
  ];

  for (const entry of seedActions) {
    await fetch('http://localhost:3000/api/v1/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify(entry),
    });
  }

  const verifyRes = await fetch('http://localhost:3000/api/v1/audit-logs/verify', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const verifyData = await verifyRes.json() as any;
  console.log(`Seeded ${seedActions.length} pristine audit logs. Cryptographic SHA-256 chain integrity: ${verifyData.valid ? 'VALID ✓' : 'INVALID ✗'}`);
}

async function main() {
  await cleanCatalog();
  await cleanSubmissions();
  await cleanMongoGridFS();
  await cleanAuditLogs();
  console.log('\n=== Database Cleanup Complete! ===\n');
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
