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
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { IoKey } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCategories } from '@/hooks/useCategories';
import { organizationApi, Member, InviteMemberData, categoryApi } from '@/lib/api';
import useSWR from 'swr';
import { useSnackbar } from '@/contexts/SnackbarContext';

export default function UserManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuth();
  const { organizations, currentOrg, isLoading: isLoadingOrgs } = useOrganizations();
  const { categories } = useCategories();
  const { showSnackbar } = useSnackbar();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);

  const [accessMember, setAccessMember] = useState<Member | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const { data: members, mutate, isLoading: isLoadingMembers } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([_, orgId, token]) => organizationApi.listMembers(orgId, token),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

  const { isLoading: isLoadingAuth } = useAuth();

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isLoadingOrgs && organizations.length === 0) {
      router.push('/onboarding');
    } else if (members && currentUserRole === 'member') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoadingAuth, organizations, isLoadingOrgs, members, currentUserRole, router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showSnackbar('Email is required', 'error');
      return;
    }
    if (!currentOrg || !token) {
      showSnackbar('No organization selected', 'error');
      return;
    }

    const normalized = email.trim().toLowerCase();
    if (members?.some(m => m.user_email.toLowerCase() === normalized)) {
      showSnackbar('That user is already a member of this organization', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const data: InviteMemberData = { email: email.toLowerCase(), role };
      await organizationApi.inviteMember(currentOrg.id, data, token);
      await mutate();
      const invitedEmail = email;
      setEmail('');
      setRole('member');
      showSnackbar(`Successfully invited ${invitedEmail} as ${role}`, 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to invite member', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const openAccessDialog = async (member: Member) => {
    if (!currentOrg || !token) return;
    setAccessMember(member);
    setIsLoadingAccess(true);
    try {
      const ids = await categoryApi.getMemberAccess(currentOrg.id, member.user_id, token);
      setSelectedCategoryIds(ids);
    } catch {
      setSelectedCategoryIds([]);
    } finally {
      setIsLoadingAccess(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleSaveAccess = async () => {
    if (!accessMember || !currentOrg || !token) return;
    setIsSavingAccess(true);
    try {
      await categoryApi.setMemberAccess(currentOrg.id, accessMember.user_id, selectedCategoryIds, token);
      setAccessMember(null);
      showSnackbar('Category access updated successfully', 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to update access', 'error');
    } finally {
      setIsSavingAccess(false);
    }
  };

  if (isLoadingOrgs || isLoadingMembers) {
    return (
      <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
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
      case 'owner': return '#f44336';
      case 'admin': return '#ff9800';
      case 'member': return '#2196f3';
      default: return '#666666';
    }
  };

  return (
    <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
      <Typography variant="h4" sx={{ mb: 4, color: 'white' }}>
        User Management
      </Typography>

      {/* Invite Member Form */}
      <Card sx={{ mb: 4, bgcolor: '#2c2c2c' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, color: 'white' }}>
            Invite Member
          </Typography>

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
              sx={{ px: 4, py: 1.5, fontSize: '1rem', fontWeight: 600, textTransform: 'none' }}
            >
              {isInviting ? 'Inviting...' : 'Invite'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Members List */}
      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
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
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Category Access</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members && members.length > 0 ? (
              members.map((member) => (
                <TableRow key={member.user_id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: 'white' }}>{member.user_full_name || 'N/A'}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{member.user_email}</TableCell>
                  <TableCell>
                    <Chip
                      label={member.role.toUpperCase()}
                      sx={{ bgcolor: getRoleColor(member.role), color: 'white', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {member.role === 'owner' ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 220 }}>
                        Owner has access to all categories
                      </Typography>
                    ) : (
                      <IconButton
                        size="small"
                        sx={{ color: 'text.secondary' }}
                        onClick={() => openAccessDialog(member)}
                        title="Manage category access"
                      >
                        <IoKey size={18} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Category Access Dialog */}
      <Dialog open={!!accessMember} onClose={() => setAccessMember(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Category Access — {accessMember?.user_full_name || accessMember?.user_email}
        </DialogTitle>
        <DialogContent>
          {isLoadingAccess ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : categories.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
              No categories available. Create categories first.
            </Typography>
          ) : (
            <FormGroup sx={{ mt: 1 }}>
              {categories.map(category => (
                <FormControlLabel
                  key={category.id}
                  control={
                    <Checkbox
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      disabled={isSavingAccess}
                    />
                  }
                  label={category.name}
                />
              ))}
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAccessMember(null)} disabled={isSavingAccess}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveAccess}
            disabled={isSavingAccess || isLoadingAccess || categories.length === 0}
          >
            {isSavingAccess ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
