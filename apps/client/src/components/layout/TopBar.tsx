import React from 'react'
import { Bell, Menu, Calendar, ShieldCheck, Wifi } from 'lucide-react'

interface TopBarProps {
  onToggleSidebar: () => void
  currentRole?: 'Academic Head' | 'Faculty Staff'
  isLiveConnected?: boolean
}

export function TopBar({
  onToggleSidebar,
  currentRole = 'Academic Head',
  isLiveConnected = true,
}: TopBarProps) {
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

        {/* Term Calendar Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-secondary" />
          <span>A.Y. 2026-2027 | 1st Semester</span>
        </div>

        {/* Role Badge (Two Roles Only) */}
        <div className="flex items-center gap-2 px-3 py-1 bg-[#EAF3DE] text-[#1D9E75] border border-[#1D9E75]/30 rounded-md text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{currentRole}</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-muted text-gray-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
            AH
          </div>
          <span className="text-xs font-semibold hidden md:inline text-gray-800">Academic Head</span>
        </div>
      </div>
    </header>
  )
}
