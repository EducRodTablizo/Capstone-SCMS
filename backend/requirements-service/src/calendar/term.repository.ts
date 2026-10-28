import { pool, Pool } from '../config/db';
import { AcademicTerm, CreateTermDto, TermStatus, UpdateTermDto } from './calendar.entity';

export class TermRepository {
  constructor(private readonly db: Pool = pool) {}

  async init(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS academic_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        term_code VARCHAR(20) UNIQUE NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        semester_number INT NOT NULL,
        semester_label VARCHAR(30) NOT NULL,
        display_label VARCHAR(100),
        start_date DATE,
        end_date DATE,
        submission_window_start TIMESTAMP WITH TIME ZONE,
        submission_window_end TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async findAll(): Promise<AcademicTerm[]> {
    const res = await this.db.query('SELECT * FROM academic_terms ORDER BY start_date DESC');
    return res.rows;
  }

  async findById(id: string): Promise<AcademicTerm | null> {
    const res = await this.db.query('SELECT * FROM academic_terms WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByCode(termCode: string): Promise<AcademicTerm | null> {
    const res = await this.db.query('SELECT * FROM academic_terms WHERE term_code = $1', [termCode]);
    return res.rows[0] || null;
  }

  async getActiveTerm(): Promise<AcademicTerm | null> {
    const res = await this.db.query(
      'SELECT * FROM academic_terms WHERE UPPER(status) = UPPER($1) ORDER BY start_date DESC LIMIT 1',
      ['ACTIVE']
    );
    return res.rows[0] || null;
  }

  async create(data: CreateTermDto): Promise<AcademicTerm> {
    const normalizedStatus = data.status ? String(data.status).toUpperCase() : 'UPCOMING';
    const displayLabel =
      data.display_label || `A.Y. ${data.academic_year} Semester ${data.semester_number}`;
    const res = await this.db.query(
      `INSERT INTO academic_terms (
        term_code, academic_year, semester_number, semester_label, display_label,
        start_date, end_date, submission_window_start, submission_window_end, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.term_code.trim(),
        data.academic_year.trim(),
        data.semester_number,
        data.semester_label.trim(),
        displayLabel.trim(),
        data.start_date || null,
        data.end_date || null,
        data.submission_window_start || null,
        data.submission_window_end || null,
        normalizedStatus,
      ]
    );
    return res.rows[0];
  }

  async update(idOrCode: string, data: UpdateTermDto): Promise<AcademicTerm | null> {
    const normalizedStatus = data.status ? String(data.status).toUpperCase() : null;
    const res = await this.db.query(
      `UPDATE academic_terms SET
        academic_year = COALESCE($1, academic_year),
        semester_number = COALESCE($2, semester_number),
        semester_label = COALESCE($3, semester_label),
        display_label = COALESCE($4, display_label),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        submission_window_start = COALESCE($7, submission_window_start),
        submission_window_end = COALESCE($8, submission_window_end),
        status = COALESCE($9, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id::text = $10 OR term_code = $10
      RETURNING *`,
      [
        data.academic_year ?? null,
        data.semester_number ?? null,
        data.semester_label ?? null,
        data.display_label ?? null,
        data.start_date ?? null,
        data.end_date ?? null,
        data.submission_window_start ?? undefined,
        data.submission_window_end ?? undefined,
        normalizedStatus,
        idOrCode,
      ]
    );
    return res.rows[0] || null;
  }

  async updateSubmissionWindow(
    termCode: string,
    windowStart: string,
    windowEnd: string
  ): Promise<AcademicTerm | null> {
    const res = await this.db.query(
      `UPDATE academic_terms 
       SET submission_window_start = $2, submission_window_end = $3, updated_at = CURRENT_TIMESTAMP
       WHERE term_code = $1 RETURNING *`,
      [termCode, windowStart, windowEnd]
    );
    return res.rows[0] || null;
  }

  async updateStatus(termCode: string, status: TermStatus): Promise<AcademicTerm | null> {
    const normalizedStatus = String(status).toUpperCase();
    const res = await this.db.query(
      `UPDATE academic_terms 
       SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE term_code = $1 RETURNING *`,
      [termCode, normalizedStatus]
    );
    return res.rows[0] || null;
  }

  async delete(idOrCode: string): Promise<boolean> {
    const res = await this.db.query(
      'DELETE FROM academic_terms WHERE id::text = $1 OR term_code = $1',
      [idOrCode]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const termRepository = new TermRepository(pool);

