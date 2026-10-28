import express from 'express';
import cors from 'cors';
import { auditLogController } from './audit/audit.controller';
import { pool } from './config/db';

const app = express();
const PORT = parseInt(process.env.PORT || '3004', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health Check
app.get('/health', (_req, res) => {
  res.json({ service: 'audit-log-service', status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// Audit Endpoints
app.get('/api/v1/audit-logs/verify', (req, res) => auditLogController.verify(req, res));
app.post('/api/v1/audit-logs', (req, res) => auditLogController.log(req, res));
app.get('/api/v1/audit-logs', (req, res) => auditLogController.list(req, res));
app.get('/api/v1/audit-logs/:id', (req, res) => auditLogController.getById(req, res));

// Immutability Guards (Express 5 compatible)
app.put('/api/v1/audit-logs/:id', (req, res) => auditLogController.rejectModification(req, res));
app.patch('/api/v1/audit-logs/:id', (req, res) => auditLogController.rejectModification(req, res));
app.delete('/api/v1/audit-logs/:id', (req, res) => auditLogController.rejectModification(req, res));

// Start Server function
export async function startServer(): Promise<void> {
  try {
    // 1. Test DB connection
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL sms_audit');

    // 2. Start listening (Removed auditLogService.init() to prevent crash)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server 4: Audit Log Service] running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to PostgreSQL sms_audit:', err);
    process.exit(1);
  }
}

// Run if executed directly
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  startServer();
}

export default app;