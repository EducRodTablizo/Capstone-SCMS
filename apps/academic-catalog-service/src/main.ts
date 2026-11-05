import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { programRouter } from './programs/program.controller';
import { courseRouter } from './courses/course.controller';
import { curriculumRouter } from './curricula/curriculum.controller';
import { blockSectionRouter } from './block-sections/block-section.controller';
import { programRepository } from './programs/program.repository';
import { pool } from './config/db';

export const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'scms-academic-catalog-service',
    port: PORT,
    timestamp: new Date(),
  });
});

// SSOT Academic Catalog Routes (Sprint 1 & Sprint 2)
app.use('/api/v1/programs', programRouter);            // SMS-021: Academic Programs
app.use('/api/v1/courses', courseRouter);              // SMS-022: Course Master Catalogue
app.use('/api/v1/curricula', curriculumRouter);        // SMS-030: Curricula & Course Mappings
app.use('/api/v1/block-sections', blockSectionRouter); // SMS-031: Cohort Block Sections

export async function startServer(): Promise<void> {
  await pool.query('SELECT 1');
  await programRepository.init();
  console.log('Connected to PostgreSQL sms_catalog');

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log('=======================================================');
    console.log(`  SCMS Academic Catalog Service running on port ${PORT}`);
    console.log('  SSOT: Programs, Courses, Curricula, Block Sections');
    console.log('  User Stories: SMS-021, SMS-022, SMS-030, SMS-031');
    console.log('=======================================================');
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to connect to PostgreSQL sms_catalog:', err);
    process.exit(1);
  });
}
