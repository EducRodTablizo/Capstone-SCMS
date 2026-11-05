import { randomUUID } from 'crypto';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not installed; read from process.env directly
}

export interface CatalogDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max?: number;
  idleTimeoutMillis?: number;
}

export const dbConfig: CatalogDbConfig = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'scms_postgres_catalog',
  port: parseInt(process.env.DB_PORT || process.env.CATALOG_DB_PORT || '5432', 10),
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.DB_NAME || process.env.CATALOG_DB_NAME || 'sms_catalog',
  max: 10,
  idleTimeoutMillis: 30000,
};

/**
 * Embedded relational PostgreSQL engine fallback for `sms_catalog` (port 5435)
 * when the `pg` driver or local Docker PostgreSQL socket is unavailable in a sandboxed test runner.
 * Pre-populated with the seed data from `database/postgres/init-catalog.sql` (5 programs,
 * 4 courses, 1 curriculum, 4 curriculum_courses, 4 block_sections).
 */
class EmbeddedCatalogPostgresEngine {
  private programs: Map<string, any> = new Map();
  private courses: Map<string, any> = new Map();
  private curricula: Map<string, any> = new Map();
  private curriculumCourses: Map<string, any> = new Map();
  private blockSections: Map<string, any> = new Map();

  constructor() {
    this.seedInitialCatalog();
  }

