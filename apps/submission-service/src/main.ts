import express from 'express';
import cors from 'cors';
import { submissionController } from './submissions/submission.controller';

const app = express();
const PORT = parseInt(process.env.PORT || '3003', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Health
app.get('/health', (req, res) => {
  res.json({ service: 'submission-service', status: 'OK', port: PORT, timestamp: new Date().toISOString() });
});

// Sprint 4 & Sprint 5 Endpoints
app.post('/api/v1/submissions', (req, res) => submissionController.submit(req, res));
app.get('/api/v1/submissions', (req, res) => submissionController.list(req, res));
app.get('/api/v1/submissions/:id', (req, res) => submissionController.getById(req, res));
app.patch('/api/v1/submissions/:id/open-review', (req, res) => submissionController.openReview(req, res));
app.post('/api/v1/submissions/:id/review', (req, res) => submissionController.review(req, res));
app.post('/api/v1/submissions/:id/resubmit', (req, res) => submissionController.resubmit(req, res));
app.get('/api/v1/submissions/:id/versions', (req, res) => submissionController.getVersions(req, res));
app.get('/api/v1/submissions/:id/file', (req, res) => submissionController.downloadFile(req, res));
app.get('/api/v1/submissions/:id/preview', (req, res) => submissionController.getPreview(req, res));

// Sprint 7 Endpoints (SMS-023, SMS-025, SMS-035)
app.get('/api/v1/submissions/:id/pdf', (req, res) => submissionController.downloadPdf(req, res));
app.get('/api/v1/signatories', (req, res) => submissionController.getSignatories(req, res));
app.put('/api/v1/signatories', (req, res) => submissionController.updateSignatories(req, res));
app.post('/api/v1/integrations/fms/assignments/reassign', (req, res) => submissionController.reassignAssignment(req, res));
app.post('/api/v1/integrations/fms/assignments/withdraw', (req, res) => submissionController.withdrawAssignment(req, res));
app.post('/api/v1/integrations/fms/assignments/substitute', (req, res) => submissionController.assignSubstitute(req, res));

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server 3: Submission Service] running on port ${PORT}`);
  });
}

export default app;
