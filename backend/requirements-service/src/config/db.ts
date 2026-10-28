import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Primary Requirements Database (Port 5436)
export const requirementsPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.REQUIREMENTS_DB_PORT || '5436', 10),
  user: process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.REQUIREMENTS_DB_NAME || 'sms_requirements',
  max: 10,
  idleTimeoutMillis: 30000,
});

// Read-only Catalog Database connection for active program verification (Port 5435)
export const catalogPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.CATALOG_DB_PORT || '5435', 10),
  user: process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.CATALOG_DB_NAME || 'sms_catalog',
  max: 5,
  idleTimeoutMillis: 30000,
});