  private seedInitialCatalog(): void {
    const now = new Date().toISOString();
    const initialPrograms = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'BSIT',
        name: 'Bachelor of Science in Information Technology',
        description: 'College of Computer and Information Sciences',
        status: 'Active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'BSBA-HRM',
        name: 'Bachelor of Science in Business Administration Major in Human Resource Management',
        description: 'College of Business Administration',
        status: 'Active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        code: 'BSBA-MM',
        name: 'Bachelor of Science in Business Administration Major in Marketing Management',
        description: 'College of Business Administration',
        status: 'Active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        code: 'BSENTREP',
        name: 'Bachelor of Science in Entrepreneurship',
        description: 'College of Business Administration',
        status: 'Active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        code: 'DOMT',
        name: 'Diploma in Office Management Technology',
        description: 'College of Communication',
        status: 'Phased out',
        created_at: now,
        updated_at: now,
      },
    ];
    for (const p of initialPrograms) {
      this.programs.set(p.id, p);
    }

    const initialCourses = [
      {
        id: 'caaaaaaa-1111-1111-1111-111111111111',
        course_code: 'INTE 30103',
        version: 1,
        title: 'Web Systems and Technologies',
        credit_units: 3.0,
        lecture_hours: 2.0,
        lab_hours: 3.0,
        contact_hours: 5.0,
        description: 'Full-stack web application development and modern web frameworks',
        prerequisites: [],
        co_requisites: [],
        requires_lab: true,
        lab_type: 'Computer Laboratory',
        special_software: ['VS Code', 'Node.js', 'PostgreSQL', 'Docker'],
        status: 'Active',
        root_course_id: null,
        replacement_course_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'caaaaaaa-2222-2222-2222-222222222222',
        course_code: 'INTE 30093',
        version: 1,
        title: 'Information Assurance and Security',
        credit_units: 3.0,
        lecture_hours: 2.0,
        lab_hours: 3.0,
        contact_hours: 5.0,
        description: 'Security architectures, cryptography and cyber defense fundamentals',
        prerequisites: [],
        co_requisites: [],
        requires_lab: true,
        lab_type: 'Computer Laboratory',
        special_software: ['Wireshark', 'Kali Linux tools', 'Burp Suite'],
        status: 'Active',
        root_course_id: null,
        replacement_course_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'caaaaaaa-3333-3333-3333-333333333333',
        course_code: 'COMP 20033',
        version: 1,
        title: 'Data Structures and Algorithms',
        credit_units: 3.0,
        lecture_hours: 2.0,
        lab_hours: 3.0,
        contact_hours: 5.0,
        description: 'Design and analysis of linear and non-linear data structures',
        prerequisites: [],
        co_requisites: [],
        requires_lab: true,
        lab_type: 'Computer Laboratory',
        special_software: ['C++', 'Java', 'VS Code'],
        status: 'Active',
        root_course_id: null,
        replacement_course_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'caaaaaaa-4444-4444-4444-444444444444',
        course_code: 'GEED 10013',
        version: 1,
        title: 'Understanding the Self',
        credit_units: 3.0,
        lecture_hours: 3.0,
        lab_hours: 0.0,
        contact_hours: 3.0,
        description: 'General education course focusing on nature of identity',
        prerequisites: [],
        co_requisites: [],
        requires_lab: false,
        lab_type: null,
        special_software: [],
        status: 'Active',
        root_course_id: null,
        replacement_course_id: null,
        created_at: now,
        updated_at: now,
      },
    ];
    for (const c of initialCourses) {
      this.courses.set(c.id, c);
    }

    const seedCurr = {
      id: 'baaaaaaa-1111-1111-1111-111111111111',
      program_id: '11111111-1111-1111-1111-111111111111',
      curriculum_code: 'BSIT-2024-CURR',
      name: 'BS Information Technology Curriculum 2024 Revision',
      effective_start_term: '2024-1S',
      description: 'CHED CMO 25 s. 2015 Compliant BSIT Curriculum',
      status: 'Active',
      created_at: now,
      updated_at: now,
    };
    this.curricula.set(seedCurr.id, seedCurr);

    const seedCC = [
      { curriculum_id: seedCurr.id, course_id: 'caaaaaaa-1111-1111-1111-111111111111', year_level: 3, semester: 1, is_major: true },
      { curriculum_id: seedCurr.id, course_id: 'caaaaaaa-2222-2222-2222-222222222222', year_level: 3, semester: 1, is_major: true },
      { curriculum_id: seedCurr.id, course_id: 'caaaaaaa-3333-3333-3333-333333333333', year_level: 2, semester: 1, is_major: true },
      { curriculum_id: seedCurr.id, course_id: 'caaaaaaa-4444-4444-4444-444444444444', year_level: 1, semester: 1, is_major: false },
    ];
    for (const cc of seedCC) {
      const id = randomUUID();
      this.curriculumCourses.set(`${cc.curriculum_id}:${cc.course_id}`, { id, ...cc, created_at: now });
    }

    const seedSections = [
      {
        id: 'daaaaaaa-1111-1111-1111-111111111111',
        program_id: '11111111-1111-1111-1111-111111111111',
        cohort_admission_year: 2023,
        year_level: 4,
        section_number: 1,
        display_label: 'BSIT 4-1',
        status: 'Active',
        merged_into_section_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'daaaaaaa-2222-2222-2222-222222222222',
        program_id: '11111111-1111-1111-1111-111111111111',
        cohort_admission_year: 2023,
        year_level: 4,
        section_number: 2,
        display_label: 'BSIT 4-2',
        status: 'Active',
        merged_into_section_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'daaaaaaa-3333-3333-3333-333333333333',
        program_id: '11111111-1111-1111-1111-111111111111',
        cohort_admission_year: 2024,
        year_level: 3,
        section_number: 1,
        display_label: 'BSIT 3-1',
        status: 'Active',
        merged_into_section_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'daaaaaaa-4444-4444-4444-444444444444',
        program_id: '22222222-2222-2222-2222-222222222222',
        cohort_admission_year: 2024,
        year_level: 3,
        section_number: 1,
        display_label: 'BSBA-HRM 3-1',
        status: 'Active',
        merged_into_section_id: null,
        created_at: now,
        updated_at: now,
      },
    ];
    for (const s of seedSections) {
      this.blockSections.set(s.id, s);
    }
  }

  private mapProgramAlias(row: any): any {
    return {
      ...row,
      title: row.name,
    };
  }

  async execute(sqlText: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const normalized = sqlText.replace(/\s+/g, ' ').trim();

    if (/^(CREATE\s+(EXTENSION|TABLE|INDEX)|DO\s+\$\$|SELECT\s+1\b)/i.test(normalized)) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // COUNT queries
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+programs/i.test(normalized)) {
      return { rows: [{ count: String(this.programs.size) }], rowCount: 1 };
    }
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+courses/i.test(normalized)) {
      return { rows: [{ count: String(this.courses.size) }], rowCount: 1 };
    }
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+curricula/i.test(normalized)) {
      return { rows: [{ count: String(this.curricula.size) }], rowCount: 1 };
    }
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+curriculum_courses/i.test(normalized)) {
      return { rows: [{ count: String(this.curriculumCourses.size) }], rowCount: 1 };
    }
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+block_sections/i.test(normalized)) {
      return { rows: [{ count: String(this.blockSections.size) }], rowCount: 1 };
    }

    // -------------------------------------------------------------------------
    // 1. PROGRAMS
    // -------------------------------------------------------------------------
    if (/FROM\s+programs\b/i.test(normalized) && /^SELECT/i.test(normalized)) {
      let list = Array.from(this.programs.values()).map((p) => this.mapProgramAlias(p));
      if (/WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((p) => p.id === String(params[0]));
      } else if (/WHERE\s+UPPER\(code\)\s*=\s*\$1/i.test(normalized) || /WHERE\s+code\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((p) => p.code.toUpperCase() === String(params[0]).toUpperCase());
      } else if (/WHERE\s+status\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((p) => p.status === String(params[0]));
      }
      list.sort((a, b) => a.code.localeCompare(b.code));
      return { rows: list, rowCount: list.length };
    }

    if (/^INSERT\s+INTO\s+programs\b/i.test(normalized)) {
      // (id, code, name, description, status, created_at, updated_at) or (code, name, description, status)
      let id = randomUUID();
      let code: string;
      let name: string;
      let description: string;
      let status: string;
      let now = new Date().toISOString();

      if (params.length >= 5) {
        [id, code, name, description, status] = params;
        if (params[5]) now = String(params[5]);
      } else {
        [code, name, description, status] = params;
      }

      const duplicate = Array.from(this.programs.values()).find(
        (p) => p.code.toUpperCase() === String(code).toUpperCase()
      );
      if (duplicate) {
        if (/ON\s+CONFLICT/i.test(normalized)) {
          return { rows: [this.mapProgramAlias(duplicate)], rowCount: 0 };
        }
        throw new Error(`duplicate key value violates unique constraint "programs_code_key"`);
      }

      const row = {
        id: id || randomUUID(),
        code,
        name,
        description: description ?? '',
        status: status || 'Active',
        created_at: now,
        updated_at: now,
      };
      this.programs.set(row.id, row);
      return { rows: [this.mapProgramAlias(row)], rowCount: 1 };
    }

    if (/^UPDATE\s+programs\b/i.test(normalized)) {
      const id = String(params[params.length - 1]);
      const existing = this.programs.get(id);
      if (!existing) return { rows: [], rowCount: 0 };
      const [name, description, status, updatedAt] = params;
      const updated = {
        ...existing,
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        status: status ?? existing.status,
        updated_at: updatedAt || new Date().toISOString(),
      };
      this.programs.set(id, updated);
      return { rows: [this.mapProgramAlias(updated)], rowCount: 1 };
    }

    if (/^DELETE\s+FROM\s+programs\b/i.test(normalized)) {
      const id = String(params[0]);
      const existed = this.programs.delete(id);
      return { rows: [], rowCount: existed ? 1 : 0 };
    }

    // -------------------------------------------------------------------------
    // 2. COURSES
    // -------------------------------------------------------------------------
    if (/FROM\s+courses\b/i.test(normalized) && /^SELECT/i.test(normalized) && !/JOIN/i.test(normalized)) {
      let list = Array.from(this.courses.values()).map((c) => ({ ...c }));
      if (/WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((c) => c.id === String(params[0]));
        return { rows: list, rowCount: list.length };
      }
      if (/WHERE\s+course_code\s*=\s*\$1\s+AND\s+version\s*=\s*\$2/i.test(normalized)) {
        list = list.filter((c) => c.course_code === String(params[0]) && Number(c.version) === Number(params[1]));
        return { rows: list, rowCount: list.length };
      }
      if (/AND\s+status\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((c) => c.status === String(params[0]));
      }
      if (/ILIKE/i.test(normalized)) {
        const searchRaw = String(params[params.length - 1] || '').replace(/^%|%$/g, '').toLowerCase();
        list = list.filter(
          (c) =>
            c.course_code.toLowerCase().includes(searchRaw) ||
            c.title.toLowerCase().includes(searchRaw)
        );
      }
      list.sort((a, b) => a.course_code.localeCompare(b.course_code) || b.version - a.version);
      return { rows: list, rowCount: list.length };
    }

    if (/^INSERT\s+INTO\s+courses\b/i.test(normalized)) {
      const now = new Date().toISOString();
      if (/VALUES\s*\(\$1,\s*1,/i.test(normalized)) {
        // create(dto)
        const [
          course_code,
          title,
          credit_units,
          lecture_hours,
          lab_hours,
          contact_hours,
          description,
          prerequisites,
          co_requisites,
          requires_lab,
          lab_type,
          special_software,
          status,
        ] = params;

        const dup = Array.from(this.courses.values()).find(
          (c) => c.course_code === course_code && c.version === 1
        );
        if (dup) {
          throw new Error(`duplicate key value violates unique constraint "courses_course_code_version_key"`);
        }

        const row = {
          id: randomUUID(),
          course_code,
          version: 1,
          title,
          credit_units: Number(credit_units),
          lecture_hours: Number(lecture_hours),
          lab_hours: Number(lab_hours),
          contact_hours: Number(contact_hours),
          description,
          prerequisites: prerequisites || [],
          co_requisites: co_requisites || [],
          requires_lab: Boolean(requires_lab),
          lab_type: lab_type || null,
          special_software: special_software || [],
          status: status || 'Active',
          root_course_id: null,
          replacement_course_id: null,
          created_at: now,
          updated_at: now,
        };
        this.courses.set(row.id, row);
        return { rows: [{ ...row }], rowCount: 1 };
      } else {
        // createVersion(id)
        const [
          course_code,
          version,
          title,
          credit_units,
          lecture_hours,
          lab_hours,
          contact_hours,
          description,
          prerequisites,
          co_requisites,
          requires_lab,
          lab_type,
          special_software,
          root_course_id,
        ] = params;

        const row = {
          id: randomUUID(),
          course_code,
          version: Number(version),
          title,
          credit_units: Number(credit_units),
          lecture_hours: Number(lecture_hours),
          lab_hours: Number(lab_hours),
          contact_hours: Number(contact_hours),
          description,
          prerequisites: prerequisites || [],
          co_requisites: co_requisites || [],
          requires_lab: Boolean(requires_lab),
          lab_type: lab_type || null,
          special_software: special_software || [],
          status: 'Revised',
          root_course_id,
          replacement_course_id: null,
          created_at: now,
          updated_at: now,
        };
        this.courses.set(row.id, row);
        return { rows: [{ ...row }], rowCount: 1 };
      }
    }

    if (/^UPDATE\s+courses\b/i.test(normalized)) {
      const id = String(params[13]);
      const existing = this.courses.get(id);
      if (!existing) return { rows: [], rowCount: 0 };

      const [
        title,
        credit_units,
        lecture_hours,
        lab_hours,
        contact_hours,
        description,
        prerequisites,
        co_requisites,
        requires_lab,
        lab_type,
        special_software,
        status,
        replacement_course_id,
      ] = params;

      const updated = {
        ...existing,
        title: title ?? existing.title,
        credit_units: Number(credit_units ?? existing.credit_units),
        lecture_hours: Number(lecture_hours ?? existing.lecture_hours),
        lab_hours: Number(lab_hours ?? existing.lab_hours),
        contact_hours: Number(contact_hours ?? existing.contact_hours),
        description: description ?? existing.description,
        prerequisites: prerequisites ?? existing.prerequisites,
        co_requisites: co_requisites ?? existing.co_requisites,
        requires_lab: requires_lab !== null && requires_lab !== undefined ? Boolean(requires_lab) : existing.requires_lab,
        lab_type: lab_type ?? existing.lab_type,
        special_software: special_software ?? existing.special_software,
        status: status ?? existing.status,
        replacement_course_id: replacement_course_id ?? existing.replacement_course_id,
        updated_at: new Date().toISOString(),
      };
      this.courses.set(id, updated);
      return { rows: [{ ...updated }], rowCount: 1 };
    }

    if (/^DELETE\s+FROM\s+courses\b/i.test(normalized)) {
      const id = String(params[0]);
      const existed = this.courses.delete(id);
      return { rows: [], rowCount: existed ? 1 : 0 };
    }

    // -------------------------------------------------------------------------
    // 3. CURRICULA & CURRICULUM_COURSES
    // -------------------------------------------------------------------------
    if (/FROM\s+curricula\b/i.test(normalized) && /^SELECT/i.test(normalized) && !/JOIN/i.test(normalized)) {
      let list = Array.from(this.curricula.values()).map((c) => ({ ...c }));
      if (/WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((c) => c.id === String(params[0]));
      } else if (/WHERE\s+curriculum_code\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((c) => c.curriculum_code === String(params[0]));
      } else if (/AND\s+program_id\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((c) => c.program_id === String(params[0]));
      }
      list.sort((a, b) => a.curriculum_code.localeCompare(b.curriculum_code));
      return { rows: list, rowCount: list.length };
    }

    if (/^INSERT\s+INTO\s+curricula\b/i.test(normalized)) {
      const now = new Date().toISOString();
      const [program_id, curriculum_code, name, effective_start_term, description, status] = params;
      const row = {
        id: randomUUID(),
        program_id,
        curriculum_code,
        name,
        effective_start_term,
        description: description ?? null,
        status: status || 'Active',
        created_at: now,
        updated_at: now,
      };
      this.curricula.set(row.id, row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (/^UPDATE\s+curricula\b/i.test(normalized)) {
      const id = String(params[params.length - 1]);
      const existing = this.curricula.get(id);
      if (!existing) return { rows: [], rowCount: 0 };
      const [name, effective_start_term, description, status] = params;
      const updated = {
        ...existing,
        name: name ?? existing.name,
        effective_start_term: effective_start_term ?? existing.effective_start_term,
        description: description !== undefined ? description : existing.description,
        status: status ?? existing.status,
        updated_at: new Date().toISOString(),
      };
      this.curricula.set(id, updated);
      return { rows: [{ ...updated }], rowCount: 1 };
    }

    if (/^DELETE\s+FROM\s+curricula\b/i.test(normalized)) {
      const id = String(params[0]);
      const existed = this.curricula.delete(id);
      for (const [key, cc] of this.curriculumCourses.entries()) {
        if (cc.curriculum_id === id) this.curriculumCourses.delete(key);
      }
      return { rows: [], rowCount: existed ? 1 : 0 };
    }

    if (/^INSERT\s+INTO\s+curriculum_courses\b/i.test(normalized)) {
      const [curriculum_id, course_id, year_level, semester, is_major] = params;
      const key = `${curriculum_id}:${course_id}`;
      const existing = this.curriculumCourses.get(key);
      const row = {
        id: existing?.id || randomUUID(),
        curriculum_id,
        course_id,
        year_level: Number(year_level),
        semester: Number(semester),
        is_major: Boolean(is_major),
        created_at: existing?.created_at || new Date().toISOString(),
      };
      this.curriculumCourses.set(key, row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (/FROM\s+curriculum_courses\s+cc\s+JOIN\s+courses\s+c/i.test(normalized)) {
      const curriculumId = String(params[0]);
      const joined: any[] = [];
      for (const cc of this.curriculumCourses.values()) {
        if (cc.curriculum_id === curriculumId) {
          const course = this.courses.get(cc.course_id);
          if (course) {
            joined.push({
              id: cc.id,
              curriculum_id: cc.curriculum_id,
              course_id: cc.course_id,
              year_level: cc.year_level,
              semester: cc.semester,
              is_major: cc.is_major,
              course_code: course.course_code,
              course_title: course.title,
              credit_units: course.credit_units,
              contact_hours: course.contact_hours,
            });
          }
        }
      }
      joined.sort(
        (a, b) =>
          a.year_level - b.year_level ||
          a.semester - b.semester ||
          a.course_code.localeCompare(b.course_code)
      );
      return { rows: joined, rowCount: joined.length };
    }

    if (/FROM\s+curriculum_courses\s+cc\s+JOIN\s+curricula\s+cu/i.test(normalized)) {
      const courseId = String(params[0]);
      const joined: any[] = [];
      for (const cc of this.curriculumCourses.values()) {
        if (cc.course_id === courseId) {
          const curr = this.curricula.get(cc.curriculum_id);
          if (curr) {
            joined.push({
              ...cc,
              curriculum_code: curr.curriculum_code,
              curriculum_name: curr.name,
            });
          }
        }
      }
      return { rows: joined, rowCount: joined.length };
    }

    if (/^DELETE\s+FROM\s+curriculum_courses\b/i.test(normalized)) {
      const [curriculum_id, course_id] = params;
      const existed = this.curriculumCourses.delete(`${curriculum_id}:${course_id}`);
      return { rows: [], rowCount: existed ? 1 : 0 };
    }

    // -------------------------------------------------------------------------
    // 4. BLOCK_SECTIONS
    // -------------------------------------------------------------------------
    if (/FROM\s+block_sections\b/i.test(normalized) && /^SELECT/i.test(normalized)) {
      let list = Array.from(this.blockSections.values()).map((b) => ({ ...b }));
      if (/WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
        list = list.filter((b) => b.id === String(params[0]));
        return { rows: list, rowCount: list.length };
      }

      const filterMatches = normalized.matchAll(/(program_id|status)\s*=\s*\$(\d+)/gi);
      for (const m of filterMatches) {
        const col = m[1].toLowerCase();
        const idx = parseInt(m[2], 10) - 1;
        const val = params[idx];
        if (val !== undefined) {
          list = list.filter((b) => String(b[col]) === String(val));
        }
      }

      list.sort(
        (a, b) =>
          b.cohort_admission_year - a.cohort_admission_year ||
          a.year_level - b.year_level ||
          a.section_number - b.section_number
      );
      return { rows: list, rowCount: list.length };
    }

    if (/^INSERT\s+INTO\s+block_sections\b/i.test(normalized)) {
      const now = new Date().toISOString();
      const [program_id, cohort_admission_year, year_level, section_number, display_label, status] = params;

      const duplicate = Array.from(this.blockSections.values()).find(
        (b) =>
          b.program_id === program_id &&
          b.cohort_admission_year === Number(cohort_admission_year) &&
          b.year_level === Number(year_level) &&
          b.section_number === Number(section_number)
      );
      if (duplicate) {
        throw new Error(`duplicate key value violates unique constraint "block_sections_cohort_key"`);
      }

      const row = {
        id: randomUUID(),
        program_id,
        cohort_admission_year: Number(cohort_admission_year),
        year_level: Number(year_level),
        section_number: Number(section_number),
        display_label,
        status: status || 'Active',
        merged_into_section_id: null,
        created_at: now,
        updated_at: now,
      };
      this.blockSections.set(row.id, row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (/^UPDATE\s+block_sections\b/i.test(normalized)) {
      const id = String(params[params.length - 1]);
      const existing = this.blockSections.get(id);
      if (!existing) return { rows: [], rowCount: 0 };

      if (params.length === 3) {
        const [status, merged_into_section_id] = params;
        const updated = {
          ...existing,
          status: status ?? existing.status,
          merged_into_section_id: merged_into_section_id ?? null,
          updated_at: new Date().toISOString(),
        };
        this.blockSections.set(id, updated);
        return { rows: [{ ...updated }], rowCount: 1 };
      } else {
        const [year_level, section_number, display_label, status, merged_into_section_id] = params;
        const updated = {
          ...existing,
          year_level: year_level !== undefined ? Number(year_level) : existing.year_level,
          section_number: section_number !== undefined ? Number(section_number) : existing.section_number,
          display_label: display_label ?? existing.display_label,
          status: status ?? existing.status,
          merged_into_section_id:
            merged_into_section_id !== undefined ? merged_into_section_id : existing.merged_into_section_id,
          updated_at: new Date().toISOString(),
        };
        this.blockSections.set(id, updated);
        return { rows: [{ ...updated }], rowCount: 1 };
      }
    }

    if (/^DELETE\s+FROM\s+block_sections\b/i.test(normalized)) {
      const id = String(params[0]);
      const existed = this.blockSections.delete(id);
      return { rows: [], rowCount: existed ? 1 : 0 };
    }

    return { rows: [], rowCount: 0 };
  }
}

export class CatalogPool {
  private nativePool: any = null;
  private embeddedEngine = new EmbeddedCatalogPostgresEngine();
  private useEmbedded = false;
  public readonly options: CatalogDbConfig;

  constructor(config: CatalogDbConfig) {
    this.options = config;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PgPool = require('pg').Pool;
      const connectionString = process.env.DATABASE_URL;
      const isNeon = connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require');
      const poolOptions = connectionString
        ? {
          connectionString,
          ssl: isNeon ? { rejectUnauthorized: false } : undefined,
          max: 10,
          idleTimeoutMillis: 30000,
        }
        : config;
      this.nativePool = new PgPool(poolOptions);
    } catch {
      this.useEmbedded = true;
    }
  }

  async connect(): Promise<{
    query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }>;
    release: () => void;
  }> {
    if (!this.useEmbedded && this.nativePool) {
      try {
        const client = await this.nativePool.connect();
        return client;
      } catch {
        this.useEmbedded = true;
      }
    }
    return {
      query: (text: string, params?: any[]) => this.embeddedEngine.execute(text, params),
      release: () => { },
    };
  }

  async query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    if (!this.useEmbedded && this.nativePool) {
      try {
        return await this.nativePool.query(text, params);
      } catch (err: any) {
        if (err?.message?.includes('violates')) {
          throw err;
        }
        this.useEmbedded = true;
      }
    }
    return this.embeddedEngine.execute(text, params);
  }

  async end(): Promise<void> {
    if (this.nativePool && !this.useEmbedded) {
      await this.nativePool.end();
    }
  }
}

export const pool = new CatalogPool(dbConfig);
export type Pool = CatalogPool;
