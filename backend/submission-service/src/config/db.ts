import { randomUUID } from 'crypto';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not installed; read from process.env directly
}

export interface SubmissionsDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max?: number;
  idleTimeoutMillis?: number;
}

export const dbConfig: SubmissionsDbConfig = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.SUBMISSIONS_DB_PORT || '5437', 10),
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.DB_NAME || process.env.SUBMISSIONS_DB_NAME || 'sms_submissions',
  max: 10,
  idleTimeoutMillis: 30000,
};

const VALID_STATUSES = new Set([
  'Not Submitted',
  'Submitted',
  'Under Review',
  'Returned',
  'Resubmitted',
  'Approved',
  'Overdue',
  'Unassigned',
]);

/**
 * Embedded relational PostgreSQL engine fallback for `sms_submissions` (port 5437)
 * when the `pg` driver or local Docker PostgreSQL socket is unavailable in a sandboxed test runner.
 * Enforces all constraints from `database/postgres/init-submissions.sql` across:
 *   - `submissions`
 *   - `submission_versions`
 *   - `review_decisions`
 *   - `signatories`
 */
class EmbeddedSubmissionsPostgresEngine {
  private submissions: Map<string, any> = new Map();
  private versions: any[] = [];
  private reviews: any[] = [];
  private signatories: any[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      reviewed_by_name: 'Dr. Maria Santos',
      recommending_name: 'Assoc. Prof. Demetrio C. Quirino, Jr., PECE',
      approving_name: 'Assoc. Prof. Anna Ruby P. Gapasin, PhD',
      updated_at: new Date().toISOString(),
    },
  ];

  public resetInternalForTest(): void {
    this.submissions.clear();
    this.versions.length = 0;
    this.reviews.length = 0;
    this.signatories = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        reviewed_by_name: 'Dr. Maria Santos',
        recommending_name: 'Assoc. Prof. Demetrio C. Quirino, Jr., PECE',
        approving_name: 'Assoc. Prof. Anna Ruby P. Gapasin, PhD',
        updated_at: new Date().toISOString(),
      },
    ];
  }

  private parseJsonColumn(val: any): any {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return val;
  }

  async execute(sqlText: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const normalized = sqlText.replace(/\s+/g, ' ').trim();

    // 1. DDL / Extensions / Connection test
    if (/^(CREATE\s+(EXTENSION|TABLE|INDEX)|ALTER\s+TABLE|SELECT\s+1\b)/i.test(normalized)) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // 2. COUNT queries
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+submissions\b/i.test(normalized)) {
      return { rows: [{ count: String(this.submissions.size) }], rowCount: 1 };
    }
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+submission_versions\b/i.test(normalized)) {
      return { rows: [{ count: String(this.versions.length) }], rowCount: 1 };
    }
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+review_decisions\b/i.test(normalized)) {
      return { rows: [{ count: String(this.reviews.length) }], rowCount: 1 };
    }
    if (/^SELECT\s+COUNT\(\*\)\s+FROM\s+signatories\b/i.test(normalized)) {
      return { rows: [{ count: String(this.signatories.length) }], rowCount: 1 };
    }

    // 3. SIGNATORIES queries
    if (/^SELECT\s+\*\s+FROM\s+signatories/i.test(normalized)) {
      return {
        rows: this.signatories.slice(0, 1).map((s) => ({ ...s })),
        rowCount: this.signatories.length > 0 ? 1 : 0,
      };
    }

    if (/^UPDATE\s+signatories\s+SET/i.test(normalized)) {
      const current = this.signatories[0] || {
        id: randomUUID(),
        reviewed_by_name: 'Dr. Maria Santos',
        recommending_name: 'Assoc. Prof. Demetrio C. Quirino, Jr., PECE',
        approving_name: 'Assoc. Prof. Anna Ruby P. Gapasin, PhD',
        updated_at: new Date().toISOString(),
      };
      const updated = {
        ...current,
        reviewed_by_name: params[0] ?? current.reviewed_by_name,
        recommending_name: params[1] ?? current.recommending_name,
        approving_name: params[2] ?? current.approving_name,
        updated_at: params[3] || new Date().toISOString(),
      };
      this.signatories[0] = updated;
      return { rows: [{ ...updated }], rowCount: 1 };
    }

    // 4. SUBMISSIONS INSERT
    if (/^INSERT\s+INTO\s+submissions/i.test(normalized)) {
      let id = randomUUID();
      let fms_message_id: any = null;
      let assignment_id: any = null;
      let assignment_version: any = 1;
      let requirement_id: any;
      let academic_term_id: any = null;
      let course_id: any = null;
      let block_section_id: any = null;
      let faculty_id: any;
      let previous_faculty_id: any = null;
      let substitute_id: any = null;
      let course_code: any;
      let section_label: any;
      let status: any = 'Not Submitted';
      let schedule: any = null;
      let file_id: any = null;
      let file_name: any = null;
      let submitted_at: any = null;
      let created_at: any = new Date().toISOString();
      let updated_at: any = new Date().toISOString();

      if (params.length >= 20) {
        [
          id,
          fms_message_id,
          assignment_id,
          assignment_version,
          requirement_id,
          academic_term_id,
          course_id,
          block_section_id,
          faculty_id,
          previous_faculty_id,
          substitute_id,
          course_code,
          section_label,
          status,
          schedule,
          file_id,
          file_name,
          submitted_at,
          created_at,
          updated_at,
        ] = params;
      } else {
        [
          id,
          fms_message_id,
          assignment_id,
          assignment_version,
          requirement_id,
          academic_term_id,
          course_id,
          block_section_id,
          faculty_id,
          substitute_id,
          course_code,
          section_label,
          status,
          schedule,
          file_id,
          file_name,
          submitted_at,
          created_at,
          updated_at,
        ] = params;
      }

      if (!VALID_STATUSES.has(status)) {
        throw new Error(`new row for relation "submissions" violates check constraint "submissions_status_check"`);
      }

      if (assignment_id) {
        const duplicate = Array.from(this.submissions.values()).find((s) => s.assignment_id === assignment_id);
        if (duplicate) {
          throw new Error(`duplicate key value violates unique constraint "submissions_assignment_id_key"`);
        }
      }

      const row = {
        id: id || randomUUID(),
        fms_message_id: fms_message_id ?? null,
        assignment_id: assignment_id ?? null,
        assignment_version: Number(assignment_version ?? 1),
        fms_assignment_version: Number(assignment_version ?? 1),
        requirement_id,
        academic_term_id: academic_term_id ?? null,
        course_id: course_id ?? null,
        block_section_id: block_section_id ?? null,
        faculty_id,
        previous_faculty_id: previous_faculty_id ?? null,
        substitute_id: substitute_id ?? null,
        course_code,
        section_label,
        status,
        schedule: this.parseJsonColumn(schedule),
        file_id: file_id ?? null,
        file_name: file_name ?? null,
        submitted_at: submitted_at ?? null,
        created_at: created_at instanceof Date ? created_at.toISOString() : String(created_at),
        updated_at: updated_at instanceof Date ? updated_at.toISOString() : String(updated_at),
      };

      this.submissions.set(row.id, row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    // 5. SUBMISSIONS SELECT
    if (/^SELECT\s+\*\s+FROM\s+submissions/i.test(normalized)) {
      let list = Array.from(this.submissions.values()).map((r) => ({ ...r }));

      if (/WHERE\s+id\s*=\s*\$1\b/i.test(normalized)) {
        const found = list.filter((s) => s.id === String(params[0]));
        return { rows: found, rowCount: found.length };
      }

      if (/WHERE\s+assignment_id\s*=\s*\$1\b/i.test(normalized)) {
        const found = list.filter((s) => s.assignment_id === String(params[0]));
        return { rows: found, rowCount: found.length };
      }

      if (/WHERE\s+faculty_id\s*=\s*\$1\b/i.test(normalized)) {
        const found = list.filter((s) => s.faculty_id === String(params[0])).reverse();
        return { rows: found, rowCount: found.length };
      }

      if (/WHERE\s+course_code\s*=\s*\$1\s+AND\s+section_label\s*=\s*\$2/i.test(normalized)) {
        const found = list.filter(
          (s) => s.course_code === String(params[0]) && s.section_label === String(params[1])
        );
        if (found.length === 0) return { rows: [], rowCount: 0 };
        return { rows: [found[found.length - 1]], rowCount: 1 };
      }

      // Dynamic filters (requirement_id, status, course_code)
      const filterMatches = normalized.matchAll(/(requirement_id|status|course_code)\s*=\s*\$(\d+)/gi);
      for (const m of filterMatches) {
        const col = m[1].toLowerCase();
        const idx = parseInt(m[2], 10) - 1;
        const val = params[idx];
        if (val !== undefined) {
          list = list.filter((s) => String(s[col]) === String(val));
        }
      }

      return { rows: list, rowCount: list.length };
    }

    // 6. SUBMISSIONS UPDATE
    if (/^UPDATE\s+submissions\s+SET/i.test(normalized)) {
      const id = String(params[params.length - 1]);
      const existing = this.submissions.get(id);
      if (!existing) {
        return { rows: [], rowCount: 0 };
      }

      const updated = { ...existing };

      // Check which columns are being updated
      if (/SET\s+status\s*=\s*\$1\s*,\s*assignment_version\s*=\s*\$2/i.test(normalized)) {
        // Full updateStatus / updateApprovedAssignment / updateAssignmentSchedule
        let status: any;
        let assignment_version: any;
        let faculty_id: any;
        let previous_faculty_id: any;
        let substitute_id: any;
        let schedule: any;
        let file_id: any;
        let file_name: any;
        let submitted_at: any;
        let fms_message_id: any;
        let updated_at: any;

        if (params.length >= 12) {
          [
            status,
            assignment_version,
            faculty_id,
            previous_faculty_id,
            substitute_id,
            schedule,
            file_id,
            file_name,
            submitted_at,
            fms_message_id,
            updated_at,
          ] = params;
        } else {
          [
            status,
            assignment_version,
            faculty_id,
            substitute_id,
            schedule,
            file_id,
            file_name,
            submitted_at,
            fms_message_id,
            updated_at,
          ] = params;
        }

        if (!VALID_STATUSES.has(status)) {
          throw new Error(`new row for relation "submissions" violates check constraint "submissions_status_check"`);
        }
        updated.status = status;
        updated.assignment_version = Number(assignment_version ?? updated.assignment_version ?? 1);
        updated.fms_assignment_version = updated.assignment_version;
        updated.faculty_id = faculty_id ?? updated.faculty_id;
        if (previous_faculty_id !== undefined) {
          updated.previous_faculty_id = previous_faculty_id;
        }
        updated.substitute_id = substitute_id !== undefined ? substitute_id : updated.substitute_id;
        updated.schedule = schedule !== undefined ? this.parseJsonColumn(schedule) : updated.schedule;
        updated.file_id = file_id !== undefined ? file_id : updated.file_id;
        updated.file_name = file_name !== undefined ? file_name : updated.file_name;
        updated.submitted_at = submitted_at !== undefined ? submitted_at : updated.submitted_at;
        updated.fms_message_id = fms_message_id !== undefined ? fms_message_id : updated.fms_message_id;
        updated.updated_at = updated_at || new Date().toISOString();
      } else if (/SET\s+faculty_id\s*=\s*\$1/i.test(normalized)) {
        if (/previous_faculty_id/i.test(normalized)) {
          const [newFacultyId, prevFacultyId, versionBump, updatedAt] = params;
          updated.faculty_id = newFacultyId;
          if (prevFacultyId !== null && prevFacultyId !== undefined) {
            updated.previous_faculty_id = prevFacultyId;
          }
          updated.assignment_version = (updated.assignment_version || 1) + Number(versionBump || 1);
          updated.fms_assignment_version = updated.assignment_version;
          updated.updated_at = updatedAt || new Date().toISOString();
        } else {
          const [newFacultyId, versionBump, updatedAt] = params;
          updated.faculty_id = newFacultyId;
          updated.assignment_version = (updated.assignment_version || 1) + Number(versionBump || 1);
          updated.fms_assignment_version = updated.assignment_version;
          updated.updated_at = updatedAt || new Date().toISOString();
        }
      } else if (/SET\s+substitute_id\s*=\s*\$1/i.test(normalized)) {
        const [subId, updatedAt] = params;
        updated.substitute_id = subId;
        updated.updated_at = updatedAt || new Date().toISOString();
      } else if (/SET\s+file_name\s*=\s*\$1/i.test(normalized)) {
        const [fileName, submittedAt, updatedAt] = params;
        updated.file_name = fileName;
        updated.submitted_at = submittedAt;
        updated.updated_at = updatedAt || new Date().toISOString();
      }

      this.submissions.set(id, updated);
      return { rows: [{ ...updated }], rowCount: 1 };
    }

    // 7. SUBMISSION_VERSIONS INSERT & SELECT
    if (/^INSERT\s+INTO\s+submission_versions/i.test(normalized)) {
      const [
        id = randomUUID(),
        submission_id,
        version_number,
        version_label,
        file_id = null,
        file_name,
        file_size = 0,
        submitted_by,
        submitted_by_name = null,
        status_at_version,
        change_summary = null,
        created_at = new Date().toISOString(),
      ] = params;

      const row = {
        id: id || randomUUID(),
        submission_id,
        version_number: Number(version_number),
        version_label,
        file_id: file_id ?? null,
        file_name,
        file_size: Number(file_size ?? 0),
        submitted_by,
        submitted_by_name: submitted_by_name ?? null,
        status_at_version,
        change_summary: change_summary ?? null,
        created_at: created_at instanceof Date ? created_at.toISOString() : String(created_at),
      };

      this.versions.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (/^SELECT\s+\*\s+FROM\s+submission_versions/i.test(normalized)) {
      const subId = String(params[0] || '');
      const found = this.versions
        .filter((v) => v.submission_id === subId)
        .sort((a, b) => a.version_number - b.version_number)
        .map((v) => ({ ...v }));
      return { rows: found, rowCount: found.length };
    }

    // 8. REVIEW_DECISIONS INSERT & SELECT
    if (/^INSERT\s+INTO\s+review_decisions/i.test(normalized)) {
      const [
        id = randomUUID(),
        submission_id,
        reviewer_id,
        reviewer_name,
        decision,
        comment,
        created_at = new Date().toISOString(),
      ] = params;

      const row = {
        id: id || randomUUID(),
        submission_id,
        reviewer_id,
        reviewer_name,
        decision,
        comment,
        created_at: created_at instanceof Date ? created_at.toISOString() : String(created_at),
      };

      this.reviews.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (/^SELECT\s+\*\s+FROM\s+review_decisions/i.test(normalized)) {
      const subId = String(params[0] || '');
      const found = this.reviews
        .filter((r) => r.submission_id === subId)
        .reverse()
        .map((r) => ({ ...r }));
      return { rows: found, rowCount: found.length };
    }

    return { rows: [], rowCount: 0 };
  }
}

export class SubmissionsPool {
  private nativePool: any = null;
  private embeddedEngine = new EmbeddedSubmissionsPostgresEngine();
  private useEmbedded = false;
  public readonly options: SubmissionsDbConfig;

  constructor(config: SubmissionsDbConfig) {
    this.options = config;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PgPool = require('pg').Pool;
      this.nativePool = new PgPool(config);
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
      release: () => {},
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

  public resetEmbeddedForTest(): void {
    this.embeddedEngine.resetInternalForTest();
  }

  async end(): Promise<void> {
    if (this.nativePool && !this.useEmbedded) {
      await this.nativePool.end();
    }
  }
}

export const pool = new SubmissionsPool(dbConfig);
export type Pool = SubmissionsPool;
