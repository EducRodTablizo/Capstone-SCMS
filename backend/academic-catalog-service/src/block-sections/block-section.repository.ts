import { Pool, pool } from '../config/db';
import {
  BlockSection,
  BlockSectionStatus,
  CreateBlockSectionDto,
  UpdateBlockSectionStatusDto,
} from './block-section.entity';

export class BlockSectionRepository {
  constructor(private readonly db: Pool = pool) {}

  async findAll(programId?: string, status?: BlockSectionStatus): Promise<BlockSection[]> {
    let query = 'SELECT * FROM block_sections WHERE 1=1';
    const params: any[] = [];
    if (programId) {
      params.push(programId);
      query += ` AND program_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    query += ' ORDER BY cohort_admission_year DESC, year_level ASC, section_number ASC';
    const result = await this.db.query(query, params);
    return (result.rows || []).map((r) => this.mapRowToSection(r));
  }

  async findById(id: string): Promise<BlockSection | null> {
    const result = await this.db.query('SELECT * FROM block_sections WHERE id = $1', [id]);
    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRowToSection(result.rows[0]);
  }

  async create(dto: CreateBlockSectionDto): Promise<BlockSection> {
    const result = await this.db.query(
      `INSERT INTO block_sections (program_id, cohort_admission_year, year_level, section_number, display_label, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dto.program_id,
        Number(dto.cohort_admission_year),
        Number(dto.year_level),
        Number(dto.section_number),
        dto.display_label.trim(),
        dto.status || 'Active',
      ]
    );
    return this.mapRowToSection(result.rows[0]);
  }

  async update(
    id: string,
    data: {
      year_level?: number;
      section_number?: number;
      display_label?: string;
      status?: BlockSectionStatus;
      merged_into_section_id?: string | null;
    }
  ): Promise<BlockSection | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.db.query(
      `UPDATE block_sections SET
        year_level = $1,
        section_number = $2,
        display_label = $3,
        status = $4,
        merged_into_section_id = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        data.year_level !== undefined ? Number(data.year_level) : existing.year_level,
        data.section_number !== undefined ? Number(data.section_number) : existing.section_number,
        data.display_label !== undefined ? data.display_label.trim() : existing.display_label,
        data.status !== undefined ? data.status : existing.status,
        data.merged_into_section_id !== undefined
          ? data.merged_into_section_id
          : existing.merged_into_section_id || null,
        id,
      ]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRowToSection(result.rows[0]);
  }

  async updateStatus(id: string, dto: UpdateBlockSectionStatusDto): Promise<BlockSection | null> {
    const result = await this.db.query(
      `UPDATE block_sections SET
        status = $1,
        merged_into_section_id = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [dto.status, dto.merged_into_section_id || null, id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRowToSection(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.db.query('DELETE FROM block_sections WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  private mapRowToSection(row: any): BlockSection {
    return {
      id: row.id,
      program_id: row.program_id,
      cohort_admission_year: Number(row.cohort_admission_year),
      year_level: Number(row.year_level),
      section_number: Number(row.section_number),
      display_label: row.display_label,
      status: row.status,
      merged_into_section_id: row.merged_into_section_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export const blockSectionRepository = new BlockSectionRepository(pool);
