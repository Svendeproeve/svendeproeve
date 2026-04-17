'use client';

import { useEffect } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCategories } from '@/hooks/useCategories';
import { organizationApi, emailsApi, Member, Email, Category } from '@/lib/api';
import { CaseStatusChip, SeverityChip } from '@/lib/email-status-chips';
import useSWR from 'swr';

function formatDate(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

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
        <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Subject</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>From</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Severity</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedEmails && assignedEmails.length > 0 ? (
                assignedEmails.map(email => (
                  <TableRow
                    key={email.id}
                    hover
                    onClick={() => {
                      if (email.category_id) {
                        router.push(`/categories/${email.category_id}/thread/${email.id}`);
                      }
                    }}
                    sx={{
                      cursor: email.category_id ? 'pointer' : 'default',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                    }}
                  >
                    <TableCell sx={{ color: 'white' }}>{email.subject || '(no subject)'}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{email.sender}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{categoryName(categories, email.category_id)}</TableCell>
                    <TableCell><SeverityChip severity={email.severity} /></TableCell>
                    <TableCell><CaseStatusChip caseStatus={email.case_status} /></TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{formatDate(email.date || email.created_at)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    You are not assigned to any threads.
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
