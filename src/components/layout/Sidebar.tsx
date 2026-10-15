import React from 'react'
import {
  FileText,
  CheckSquare,
  Activity,
  Calendar,
  History,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentPath?: string
  role?: 'Academic Head' | 'Faculty Staff'
}

export function Sidebar({
  collapsed,
  onToggle,
  currentPath = '/live-compliance',
  role = 'Academic Head',
}: SidebarProps) {
  // Navigation sections strictly scoped to the 2 user roles
  const navSections =
    role === 'Academic Head'
      ? [
          {
            group: 'Live Monitoring',
            items: [
              { label: 'Live Compliance View', path: '/live-compliance', icon: Activity },
              { label: 'Review Queue', path: '/reviews', icon: CheckSquare },
              { label: 'Requirements & Deadlines', path: '/requirements', icon: Calendar },
            ],
          },
          {
            group: 'Audit & Accountability',
            items: [
              { label: 'Action Audit Trail', path: '/audit-trail', icon: History },
            ],
          },
          {
            group: 'External Integrations',
            items: [
              { label: 'FMS Profile Lookup', path: '/fms-sync', icon: Shield },
              { label: 'CCMS Status Summary', path: '/ccms-feed', icon: ExternalLink },
            ],
          },
        ]
      : [
          {
            group: 'Faculty Submissions',
            items: [
              { label: 'My Assigned Requirements', path: '/submissions', icon: FileText },
              { label: 'Submit Syllabus', path: '/submit', icon: Layers },
              { label: 'Review Status & Feedback', path: '/my-status', icon: Activity },
            ],
          },
        ]

  return (
    <aside
      className={cn(
        'bg-[#580000] text-white flex flex-col transition-all duration-300 ease-in-out border-r border-[#4a0000] z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#4a0000]">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg text-white tracking-wide">PUPQC SCMS</span>
            <span className="text-[10px] text-[#C8960C] font-semibold tracking-wider uppercase">
              Compliance Monitoring
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded bg-[#7a0c0c] hover:bg-[#8f1010] text-[#C8960C] mx-auto transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 overflow-y-auto space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="px-2">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#C8960C] mb-2 opacity-90">
                {section.group}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.path
                return (
                  <li key={item.path}>
                    <a
                      href={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#7a0c0c] text-white border-l-4 border-[#C8960C] shadow-sm'
                          : 'text-gray-200 hover:bg-[#7a0c0c]/60 hover:text-white',
                        collapsed && 'justify-center px-0'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#C8960C]' : 'text-gray-300')} />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Institutional Branding Footer Tag */}
      {!collapsed && (
        <div className="p-4 border-t border-[#4a0000] bg-[#4a0000]/40 text-[11px] text-gray-300">
          <p className="font-semibold text-white">Office of the Academic Head</p>
          <p className="text-[10px] text-gray-300">PUP Quezon City Campus</p>
        </div>
      )}
    </aside>
  )
}
