import { pool, catalogPool, Pool } from '../config/db';
import { Requirement, RequirementStatus, CreateRequirementDto, UpdateRequirementDto } from './requirement.entity';

export class RequirementRepository {
  constructor(
    private readonly db: Pool = pool,
    private readonly catDb = catalogPool
  ) {}

  async init(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID,
        program_code VARCHAR(50),
        term_code VARCHAR(20) NOT NULL,
        requirement_type VARCHAR(100) NOT NULL DEFAULT 'OBTL_SYLLABUS',
        name VARCHAR(255) NOT NULL,
        description TEXT,
        deadline_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async verifyProgramIsActive(programCode: string): Promise<{ exists: boolean; isActive: boolean }> {
    const res = await this.catDb.query('SELECT status FROM programs WHERE code = $1', [programCode]);
    if (res.rows.length === 0) return { exists: false, isActive: false };
    return { exists: true, isActive: res.rows[0].status === 'Active' };
  }

  async findAll(status?: RequirementStatus, programCode?: string, termCode?: string): Promise<Requirement[]> {
    let query = 'SELECT * FROM requirements WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (programCode) {
      params.push(programCode);
      query += ` AND program_code = $${params.length}`;
    }
    if (termCode) {
      params.push(termCode);
      query += ` AND term_code = $${params.length}`;
    }

    query += ' ORDER BY term_code DESC, program_code ASC, created_at ASC';
    const result = await this.db.query(query, params);
    return result.rows.map((row) => this.mapRowToRequirement(row));
  }

  async findById(id: string): Promise<Requirement | null> {
    const result = await this.db.query('SELECT * FROM requirements WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToRequirement(result.rows[0]);
  }

  async create(dto: CreateRequirementDto & { status?: RequirementStatus }): Promise<Requirement> {
    const status = dto.status || 'DRAFT';
    const result = await this.db.query(
      `INSERT INTO requirements (program_code, term_code, requirement_type, name, description, deadline_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dto.program_code.trim(),
        dto.term_code.trim(),
        dto.requirement_type?.trim() || 'OBTL_SYLLABUS',
        dto.name.trim(),
        dto.description || null,
        dto.deadline_at ? new Date(dto.deadline_at) : null,
        status,
      ]
    );
    return this.mapRowToRequirement(result.rows[0]);
  }

  async update(id: string, dto: UpdateRequirementDto): Promise<Requirement | null> {
    const result = await this.db.query(
      `UPDATE requirements SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        deadline_at = COALESCE($3, deadline_at),
        status = COALESCE($4, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [
        dto.name ? dto.name.trim() : null,
        dto.description ? dto.description.trim() : null,
        dto.deadline_at ? new Date(dto.deadline_at) : null,
        dto.status || null,
        id,
      ]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToRequirement(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM requirements WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRowToRequirement(row: any): Requirement {
    return {
      id: row.id,
      program_code: row.program_code,
      term_code: row.term_code,
      requirement_type: row.requirement_type,
      name: row.name,
      description: row.description,
      deadline_at: row.deadline_at ? new Date(row.deadline_at) : null,
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export const requirementRepository = new RequirementRepository(pool, catalogPool);
