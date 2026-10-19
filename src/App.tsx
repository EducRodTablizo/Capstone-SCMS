import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { SyllabusUploadPage } from './pages/SyllabusUploadPage';
import { SubmissionDetailPage } from './pages/SubmissionDetailPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route (Sprint 1) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected System Layout */}
          <Route element={<AppLayout />}>
            {/* Common Authenticated Routes */}
            <Route path="/" element={<Navigate to="/requirements" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/live-compliance" element={<DashboardPage />} />

            {/* Requirements & Deadlines (Sprint 2: SCMS-004, SCMS-005) */}
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/academic-programs" element={<ProgramsPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />

            {/* Action Audit Trail (Sprint 2: SCMS-014) */}
            <Route path="/audit-trail" element={<AuditLogPage />} />
            <Route path="/audit-logs" element={<AuditLogPage />} />

            {/* Submission & Review Routes */}
            <Route path="/reviews" element={<DashboardPage />} />
            <Route path="/submit" element={<SyllabusUploadPage />} />
            <Route path="/submissions/new" element={<SyllabusUploadPage />} />
            <Route path="/submissions/:id/review" element={<SubmissionDetailPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
