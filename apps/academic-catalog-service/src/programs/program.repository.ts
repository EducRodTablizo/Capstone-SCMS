import { pool } from '../config/db';
import { Program, ProgramStatus } from './program.entity';
import { randomUUID } from 'crypto';

class ProgramRepository {
  private inMemoryFallback: Program[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'BSIT',
      title: 'Bachelor of Science in Information Technology',
      description: 'College of Computer and Information Sciences',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'BSBA-HRM',
      title: 'Bachelor of Science in Business Administration Major in Human Resource Management',
      description: 'College of Business Administration',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      code: 'BSBA-MM',
      title: 'Bachelor of Science in Business Administration Major in Marketing Management',
      description: 'College of Business Administration',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      code: 'BSENTREP',
      title: 'Bachelor of Science in Entrepreneurship',
      description: 'College of Business Administration',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      code: 'DOMT',
      title: 'Diploma in Office Management Technology',
      description: 'College of Communication',
      status: 'Phased out',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  private useMemory = false;

  async init(): Promise<void> {
    try {
      const client = await pool.connect();
      // Ensure table and columns exist
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
      // Seed default programs if table is empty
      const countRes = await client.query('SELECT COUNT(*) FROM programs');
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        for (const p of this.inMemoryFallback) {
          await client.query(`
            INSERT INTO programs (id, code, name, description, status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (code) DO NOTHING
          `, [p.id, p.code, p.title, p.description || '', p.status]);
        }
      }
      client.release();
      this.useMemory = false;
      console.log('Connected to PostgreSQL for programs storage');
    } catch (err) {
      console.warn('PostgreSQL connection failed. Using in-memory programs repository fallback.');
      this.useMemory = true;
    }
  }

  async findAll(statusFilter?: ProgramStatus): Promise<Program[]> {
    if (!this.useMemory) {
      try {
        let query = 'SELECT id, code, name as title, description, status, created_at, updated_at FROM programs';
        const params: any[] = [];
        if (statusFilter) {
          query += ' WHERE status = $1';
          params.push(statusFilter);
        }
        query += ' ORDER BY code ASC';
        const res = await pool.query(query, params);
        return res.rows;
      } catch {
        this.useMemory = true;
      }
    }
    let list = [...this.inMemoryFallback];
    if (statusFilter) {
      list = list.filter(p => p.status === statusFilter);
    }
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }

  async findById(id: string): Promise<Program | null> {
    if (!this.useMemory) {
      try {
        const res = await pool.query(
          'SELECT id, code, name as title, description, status, created_at, updated_at FROM programs WHERE id = $1',
          [id]
        );
        return res.rows[0] || null;
      } catch {
        this.useMemory = true;
      }
    }
    return this.inMemoryFallback.find(p => p.id === id) || null;
  }

  async findByCode(code: string): Promise<Program | null> {
    const normalized = code.trim().toUpperCase();
    if (!this.useMemory) {
      try {
        const res = await pool.query(
          'SELECT id, code, name as title, description, status, created_at, updated_at FROM programs WHERE UPPER(code) = $1',
          [normalized]
        );
        return res.rows[0] || null;
      } catch {
        this.useMemory = true;
      }
    }
    return this.inMemoryFallback.find(p => p.code.toUpperCase() === normalized) || null;
  }

  async create(data: { code: string; title: string; description?: string; status?: ProgramStatus }): Promise<Program> {
    const code = data.code.trim().toUpperCase();
    const title = data.title.trim();
    const status = data.status || 'Active';
    const description = data.description || '';
    const now = new Date().toISOString();
    const id = randomUUID();

    if (!this.useMemory) {
      try {
        const res = await pool.query(`
          INSERT INTO programs (id, code, name, description, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $6)
          RETURNING id, code, name as title, description, status, created_at, updated_at
        `, [id, code, title, description, status, now]);
        return res.rows[0];
      } catch {
        this.useMemory = true;
      }
    }

    const created: Program = {
      id,
      code,
      title,
      description,
      status,
      created_at: now,
      updated_at: now,
    };
    this.inMemoryFallback.push(created);
    return created;
  }

  async update(id: string, data: { title?: string; description?: string; status?: ProgramStatus }): Promise<Program | null> {
    const now = new Date().toISOString();
    if (!this.useMemory) {
      try {
        const existing = await this.findById(id);
        if (!existing) return null;

        const newTitle = data.title !== undefined ? data.title.trim() : existing.title;
        const newDesc = data.description !== undefined ? data.description.trim() : (existing.description || '');
        const newStatus = data.status !== undefined ? data.status : existing.status;

        const res = await pool.query(`
          UPDATE programs
          SET name = $1, description = $2, status = $3, updated_at = $4
          WHERE id = $5
          RETURNING id, code, name as title, description, status, created_at, updated_at
        `, [newTitle, newDesc, newStatus, now, id]);

        return res.rows[0] || null;
      } catch {
        this.useMemory = true;
      }
    }

    const index = this.inMemoryFallback.findIndex(p => p.id === id);
    if (index === -1) return null;

    const current = this.inMemoryFallback[index];
    const updated: Program = {
      ...current,
      title: data.title !== undefined ? data.title.trim() : current.title,
      description: data.description !== undefined ? data.description.trim() : current.description,
      status: data.status !== undefined ? data.status : current.status,
      updated_at: now,
    };
    this.inMemoryFallback[index] = updated;
    return updated;
  }
}

export const programRepository = new ProgramRepository();
