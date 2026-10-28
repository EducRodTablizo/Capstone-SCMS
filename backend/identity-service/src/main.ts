import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './auth/auth.controller';
import { userRepository } from './users/user.repository';

export const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'scms-identity-service', timestamp: new Date() });
});

// Mount Auth routes under /api/v1/auth
app.use('/api/v1/auth', authRouter);

// Start server if run directly
if (require.main === module) {
  userRepository.init().then(() => {
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  SCMS Identity & Access Service running on port ${PORT}`);
      console.log(`  Institution: PUPQC - Syllabus Compliance Monitoring`);
      console.log(`=======================================================`);
    });
  });
}
