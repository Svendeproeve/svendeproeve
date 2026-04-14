'use client';

import { use } from 'react';
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
} from '@mui/material';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useInboxes } from '@/hooks/useInboxes';
import { organizationApi, Member } from '@/lib/api';
import useSWR from 'swr';

export default function InboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token } = useAuth();
  const { currentOrg } = useOrganizations();

  const { data: members, isLoading: isLoadingMembers } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([_, orgId, token]) => organizationApi.listMembers(orgId, token),
    { revalidateOnFocus: false }
  );

  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

  const { inboxes, isLoading: isLoadingInboxes } = useInboxes({ userId: user?.id, userRole: currentUserRole });
  const inbox = inboxes.find(i => i.id === id);

  if (isLoadingMembers || isLoadingInboxes) {
    return (
      <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!inbox) {
    return (
      <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          You do not have access to this inbox.
        </Typography>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
      <Typography variant="h4" sx={{ mb: 4, color: 'white' }}>
        {inbox.name}
      </Typography>

      <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Classification</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Duration</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Assigned to</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                No threads yet.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardLayout>
  );
}
