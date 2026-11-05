import { Pool } from 'pg';
import path from 'path';
import * as dotenv from 'dotenv';

// Load both local service .env and root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;
const isNeon = connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require');

export const pool = connectionString
  ? new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
  })
  : new Pool({
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'scms_postgres_compliance',
    port: parseInt(process.env.DB_PORT || process.env.COMPLIANCE_DB_PORT || '5432', 10),
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'scms_admin',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
    database: process.env.DB_NAME || process.env.COMPLIANCE_DB_NAME || 'sms_compliance',
    max: 10,
    idleTimeoutMillis: 30000,
  });

export const REDIS_URI = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://scms-redis:6379';
