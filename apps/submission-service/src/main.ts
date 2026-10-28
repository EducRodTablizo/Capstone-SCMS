import express from 'express';
import cors from 'cors';
import { auditLogController } from './audit/audit.controller';
import { auditLogService } from './audit/audit.service';
import { pool } from './config/db';

const app = express();
const PORT = parseInt(process.env.PORT || '3004', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health Check
app.get('/health', (_req, res) => {
  res.json({ service: 'audit-log-service', status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// Audit Log Endpoints
app.post('/api/v1/audit-logs', (req, res) => auditLogController.log(req, res));
app.get('/api/v1/audit-logs', (req, res) => auditLogController.list(req, res));
app.get('/api/v1/audit-logs/verify', (req, res) => {
  try {
    const isValid = auditLogService.verifyChain();
    res.status(200).json({ valid: isValid, message: isValid ? 'Chain is valid' : 'Chain is broken' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Express 5 Compatible Routes for Immutability Guards (SMS-014 AC 2)
// Note: Using ':id' instead of '*' to support Express 5 path-to-regexp
app.put('/api/v1/audit-logs/:id', (req, res) => auditLogController.rejectModification(req, res));
app.patch('/api/v1/audit-logs/:id', (req, res) => auditLogController.rejectModification(req, res));
app.delete('/api/v1/audit-logs/:id', (req, res) => auditLogController.rejectModification(req, res));

// Fallback for GET /:id (Read-only)
app.get('/api/v1/audit-logs/:id', (req, res) => auditLogController.getById(req, res));

export async function startServer(): Promise<void> {
  try {
    // Verify PostgreSQL connection
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL sms_audit');

    // Initialize the audit service (loads hash chain or starts fresh)
    await auditLogService.init();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server 4: Audit Log Service] running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Audit Log Service:', err);
    process.exit(1);
  }
}

// Only start server if this file is run directly
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  startServer();
}

export default app;