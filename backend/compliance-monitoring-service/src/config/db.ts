import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'scms_postgres_compliance',
  port: parseInt(process.env.DB_PORT || process.env.COMPLIANCE_DB_PORT || '5432', 10),
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.DB_NAME || process.env.COMPLIANCE_DB_NAME || 'sms_compliance',
  max: 10,
  idleTimeoutMillis: 30000,
});

export const REDIS_URI = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://scms-redis:6379';
