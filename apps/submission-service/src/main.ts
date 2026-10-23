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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server 3: Submission Service] running on port ${PORT}`);
  });
}

export default app;
