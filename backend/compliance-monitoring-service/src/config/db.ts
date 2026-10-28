import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.COMPLIANCE_DB_PORT || '5439', 10),
  user: process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.COMPLIANCE_DB_NAME || 'sms_compliance',
  max: 10,
  idleTimeoutMillis: 30000,
});
