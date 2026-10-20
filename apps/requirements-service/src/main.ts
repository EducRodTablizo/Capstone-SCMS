import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requirementRouter } from './requirements/requirement.controller';

export const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'scms-requirements-service',
    port: PORT,
    timestamp: new Date(),
  });
});

// Mount routes
app.use('/api/v1/requirements', requirementRouter);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('=======================================================');
    console.log(`  SCMS Requirements Service running on port ${PORT}`);
    console.log('  Responsibilities: Program Requirement Definitions (SMS-004)');
    console.log('  Database: sms_requirements (Port 5436)');
    console.log('=======================================================');
  });
}
