'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { organizationApi, Member, InviteMemberData } from '@/lib/api';
import useSWR from 'swr';

export default function UserManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuth();
  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Use first organization for now (could be improved with org selection)
  const currentOrg = organizations[0];

  const { data: members, mutate, isLoading: isLoadingMembers } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([_, orgId, token]) => organizationApi.listMembers(orgId, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Get current user's role in the organization
  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isLoadingOrgs && organizations.length === 0) {
      router.push('/onboarding');
    } else if (members && currentUserRole === 'member') {
      // Redirect members away from user management
      router.push('/dashboard');
    }
  }, [isAuthenticated, organizations, isLoadingOrgs, members, currentUserRole, router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!currentOrg || !token) {
      setError('No organization selected');
      return;
    }

    setIsInviting(true);

    try {
      const data: InviteMemberData = {
        email: email.toLowerCase(),
        role,
      };
      await organizationApi.inviteMember(currentOrg.id, data, token);
      await mutate();
      setEmail('');
      setRole('member');
      setSuccess(`Successfully invited ${email} as ${role}`);
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoadingOrgs || isLoadingMembers) {
    return (
      <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
          }}
        >
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !currentOrg || currentUserRole === 'member') {
    return null;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#f44336';
      case 'admin':
        return '#ff9800';
      case 'member':
        return '#2196f3';
      default:
        return '#666666';
    }
  };

  return (
    <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
      <Typography variant="h4" sx={{ mb: 4, color: 'white', fontWeight: 400 }}>
        User Management
      </Typography>

      {/* Invite Member Form */}
      <Card sx={{ mb: 4, bgcolor: '#2c2c2c' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, color: 'white' }}>
            Invite Member
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="invite-error">
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} data-testid="invite-success">
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleInvite}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isInviting}
                inputProps={{ 'data-testid': 'invite-email-input' }}
              />

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={role}
                  label="Role"
                  onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                  disabled={isInviting}
                  data-testid="invite-role-select"
                >
                  <MenuItem value="member">Member</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={isInviting}
              data-testid="invite-submit-button"
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {isInviting ? 'Inviting...' : 'Invite'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Members List */}
      <Typography variant="h6" sx={{ mb: 2, color: 'white', fontWeight: 400 }}>
        Current Members
      </Typography>

      <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Joined</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members && members.length > 0 ? (
              members.map((member) => (
                <TableRow key={member.user_id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: 'white' }}>
                    {member.user_full_name || 'N/A'}
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{member.user_email}</TableCell>
                  <TableCell>
                    <Chip
                      label={member.role.toUpperCase()}
                      sx={{
                        bgcolor: getRoleColor(member.role),
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardLayout>
  );
}
