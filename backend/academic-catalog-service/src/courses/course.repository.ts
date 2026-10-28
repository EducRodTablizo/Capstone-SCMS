import { Pool, pool } from '../config/db';
import { Course, CourseStatus, CreateCourseDto, UpdateCourseDto } from './course.entity';

export class CourseRepository {
  constructor(private readonly db: Pool = pool) {}

  async findAll(status?: CourseStatus, search?: string): Promise<Course[]> {
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params: any[] = [];
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (course_code ILIKE $${params.length} OR title ILIKE $${params.length})`;
    }
    query += ' ORDER BY course_code ASC, version DESC';
    const result = await this.db.query(query, params);
    return (result.rows || []).map((r) => this.mapRowToCourse(r));
  }

  async findById(id: string): Promise<Course | null> {
    const result = await this.db.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRowToCourse(result.rows[0]);
  }

  async findByCodeAndVersion(code: string, version: number): Promise<Course | null> {
    const result = await this.db.query(
      'SELECT * FROM courses WHERE course_code = $1 AND version = $2',
      [code, version]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRowToCourse(result.rows[0]);
  }

  async create(dto: CreateCourseDto): Promise<Course> {
    const lecture = dto.lecture_hours !== undefined ? Number(dto.lecture_hours) : 3.0;
    const lab = dto.lab_hours !== undefined ? Number(dto.lab_hours) : 0.0;
    const contact = lecture + lab; // SMS-022: contact hours = lecture + lab
    const credits = dto.credit_units !== undefined ? Number(dto.credit_units) : 3.0;

    const result = await this.db.query(
      `INSERT INTO courses (
        course_code, version, title, credit_units, lecture_hours, lab_hours, contact_hours,
        description, prerequisites, co_requisites, requires_lab, lab_type, special_software, status
      ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        dto.course_code.trim(),
        dto.title.trim(),
        credits,
        lecture,
        lab,
        contact,
        dto.description || null,
        dto.prerequisites || null,
        dto.co_requisites || null,
        dto.requires_lab || false,
        dto.lab_type || null,
        dto.special_software || null,
        dto.status || 'Active',
      ]
    );
    return this.mapRowToCourse(result.rows[0]);
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const lecture =
      dto.lecture_hours !== undefined ? Number(dto.lecture_hours) : Number(existing.lecture_hours);
    const lab = dto.lab_hours !== undefined ? Number(dto.lab_hours) : Number(existing.lab_hours);
    const contact = lecture + lab;
    const credits =
      dto.credit_units !== undefined ? Number(dto.credit_units) : Number(existing.credit_units);

    const result = await this.db.query(
      `UPDATE courses SET
        title = COALESCE($1, title),
        credit_units = $2,
        lecture_hours = $3,
        lab_hours = $4,
        contact_hours = $5,
        description = COALESCE($6, description),
        prerequisites = COALESCE($7, prerequisites),
        co_requisites = COALESCE($8, co_requisites),
        requires_lab = COALESCE($9, requires_lab),
        lab_type = COALESCE($10, lab_type),
        special_software = COALESCE($11, special_software),
        status = COALESCE($12, status),
        replacement_course_id = COALESCE($13, replacement_course_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *`,
      [
        dto.title?.trim() || null,
        credits,
        lecture,
        lab,
        contact,
        dto.description || null,
        dto.prerequisites || null,
        dto.co_requisites || null,
        dto.requires_lab !== undefined ? dto.requires_lab : null,
        dto.lab_type || null,
        dto.special_software || null,
        dto.status || null,
        dto.replacement_course_id || null,
        id,
      ]
    );

    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRowToCourse(result.rows[0]);
  }

  async createVersion(id: string): Promise<Course | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const newVersion = existing.version + 1;
    const rootId = existing.root_course_id || existing.id;

    const result = await this.db.query(
      `INSERT INTO courses (
        course_code, version, title, credit_units, lecture_hours, lab_hours, contact_hours,
        description, prerequisites, co_requisites, requires_lab, lab_type, special_software,
        status, root_course_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Revised', $14)
      RETURNING *`,
      [
        existing.course_code,
        newVersion,
        existing.title,
        existing.credit_units,
        existing.lecture_hours,
        existing.lab_hours,
        existing.contact_hours,
        existing.description,
        existing.prerequisites,
        existing.co_requisites,
        existing.requires_lab,
        existing.lab_type,
        existing.special_software,
        rootId,
      ]
    );
    return this.mapRowToCourse(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.db.query('DELETE FROM courses WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  // ---------------------------------------------------------------------------
  // curriculum_courses join table support for courses belonging to multiple curricula
  // ---------------------------------------------------------------------------

  async assignToCurriculum(params: {
    curriculum_id: string;
    course_id: string;
    year_level: number;
    semester: number;
    is_major?: boolean;
  }): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO curriculum_courses (curriculum_id, course_id, year_level, semester, is_major)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (curriculum_id, course_id) DO UPDATE SET
         year_level = EXCLUDED.year_level,
         semester = EXCLUDED.semester,
         is_major = EXCLUDED.is_major
       RETURNING *`,
      [
        params.curriculum_id,
        params.course_id,
        params.year_level,
        params.semester,
        params.is_major !== undefined ? params.is_major : true,
      ]
    );
    return res.rows[0];
  }

  async getCurriculaForCourse(courseId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT cc.*, cu.curriculum_code, cu.name as curriculum_name
       FROM curriculum_courses cc
       JOIN curricula cu ON cc.curriculum_id = cu.id
       WHERE cc.course_id = $1`,
      [courseId]
    );
    return res.rows || [];
  }

  async removeFromCurriculum(curriculumId: string, courseId: string): Promise<boolean> {
    const res = await this.db.query(
      'DELETE FROM curriculum_courses WHERE curriculum_id = $1 AND course_id = $2',
      [curriculumId, courseId]
    );
    return (res.rowCount || 0) > 0;
  }

  private mapRowToCourse(row: any): Course {
    return {
      id: row.id,
      course_code: row.course_code,
      version: Number(row.version),
      title: row.title,
      credit_units: Number(row.credit_units),
      lecture_hours: Number(row.lecture_hours),
      lab_hours: Number(row.lab_hours),
      contact_hours: Number(row.contact_hours),
      description: row.description,
      prerequisites: row.prerequisites || [],
      co_requisites: row.co_requisites || [],
      requires_lab: Boolean(row.requires_lab),
      lab_type: row.lab_type,
      special_software: row.special_software || [],
      status: row.status,
      root_course_id: row.root_course_id,
      replacement_course_id: row.replacement_course_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export const courseRepository = new CourseRepository(pool);
