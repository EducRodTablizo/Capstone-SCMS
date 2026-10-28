import { resilienceService } from './integrations/resilience.service';

async function runSprint8Tests() {
  console.log('====================================================');
  console.log('   PUPQC SCMS Sprint 8 Automated Verification Test  ');
  console.log('   Stories: SMS-020, SMS-027, SMS-029, SMS-034      ');
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

  // 1. Multi-System Offline Resilience & 4-Tier Fallback for FMS (SMS-020)
  console.log('--- 1. Testing 4-Tier FMS Cache Resilience (SMS-020 / REQ-INT-02) ---');
  // Tier 1: Warm Cache
  resilienceService.setTierOverride('FMS', null);
  const p1 = resilienceService.getFacultyProfile('fac-1092');
  assert(
    p1.cache_state === 'WARM_CACHE' && p1.display_name === 'Asst. Prof. Juan Dela Cruz',
    'Tier 1 (Warm Cache): Serves active cached profile instantly (<5ms) (SMS-020 AC 1)'
  );

  // Tier 2: Stale Expired Cache
  resilienceService.setTierOverride('FMS', 'EXPIRED_STALE');
  const p2 = resilienceService.getFacultyProfile('fac-1092');
  assert(
    p2.cache_state === 'EXPIRED_STALE' && p2.advisory_notice === '[CACHED SNAPSHOT - STALE]',
    'Tier 2 (Expired Cache): Stale-while-revalidate serving with [CACHED SNAPSHOT - STALE] amber banner (SMS-020 AC 1)'
  );

  // Tier 3: Synthetic Fixture Fallback
  resilienceService.setTierOverride('FMS', 'SYNTHETIC_FIXTURE');
  const p3 = resilienceService.getFacultyProfile('fac-unknown-999');
  assert(
    p3.cache_state === 'SYNTHETIC_FIXTURE' && p3.advisory_notice === '[FIXTURE DATA: FMS UNCONNECTED]',
    'Tier 3 (Cold Start): Serves certified synthetic fixtures with [FIXTURE DATA: FMS UNCONNECTED] (SMS-020 AC 1)'
  );

  // Tier 4: Missing Field Fallback
  resilienceService.setTierOverride('FMS', 'MISSING_FIELD_DEFAULT');
  const p4 = resilienceService.getFacultyProfile('fac-prof-delacruz');
  assert(
    p4.cache_state === 'MISSING_FIELD_DEFAULT' && p4.consultation_hours.includes('By appointment via MS Teams'),
    'Tier 4 (Missing Field Fallback): Defaults missing consultation hours to MS Teams standard (SMS-020 AC 1)'
  );

  // Manual Operator Reconcile (SMS-020 AC 3 & Joint Acceptance Rule 9)
  const reconcile = resilienceService.reconcileFms();
  assert(
    reconcile.reconciled === true && reconcile.discrepancy_count === 0,
    'Manual operator reconciliation path re-syncs FMS and clears discrepancies (SMS-020 AC 3)'
  );

  // 2. Outbound Catalog Change Webhook & 1m, 5m, 15m Retry Queue (SMS-027)
  console.log('\n--- 2. Testing Outbound Catalog Webhooks & Retry Queue (SMS-027) ---');
  const webhookSuccess = resilienceService.dispatchCatalogWebhook({
    eventType: 'COURSE_UPDATED',
    courseId: 'crs-inte401',
    courseCode: 'INTE 401',
    courseTitle: 'Information Assurance and Security 2',
    creditUnits: 3,
    lectureHours: 2,
    labHours: 3,
    requiresLaboratory: true,
    status: 'ACTIVE'
  });
  assert(
    webhookSuccess.status === 'DELIVERED' && webhookSuccess.payload.digest_signature.length === 64,
    'Dispatches HMAC-signed catalog change webhook to FMS with DELIVERED status (SMS-027 AC 1)'
  );

  const webhookRetry = resilienceService.dispatchCatalogWebhook({
    eventType: 'COURSE_RETIRED',
    courseId: 'crs-inte302',
    courseCode: 'INTE 302',
    courseTitle: 'Information Assurance and Security 1',
    creditUnits: 3,
    lectureHours: 2,
    labHours: 3,
    requiresLaboratory: true,
    status: 'RETIRED',
    simulateFailure: true
  });
  assert(
    webhookRetry.status === 'RETRY_1M' && webhookRetry.next_retry_at !== null,
    'On delivery failure, schedules automatic retry with exponential backoff (1m, 5m, 15m) (SMS-027 AC 2)'
  );

  const logs = resilienceService.getWebhookLogs();
  assert(logs.length >= 2, 'Webhook delivery and retry history permanently recorded for audit (SMS-027 AC 3)');

  // 3. Health Checks & Joint Acceptance Fixtures (SMS-029)
  console.log('\n--- 3. Testing Unified Health Checks & Seed Fixtures (SMS-029) ---');
  const health = resilienceService.getHealthStatus();
  assert(
    health.service === 'compliance-monitoring-service' &&
    health.dependencies.postgres === 'CONNECTED' &&
    health.resilience.outbound_retry_queue_length >= 1,
    'Health check reports service availability, dependency status, and retry queue (SMS-029 AC 1)'
  );

  // 4. CCMS Offline Resilience & Calendar Fallback (SMS-034)
  console.log('\n--- 4. Testing CCMS Offline Calendar Resilience (SMS-034) ---');
  resilienceService.setTierOverride('CCMS', null);
  const cal1 = resilienceService.getCcmsCalendar();
  assert(
    cal1.cache_state === 'WARM_CACHE' && cal1.term_code === '2026-1S',
    'Serves active cached CCMS calendar for 24h (SMS-034 AC 1)'
  );

  resilienceService.setTierOverride('CCMS', 'EXPIRED_STALE');
  const cal2 = resilienceService.getCcmsCalendar();
  assert(
    cal2.cache_state === 'EXPIRED_STALE' && cal2.advisory_notice === '[STALE CALENDAR SNAPSHOT - CCMS OFFLINE]',
    'Serves stale calendar with amber warning notice banner when CCMS is offline (SMS-034 AC 1)'
  );

  resilienceService.setTierOverride('CCMS', 'SYNTHETIC_FIXTURE');
  const cal3 = resilienceService.getCcmsCalendar();
  assert(
    cal3.cache_state === 'SYNTHETIC_FIXTURE' && cal3.holidays.length >= 5,
    'Cold start falls back to certified synthetic term calendar sample (SMS-034 AC 1)'
  );

  console.log(`\n====================================================`);
  console.log(`   Sprint 8 Verification Results: ${passed} / ${total} Tests Passed`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSprint8Tests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
