import { complianceService } from './compliance/compliance.service';
import { complianceRepository } from './compliance/compliance.repository';

async function runComplianceSprint7Tests() {
  console.log('====================================================');
  console.log('   PUPQC SCMS Sprint 7 Compliance Monitoring Test   ');
  console.log('   Stories: SMS-019 (CCMS Push) & SMS-037 (Matrix Exports)');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${desc}`);
    }
  }

  // 1. CCMS Outbound Compliance Summary (SMS-019)
  console.log('--- 1. Testing CCMS Outbound Compliance Summary (SMS-019) ---');
  const summary = await complianceService.getCcmsSummary('2026-1S');
  assert(
    summary.zero_pii_certified === true &&
    summary.institution.includes('Polytechnic University') &&
    summary.status_distribution !== undefined &&
    typeof summary.compliance_rate_percentage === 'number' &&
    summary.digest_signature.length === 64,
    'Builds zero-PII compliance summary payload with HMAC digest (SMS-019 AC 1 & AC 3)'
  );

  const pushResult = await complianceService.pushCcmsSummary({
    trigger: 'MANUAL_ON_DEMAND',
    actorName: 'Dr. Maria Santos'
  });
  assert(
    pushResult.status === 'DELIVERED' &&
    pushResult.http_status === 200 &&
    pushResult.payload.zero_pii_certified === true,
    'Transmits compliance summary to CCMS endpoint and logs record (SMS-019 AC 2 & AC 4)'
  );

  const logs = complianceService.getCcmsPushLogs();
  assert(logs.length >= 1, 'Push history retains transmitted log entries');

  // 2. Compliance Matrix CSV & PDF Export (SMS-037)
  console.log('\n--- 2. Testing Compliance Matrix CSV & PDF Export (SMS-037) ---');
  const csvData = await complianceService.exportMatrixCsv();
  assert(
    csvData.includes('Course Code') &&
    csvData.includes('Block Section') &&
    csvData.includes('Compliance Status') &&
    csvData.includes('INTE 401'),
    'Generates standard RFC 4180 CSV compliance matrix with complete columns (SMS-037 AC 1)'
  );

  const pdfBuffer = await complianceService.exportMatrixPdf({}, 'Dr. Maria Santos');
  assert(
    Buffer.isBuffer(pdfBuffer) &&
    pdfBuffer.length > 500 &&
    pdfBuffer.slice(0, 5).toString() === '%PDF-',
    'Generates official QA & accreditation compliant PDF matrix with PUPQC header & signature (SMS-037 AC 1 & AC 2)'
  );

  // 3. FMS Ingestion Sync (SMS-023)
  console.log('\n--- 3. Testing FMS Reassignment & Withdrawal Sync (SMS-023) ---');
  const reassignedRecord = await complianceService.syncAssignmentReassignment({
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-1',
    newFacultyId: 'fac-prof-reassigned-101',
    newFacultyName: 'Prof. Teresa Morales'
  });
  assert(
    reassignedRecord !== null && reassignedRecord.faculty_id === 'fac-prof-reassigned-101',
    'Compliance record syncs reassigned faculty details from FMS (SMS-023 AC 1)'
  );

  const withdrawnRecord = await complianceService.syncAssignmentWithdrawal({
    courseCode: 'INTE 401',
    sectionLabel: 'BSIT 4-1'
  });
  assert(
    withdrawnRecord !== null && withdrawnRecord.status === 'Unassigned',
    'Compliance record moves to Unassigned status upon assignment withdrawal (SMS-023 AC 3)'
  );

  console.log(`\n====================================================`);
  console.log(`   Compliance Sprint 7 Results: ${passed} / ${total} Tests Passed`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runComplianceSprint7Tests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
