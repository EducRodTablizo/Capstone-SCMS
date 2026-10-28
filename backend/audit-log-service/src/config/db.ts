import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.AUDIT_DB_PORT || '5438', 10),
  user: process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.AUDIT_DB_NAME || 'sms_audit',
  max: 10,
  idleTimeoutMillis: 30000,
});
