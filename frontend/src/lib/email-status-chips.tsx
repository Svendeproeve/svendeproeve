import { Chip } from '@mui/material';
import type { Email } from '@/lib/api';

export function formatCaseStatusLabel(raw: string | undefined): string {
  const s = (raw || '').toLowerCase();
  if (s === 'open') return 'Open';
  if (s === 'closed') return 'Closed';
  if (s === 'waiting_for_customer') return 'Waiting for customer';
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Same styling as the category thread list table. */
export function SeverityChip({ severity }: { severity: Email['severity'] }) {
  return (
    <Chip
      component="span"
      label={
        severity === 'critical'
          ? 'Critical'
          : severity === 'non_critical'
            ? 'Non-Critical'
            : 'Not set'
      }
      size="small"
      sx={{
        cursor: 'default',
        fontWeight: 600,
        fontSize: '0.7rem',
        ...(severity === 'critical'
          ? {
              bgcolor: 'rgba(244, 67, 54, 0.15)',
              color: '#f44336',
            }
          : severity === 'non_critical'
            ? {
                bgcolor: 'rgba(33, 150, 243, 0.15)',
                color: '#2196f3',
              }
            : {
                bgcolor: 'rgba(255,255,255,0.08)',
                color: 'text.secondary',
              }),
      }}
    />
  );
}

/** Same styling as the category thread list table. */
export function CaseStatusChip({ caseStatus }: { caseStatus: string | undefined }) {
  return (
    <Chip
      label={formatCaseStatusLabel(caseStatus)}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.7rem',
        ...(caseStatus?.toLowerCase() === 'open'
          ? { bgcolor: 'rgba(76,175,80,0.15)', color: '#4caf50' }
          : caseStatus?.toLowerCase() === 'waiting_for_customer'
            ? { bgcolor: 'rgba(255,152,0,0.15)', color: '#ff9800' }
            : { bgcolor: 'rgba(255,255,255,0.08)', color: 'text.secondary' }),
      }}
    />
  );
}
