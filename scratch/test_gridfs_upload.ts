import assert from 'assert';
import FormData from 'form-data';
import http from 'http';
import { MongoClient, ObjectId } from 'mongodb';
import app from '../apps/submission-service/src/main';
import { pool } from '../apps/submission-service/src/config/db';
import { submissionRepository } from '../apps/submission-service/src/submissions/submission.repository';

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://scms_admin:scms_mongo_pass_2026@localhost:27017/scms_documents?authSource=admin';

async function runTest() {
  console.log('===============================================================');
  console.log('   MONGODB GRIDFS FILE UPLOAD PIPELINE VERIFICATION');
  console.log('===============================================================');

  await pool.query('SELECT 1');
  await submissionRepository.init();

  // 1. Start test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(4899, resolve));
  console.log('Test server listening on port 4899');

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('scms_documents');

  try {
    // 2. Prepare test file & multipart form
    const samplePdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (CS101 Syllabus 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    const testFileName = `SYLLABUS_TEST_${Date.now()}.pdf`;

    const form = new FormData();
    form.append('requirementId', 'req-gridfs-test-2026');
    form.append('facultyId', 'fac-prof-delacruz');
    form.append('facultyName', 'Prof. Juan Dela Cruz');
    form.append('courseCode', 'COMP 20033');
    form.append('sectionLabel', 'BSIT 3-1');
    form.append('mode', 'FILE_UPLOAD');
    form.append('file', samplePdfContent, {
      filename: testFileName,
      contentType: 'application/pdf',
    });

    console.log('\n--- 1. Uploading file via POST /api/v1/submissions (multipart/form-data) ---');
    const uploadRes = await new Promise<{ status: number; body: any }>((resolve, reject) => {
      const req = http.request(
        'http://localhost:4899/api/v1/submissions',
        {
          method: 'POST',
          headers: form.getHeaders(),
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
            } catch (err) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          });
        }
      );
      req.on('error', reject);
      form.pipe(req);
    });

    assert.strictEqual(uploadRes.status, 201, `Expected HTTP 201, got ${uploadRes.status}: ${JSON.stringify(uploadRes.body)}`);
    assert.strictEqual(uploadRes.body.success, true);
    const submission = uploadRes.body.data;
    console.log('  [PASS] Upload endpoint returned HTTP 201 Created');
    console.log(`  Submission ID: ${submission.id}`);
    console.log(`  Stored File ID (PostgreSQL): ${submission.file_id}`);
    console.log(`  Stored File Name: ${submission.file_name}`);

    assert.strictEqual(submission.file_name, testFileName, 'Expected file_name to match original filename');
    assert.ok(submission.file_id, 'Expected file_id to be populated');

    // 3. Verify in PostgreSQL
    console.log('\n--- 2. Verifying PostgreSQL Record ---');
    const pgRes = await pool.query('SELECT * FROM submissions WHERE id = $1', [submission.id]);
    assert.strictEqual(pgRes.rows.length, 1);
    const pgRow = pgRes.rows[0];
    assert.strictEqual(pgRow.file_name, testFileName);
    assert.strictEqual(pgRow.file_id, submission.file_id);
    console.log('  [PASS] PostgreSQL record verified with file_id and file_name');

    // 4. Verify in MongoDB GridFS (db.fs.files & db.fs.chunks)
    console.log('\n--- 3. Verifying MongoDB GridFS Storage ---');
    const gridFile = await db.collection('fs.files').findOne({ _id: new ObjectId(submission.file_id) });
    assert.ok(gridFile, `File not found in MongoDB GridFS collection fs.files with _id ${submission.file_id}`);
    assert.strictEqual(gridFile.filename, testFileName, 'Expected GridFS filename to match');
    assert.strictEqual(gridFile.length, samplePdfContent.length, 'Expected GridFS length to match binary size');
    console.log('  [PASS] MongoDB GridFS file found in fs.files:');
    console.log(`    _id: ${gridFile._id}`);
    console.log(`    filename: ${gridFile.filename}`);
    console.log(`    length: ${gridFile.length} bytes`);
    console.log(`    uploadDate: ${gridFile.uploadDate}`);

    const chunks = await db.collection('fs.chunks').find({ files_id: gridFile._id }).toArray();
    assert.ok(chunks.length > 0, 'Expected at least 1 chunk in fs.chunks');
    console.log(`  [PASS] MongoDB GridFS chunks verified (${chunks.length} chunk(s))`);

    // 5. Verify File Download from GridFS
    console.log('\n--- 4. Verifying File Streaming from GridFS via GET /api/v1/submissions/:id/file ---');
    const downloadRes = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; buffer: Buffer }>((resolve, reject) => {
      http.get(`http://localhost:4899/api/v1/submissions/${submission.id}/file`, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, headers: res.headers, buffer: Buffer.concat(chunks) });
        });
      }).on('error', reject);
    });

    assert.strictEqual(downloadRes.status, 200);
    assert.strictEqual(downloadRes.headers['content-type'], 'application/pdf');
    assert.strictEqual(downloadRes.buffer.toString(), samplePdfContent.toString(), 'Streamed content does not match original binary');
    console.log('  [PASS] Streamed download returns exact binary content from MongoDB GridFS');

    console.log('\n===============================================================');
    console.log('ALL MONGODB GRIDFS PIPELINE VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('===============================================================');
    process.exit(0);
  } finally {
    server.close();
    await mongo.close();
    await pool.end();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

