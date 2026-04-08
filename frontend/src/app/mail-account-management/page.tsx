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
  CircularProgress,
  IconButton,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { IoTrash, IoPencil, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { mailAccountApi, MailAccount, MailAccountCreateData, MailAccountUpdateData, organizationApi, Member } from '@/lib/api';
import useSWR from 'swr';

const DEFAULT_FORM: MailAccountCreateData = {
  name: '',
  imap_host: '',
  imap_port: 993,
  imap_username: '',
  imap_password: '',
  use_ssl: true,
};

export default function MailAccountManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user, token, isLoading: isLoadingAuth } = useAuth();
  const { organizations, currentOrg, isLoading: isLoadingOrgs } = useOrganizations();

  const { data: mailAccounts, isLoading: isLoadingAccounts, mutate } = useSWR<MailAccount[]>(
    currentOrg && token ? ['mail-accounts', currentOrg.id, token] : null,
    ([, orgId, tok]: [string, string, string]) => mailAccountApi.list(orgId, tok),
    { revalidateOnFocus: false }
  );

  const { data: members, isLoading: isLoadingMembers } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([, orgId, tok]: [string, string, string]) => organizationApi.listMembers(orgId, tok),
    { revalidateOnFocus: false }
  );

  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

  const [form, setForm] = useState<MailAccountCreateData>(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [editAccount, setEditAccount] = useState<MailAccount | null>(null);
  const [editForm, setEditForm] = useState<MailAccountUpdateData>({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<MailAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleTest = async () => {
    if (!currentOrg || !token) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await mailAccountApi.test(currentOrg.id, {
        imap_host: form.imap_host,
        imap_port: form.imap_port,
        imap_username: form.imap_username,
        imap_password: form.imap_password,
        use_ssl: form.use_ssl,
      }, token);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentOrg || !token) return;
    setIsSubmitting(true);
    try {
      await mailAccountApi.create(currentOrg.id, form, token);
      await mutate();
      setForm(DEFAULT_FORM);
      setTestResult(null);
      setSuccess(`Mail account "${form.name}" added`);
    } catch (err: any) {
      setError(err.message || 'Failed to create mail account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (account: MailAccount) => {
    setEditAccount(account);
    setEditForm({ name: account.name, imap_host: account.imap_host, imap_port: account.imap_port, imap_username: account.imap_username, use_ssl: account.use_ssl });
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccount || !currentOrg || !token) return;
    setIsEditSubmitting(true);
    setEditError('');
    try {
      await mailAccountApi.update(currentOrg.id, editAccount.id, editForm, token);
      await mutate();
      setEditAccount(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update mail account');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !currentOrg || !token) return;
    setIsDeleting(true);
    try {
      await mailAccountApi.delete(currentOrg.id, deleteTarget.id, token);
      await mutate();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete mail account');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
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

  if (!isAuthenticated || !currentOrg || currentUserRole === 'member') return null;

  return (
    <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
      <Typography variant="h4" sx={{ mb: 4, color: 'white' }}>
        Mail Accounts
      </Typography>

      <Card sx={{ mb: 4, bgcolor: '#2c2c2c' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, color: 'white' }}>Add Mail Account</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleCreate}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField label="Account Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={isSubmitting} required sx={{ flex: '1 1 180px' }} />
              <TextField label="IMAP Host" value={form.imap_host} onChange={e => setForm(f => ({ ...f, imap_host: e.target.value }))} disabled={isSubmitting} required sx={{ flex: '1 1 200px' }} />
              <TextField label="Port" type="number" value={form.imap_port} onChange={e => setForm(f => ({ ...f, imap_port: parseInt(e.target.value) || 993 }))} disabled={isSubmitting} required sx={{ flex: '0 1 100px' }} inputProps={{ min: 1, max: 65535 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField label="Username" value={form.imap_username} onChange={e => setForm(f => ({ ...f, imap_username: e.target.value }))} disabled={isSubmitting} required sx={{ flex: '1 1 200px' }} />
              <TextField label="Password" type="password" value={form.imap_password} onChange={e => setForm(f => ({ ...f, imap_password: e.target.value }))} disabled={isSubmitting} required sx={{ flex: '1 1 200px' }} />
              <FormControlLabel
                control={<Switch checked={form.use_ssl} onChange={e => setForm(f => ({ ...f, use_ssl: e.target.checked }))} disabled={isSubmitting} />}
                label="SSL"
                sx={{ color: 'white' }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ px: 4, py: 1.5, fontWeight: 600, textTransform: 'none' }}>
                {isSubmitting ? 'Adding...' : 'Add Account'}
              </Button>
              <Button variant="outlined" onClick={handleTest} disabled={isTesting || !form.imap_host || !form.imap_username || !form.imap_password}
                sx={{ px: 3, py: 1.5, textTransform: 'none' }}>
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              {testResult && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {testResult.ok
                    ? <><IoCheckmarkCircle color="#4caf50" size={20} /><Typography variant="body2" sx={{ color: '#4caf50' }}>Connected</Typography></>
                    : <><IoCloseCircle color="#f44336" size={20} /><Typography variant="body2" sx={{ color: '#f44336' }}>{testResult.error || 'Failed'}</Typography></>
                  }
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Connected Accounts</Typography>

      {isLoadingAccounts ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Host</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Port</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Username</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>SSL</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mailAccounts && mailAccounts.length > 0 ? mailAccounts.map(account => (
                <TableRow key={account.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: 'white' }}>{account.name}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{account.imap_host}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{account.imap_port}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{account.imap_username}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{account.use_ssl ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => openEdit(account)}>
                      <IoPencil size={18} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#f44336' }} onClick={() => setDeleteTarget(account)}>
                      <IoTrash size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    No mail accounts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editAccount} onClose={() => setEditAccount(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Mail Account</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{editError}</Alert>}
          <Box component="form" id="edit-mail-form" onSubmit={handleEdit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Account Name" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <TextField label="IMAP Host" value={editForm.imap_host || ''} onChange={e => setEditForm(f => ({ ...f, imap_host: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Port" type="number" value={editForm.imap_port || ''} onChange={e => setEditForm(f => ({ ...f, imap_port: parseInt(e.target.value) || undefined }))} disabled={isEditSubmitting} inputProps={{ min: 1, max: 65535 }} sx={{ flex: 1 }} />
              <FormControlLabel control={<Switch checked={editForm.use_ssl ?? true} onChange={e => setEditForm(f => ({ ...f, use_ssl: e.target.checked }))} disabled={isEditSubmitting} />} label="SSL" sx={{ flex: 1 }} />
            </Box>
            <TextField label="Username" value={editForm.imap_username || ''} onChange={e => setEditForm(f => ({ ...f, imap_username: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <TextField label="New Password (leave blank to keep)" type="password" value={editForm.imap_password || ''} onChange={e => setEditForm(f => ({ ...f, imap_password: e.target.value || undefined }))} disabled={isEditSubmitting} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditAccount(null)} disabled={isEditSubmitting}>Cancel</Button>
          <Button type="submit" form="edit-mail-form" variant="contained" disabled={isEditSubmitting}>
            {isEditSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Mail Account</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
