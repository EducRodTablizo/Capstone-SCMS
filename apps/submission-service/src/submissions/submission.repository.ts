import { pool } from '../config/db';
import { Submission, ReviewDecision, SubmissionVersion, CanonicalStatus, FmsScheduleDetails } from './submission.entity';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface SubmissionsPersistenceStore {
  submissions: Submission[];
  versions: Record<string, SubmissionVersion[]>;
  reviews: ReviewDecision[];
}

export class SubmissionRepository {
  private fallbackStore: Map<string, Submission> = new Map();
  private fallbackVersions: Map<string, SubmissionVersion[]> = new Map();
  private fallbackReviews: ReviewDecision[] = [];
  private readonly filePath: string;

  constructor() {
    this.filePath = path.resolve(process.cwd(), 'submissions.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: SubmissionsPersistenceStore = JSON.parse(raw);
        this.fallbackStore.clear();
        this.fallbackVersions.clear();
        this.fallbackReviews = [];

        if (Array.isArray(parsed.submissions)) {
          for (const sub of parsed.submissions) {
            this.fallbackStore.set(sub.id, sub);
          }
        }
        if (parsed.versions && typeof parsed.versions === 'object') {
          for (const [subId, verList] of Object.entries(parsed.versions)) {
            if (Array.isArray(verList)) {
              this.fallbackVersions.set(subId, verList);
            }
          }
        }
        if (Array.isArray(parsed.reviews)) {
          this.fallbackReviews = parsed.reviews;
        }
      }
    } catch {
      // Ignore read errors on startup and initialize empty
    }
  }

  private saveToDisk(): void {
    try {
      const versionsObj: Record<string, SubmissionVersion[]> = {};
      for (const [subId, verList] of this.fallbackVersions.entries()) {
        versionsObj[subId] = verList;
      }
      const payload: SubmissionsPersistenceStore = {
        submissions: Array.from(this.fallbackStore.values()),
        versions: versionsObj,
        reviews: this.fallbackReviews,
      };
      fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Fallback in restricted environments
    }
  }

  public clearForTesting(): void {
    this.fallbackStore.clear();
    this.fallbackVersions.clear();
    this.fallbackReviews = [];
    if (fs.existsSync(this.filePath)) {
      try {
        fs.unlinkSync(this.filePath);
      } catch {
        // ignore
      }
    }
  }

  async create(data: Omit<Submission, 'id' | 'created_at' | 'updated_at'>): Promise<Submission> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newSubmission: Submission = {
      id,
      ...data,
      created_at: now,
      updated_at: now,
    };

    try {
      const query = `
        INSERT INTO submissions (id, requirement_id, faculty_id, substitute_id, fms_assignment_version, course_code, section_label, status, file_id, file_name, submitted_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `;
      const res = await pool.query(query, [
        id,
        data.requirement_id,
        data.faculty_id,
        data.substitute_id || null,
        data.fms_assignment_version || 1,
        data.course_code,
        data.section_label,
        data.status,
        data.file_id || null,
        data.file_name || null,
        data.submitted_at || null,
        now,
        now,
      ]);
      this.fallbackStore.set(id, res.rows[0]);
      this.saveToDisk();
      return res.rows[0];
    } catch {
      this.fallbackStore.set(id, newSubmission);
      this.saveToDisk();
      return newSubmission;
    }
  }

  async findById(id: string): Promise<Submission | null> {
    try {
      const res = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
      return res.rows[0] || this.fallbackStore.get(id) || null;
    } catch {
      return this.fallbackStore.get(id) || null;
    }
  }

  async findByFaculty(facultyId: string): Promise<Submission[]> {
    try {
      const res = await pool.query('SELECT * FROM submissions WHERE faculty_id = $1 ORDER BY created_at DESC', [facultyId]);
      return res.rows;
    } catch {
      return Array.from(this.fallbackStore.values()).filter(s => s.faculty_id === facultyId);
    }
  }

  async listAll(filter?: { requirement_id?: string; status?: string; course_code?: string }): Promise<Submission[]> {
    try {
      let q = 'SELECT * FROM submissions WHERE 1=1';
      const params: any[] = [];
      let idx = 1;
      if (filter?.requirement_id) {
        q += ` AND requirement_id = $${idx++}`;
        params.push(filter.requirement_id);
      }
      if (filter?.status) {
        q += ` AND status = $${idx++}`;
        params.push(filter.status);
      }
      if (filter?.course_code) {
        q += ` AND course_code = $${idx++}`;
        params.push(filter.course_code);
      }
      q += ' ORDER BY created_at DESC';
      const res = await pool.query(q, params);
      return res.rows;
    } catch {
      let items = Array.from(this.fallbackStore.values());
      if (filter?.requirement_id) items = items.filter(s => s.requirement_id === filter.requirement_id);
      if (filter?.status) items = items.filter(s => s.status === filter.status);
      if (filter?.course_code) items = items.filter(s => s.course_code === filter.course_code);
      return items;
    }
  }

  async updateStatus(id: string, status: CanonicalStatus, submittedAt?: string): Promise<Submission | null> {
    const now = new Date().toISOString();
    try {
      const query = `
        UPDATE submissions 
        SET status = $1, submitted_at = COALESCE($2, submitted_at), updated_at = $3
        WHERE id = $4
        RETURNING *;
      `;
      const res = await pool.query(query, [status, submittedAt || null, now, id]);
      if (res.rows[0]) {
        this.fallbackStore.set(id, res.rows[0]);
        this.saveToDisk();
        return res.rows[0];
      }
    } catch {
      // fallback
    }

    const sub = this.fallbackStore.get(id);
    if (!sub) return null;
    sub.status = status;
    if (submittedAt) sub.submitted_at = submittedAt;
    sub.updated_at = now;
    this.fallbackStore.set(id, sub);
    this.saveToDisk();
    return sub;
  }

  async updateFileMetadata(id: string, fileName: string, fileSize: number, submittedAt: string): Promise<Submission | null> {
    const now = new Date().toISOString();
    try {
      const query = `
        UPDATE submissions 
        SET file_name = $1, submitted_at = $2, updated_at = $3
        WHERE id = $4
        RETURNING *;
      `;
      const res = await pool.query(query, [fileName, submittedAt, now, id]);
      if (res.rows[0]) {
        this.fallbackStore.set(id, res.rows[0]);
        this.saveToDisk();
        return res.rows[0];
      }
    } catch {
      // fallback
    }

    const sub = this.fallbackStore.get(id);
    if (!sub) return null;
    sub.file_name = fileName;
    sub.file_size = fileSize;
    sub.submitted_at = submittedAt;
    sub.updated_at = now;
    this.fallbackStore.set(id, sub);
    this.saveToDisk();
    return sub;
  }

  // Version Management (SCMS-021)
  async createVersion(data: Omit<SubmissionVersion, 'id' | 'created_at'>): Promise<SubmissionVersion> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newVersion: SubmissionVersion = { id, ...data, created_at: now };

    try {
      const query = `
        INSERT INTO submission_versions (id, submission_id, version_number, version_label, file_id, file_name, file_size, submitted_by, submitted_by_name, status_at_version, change_summary, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const res = await pool.query(query, [
        id,
        data.submission_id,
        data.version_number,
        data.version_label,
        data.file_id || null,
        data.file_name,
        data.file_size || 0,
        data.submitted_by,
        data.submitted_by_name || null,
        data.status_at_version,
        data.change_summary || null,
        now,
      ]);
      const list = this.fallbackVersions.get(data.submission_id) || [];
      list.push(res.rows[0]);
      this.fallbackVersions.set(data.submission_id, list);
      this.saveToDisk();
      return res.rows[0];
    } catch {
      const list = this.fallbackVersions.get(data.submission_id) || [];
      list.push(newVersion);
      this.fallbackVersions.set(data.submission_id, list);
      this.saveToDisk();
      return newVersion;
    }
  }

  async getVersions(submissionId: string): Promise<SubmissionVersion[]> {
    try {
      const res = await pool.query('SELECT * FROM submission_versions WHERE submission_id = $1 ORDER BY version_number ASC', [submissionId]);
      if (res.rows.length > 0) return res.rows;
      return this.fallbackVersions.get(submissionId) || [];
    } catch {
      return this.fallbackVersions.get(submissionId) || [];
    }
  }

  async getLatestVersionNumber(submissionId: string): Promise<number> {
    const versions = await this.getVersions(submissionId);
    if (versions.length === 0) return 0;
    return Math.max(...versions.map(v => v.version_number));
  }

  // Review Decisions (SCMS-010)
  async createReviewDecision(data: Omit<ReviewDecision, 'id' | 'created_at'>): Promise<ReviewDecision> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newReview: ReviewDecision = { id, ...data, created_at: now };
    try {
      const query = `
        INSERT INTO review_decisions (id, submission_id, reviewer_name, decision, comment, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const res = await pool.query(query, [id, data.submission_id, data.reviewer_name, data.decision, data.comment, now]);
      this.fallbackReviews.push(res.rows[0]);
      this.saveToDisk();
      return res.rows[0];
    } catch {
      this.fallbackReviews.push(newReview);
      this.saveToDisk();
      return newReview;
    }
  }

  async getReviews(submissionId: string): Promise<ReviewDecision[]> {
    try {
      const res = await pool.query('SELECT * FROM review_decisions WHERE submission_id = $1 ORDER BY created_at DESC', [submissionId]);
      if (res.rows.length > 0) return res.rows;
      return this.fallbackReviews.filter(r => r.submission_id === submissionId);
    } catch {
      return this.fallbackReviews.filter(r => r.submission_id === submissionId);
    }
  }

  async findByCourseAndSection(courseCode: string, sectionLabel: string): Promise<Submission | null> {
    try {
      const res = await pool.query(
        'SELECT * FROM submissions WHERE course_code = $1 AND section_label = $2 ORDER BY created_at DESC LIMIT 1',
        [courseCode, sectionLabel]
      );
      if (res.rows[0]) return res.rows[0];
    } catch {
      // fallback
    }
    const allMatching = Array.from(this.fallbackStore.values()).filter(
      s => s.course_code === courseCode && s.section_label === sectionLabel
    );
    if (allMatching.length === 0) return null;
    return allMatching[allMatching.length - 1];
  }

  async updateFacultyAssignment(id: string, newFacultyId: string, versionBump: number = 1): Promise<Submission | null> {
    const now = new Date().toISOString();
    try {
      const res = await pool.query(
        'UPDATE submissions SET faculty_id = $1, fms_assignment_version = COALESCE(fms_assignment_version, 1) + $2, updated_at = $3 WHERE id = $4 RETURNING *;',
        [newFacultyId, versionBump, now, id]
      );
      if (res.rows[0]) {
        this.fallbackStore.set(id, res.rows[0]);
        this.saveToDisk();
        return res.rows[0];
      }
    } catch {
      // fallback
    }
    const sub = this.fallbackStore.get(id);
    if (!sub) return null;
    sub.faculty_id = newFacultyId;
    sub.fms_assignment_version = (sub.fms_assignment_version || 1) + versionBump;
    sub.updated_at = now;
    this.fallbackStore.set(id, sub);
    this.saveToDisk();
    return sub;
  }

  async updateSubstitute(id: string, substituteId: string | null): Promise<Submission | null> {
    const now = new Date().toISOString();
    try {
      const res = await pool.query(
        'UPDATE submissions SET substitute_id = $1, updated_at = $2 WHERE id = $3 RETURNING *;',
        [substituteId, now, id]
      );
      if (res.rows[0]) {
        this.fallbackStore.set(id, res.rows[0]);
        this.saveToDisk();
        return res.rows[0];
      }
    } catch {
      // fallback
    }
    const sub = this.fallbackStore.get(id);
    if (!sub) return null;
    sub.substitute_id = substituteId;
    sub.updated_at = now;
    this.fallbackStore.set(id, sub);
    this.saveToDisk();
    return sub;
  }

  async findByAssignmentId(assignmentId: string): Promise<Submission | null> {
    for (const sub of this.fallbackStore.values()) {
      if (sub.assignment_id === assignmentId) {
        return sub;
      }
    }
    return null;
  }

  async updateAssignmentSchedule(
    id: string,
    schedule: FmsScheduleDetails,
    assignmentVersion: number
  ): Promise<Submission | null> {
    const now = new Date().toISOString();
    const sub = this.fallbackStore.get(id);
    if (!sub) return null;
    sub.schedule = schedule;
    sub.fms_assignment_version = assignmentVersion;
    sub.updated_at = now;
    this.fallbackStore.set(id, sub);
    this.saveToDisk();
    return sub;
  }

  async updateApprovedAssignment(
    id: string,
    updates: Partial<Submission>
  ): Promise<Submission | null> {
    const now = new Date().toISOString();
    const sub = this.fallbackStore.get(id);
    if (!sub) return null;
    const updatedSub: Submission = {
      ...sub,
      ...updates,
      updated_at: now,
    };
    this.fallbackStore.set(id, updatedSub);
    this.saveToDisk();
    return updatedSub;
  }
}

export const submissionRepository = new SubmissionRepository();
