import { pool } from '../config/db';
import { Course, CourseStatus, CreateCourseDto, UpdateCourseDto } from './course.entity';

export class CourseRepository {
  private inMemoryFallback: Course[] = [
    {
      id: 'caaaaaaa-1111-1111-1111-111111111111',
      course_code: 'INTE 30103',
      version: 1,
      title: 'Web Systems and Technologies',
      credit_units: 3.0,
      lecture_hours: 2.0,
      lab_hours: 3.0,
      contact_hours: 5.0,
      description: 'Full-stack web application development',
      requires_lab: true,
      lab_type: 'Computer Laboratory',
      special_software: ['VS Code', 'Node.js', 'PostgreSQL', 'Docker'],
      status: 'Active',
      created_at: new Date(),
      updated_at: new Date(),
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
      description: 'Security architectures and cyber defense',
      requires_lab: true,
      lab_type: 'Computer Laboratory',
      special_software: ['Wireshark', 'Kali Linux tools'],
      status: 'Active',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  async findAll(status?: CourseStatus, search?: string): Promise<Course[]> {
    try {
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
      const result = await pool.query(query, params);
      return result.rows.map(this.mapRowToCourse);
    } catch {
      return this.inMemoryFallback.filter(c => (!status || c.status === status));
    }
  }

  async findById(id: string): Promise<Course | null> {
    try {
      const result = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRowToCourse(result.rows[0]);
    } catch {
      return this.inMemoryFallback.find(c => c.id === id) || null;
    }
  }

  async findByCodeAndVersion(code: string, version: number): Promise<Course | null> {
    try {
      const result = await pool.query('SELECT * FROM courses WHERE course_code = $1 AND version = $2', [code, version]);
      if (result.rows.length === 0) return null;
      return this.mapRowToCourse(result.rows[0]);
    } catch {
      return this.inMemoryFallback.find(c => c.course_code === code && c.version === version) || null;
    }
  }

  async create(dto: CreateCourseDto): Promise<Course> {
    const lecture = dto.lecture_hours !== undefined ? Number(dto.lecture_hours) : 3.0;
    const lab = dto.lab_hours !== undefined ? Number(dto.lab_hours) : 0.0;
    const contact = lecture + lab; // SMS-022: contact hours = lecture + lab
    const credits = dto.credit_units !== undefined ? Number(dto.credit_units) : 3.0;

    try {
      const result = await pool.query(
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
    } catch (err) {
      const newCourse: Course = {
        id: 'c' + Date.now().toString(16),
        course_code: dto.course_code.trim(),
        version: 1,
        title: dto.title.trim(),
        credit_units: credits,
        lecture_hours: lecture,
        lab_hours: lab,
        contact_hours: contact,
        description: dto.description,
        prerequisites: dto.prerequisites,
        co_requisites: dto.co_requisites,
        requires_lab: dto.requires_lab || false,
        lab_type: dto.lab_type,
        special_software: dto.special_software,
        status: dto.status || 'Active',
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.inMemoryFallback.push(newCourse);
      return newCourse;
    }
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const lecture = dto.lecture_hours !== undefined ? Number(dto.lecture_hours) : Number(existing.lecture_hours);
    const lab = dto.lab_hours !== undefined ? Number(dto.lab_hours) : Number(existing.lab_hours);
    const contact = lecture + lab;
    const credits = dto.credit_units !== undefined ? Number(dto.credit_units) : Number(existing.credit_units);

    try {
      const result = await pool.query(
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
      return this.mapRowToCourse(result.rows[0]);
    } catch {
      Object.assign(existing, {
        ...dto,
        credit_units: credits,
        lecture_hours: lecture,
        lab_hours: lab,
        contact_hours: contact,
        updated_at: new Date(),
      });
      return existing;
    }
  }

  async createVersion(id: string): Promise<Course | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const newVersion = existing.version + 1;
    const rootId = existing.root_course_id || existing.id;

    try {
      const result = await pool.query(
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
    } catch {
      const versioned: Course = {
        ...existing,
        id: 'c' + Date.now().toString(16),
        version: newVersion,
        status: 'Revised',
        root_course_id: rootId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.inMemoryFallback.push(versioned);
      return versioned;
    }
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

export const courseRepository = new CourseRepository();
