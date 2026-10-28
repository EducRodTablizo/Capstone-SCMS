import { Pool, pool } from '../config/db';
import { Program, ProgramStatus } from './program.entity';
import { randomUUID } from 'crypto';

export class ProgramRepository {
  private isInitialized = false;

  constructor(private readonly db: Pool = pool) {}

  async init(): Promise<void> {
    if (this.isInitialized) return;
    const client = await this.db.connect();
    try {
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE TABLE IF NOT EXISTS programs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Phased out')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.isInitialized = true;
      console.log('Connected to PostgreSQL sms_catalog');
    } finally {
      client.release();
    }
  }

  private mapRowToProgram(row: any): Program {
    return {
      id: row.id,
      code: row.code,
      title: row.title ?? row.name,
      description: row.description || '',
      status: row.status as ProgramStatus,
      created_at:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  }

  async findAll(statusFilter?: ProgramStatus): Promise<Program[]> {
    await this.init();
    let query =
      'SELECT id, code, name as title, description, status, created_at, updated_at FROM programs';
    const params: any[] = [];
    if (statusFilter) {
      query += ' WHERE status = $1';
      params.push(statusFilter);
    }
    query += ' ORDER BY code ASC';
    const res = await this.db.query(query, params);
    return (res.rows || []).map((r) => this.mapRowToProgram(r));
  }

  async findById(id: string): Promise<Program | null> {
    await this.init();
    const res = await this.db.query(
      'SELECT id, code, name as title, description, status, created_at, updated_at FROM programs WHERE id = $1',
      [id]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return this.mapRowToProgram(res.rows[0]);
  }

  async findByCode(code: string): Promise<Program | null> {
    await this.init();
    const normalized = code.trim().toUpperCase();
    const res = await this.db.query(
      'SELECT id, code, name as title, description, status, created_at, updated_at FROM programs WHERE UPPER(code) = $1',
      [normalized]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return this.mapRowToProgram(res.rows[0]);
  }

  async create(data: {
    code: string;
    title: string;
    description?: string;
    status?: ProgramStatus;
  }): Promise<Program> {
    await this.init();
    const code = data.code.trim().toUpperCase();
    const title = data.title.trim();
    const status = data.status || 'Active';
    const description = data.description || '';
    const now = new Date().toISOString();
    const id = randomUUID();

    const res = await this.db.query(
      `INSERT INTO programs (id, code, name, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING id, code, name as title, description, status, created_at, updated_at`,
      [id, code, title, description, status, now]
    );

    return this.mapRowToProgram(res.rows[0]);
  }

  async update(
    id: string,
    data: { title?: string; description?: string; status?: ProgramStatus }
  ): Promise<Program | null> {
    await this.init();
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newTitle = data.title !== undefined ? data.title.trim() : existing.title;
    const newDesc =
      data.description !== undefined ? data.description.trim() : existing.description || '';
    const newStatus = data.status !== undefined ? data.status : existing.status;

    const res = await this.db.query(
      `UPDATE programs
       SET name = $1, description = $2, status = $3, updated_at = $4
       WHERE id = $5
       RETURNING id, code, name as title, description, status, created_at, updated_at`,
      [newTitle, newDesc, newStatus, now, id]
    );

    if (!res.rows || res.rows.length === 0) return null;
    return this.mapRowToProgram(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const res = await this.db.query('DELETE FROM programs WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }
}

export const programRepository = new ProgramRepository(pool);
