import React from 'react'
import { Chip } from '@mui/material'
import { Clock, PlayCircle, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, UploadCloud } from 'lucide-react'

export type ComplianceStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'returned'
  | 'resubmitted'
  | 'approved'
  | 'overdue'
  | 'unassigned'
  | 'pending'
  | 'in_progress'
  | 'completed'

interface StatusBadgeProps {
  status: ComplianceStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    not_submitted: {
      label: 'Not Submitted',
      icon: <Clock style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: 'rgba(75, 85, 99, 0.3)', fontWeight: 600 },
    },
    submitted: {
      label: 'Submitted',
      icon: <UploadCloud style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.3)', fontWeight: 600 },
    },
    under_review: {
      label: 'Under Review',
      icon: <PlayCircle style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: 'rgba(29, 78, 216, 0.3)', fontWeight: 600 },
    },
    returned: {
      label: 'Returned for Revision',
      icon: <AlertCircle style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'rgba(186, 117, 23, 0.3)', fontWeight: 600 },
    },
    resubmitted: {
      label: 'Resubmitted',
      icon: <RefreshCw style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: '#ede9fe', color: '#7c3aed', borderColor: 'rgba(124, 58, 237, 0.3)', fontWeight: 600 },
    },
    approved: {
      label: 'Approved',
      icon: <CheckCircle2 style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderColor: 'rgba(29, 158, 117, 0.3)', fontWeight: 600 },
    },
        unassigned: {
      label: 'Unassigned',
      icon: <Clock style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: '#f3e8ff', color: '#7c3aed', borderColor: 'rgba(124, 58, 237, 0.3)', fontWeight: 600 },
    },
    overdue: {
      label: 'Overdue',
      icon: <AlertTriangle style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderColor: 'rgba(226, 75, 74, 0.3)', fontWeight: 600 },
    },
    pending: {
      label: 'Pending',
      icon: <Clock style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'rgba(186, 117, 23, 0.3)', fontWeight: 600 },
    },
    in_progress: {
      label: 'In Progress',
      icon: <PlayCircle style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.3)', fontWeight: 600 },
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 style={{ width: 14, height: 14 }} />,
      style: { backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderColor: 'rgba(29, 158, 117, 0.3)', fontWeight: 600 },
    },
  }[status] || {
    label: status,
    icon: <Clock style={{ width: 14, height: 14 }} />,
    style: { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb', fontWeight: 600 },
  }

  return (
    <Chip
      size="small"
      icon={config.icon}
      label={config.label}
      variant="outlined"
      style={config.style}
      sx={{
        '& .MuiChip-icon': { color: 'inherit' },
        borderRadius: '6px',
        fontSize: '12px',
        height: '24px',
      }}
    />
  )
}
