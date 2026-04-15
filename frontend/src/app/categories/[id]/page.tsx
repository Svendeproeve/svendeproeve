'use client';

import { use, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCategories } from '@/hooks/useCategories';
import { organizationApi, categoryApi, emailsApi, Member, Email } from '@/lib/api';
import useSWR from 'swr';

function formatDate(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCaseStatus(raw: string): string {
  const s = (raw || '').toLowerCase();
  if (s === 'open') return 'Open';
  if (s === 'closed') return 'Closed';
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

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
  const { user, token } = useAuth();
  const { currentOrg } = useOrganizations();

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
  const [recatError, setRecatError] = useState('');

  const handleRecategorize = async () => {
    if (!currentOrg || !token) return;
    setRecatError('');
    setIsRecategorizing(true);
    try {
      await emailsApi.categorize(currentOrg.id, { limit: 500, force: false }, token);
      await mutateEmails();
      await mutateUncCount();
    } catch (err: unknown) {
      setRecatError(err instanceof Error ? err.message : 'Failed to re-categorize');
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
      {recatError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRecatError('')}>
          {recatError}
        </Alert>
      )}

      {isLoadingEmails ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Subject</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>From</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Last activity</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {threadRows.length > 0 ? threadRows.map(email => (
                <TableRow
                  key={(email.thread_id || '').trim() || email.id}
                  sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                >
                  <TableCell sx={{ color: 'white' }}>{email.subject || '(no subject)'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{email.sender}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{formatDate(email.date || email.created_at)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatCaseStatus(email.case_status)}
                      size="small"
                      sx={{
                        bgcolor: email.case_status?.toLowerCase() === 'open' ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.08)',
                        color: email.case_status?.toLowerCase() === 'open' ? '#4caf50' : 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    No threads in this category yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DashboardLayout>
  );
}
