import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { complianceController } from './compliance/compliance.controller';
import { complianceService } from './compliance/compliance.service';

const app = express();
const PORT = parseInt(process.env.PORT || '3005', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/health', (req, res) => {
  res.json({ service: 'compliance-monitoring-service', status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// REST Endpoints (SMS-012, SMS-024)
app.get('/api/v1/compliance/metrics', (req, res) => complianceController.getMetrics(req, res));
app.get('/api/v1/compliance/records', (req, res) => complianceController.listRecords(req, res));
app.post('/api/v1/compliance/evaluate-overdue', (req, res) => complianceController.evaluateOverdue(req, res));
app.get('/api/v1/compliance/syllabus-header/:assignmentId', (req, res) => complianceController.getSyllabusHeader(req, res));

// Event Ingestion with WebSocket Broadcast (SMS-013)
app.post('/api/v1/compliance/events', async (req, res) => {
  try {
    const { courseCode, sectionLabel, status, submissionId, fileName, versionLabel, submittedAt } = req.body;
    const updated = await complianceService.handleStatusEvent({
      courseCode,
      sectionLabel,
      status,
      submissionId,
      fileName,
      versionLabel,
      submittedAt
    });

    // Broadcast event to all WebSocket clients (SMS-013 AC 1 & AC 3)
    broadcast({
      type: 'STATUS_UPDATED',
      payload: updated
    });

    const refreshedMetrics = await complianceService.getMetrics();
    broadcast({
      type: 'METRICS_REFRESHED',
      payload: refreshedMetrics
    });

    res.json({ success: true, data: updated, metrics: refreshedMetrics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sprint 7 Endpoints (SMS-019, SMS-023, SMS-037)
app.get('/api/v1/compliance/export/csv', (req, res) => complianceController.exportCsv(req, res));
app.get('/api/v1/compliance/export/pdf', (req, res) => complianceController.exportPdf(req, res));
app.get('/api/v1/compliance/ccms/summary', (req, res) => complianceController.getCcmsSummary(req, res));
app.post('/api/v1/compliance/ccms/push', (req, res) => complianceController.pushCcmsSummary(req, res));
app.get('/api/v1/compliance/ccms/logs', (req, res) => complianceController.getCcmsPushLogs(req, res));
app.post('/api/v1/integrations/fms/assignments/reassign', (req, res) => complianceController.syncReassignment(req, res));
app.post('/api/v1/integrations/fms/assignments/withdraw', (req, res) => complianceController.syncWithdrawal(req, res));

const server = http.createServer(app);

// WebSocket Gateway Server (SMS-013)
const wss = new WebSocketServer({ server, path: '/ws' });

const connectedClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  connectedClients.add(ws);
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to SCMS Live Compliance Gateway' }));

  ws.on('close', () => {
    connectedClients.delete(ws);
  });
});

export function broadcast(message: object) {
  const data = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server 5: Compliance Monitoring Service] running on port ${PORT} (WS on /ws)`);
  });
}

export default app;
