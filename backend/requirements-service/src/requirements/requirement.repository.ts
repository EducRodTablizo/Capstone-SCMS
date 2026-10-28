import { requirementsPool, catalogPool } from '../config/db';
import { Requirement, RequirementStatus, CreateRequirementDto, UpdateRequirementDto } from './requirement.entity';

export class RequirementRepository {
  private inMemoryFallback: Requirement[] = [
    {
      id: 'req-1111-1111-1111-1111-111111111111',
      program_code: 'BSIT',
      term_code: '2026-1S',
      requirement_type: 'OBTL_SYLLABUS',
      name: 'PUPQC Outcomes-Based Teaching & Learning Syllabus',
      description: 'Official OBTL Syllabus template compliant with CHED CMO 25 s. 2015',
      status: 'PUBLISHED',
      deadline_at: new Date('2026-10-30T23:59:59+08:00'),
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  async verifyProgramIsActive(programCode: string): Promise<{ exists: boolean; isActive: boolean }> {
    try {
      const res = await catalogPool.query('SELECT status FROM programs WHERE code = $1', [programCode]);
      if (res.rows.length === 0) return { exists: false, isActive: false };
      return { exists: true, isActive: res.rows[0].status === 'Active' };
    } catch {
      // In-memory fallback
      if (programCode === 'DOMT') return { exists: true, isActive: false }; // Phased out
      if (['BSIT', 'BSBA-HRM', 'BSBA-MM', 'BSENTREP'].includes(programCode)) return { exists: true, isActive: true };
      return { exists: false, isActive: false };
    }
  }

  async findAll(status?: RequirementStatus, programCode?: string, termCode?: string): Promise<Requirement[]> {
    try {
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
      const result = await requirementsPool.query(query, params);
      return result.rows.map(this.mapRowToRequirement);
    } catch {
      return this.inMemoryFallback.filter(r => {
        if (status && r.status !== status) return false;
        if (programCode && r.program_code !== programCode) return false;
        if (termCode && r.term_code !== termCode) return false;
        return true;
      });
    }
  }

  async findById(id: string): Promise<Requirement | null> {
    try {
      const result = await requirementsPool.query('SELECT * FROM requirements WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRowToRequirement(result.rows[0]);
    } catch {
      return this.inMemoryFallback.find(r => r.id === id) || null;
    }
  }

  async create(dto: CreateRequirementDto): Promise<Requirement> {
    try {
      const result = await requirementsPool.query(
        `INSERT INTO requirements (program_code, term_code, requirement_type, name, description, deadline_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
         RETURNING *`,
        [
          dto.program_code.trim(),
          dto.term_code.trim(),
          dto.requirement_type?.trim() || 'OBTL_SYLLABUS',
          dto.name.trim(),
          dto.description || null,
          dto.deadline_at ? new Date(dto.deadline_at) : null,
        ]
      );
      return this.mapRowToRequirement(result.rows[0]);
    } catch (err) {
      const created: Requirement = {
        id: 'req-' + Date.now().toString(16),
        program_code: dto.program_code.trim(),
        term_code: dto.term_code.trim(),
        requirement_type: dto.requirement_type?.trim() || 'OBTL_SYLLABUS',
        name: dto.name.trim(),
        description: dto.description,
        deadline_at: dto.deadline_at ? new Date(dto.deadline_at) : null,
        status: 'DRAFT',
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.inMemoryFallback.push(created);
      return created;
    }
  }

  async update(id: string, dto: UpdateRequirementDto): Promise<Requirement | null> {
    try {
      const result = await requirementsPool.query(
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
    } catch {
      const existing = this.inMemoryFallback.find(r => r.id === id);
      if (!existing) return null;
      if (dto.name) existing.name = dto.name;
      if (dto.description) existing.description = dto.description;
      if (dto.deadline_at) existing.deadline_at = new Date(dto.deadline_at);
      if (dto.status) existing.status = dto.status;
      existing.updated_at = new Date();
      return existing;
    }
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

export const requirementRepository = new RequirementRepository();
