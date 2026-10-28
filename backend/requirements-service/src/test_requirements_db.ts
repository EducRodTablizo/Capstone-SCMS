import { pool, dbConfig } from './config/db';
import { termRepository } from './calendar/term.repository';
import { requirementRepository } from './requirements/requirement.repository';
import { calendarRepository } from './calendar/calendar.repository';
import { CalendarSnapshotPayload } from './calendar/calendar.entity';

async function runRequirementsDbTests() {
  console.log('=============================================================');
  console.log('   SCMS REQUIREMENTS SERVICE - POSTGRESQL MIGRATION SUITE');
  console.log('=============================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, label: string, details?: string) => {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${label}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${label}${details ? ' — ' + details : ''}`);
    }
  };

  try {
    // 1. Verify DB Configuration & Connection
    assert(
      dbConfig.host === 'localhost' &&
        dbConfig.port === 5436 &&
        dbConfig.user === 'scms_admin' &&
        dbConfig.database === 'sms_requirements',
      `Database config connects to ${dbConfig.database} on port ${dbConfig.port} as ${dbConfig.user}`
    );

    await termRepository.init();
    await requirementRepository.init();
    await calendarRepository.init();

    // -------------------------------------------------------------------------
    // 2. Academic Terms CRUD (`academic_terms` table)
    // -------------------------------------------------------------------------
    const initialTerms = await termRepository.findAll();
    assert(
      initialTerms.length >= 1 && initialTerms.some((t) => t.term_code === '2026-1S'),
      `Initial seeded academic term '2026-1S' exists in academic_terms (count=${initialTerms.length})`
    );

    const activeTerm = await termRepository.getActiveTerm();
    assert(
      activeTerm !== null && activeTerm.term_code === '2026-1S',
      `termRepository.getActiveTerm() returns '2026-1S'`
    );

    const testTermCode = `TEST-${Date.now().toString().slice(-5)}`;
    const createdTerm = await termRepository.create({
      term_code: testTermCode,
      academic_year: '2027-2028',
      semester_number: 2,
      semester_label: '2ND_SEMESTER',
      display_label: 'A.Y. 2027-2028 Second Semester',
      start_date: '2028-02-01',
      end_date: '2028-06-30',
      status: 'UPCOMING',
    });
    assert(
      Boolean(createdTerm?.id) &&
        createdTerm.term_code === testTermCode &&
        createdTerm.status === 'UPCOMING',
      `termRepository.create() inserts into academic_terms (id=${createdTerm?.id})`
    );

    const fetchedTermById = await termRepository.findById(createdTerm.id!);
    const fetchedTermByCode = await termRepository.findByCode(testTermCode);
    assert(
      fetchedTermById?.term_code === testTermCode && fetchedTermByCode?.id === createdTerm.id,
      `termRepository.findById() & findByCode() retrieve the created term`
    );

    const updatedWindowTerm = await termRepository.updateSubmissionWindow(
      testTermCode,
      '2028-02-01T00:00:00Z',
      '2028-03-15T23:59:59Z'
    );
    assert(
      updatedWindowTerm !== null &&
        String(updatedWindowTerm.submission_window_start).startsWith('2028-02-01'),
      `termRepository.updateSubmissionWindow() updates window_start and window_end`
    );

    const updatedStatusTerm = await termRepository.updateStatus(testTermCode, 'CLOSED');
    assert(
      updatedStatusTerm !== null && updatedStatusTerm.status === 'CLOSED',
      `termRepository.updateStatus() transitions term status to CLOSED`
    );

    const updatedTermFull = await termRepository.update(testTermCode, {
      display_label: 'A.Y. 2027-2028 Second Semester (Updated)',
      status: 'ARCHIVED',
    });
    assert(
      updatedTermFull !== null &&
        updatedTermFull.display_label === 'A.Y. 2027-2028 Second Semester (Updated)' &&
        updatedTermFull.status === 'ARCHIVED',
      `termRepository.update() updates display_label and status`
    );

    // -------------------------------------------------------------------------
    // 3. Requirements CRUD (`requirements` table)
    // -------------------------------------------------------------------------
    const bsitStatus = await requirementRepository.verifyProgramIsActive('BSIT');
    const domtStatus = await requirementRepository.verifyProgramIsActive('DOMT');
    assert(
      bsitStatus.exists && bsitStatus.isActive && domtStatus.exists && !domtStatus.isActive,
      `requirementRepository.verifyProgramIsActive() queries catalog programs table (BSIT=Active, DOMT=Phased Out)`
    );

    const initialReqs = await requirementRepository.findAll();
    assert(
      initialReqs.length >= 1 && initialReqs.some((r) => r.program_code === 'BSIT'),
      `Initial seeded requirement for BSIT exists in requirements table (count=${initialReqs.length})`
    );

    const createdReq = await requirementRepository.create({
      program_code: 'BSBA-HRM',
      term_code: '2026-1S',
      requirement_type: 'OBTL_SYLLABUS',
      name: 'BSBA-HRM OBTL Syllabus Requirement',
      description: 'Outcomes-Based Teaching and Learning Syllabus for HRM',
      deadline_at: '2026-11-15T23:59:59Z',
    });
    assert(
      Boolean(createdReq?.id) &&
        createdReq.program_code === 'BSBA-HRM' &&
        createdReq.status === 'DRAFT',
      `requirementRepository.create() inserts new requirement in DRAFT status (id=${createdReq?.id})`
    );

    const fetchedReq = await requirementRepository.findById(createdReq.id);
    assert(
      fetchedReq !== null && fetchedReq.name === 'BSBA-HRM OBTL Syllabus Requirement',
      `requirementRepository.findById() fetches created requirement by UUID`
    );

    const updatedReq = await requirementRepository.update(createdReq.id, {
      name: 'BSBA-HRM OBTL Syllabus (Published)',
      status: 'PUBLISHED',
    });
    assert(
      updatedReq !== null &&
        updatedReq.name === 'BSBA-HRM OBTL Syllabus (Published)' &&
        updatedReq.status === 'PUBLISHED',
      `requirementRepository.update() updates requirement name and transitions status to PUBLISHED`
    );

    const filteredPublishedReqs = await requirementRepository.findAll('PUBLISHED', 'BSBA-HRM', '2026-1S');
    assert(
      filteredPublishedReqs.some((r) => r.id === createdReq.id),
      `requirementRepository.findAll(status, programCode, termCode) filters requirements accurately`
    );

    // -------------------------------------------------------------------------
    // 4. Calendar Snapshots CRUD & Idempotent CCMS Push (`calendar_snapshots` table)
    // -------------------------------------------------------------------------
    const testSyncId = `SYNC-CRUD-${Date.now()}`;
    const samplePayload: CalendarSnapshotPayload = {
      sync_id: testSyncId,
      schema_version: '1.0',
      timestamp: new Date().toISOString(),
      academic_term: {
        term_code: '2026-1S',
        academic_year: '2026-2027',
        semester_number: 1,
        semester_label: '1ST_SEMESTER',
        display_label: 'A.Y. 2026-2027 First Semester',
        start_date: '2026-09-01',
        end_date: '2027-01-31',
      },
      holidays: [
        {
          event_id: 'HOL-2026-11-30',
          date: '2026-11-30',
          name: 'Bonifacio Day',
          entry_type: 'REGULAR_HOLIDAY',
          applies_to: 'BOTH',
        },
      ],
      suspensions: [],
    };

    const createdSnapshot = await calendarRepository.createSnapshot({
      sync_id: testSyncId,
      term_code: '2026-1S',
      payload: samplePayload,
    });
    assert(
      Boolean(createdSnapshot?.id) && createdSnapshot.sync_id === testSyncId,
      `calendarRepository.createSnapshot() inserts into calendar_snapshots (id=${createdSnapshot?.id})`
    );

    const fetchedSnapById = await calendarRepository.findSnapshotById(createdSnapshot.id);
    const fetchedSnapBySyncId = await calendarRepository.findSnapshotBySyncId(testSyncId);
    assert(
      fetchedSnapById?.sync_id === testSyncId && fetchedSnapBySyncId?.id === createdSnapshot.id,
      `calendarRepository.findSnapshotById() & findSnapshotBySyncId() retrieve snapshot`
    );

    const updatedSnap = await calendarRepository.updateSnapshot(createdSnapshot.id, {
      term_code: '2026-2S',
    });
    assert(
      updatedSnap !== null && updatedSnap.term_code === '2026-2S',
      `calendarRepository.updateSnapshot() updates snapshot term_code`
    );

    const allSnaps = await calendarRepository.findAllSnapshots();
    assert(
      allSnaps.some((s) => s.id === createdSnapshot.id),
      `calendarRepository.findAllSnapshots() lists snapshots in calendar_snapshots`
    );

    const deletedSnap = await calendarRepository.deleteSnapshot(createdSnapshot.id);
    assert(
      deletedSnap === true && (await calendarRepository.findSnapshotById(createdSnapshot.id)) === null,
      `calendarRepository.deleteSnapshot() removes snapshot from calendar_snapshots`
    );

    // Test saveSnapshot transactional CCMS push + idempotency
    const pushSyncId = `SYNC-PUSH-${Date.now()}`;
    const pushPayload: CalendarSnapshotPayload = {
      ...samplePayload,
      sync_id: pushSyncId,
    };
    const firstPush = await calendarRepository.saveSnapshot(pushPayload);
    const secondPush = await calendarRepository.saveSnapshot(pushPayload);
    assert(
      firstPush.status === 'PROCESSED' &&
        firstPush.events_count === 1 &&
        secondPush.status === 'ALREADY_PROCESSED',
      `calendarRepository.saveSnapshot() persists snapshot + events and enforces idempotency on duplicate sync_id`
    );

    const nonWorkingCheck = await calendarRepository.isNonWorkingDay('2026-1S', '2026-11-30');
    assert(
      nonWorkingCheck.isNonWorking === true &&
        String(nonWorkingCheck.reason).includes('Bonifacio Day'),
      `calendarRepository.isNonWorkingDay() detects holiday pushed via calendar snapshot`
    );

    // -------------------------------------------------------------------------
    // 5. Cleanup Test Records (Delete CRUD checks)
    // -------------------------------------------------------------------------
    const deletedReq = await requirementRepository.delete(createdReq.id);
    assert(
      deletedReq === true && (await requirementRepository.findById(createdReq.id)) === null,
      `requirementRepository.delete() deletes requirement record`
    );

    const deletedTerm = await termRepository.delete(testTermCode);
    assert(
      deletedTerm === true && (await termRepository.findByCode(testTermCode)) === null,
      `termRepository.delete() deletes academic term record`
    );

    await calendarRepository.deleteSnapshot(pushSyncId);
  } catch (err: any) {
    failed++;
    console.error('  [UNHANDLED ERROR]', err);
  } finally {
    await pool.end();
  }

  console.log('=============================================================');
  console.log(`  TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('=============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRequirementsDbTests();

