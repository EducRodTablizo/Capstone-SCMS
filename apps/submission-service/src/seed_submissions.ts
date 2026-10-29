import { pool } from './config/db';

export interface SeedSubmissionRecord {
  id: string;
  fms_message_id: string;
  assignment_id: string;
  assignment_version: number;
  requirement_id: string;
  academic_term_id: string;
  course_id: string;
  block_section_id: string;
  faculty_id: string;
  faculty_name: string;
  course_code: string;
  section_label: string;
  status:
    | 'Not Submitted'
    | 'Submitted'
    | 'Under Review'
    | 'Returned'
    | 'Resubmitted'
    | 'Approved'
    | 'Overdue'
    | 'Unassigned';
  schedule: {
    schedule_day_time: string;
    room_id: string;
    room_label: string;
  };
  file_id: string | null;
  file_name: string | null;
  file_size: number | null;
  submitted_at: string | null;
  review?: {
    id: string;
    reviewer_id: string;
    reviewer_name: string;
    decision: 'Approved' | 'Returned';
    comment: string;
  };
}

export const SEED_SUBMISSIONS: SeedSubmissionRecord[] = [
  {
    id: 'a1111111-1111-4111-8111-111111111101',
    fms_message_id: 'msg-seed-0001',
    assignment_id: 'asg-001',
    assignment_version: 2,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-1111-1111-1111-111111111111',
    block_section_id: 'daaaaaaa-1111-1111-1111-111111111111',
    faculty_id: 'fac-prof-delacruz',
    faculty_name: 'Prof. Juan Dela Cruz',
    course_code: 'INTE 401',
    section_label: 'BSIT 4-1',
    status: 'Approved',
    schedule: {
      schedule_day_time: 'Mon/Wed 8:00 AM - 10:30 AM',
      room_id: 'room-304',
      room_label: 'Room 304, PUPQC Academic Bldg',
    },
    file_id: 'file_seed_001',
    file_name: 'INTE_401_Syllabus.pdf',
    file_size: 482304,
    submitted_at: '2026-10-18T10:00:00.000Z',
    review: {
      id: 'c1111111-1111-4111-8111-111111111101',
      reviewer_id: 'acad_head_01',
      reviewer_name: 'Dr. Maria Santos',
      decision: 'Approved',
      comment: 'Complied with CHED CMO 25 s. 2015 and PUPQC OBTL outcomes-based syllabus rubric.',
    },
  },
  {
    id: 'a1111111-1111-4111-8111-111111111102',
    fms_message_id: 'msg-seed-0002',
    assignment_id: 'asg-002',
    assignment_version: 1,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-2222-2222-2222-222222222222',
    block_section_id: 'daaaaaaa-3333-3333-3333-333333333333',
    faculty_id: 'fac-prof-delacruz',
    faculty_name: 'Prof. Juan Dela Cruz',
    course_code: 'INTE 302',
    section_label: 'BSIT 3-1',
    status: 'Under Review',
    schedule: {
      schedule_day_time: 'Tue/Thu 1:00 PM - 3:30 PM',
      room_id: 'room-lab-02',
      room_label: 'Computer Lab 2',
    },
    file_id: 'file_seed_002',
    file_name: 'INTE_302_Syllabus.pdf',
    file_size: 512000,
    submitted_at: '2026-10-21T08:00:00.000Z',
  },
  {
    id: 'a1111111-1111-4111-8111-111111111103',
    fms_message_id: 'msg-seed-0003',
    assignment_id: 'asg-003',
    assignment_version: 1,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-3333-3333-3333-333333333333',
    block_section_id: 'daaaaaaa-2222-2222-2222-222222222222',
    faculty_id: 'fac-prof-santos',
    faculty_name: 'Prof. Ana Santos',
    course_code: 'COMP 201',
    section_label: 'BSIT 2-1',
    status: 'Returned',
    schedule: {
      schedule_day_time: 'Mon/Thu 10:30 AM - 1:00 PM',
      room_id: 'room-lab-01',
      room_label: 'Computer Lab 1',
    },
    file_id: 'file_seed_003',
    file_name: 'COMP_201_Syllabus.pdf',
    file_size: 398120,
    submitted_at: '2026-10-20T11:00:00.000Z',
    review: {
      id: 'c1111111-1111-4111-8111-111111111103',
      reviewer_id: 'acad_head_01',
      reviewer_name: 'Dr. Maria Santos',
      decision: 'Returned',
      comment: 'Please align Week 10-14 laboratory assessment rubrics with CLO 3 and update textbook references to 2022-2026 editions.',
    },
  },
  {
    id: 'a1111111-1111-4111-8111-111111111104',
    fms_message_id: 'msg-seed-0004',
    assignment_id: 'asg-004',
    assignment_version: 2,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-1111-1111-1111-111111111111',
    block_section_id: 'daaaaaaa-2222-2222-2222-222222222222',
    faculty_id: 'fac-prof-reyes',
    faculty_name: 'Prof. Carlos Reyes',
    course_code: 'INTE 203',
    section_label: 'BSIT 2-2',
    status: 'Resubmitted',
    schedule: {
      schedule_day_time: 'Wed/Fri 1:00 PM - 3:30 PM',
      room_id: 'room-lab-03',
      room_label: 'Computer Lab 3',
    },
    file_id: 'file_seed_004',
    file_name: 'INTE_203_Revised.pdf',
    file_size: 540672,
    submitted_at: '2026-10-22T09:30:00.000Z',
  },
  {
    id: 'a1111111-1111-4111-8111-111111111105',
    fms_message_id: 'msg-seed-0005',
    assignment_id: 'asg-005',
    assignment_version: 1,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-4444-4444-4444-444444444444',
    block_section_id: 'daaaaaaa-1111-1111-1111-111111111111',
    faculty_id: 'fac-prof-reyes',
    faculty_name: 'Prof. Carlos Reyes',
    course_code: 'COMP 101',
    section_label: 'BSIT 1-1',
    status: 'Submitted',
    schedule: {
      schedule_day_time: 'Tue/Fri 8:00 AM - 10:30 AM',
      room_id: 'room-201',
      room_label: 'Room 201, Academic Bldg',
    },
    file_id: 'file_seed_005',
    file_name: 'COMP_101_Syllabus.pdf',
    file_size: 419430,
    submitted_at: '2026-10-24T14:15:00.000Z',
  },
  {
    id: 'a1111111-1111-4111-8111-111111111106',
    fms_message_id: 'msg-seed-0006',
    assignment_id: 'asg-006',
    assignment_version: 1,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-4444-4444-4444-444444444444',
    block_section_id: 'daaaaaaa-4444-4444-4444-444444444444',
    faculty_id: 'fac-prof-gomez',
    faculty_name: 'Prof. Elena Gomez',
    course_code: 'HRMG 201',
    section_label: 'BSBA 2-1',
    status: 'Approved',
    schedule: {
      schedule_day_time: 'Mon/Wed 1:00 PM - 2:30 PM',
      room_id: 'room-402',
      room_label: 'Room 402, CBA Wing',
    },
    file_id: 'file_seed_006',
    file_name: 'HRMG_201_Syllabus.docx',
    file_size: 360448,
    submitted_at: '2026-10-17T15:00:00.000Z',
    review: {
      id: 'c1111111-1111-4111-8111-111111111106',
      reviewer_id: 'acad_head_01',
      reviewer_name: 'Dr. Maria Santos',
      decision: 'Approved',
      comment: 'Approved. Complete OBTL alignment and competency matrix.',
    },
  },
  {
    id: 'a1111111-1111-4111-8111-111111111107',
    fms_message_id: 'msg-seed-0007',
    assignment_id: 'asg-007',
    assignment_version: 1,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-4444-4444-4444-444444444444',
    block_section_id: 'daaaaaaa-4444-4444-4444-444444444444',
    faculty_id: 'fac-prof-gomez',
    faculty_name: 'Prof. Elena Gomez',
    course_code: 'HRMG 301',
    section_label: 'BSBA 3-1',
    status: 'Overdue',
    schedule: {
      schedule_day_time: 'Tue/Thu 3:30 PM - 5:00 PM',
      room_id: 'room-405',
      room_label: 'Room 405, CBA Wing',
    },
    file_id: null,
    file_name: null,
    file_size: null,
    submitted_at: null,
  },
  {
    id: 'a1111111-1111-4111-8111-111111111108',
    fms_message_id: 'msg-seed-0008',
    assignment_id: 'asg-009',
    assignment_version: 1,
    requirement_id: '22222222-2222-2222-2222-222222222222',
    academic_term_id: '2026-1S',
    course_id: 'caaaaaaa-3333-3333-3333-333333333333',
    block_section_id: 'daaaaaaa-1111-1111-1111-111111111111',
    faculty_id: 'fac-prof-reyes',
    faculty_name: 'Prof. Carlos Reyes',
    course_code: 'COMP 102',
    section_label: 'BSIT 1-2',
    status: 'Not Submitted',
    schedule: {
      schedule_day_time: 'Fri 8:00 AM - 1:00 PM',
      room_id: 'room-lab-02',
      room_label: 'Computer Lab 2',
    },
    file_id: null,
    file_name: null,
    file_size: null,
    submitted_at: null,
  },
];

