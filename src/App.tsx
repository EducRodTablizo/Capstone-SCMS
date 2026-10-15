import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RoleGuard } from './auth/RoleGuard';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequirementsPage } from './pages/RequirementsPage';
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
          <Route
            element={
              <AppLayout>
                <div />
              </AppLayout>
            }
          >
            {/* Common Authenticated Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Faculty Staff Submission Routes */}
            <Route
              path="/submissions/new"
              element={
                <RoleGuard allowedRoles={['FACULTY_STAFF']}>
                  <SyllabusUploadPage />
                </RoleGuard>
              }
            />

            {/* Academic Head Administrative Routes */}
            <Route
              path="/requirements"
              element={
                <RoleGuard allowedRoles={['ACADEMIC_HEAD']}>
                  <RequirementsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/submissions/:id/review"
              element={
                <RoleGuard allowedRoles={['ACADEMIC_HEAD']}>
                  <SubmissionDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <RoleGuard allowedRoles={['ACADEMIC_HEAD']}>
                  <AuditLogPage />
                </RoleGuard>
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
