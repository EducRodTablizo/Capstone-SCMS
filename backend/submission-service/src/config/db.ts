let PoolClass: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PoolClass = require('pg').Pool;
} catch {
  PoolClass = class FallbackPool {
    async query() {
      throw new Error('PostgreSQL driver not installed; using in-memory repository fallback');
    }
  };
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not installed; environment variables read from process.env directly
}

export const pool = new PoolClass({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.SUBMISSIONS_DB_PORT || '5437', 10),
  user: process.env.POSTGRES_USER || 'scms_admin',
  password: process.env.POSTGRES_PASSWORD || 'scms_secure_pass_2026',
  database: process.env.SUBMISSIONS_DB_NAME || 'sms_submissions',
  max: 10,
  idleTimeoutMillis: 30000,
});
