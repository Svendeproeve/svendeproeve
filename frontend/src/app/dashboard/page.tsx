'use client';

import { useEffect } from 'react';
import {
  Typography,
  CircularProgress,
  Box,
  Tooltip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ThreadTable from '@/components/ThreadTable';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCategories } from '@/hooks/useCategories';
import { organizationApi, emailsApi, Member, Email, Category } from '@/lib/api';
import { CaseStatusChip, SeverityChip } from '@/lib/email-status-chips';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/time';
import useSWR from 'swr';

function categoryName(categories: Category[], categoryId: string | null | undefined): string {
  if (!categoryId) return '—';
  return categories.find(c => c.id === categoryId)?.name ?? '—';
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuth();
  const { currentOrg, hasOrganizations, isLoading } = useOrganizations();

  const { data: members } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([_, orgId, tok]) => organizationApi.listMembers(orgId as string, tok as string),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

  const { categories } = useCategories({ userId: user?.id, userRole: currentUserRole });

  const { data: assignedEmails, isLoading: isLoadingAssigned } = useSWR<Email[]>(
    currentOrg && token ? ['assigned-to-me', currentOrg.id, token] : null,
    ([_, orgId, tok]) => emailsApi.listAssignedToMe(orgId as string, tok as string),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!hasOrganizations) {
      router.push('/onboarding');
    }
  }, [isAuthenticated, hasOrganizations, isLoading, router]);

  if (isLoading || !isAuthenticated || !hasOrganizations) {
    return null;
  }

  return (
    <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
      <Typography variant="h4" data-testid="dashboard-greeting" sx={{ mb: 4, color: 'white' }}>
        Goodmorning, {user?.full_name || 'User'}!
      </Typography>

      <Typography variant="h5" sx={{ mb: 2, color: 'white' }}>
        Your Threads
      </Typography>

      {isLoadingAssigned ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ThreadTable
          rows={assignedEmails ?? []}
          onRowClick={e => {
            if (e.category_id) {
              router.push(`/categories/${e.category_id}/thread/${e.id}`);
            }
          }}
          isRowClickable={e => Boolean(e.category_id)}
          emptyMessage="You are not assigned to any threads."
          columns={[
            {
              key: 'subject',
              header: 'Subject',
              cellSx: { color: 'white' },
              render: e => e.subject || '(no subject)',
            },
            {
              key: 'from',
              header: 'From',
              cellSx: { color: 'text.secondary' },
              render: e => e.sender,
            },
            {
              key: 'category',
              header: 'Category',
              cellSx: { color: 'text.secondary' },
              render: e => categoryName(categories, e.category_id),
            },
            {
              key: 'severity',
              header: 'Severity',
              render: e => <SeverityChip severity={e.severity} />,
            },
            {
              key: 'status',
              header: 'Status',
              render: e => <CaseStatusChip caseStatus={e.case_status} />,
            },
            {
              key: 'lastActivity',
              header: 'Last activity',
              cellSx: { color: 'text.secondary' },
              render: e => (
                <Tooltip title={formatAbsoluteDateTime(e.date || e.created_at)}>
                  <span>{formatRelativeTime(e.date || e.created_at)}</span>
                </Tooltip>
              ),
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}
