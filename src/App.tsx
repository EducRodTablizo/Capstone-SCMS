import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { CoursesPage } from './pages/CoursesPage';
import { BlockSectionsPage } from './pages/BlockSectionsPage';
import { SyllabusUploadPage } from './pages/SyllabusUploadPage';
import { SubmissionDetailPage } from './pages/SubmissionDetailPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Authentication Route (Sprint 1) */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/programs" replace /> : <LoginPage />}
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected System Layout */}
      <Route
        element={
          isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />
        }
      >
        {/* Common Authenticated Routes */}
        <Route path="/" element={<Navigate to="/programs" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/live-compliance" element={<DashboardPage />} />

        {/* Academic Catalog Core (Sprint 1 & Sprint 2) */}
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/academic-programs" element={<ProgramsPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/block-sections" element={<BlockSectionsPage />} />

        {/* Requirements & Deadlines (Sprint 2: SMS-004) */}
        <Route path="/requirements" element={<RequirementsPage />} />

        {/* Action Audit Trail (SMS-014) */}
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
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
