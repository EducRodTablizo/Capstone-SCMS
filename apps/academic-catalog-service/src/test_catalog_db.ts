import * as fs from 'fs';
import * as path from 'path';
import { pool, dbConfig } from './config/db';
import { programRepository } from './programs/program.repository';
import { courseRepository } from './courses/course.repository';
import { curriculumRepository } from './curricula/curriculum.repository';
import { blockSectionRepository } from './block-sections/block-section.repository';

async function runCatalogDbVerification() {
  console.log('===================================================================');
  console.log('🧪 SCMS ACADEMIC CATALOG SERVICE - POSTGRESQL MIGRATION TEST SUITE');
  console.log(`   Database: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
  console.log('===================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // Delete any JSON files if they exist
  const jsonFiles = ['programs.json', 'courses.json', 'curricula.json', 'block-sections.json'];
  for (const file of jsonFiles) {
    const rootPath = path.resolve(process.cwd(), file);
    const svcPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(rootPath)) fs.unlinkSync(rootPath);
    if (fs.existsSync(svcPath)) fs.unlinkSync(svcPath);
  }

  await programRepository.init();

  // -------------------------------------------------------------------------
  // 1. PROGRAMS CRUD & SEED VERIFICATION (SMS-021)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Programs PostgreSQL CRUD & Existing Seed Data (SMS-021) ---');
  const existingPrograms = await programRepository.findAll();
  const codes = existingPrograms.map((p) => p.code);
  assert(
    existingPrograms.length >= 5 &&
      ['BSIT', 'BSBA-HRM', 'BSBA-MM', 'BSENTREP', 'DOMT'].every((c) => codes.includes(c)),
    `Reads existing 5 seeded programs (${codes.join(', ')}) from PostgreSQL without data loss`
  );

  const bsit = await programRepository.findByCode('BSIT');
  assert(
    !!bsit && bsit.id === '11111111-1111-1111-1111-111111111111' && bsit.status === 'Active',
    'findByCode("BSIT") resolves BSIT program accurately'
  );

  const createdProg = await programRepository.create({
    code: 'BSCS-TEST',
    title: 'Bachelor of Science in Computer Science',
    description: 'College of Computer and Information Sciences',
    status: 'Active',
  });
  const updatedProg = await programRepository.update(createdProg.id, {
    title: 'BS in Computer Science (Updated)',
    status: 'Phased out',
  });
  const deletedProg = await programRepository.delete(createdProg.id);

  assert(
    createdProg.code === 'BSCS-TEST' &&
      updatedProg?.title === 'BS in Computer Science (Updated)' &&
      updatedProg?.status === 'Phased out' &&
      deletedProg === true,
    'Programs full CRUD (create, update, delete) verified on PostgreSQL'
  );

  // -------------------------------------------------------------------------
  // 2. COURSES CRUD, VERSIONING & LAB REQUIREMENTS (SMS-022)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Courses PostgreSQL CRUD, Versioning & Lab Requirements (SMS-022) ---');
  const existingCourses = await courseRepository.findAll();
  assert(
    existingCourses.length >= 4,
    `Reads seeded courses (${existingCourses.length} found) from PostgreSQL courses table`
  );

  const newCourseV1 = await courseRepository.create({
    course_code: 'INTE 49993',
    title: 'Cloud Native Microservices',
    credit_units: 3.0,
    lecture_hours: 2.0,
    lab_hours: 3.0,
    description: 'Distributed systems and container orchestration',
    requires_lab: true,
    lab_type: 'Cloud Computing Lab',
    special_software: ['Docker', 'Kubernetes'],
    status: 'Active',
  });

  assert(
    newCourseV1.version === 1 &&
      newCourseV1.contact_hours === 5.0 &&
      newCourseV1.requires_lab === true &&
      newCourseV1.lab_type === 'Cloud Computing Lab',
    'Course creation computes contact_hours (lecture + lab = 5.0) and stores lab requirements'
  );

  const updatedCourseV1 = await courseRepository.update(newCourseV1.id, {
    title: 'Cloud Native Microservices & Kubernetes',
    status: 'Active',
  });

  const newCourseV2 = await courseRepository.createVersion(newCourseV1.id);
  const fetchedV2 = await courseRepository.findByCodeAndVersion('INTE 49993', 2);

  assert(
    updatedCourseV1?.title === 'Cloud Native Microservices & Kubernetes' &&
      !!newCourseV2 &&
      newCourseV2.version === 2 &&
      newCourseV2.status === 'Revised' &&
      newCourseV2.root_course_id === newCourseV1.id &&
      fetchedV2?.id === newCourseV2.id,
    'Course update & createVersion (v1 -> v2 Revised with root_course_id) verified in PostgreSQL'
  );

  // -------------------------------------------------------------------------
  // 3. CURRICULA CRUD & MULTI-CURRICULUM COURSE MAPPING (SMS-030)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Curricula CRUD & Multi-Curriculum Join Table (SMS-030) ---');
  const existingCurricula = await curriculumRepository.findAll();
  assert(
    existingCurricula.length >= 1 && existingCurricula[0].curriculum_code === 'BSIT-2024-CURR',
    'Reads existing BSIT-2024-CURR curriculum from PostgreSQL'
  );

  const secondCurr = await curriculumRepository.create({
    program_id: '11111111-1111-1111-1111-111111111111',
    curriculum_code: 'BSIT-2026-CURR-TEST',
    name: 'BSIT 2026 Experimental Curriculum',
    effective_start_term: '2026-1S',
    description: 'Updated AI-integrated BSIT curriculum',
    status: 'Draft',
  });

  const updatedCurr = await curriculumRepository.update(secondCurr.id, {
    status: 'Active',
    name: 'BSIT 2026 Active Curriculum',
  });

  // Assign newCourseV1 to BOTH BSIT-2024-CURR and BSIT-2026-CURR-TEST
  await curriculumRepository.addCourse('baaaaaaa-1111-1111-1111-111111111111', {
    course_id: newCourseV1.id,
    year_level: 4,
    semester: 1,
    is_major: true,
  });
  await courseRepository.assignToCurriculum({
    curriculum_id: secondCurr.id,
    course_id: newCourseV1.id,
    year_level: 3,
    semester: 2,
    is_major: true,
  });

  const curriculaForCourse = await courseRepository.getCurriculaForCourse(newCourseV1.id);
  const currCoursesList = await curriculumRepository.getCurriculumCourses(secondCurr.id);

  assert(
    updatedCurr?.status === 'Active' &&
      curriculaForCourse.length === 2 &&
      currCoursesList.some((c) => c.course_id === newCourseV1.id && c.year_level === 3 && c.semester === 2),
    'Course mapped across multiple curricula via curriculum_courses join table'
  );

  // Clean up test curriculum & test courses
  await courseRepository.removeFromCurriculum('baaaaaaa-1111-1111-1111-111111111111', newCourseV1.id);
  await curriculumRepository.delete(secondCurr.id);
  if (newCourseV2) await courseRepository.delete(newCourseV2.id);
  await courseRepository.delete(newCourseV1.id);

  // -------------------------------------------------------------------------
  // 4. BLOCK SECTIONS CRUD & COHORT IDENTITY (SMS-031)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Block Sections PostgreSQL CRUD & Stable Cohort Identity (SMS-031) ---');
  const existingSections = await blockSectionRepository.findAll();
  assert(
    existingSections.length >= 4,
    `Reads seeded block sections (${existingSections.length} found) from PostgreSQL`
  );

  const createdSec = await blockSectionRepository.create({
    program_id: '11111111-1111-1111-1111-111111111111',
    cohort_admission_year: 2026,
    year_level: 1,
    section_number: 9,
    display_label: 'BSIT 1-9',
    status: 'Active',
  });

  const updatedSec = await blockSectionRepository.update(createdSec.id, {
    year_level: 2,
    display_label: 'BSIT 2-9',
  });

  const mergedSec = await blockSectionRepository.updateStatus(createdSec.id, {
    status: 'Merged',
    merged_into_section_id: 'daaaaaaa-1111-1111-1111-111111111111',
  });

  const deletedSec = await blockSectionRepository.delete(createdSec.id);

  assert(
    createdSec.id === updatedSec?.id &&
      updatedSec?.display_label === 'BSIT 2-9' &&
      mergedSec?.status === 'Merged' &&
      mergedSec?.merged_into_section_id === 'daaaaaaa-1111-1111-1111-111111111111' &&
      deletedSec === true,
    'Block sections CRUD, progression (preserving stable UUID), and merge status verified in PostgreSQL'
  );

  console.log('\n===================================================================');
  console.log(`📊 ACADEMIC CATALOG DB VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED`);
  console.log('===================================================================\n');

  await pool.end();

  if (passed !== total) {
    process.exit(1);
  }
}

runCatalogDbVerification().catch((err) => {
  console.error('Fatal error in test_catalog_db.ts:', err);
  process.exit(1);
});

