import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { programRouter } from './programs/program.controller';
import { programRepository } from './programs/program.repository';

export const app = express();
const PORT = process.env.PORT || 3006;

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
    service: 'scms-academic-catalog-service', 
    port: PORT,
    timestamp: new Date() 
  });
});

// Mount Program routes under /api/v1/programs (SMS-021)
app.use('/api/v1/programs', programRouter);

if (require.main === module) {
  programRepository.init().then(() => {
    app.listen(PORT, () => {
      console.log('=======================================================');
      console.log(`  SCMS Academic Catalog Service running on port ${PORT}`);
      console.log('  SSOT: Programs, Courses, Curricula, Block Sections');
      console.log('  User Stories: SMS-021, SMS-022, SMS-030, SMS-031');
      console.log('=======================================================');
    });
  });
}
