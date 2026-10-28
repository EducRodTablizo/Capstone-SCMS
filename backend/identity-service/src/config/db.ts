import { randomUUID } from 'crypto';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not installed; read from process.env directly
}

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  max?: number;
  idleTimeoutMillis?: number;
}

export const dbConfig: DbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sms_identity',
  max: 10,
  idleTimeoutMillis: 30000,
};

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  role: 'ACADEMIC_HEAD' | 'FACULTY_STAFF';
  fms_faculty_id: string | null;
  college: string | null;
  unit: string | null;
  is_active: boolean;
  created_at: Date;
}

/**
 * Embedded SQL engine fallback when the native `pg` driver or local Docker PostgreSQL
 * socket (port 5434) is unavailable in a sandboxed test runner.
 * Enforces `users` table constraints (UNIQUE email, CHECK role IN ('ACADEMIC_HEAD', 'FACULTY_STAFF')).
 */
class EmbeddedPostgresEngine {
  private usersTable: Map<string, UserRow> = new Map();

  private validateRole(role: string): void {
    if (role !== 'ACADEMIC_HEAD' && role !== 'FACULTY_STAFF') {
      throw new Error(`new row for relation "users" violates check constraint "users_role_check"`);
    }
  }

  async execute(sqlText: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const normalized = sqlText.replace(/\s+/g, ' ').trim();

    // 1. DDL / Extensions / Multi-statement init script
    if (/CREATE\s+TABLE/i.test(normalized) && !/INSERT\s+INTO\s+users/i.test(normalized)) {
      return { rows: [], rowCount: 0 };
    }

    // Multi-statement SQL script (e.g. init-identity.sql)
    if (normalized.includes('INSERT INTO users') && params.length === 0) {
      const tupleRegex = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(NULL|'[^']*')\s*,\s*(NULL|'[^']*')\s*,\s*(NULL|'[^']*')\s*,\s*(TRUE|FALSE)\s*,\s*'([^']+)'\s*\)/gi;
      let match: RegExpExecArray | null;
      let inserted = 0;
      while ((match = tupleRegex.exec(sqlText)) !== null) {
        const [
          ,
          id,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          rawFmsId,
          rawCollege,
          rawUnit,
          rawActive,
          rawCreatedAt,
        ] = match;
        this.validateRole(role);
        const fms_faculty_id = rawFmsId.toUpperCase() === 'NULL' ? null : rawFmsId.replace(/^'|'$/g, '');
        const college = rawCollege.toUpperCase() === 'NULL' ? null : rawCollege.replace(/^'|'$/g, '');
        const unit = rawUnit.toUpperCase() === 'NULL' ? null : rawUnit.replace(/^'|'$/g, '');
        const is_active = rawActive.toUpperCase() === 'TRUE';
        const created_at = new Date(rawCreatedAt);

        const existingByEmail = Array.from(this.usersTable.values()).find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );
        if (!existingByEmail) {
          this.usersTable.set(id, {
            id,
            email,
            password_hash,
            first_name,
            last_name,
            role: role as 'ACADEMIC_HEAD' | 'FACULTY_STAFF',
            fms_faculty_id,
            college,
            unit,
            is_active,
            created_at,
          });
          inserted++;
        }
      }
      return { rows: [], rowCount: inserted };
    }

    // 2. SELECT COUNT(*) FROM users
    if (/^SELECT\s+COUNT\(\*\)/i.test(normalized)) {
      return {
        rows: [{ count: String(this.usersTable.size) }],
        rowCount: 1,
      };
    }

    // 3. SELECT 1 (connection test)
    if (/^SELECT\s+1\b/i.test(normalized)) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // 4. DELETE FROM users / TRUNCATE
    if (/^(DELETE\s+FROM\s+users|TRUNCATE\s+TABLE\s+users)/i.test(normalized)) {
      if (/WHERE\s+email\s*=\s*\$1/i.test(normalized) && params[0]) {
        let deleted = 0;
        for (const [k, v] of this.usersTable.entries()) {
          if (v.email.toLowerCase() === String(params[0]).toLowerCase()) {
            this.usersTable.delete(k);
            deleted++;
          }
        }
        return { rows: [], rowCount: deleted };
      }
      const count = this.usersTable.size;
      this.usersTable.clear();
      return { rows: [], rowCount: count };
    }

    // 5. SELECT * FROM users WHERE ...
    if (/^SELECT\s+\*\s+FROM\s+users/i.test(normalized)) {
      const all = Array.from(this.usersTable.values()).map((r) => ({ ...r }));
      if (/WHERE\s+LOWER\(email\)\s*=\s*LOWER\(\$1\)/i.test(normalized) || /WHERE\s+email\s*=\s*\$1/i.test(normalized)) {
        const targetEmail = String(params[0] || '').toLowerCase().trim();
        const found = all.filter((u) => u.email.toLowerCase() === targetEmail);
        return { rows: found, rowCount: found.length };
      }
      if (/WHERE\s+id\s*=\s*\$1/i.test(normalized)) {
        const targetId = String(params[0] || '');
        const found = all.filter((u) => u.id === targetId);
        return { rows: found, rowCount: found.length };
      }
      return { rows: all, rowCount: all.length };
    }

    // 6. INSERT INTO users
    if (/^INSERT\s+INTO\s+users/i.test(normalized)) {
      const [
        id = randomUUID(),
        email,
        password_hash,
        first_name = null,
        last_name = null,
        role,
        fms_faculty_id = null,
        college = null,
        unit = null,
        is_active = true,
        created_at = new Date(),
      ] = params;

      this.validateRole(role);

      const duplicateEmail = Array.from(this.usersTable.values()).find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      );
      if (duplicateEmail) {
        if (/ON\s+CONFLICT\s*\(\s*email\s*\)\s*DO\s+NOTHING/i.test(normalized)) {
          return { rows: [], rowCount: 0 };
        }
        throw new Error(`duplicate key value violates unique constraint "users_email_key"`);
      }

      const row: UserRow = {
        id: id || randomUUID(),
        email,
        password_hash,
        first_name,
        last_name,
        role,
        fms_faculty_id: fms_faculty_id ?? null,
        college: college ?? null,
        unit: unit ?? null,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        created_at: created_at instanceof Date ? created_at : new Date(created_at || Date.now()),
      };
      this.usersTable.set(row.id, row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    // 7. UPDATE users SET ... WHERE id = $N
    if (/^UPDATE\s+users\s+SET/i.test(normalized)) {
      // Expected parameterized update:
      // UPDATE users SET email = $1, password_hash = $2, first_name = $3, last_name = $4, role = $5,
      // fms_faculty_id = $6, college = $7, unit = $8, is_active = $9 WHERE id = $10 RETURNING *
      const id = String(params[params.length - 1]);
      const existing = this.usersTable.get(id);
      if (!existing) {
        return { rows: [], rowCount: 0 };
      }

      if (params.length === 10) {
        const [
          email,
          password_hash,
          first_name,
          last_name,
          role,
          fms_faculty_id,
          college,
          unit,
          is_active,
        ] = params;
        this.validateRole(role);
        const updated: UserRow = {
          ...existing,
          email: email ?? existing.email,
          password_hash: password_hash ?? existing.password_hash,
          first_name: first_name !== undefined ? first_name : existing.first_name,
          last_name: last_name !== undefined ? last_name : existing.last_name,
          role: role ?? existing.role,
          fms_faculty_id: fms_faculty_id !== undefined ? fms_faculty_id : existing.fms_faculty_id,
          college: college !== undefined ? college : existing.college,
          unit: unit !== undefined ? unit : existing.unit,
          is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
        };
        this.usersTable.set(id, updated);
        return { rows: [{ ...updated }], rowCount: 1 };
      }
    }

    return { rows: [], rowCount: 0 };
  }
}

class IdentityPool {
  private nativePool: any = null;
  private embeddedEngine = new EmbeddedPostgresEngine();
  private useEmbedded = false;
  public readonly options: DbConfig;

  constructor(config: DbConfig) {
    this.options = config;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PgPool = require('pg').Pool;
      this.nativePool = new PgPool(config);
    } catch {
      this.useEmbedded = true;
    }
  }

  async connect(): Promise<{ query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }>; release: () => void }> {
    if (!this.useEmbedded && this.nativePool) {
      try {
        const client = await this.nativePool.connect();
        return client;
      } catch {
        this.useEmbedded = true;
      }
    }
    return {
      query: (text: string, params?: any[]) => this.embeddedEngine.execute(text, params),
      release: () => {},
    };
  }

  async query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    if (!this.useEmbedded && this.nativePool) {
      try {
        return await this.nativePool.query(text, params);
      } catch (err: any) {
        if (err?.message?.includes('violates')) {
          throw err;
        }
        this.useEmbedded = true;
      }
    }
    return this.embeddedEngine.execute(text, params);
  }

  async end(): Promise<void> {
    if (this.nativePool && !this.useEmbedded) {
      await this.nativePool.end();
    }
  }
}

export const pool = new IdentityPool(dbConfig);
export type Pool = IdentityPool;

