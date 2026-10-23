import express from 'express';
import cors from 'cors';
import { auditLogController } from './audit/audit.controller';

const app = express();
const PORT = parseInt(process.env.PORT || '3004', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health
app.get('/health', (req, res) => {
  res.json({ service: 'audit-log-service', status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// Audit Endpoints (SCMS-014 & SCMS-015)
app.post('/api/v1/audit/logs', (req, res) => auditLogController.log(req, res));
app.get('/api/v1/audit/logs', (req, res) => auditLogController.list(req, res));
app.get('/api/v1/audit/logs/:id', (req, res) => auditLogController.getById(req, res));

// Strict Read-Only Guards: Disallow PUT, PATCH, DELETE (SCMS-015 AC 2)
app.put('/api/v1/audit/*', (req, res) => auditLogController.rejectModification(req, res));
app.patch('/api/v1/audit/*', (req, res) => auditLogController.rejectModification(req, res));
app.delete('/api/v1/audit/*', (req, res) => auditLogController.rejectModification(req, res));

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server 4: Audit Log Service] running on port ${PORT}`);
  });
}

export default app;