export async function seedSubmissionsDatabase(): Promise<void> {
  console.log('===============================================================');
  console.log('   SCMS SUBMISSIONS DATABASE SEEDER (sms_submissions)');
  console.log('===============================================================');

  await pool.query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS fms_message_id VARCHAR(255)');

  for (const item of SEED_SUBMISSIONS) {
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO submissions (
        id, fms_message_id, assignment_id, assignment_version, requirement_id,
        academic_term_id, course_id, block_section_id, faculty_id, substitute_id,
        course_code, section_label, status, schedule, file_id, file_name,
        submitted_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, NULL,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18
      )
      ON CONFLICT (id) DO UPDATE SET
        fms_message_id = EXCLUDED.fms_message_id,
        assignment_id = EXCLUDED.assignment_id,
        assignment_version = EXCLUDED.assignment_version,
        course_code = EXCLUDED.course_code,
        section_label = EXCLUDED.section_label,
        status = EXCLUDED.status,
        schedule = EXCLUDED.schedule,
        file_id = EXCLUDED.file_id,
        file_name = EXCLUDED.file_name,
        submitted_at = EXCLUDED.submitted_at,
        updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.fms_message_id,
        item.assignment_id,
        item.assignment_version,
        item.requirement_id,
        item.academic_term_id,
        item.course_id,
        item.block_section_id,
        item.faculty_id,
        item.course_code,
        item.section_label,
        item.status,
        JSON.stringify(item.schedule),
        item.file_id,
        item.file_name,
        item.submitted_at,
        item.submitted_at || now,
        now,
      ]
    );

    if (item.file_name) {
      const versionId = item.id.replace(/^a/, 'b');
      await pool.query(
        `INSERT INTO submission_versions (
          id, submission_id, version_number, version_label, file_id,
          file_name, file_size, submitted_by, submitted_by_name,
          status_at_version, change_summary, created_at
        ) VALUES ($1, $2, 1, 'v1', $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (submission_id, version_number) DO UPDATE SET
          file_name = EXCLUDED.file_name,
          status_at_version = EXCLUDED.status_at_version`,
        [
          versionId,
          item.id,
          item.file_id,
          item.file_name,
          item.file_size || 409600,
          item.faculty_id,
          item.faculty_name,
          item.status,
          'Initial official OBTL syllabus submission',
          item.submitted_at || now,
        ]
      );
    }

    if (item.review) {
      await pool.query(
        `INSERT INTO review_decisions (
          id, submission_id, reviewer_id, reviewer_name, decision, comment, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          decision = EXCLUDED.decision,
          comment = EXCLUDED.comment`,
        [
          item.review.id,
          item.id,
          item.review.reviewer_id,
          item.review.reviewer_name,
          item.review.decision,
          item.review.comment,
          now,
        ]
      );
    }

    console.log(
      `  [SEEDED] ${item.id} | ${item.course_code} (${item.section_label}) | ${item.status}`
    );
  }

  const countRes = await pool.query('SELECT COUNT(*) FROM submissions');
  console.log('---------------------------------------------------------------');
  console.log(`  Total rows in sms_submissions.submissions: ${countRes.rows[0]?.count}`);
  console.log('===============================================================');
}

if (require.main === module) {
  seedSubmissionsDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[SEED ERROR]', err);
      process.exit(1);
    });
}

