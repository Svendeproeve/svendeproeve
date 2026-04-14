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
} from '@mui/material';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { organizationApi, Member } from '@/lib/api';
import useSWR from 'swr';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuth();
  const { currentOrg, hasOrganizations, isLoading } = useOrganizations();

  const { data: members } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([_, orgId, token]) => organizationApi.listMembers(orgId, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

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

      <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Classification</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                You are not assigned to any threads.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardLayout>
  );
}
