'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardLayout from '@/components/DashboardLayout';
import ThreadTable from '@/components/ThreadTable';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCategories } from '@/hooks/useCategories';
import { organizationApi, categoryApi, emailsApi, Member, Email } from '@/lib/api';
import { CaseStatusChip, SeverityChip } from '@/lib/email-status-chips';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/time';
import { useSnackbar } from '@/contexts/SnackbarContext';
import useSWR from 'swr';

/**
 * One row per thread: latest message drives From / last activity / status;
 * subject is always taken from the first email in the thread (earliest created_at).
 */
function oneRowPerThread(emails: Email[]): Email[] {
  const groups = new Map<string, Email[]>();
  for (const e of emails) {
    const threadKey = (e.thread_id || '').trim() || e.id;
    const list = groups.get(threadKey) || [];
    list.push(e);
    groups.set(threadKey, list);
  }

  const rows: Email[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    rows.push({
      ...latest,
      subject: first.subject ?? '',
    });
  }
  return rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, token } = useAuth();
  const { currentOrg } = useOrganizations();
  const { showSnackbar } = useSnackbar();

  const { data: members, isLoading: isLoadingMembers } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([_, orgId, token]) => organizationApi.listMembers(orgId, token),
    { revalidateOnFocus: false }
  );

  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

  const { categories, isLoading: isLoadingCategories } = useCategories({ userId: user?.id, userRole: currentUserRole });
  const category = categories.find(c => c.id === id);

  const isUncategorised = Boolean(category?.is_system && category?.name === 'Uncategorised');

  const { data: emails, isLoading: isLoadingEmails, mutate: mutateEmails } = useSWR<Email[]>(
    currentOrg && token && category ? ['emails', currentOrg.id, id, token] : null,
    ([_, orgId, categoryId, tok]) => categoryApi.listEmails(orgId, categoryId, tok),
    { revalidateOnFocus: false }
  );

  const { data: uncCount, mutate: mutateUncCount } = useSWR<{ count: number }>(
    currentOrg && token && isUncategorised ? ['uncategorized-count', currentOrg.id, token] : null,
    ([_, orgId, tok]) => emailsApi.getUncategorizedCount(orgId, tok as string),
    { revalidateOnFocus: false }
  );

  const [isRecategorizing, setIsRecategorizing] = useState(false);

  const handleRecategorize = async () => {
    if (!currentOrg || !token) return;
    setIsRecategorizing(true);
    try {
      await emailsApi.categorize(currentOrg.id, { limit: 500, force: false }, token);
      await mutateEmails();
      await mutateUncCount();
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to re-categorize', 'error');
    } finally {
      setIsRecategorizing(false);
    }
  };

  const threadRows = useMemo(() => (emails?.length ? oneRowPerThread(emails) : []), [emails]);

  if (isLoadingMembers || isLoadingCategories) {
    return (
      <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!category) {
    return (
      <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          You do not have access to this category.
        </Typography>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {category.color && (
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: category.color, flexShrink: 0 }} />
          )}
          <Typography variant="h4" sx={{ color: 'white' }}>
            {category.name}
          </Typography>
        </Box>
        {isUncategorised && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography component="span" variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {uncCount !== undefined ? `Uncategorised threads: ${uncCount.count}` : 'Uncategorised threads: …'}
            </Typography>
            <Tooltip title="Re-categorise threads">
              <span>
                <IconButton
                  onClick={handleRecategorize}
                  disabled={isRecategorizing}
                  size="small"
                  aria-label="Re-categorise threads"
                  sx={{ color: 'text.secondary' }}
                >
                  {isRecategorizing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
      </Box>
      {isLoadingEmails ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ThreadTable
          rows={threadRows}
          rowKey={e => (e.thread_id || '').trim() || e.id}
          onRowClick={e => router.push(`/categories/${id}/thread/${e.id}`)}
          emptyMessage="No threads in this category yet."
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
              key: 'lastActivity',
              header: 'Last activity',
              cellSx: { color: 'text.secondary' },
              render: e => (
                <Tooltip title={formatAbsoluteDateTime(e.date || e.created_at)}>
                  <span>{formatRelativeTime(e.date || e.created_at)}</span>
                </Tooltip>
              ),
            },
            {
              key: 'severity',
              header: 'Severity',
              render: e => <SeverityChip severity={e.severity} />,
            },
            {
              key: 'assignedTo',
              header: 'Assigned to',
              cellSx: { color: 'text.secondary' },
              render: e => e.assigned_to_name || '—',
            },
            {
              key: 'status',
              header: 'Status',
              render: e => <CaseStatusChip caseStatus={e.case_status} />,
            },
          ]}
        />
      )}
    </DashboardLayout>
  );
}
