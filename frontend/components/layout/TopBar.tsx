import React, { useState, useEffect } from 'react';
import { Bell, Menu, Calendar, ShieldCheck, Wifi, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { calendarService, AcademicTerm } from '../../services/calendarService';

interface TopBarProps {
  onToggleSidebar: () => void;
  currentRole?: 'Academic Head' | 'Faculty Staff';
  isLiveConnected?: boolean;
}

export function TopBar({
  onToggleSidebar,
  currentRole = 'Academic Head',
  isLiveConnected = true,
}: TopBarProps) {
  const { user, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);

  useEffect(() => {
    calendarService.getActiveTerm().then((term) => {
      if (term) setActiveTerm(term);
    });
  }, []);

  const handleToggleRole = () => {
    if (user?.role === 'ACADEMIC_HEAD') {
      switchRole('FACULTY_STAFF');
    } else {
      switchRole('ACADEMIC_HEAD');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md hover:bg-muted text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-lg text-primary tracking-tight">SCMS</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">/</span>
          <span className="text-xs sm:text-sm font-medium text-foreground">Syllabus Compliance Monitoring</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-Time Live Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
          <Wifi className="w-3 h-3 text-green-600 animate-pulse" />
          <span>{isLiveConnected ? 'Live Updates Active' : 'Connecting...'}</span>
        </div>

        {/* Term Calendar Indicator (SMS-018: Academic Term SSOT from CCMS) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-secondary" />
          <span>{activeTerm ? activeTerm.display_label : 'A.Y. 2026-2027 | 1st Semester'}</span>
        </div>

        {/* Role Badge (Clickable to switch demo role for testing) */}
        <button
          onClick={handleToggleRole}
          title="Click to toggle between Academic Head and Faculty Staff view"
          className="flex items-center gap-1.5 px-3 py-1 bg-[#EAF3DE] hover:bg-[#d6ebd3] text-[#1D9E75] border border-[#1D9E75]/30 rounded-md text-xs font-bold transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{user?.role === 'FACULTY_STAFF' ? 'Faculty Staff' : 'Academic Head'}</span>
          <span className="text-[10px] text-gray-500 font-normal ml-0.5">(Switch)</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-muted text-gray-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-[#580000] text-white flex items-center justify-center font-bold text-xs">
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
              : 'AH'}
          </div>
          <span className="text-xs font-semibold hidden md:inline text-gray-800">
            {user?.name || currentRole}
          </span>
          <button
            onClick={handleLogout}
            title="Sign out of SCMS"
            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-700 transition-colors ml-1"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
