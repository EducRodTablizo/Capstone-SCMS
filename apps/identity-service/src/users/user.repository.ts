import { Pool, pool } from '../config/db';
import { User, UserRole } from './user.entity';

const SEED_USERS_SQL = `
INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  fms_faculty_id,
  college,
  unit,
  is_active,
  created_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'academic.head@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$AcademicHead2026HashV19x8QpL2mN9vR4tY7wZ1kC',
    'Dr. Maria',
    'Santos',
    'ACADEMIC_HEAD',
    NULL,
    'Office of Academic Affairs',
    'PUP Quezon City Campus',
    TRUE,
    '2026-01-01 00:00:00'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'faculty.donayre@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$Faculty2026HashV19m5Kj8nB3vX6zL1qW4eR9tY2uI',
    'Prof. Juan',
    'Donayre',
    'FACULTY_STAFF',
    'FMS-PUPQC-0492',
    'College of Computer and Information Sciences',
    'Information Technology Department',
    TRUE,
    '2026-01-15 00:00:00'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'faculty.tablizo@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$Faculty2026HashV19m5Kj8nB3vX6zL1qW4eR9tY2uI',
    'Prof. Rod',
    'Tablizo',
    'FACULTY_STAFF',
    'FMS-PUPQC-0581',
    'College of Education',
    'Secondary Education Department',
    TRUE,
    '2026-01-20 00:00:00'
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = TRUE;
`;

export class UserRepository {
  private isInitialized = false;

  constructor(private readonly db: Pool = pool) {}

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      first_name: row.first_name,
      last_name: row.last_name,
      role: row.role as UserRole,
      fms_faculty_id: row.fms_faculty_id || undefined,
      college: row.college || undefined,
      unit: row.unit || undefined,
      is_active: Boolean(row.is_active),
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    };
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    const client = await this.db.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(50) CHECK (role IN ('ACADEMIC_HEAD', 'FACULTY_STAFF')),
          fms_faculty_id VARCHAR(255),
          college VARCHAR(255),
          unit VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Ensure canonical seed users exist and have updated password hashes and active status
      await client.query(SEED_USERS_SQL);

      this.isInitialized = true;
      console.log('Connected to PostgreSQL sms_identity and synchronized seed accounts');
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.init();
    const normalized = email.toLowerCase().trim();
    const res = await this.db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [normalized]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    await this.init();
    const res = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  async create(user: User): Promise<User> {
    await this.init();
    const res = await this.db.query(
      `INSERT INTO users (
        id, email, password_hash, first_name, last_name, role,
        fms_faculty_id, college, unit, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        user.id,
        user.email.trim(),
        user.password_hash,
        user.first_name,
        user.last_name,
        user.role,
        user.fms_faculty_id ?? null,
        user.college ?? null,
        user.unit ?? null,
        user.is_active,
        user.created_at || new Date(),
      ]
    );
    return this.mapRowToUser(res.rows[0]);
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    await this.init();
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged: User = {
      ...existing,
      ...updates,
      id: existing.id,
    };

    const res = await this.db.query(
      `UPDATE users
       SET email = $1,
           password_hash = $2,
           first_name = $3,
           last_name = $4,
           role = $5,
           fms_faculty_id = $6,
           college = $7,
           unit = $8,
           is_active = $9
       WHERE id = $10
       RETURNING *`,
      [
        merged.email,
        merged.password_hash,
        merged.first_name,
        merged.last_name,
        merged.role,
        merged.fms_faculty_id ?? null,
        merged.college ?? null,
        merged.unit ?? null,
        merged.is_active,
        id,
      ]
    );

    if (!res.rows || res.rows.length === 0) return null;
    return this.mapRowToUser(res.rows[0]);
  }

  async getAllUsers(): Promise<User[]> {
    await this.init();
    const res = await this.db.query('SELECT * FROM users ORDER BY created_at ASC');
    return (res.rows || []).map((r) => this.mapRowToUser(r));
  }
}

export const userRepository = new UserRepository(pool);
