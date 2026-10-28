import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { muiTheme } from '../../theme/muiTheme';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PupFooter } from './PupFooter';
import { useAuth } from '../../auth/AuthContext';

interface AppLayoutProps {
  children?: React.ReactNode;
  currentPath?: string;
  currentRole?: 'Academic Head' | 'Faculty Staff';
}

export function AppLayout({
  children,
  currentPath: propPath,
  currentRole: propRole,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const currentPath = propPath || location.pathname;
  const currentRole =
    propRole || (user?.role === 'FACULTY_STAFF' ? 'Faculty Staff' : 'Academic Head');

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className="flex h-screen bg-[#F5F7FA] text-[#0F172A] overflow-hidden font-sans">
        {/* Persistent Collapsible Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentPath={currentPath}
          role={currentRole}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* TopBar Header */}
          <TopBar
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentRole={currentRole}
          />

          {/* Scrollable Page Body */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {children ?? <Outlet />}
          </main>

          {/* Institutional Branding Footer */}
          <PupFooter />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default AppLayout;
