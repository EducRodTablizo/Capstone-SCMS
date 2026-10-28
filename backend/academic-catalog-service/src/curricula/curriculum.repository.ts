import { pool } from '../config/db';
import { Curriculum, CurriculumStatus, CreateCurriculumDto, AddCurriculumCourseDto, CurriculumCourseItem } from './curriculum.entity';

export class CurriculumRepository {
  async findAll(programId?: string): Promise<Curriculum[]> {
    try {
      let query = 'SELECT * FROM curricula WHERE 1=1';
      const params: any[] = [];
      if (programId) {
        params.push(programId);
        query += ` AND program_id = $${params.length}`;
      }
      query += ' ORDER BY curriculum_code ASC';
      const result = await pool.query(query, params);
      return result.rows.map(this.mapRowToCurriculum);
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<Curriculum | null> {
    try {
      const result = await pool.query('SELECT * FROM curricula WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      const curr = this.mapRowToCurriculum(result.rows[0]);
      curr.courses = await this.getCurriculumCourses(id);
      return curr;
    } catch {
      return null;
    }
  }

  async findByCode(code: string): Promise<Curriculum | null> {
    try {
      const result = await pool.query('SELECT * FROM curricula WHERE curriculum_code = $1', [code]);
      if (result.rows.length === 0) return null;
      return this.mapRowToCurriculum(result.rows[0]);
    } catch {
      return null;
    }
  }

  async create(dto: CreateCurriculumDto): Promise<Curriculum> {
    const result = await pool.query(
      `INSERT INTO curricula (program_id, curriculum_code, name, effective_start_term, description, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dto.program_id, dto.curriculum_code.trim(), dto.name.trim(), dto.effective_start_term.trim(), dto.description || null, dto.status || 'Active']
    );
    return this.mapRowToCurriculum(result.rows[0]);
  }

  async addCourse(curriculumId: string, dto: AddCurriculumCourseDto): Promise<CurriculumCourseItem> {
    const result = await pool.query(
      `INSERT INTO curriculum_courses (curriculum_id, course_id, year_level, semester, is_major)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (curriculum_id, course_id) DO UPDATE SET
         year_level = EXCLUDED.year_level,
         semester = EXCLUDED.semester,
         is_major = EXCLUDED.is_major
       RETURNING *`,
      [curriculumId, dto.course_id, dto.year_level, dto.semester, dto.is_major !== undefined ? dto.is_major : true]
    );

    const courseDetails = await pool.query('SELECT course_code, title, credit_units, contact_hours FROM courses WHERE id = $1', [dto.course_id]);
    const c = courseDetails.rows[0] || {};
    return {
      id: result.rows[0].id,
      curriculum_id: curriculumId,
      course_id: dto.course_id,
      course_code: c.course_code || '',
      course_title: c.title || '',
      credit_units: Number(c.credit_units || 3),
      contact_hours: Number(c.contact_hours || 3),
      year_level: result.rows[0].year_level,
      semester: result.rows[0].semester,
      is_major: result.rows[0].is_major,
    };
  }

  async getCurriculumCourses(curriculumId: string): Promise<CurriculumCourseItem[]> {
    const query = `
      SELECT cc.id, cc.curriculum_id, cc.course_id, cc.year_level, cc.semester, cc.is_major,
             c.course_code, c.title as course_title, c.credit_units, c.contact_hours
      FROM curriculum_courses cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.curriculum_id = $1
      ORDER BY cc.year_level ASC, cc.semester ASC, c.course_code ASC
    `;
    const result = await pool.query(query, [curriculumId]);
    return result.rows.map(r => ({
      id: r.id,
      curriculum_id: r.curriculum_id,
      course_id: r.course_id,
      course_code: r.course_code,
      course_title: r.course_title,
      credit_units: Number(r.credit_units),
      contact_hours: Number(r.contact_hours),
      year_level: Number(r.year_level),
      semester: Number(r.semester),
      is_major: Boolean(r.is_major),
    }));
  }

  private mapRowToCurriculum(row: any): Curriculum {
    return {
      id: row.id,
      program_id: row.program_id,
      curriculum_code: row.curriculum_code,
      name: row.name,
      effective_start_term: row.effective_start_term,
      description: row.description,
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export const curriculumRepository = new CurriculumRepository();
