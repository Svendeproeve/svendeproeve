'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Divider,
  Tooltip,
} from '@mui/material';
import { IoTrash, IoPencil, IoCheckmarkCircle, IoCloseCircle, IoRefresh } from 'react-icons/io5';
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
  smtp_host: '',
  smtp_port: 465,
  smtp_username: '',
  smtp_password: '',
  smtp_use_ssl: true,
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
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isSmtpTesting, setIsSmtpTesting] = useState(false);

  const [editAccount, setEditAccount] = useState<MailAccount | null>(null);
  const [editForm, setEditForm] = useState<MailAccountUpdateData>({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<MailAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  type ConnectionStatus = { ok: boolean; error?: string };
  type AccountStatus = { imap?: ConnectionStatus; smtp: ConnectionStatus | null; loading: boolean };
  const [accountStatuses, setAccountStatuses] = useState<Record<string, AccountStatus>>({});

  const fetchAccountStatus = useCallback(async (accountId: string) => {
    if (!currentOrg || !token) return;
    setAccountStatuses(prev => ({ ...prev, [accountId]: { ...prev[accountId], loading: true } }));
    try {
      const result = await mailAccountApi.testStatus(currentOrg.id, accountId, token);
      setAccountStatuses(prev => ({ ...prev, [accountId]: { imap: result.imap, smtp: result.smtp, loading: false } }));
    } catch {
      setAccountStatuses(prev => ({ ...prev, [accountId]: { imap: { ok: false, error: 'Failed to fetch' }, smtp: null, loading: false } }));
    }
  }, [currentOrg, token]);

  useEffect(() => {
    if (!mailAccounts) return;
    mailAccounts.forEach(account => fetchAccountStatus(account.id));
  }, [mailAccounts, fetchAccountStatus]);

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

  const handleSmtpTest = async () => {
    if (!currentOrg || !token) return;
    setIsSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const result = await mailAccountApi.testSmtp(currentOrg.id, {
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port,
        smtp_username: form.smtp_username,
        smtp_password: form.smtp_password,
        smtp_use_ssl: form.smtp_use_ssl,
      }, token);
      setSmtpTestResult(result);
    } catch (err: any) {
      setSmtpTestResult({ ok: false, error: err.message });
    } finally {
      setIsSmtpTesting(false);
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
      setSmtpTestResult(null);
      setSuccess(`Mail account "${form.name}" added`);
    } catch (err: any) {
      setError(err.message || 'Failed to create mail account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (account: MailAccount) => {
    setEditAccount(account);
    setEditForm({
      name: account.name,
      imap_host: account.imap_host,
      imap_port: account.imap_port,
      imap_username: account.imap_username,
      use_ssl: account.use_ssl,
      smtp_host: account.smtp_host,
      smtp_port: account.smtp_port,
      smtp_username: account.smtp_username,
      smtp_use_ssl: account.smtp_use_ssl,
    });
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccount || !currentOrg || !token) return;
    setIsEditSubmitting(true);
    setEditError('');
    try {
      await mailAccountApi.update(currentOrg.id, editAccount.id, editForm, token);
      const updatedId = editAccount.id;
      await mutate();
      setEditAccount(null);
      fetchAccountStatus(updatedId);
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
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 2, mb: 2 }}>
              <TextField label="Account Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={isSubmitting} required />
              <TextField label="IMAP Host" value={form.imap_host} onChange={e => setForm(f => ({ ...f, imap_host: e.target.value }))} disabled={isSubmitting} required />
              <TextField label="Port" type="number" value={form.imap_port} onChange={e => setForm(f => ({ ...f, imap_port: parseInt(e.target.value) || 993 }))} disabled={isSubmitting} required inputProps={{ min: 1, max: 65535 }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField label="Username" value={form.imap_username} onChange={e => setForm(f => ({ ...f, imap_username: e.target.value }))} disabled={isSubmitting} required />
              <TextField label="Password" type="password" value={form.imap_password} onChange={e => setForm(f => ({ ...f, imap_password: e.target.value }))} disabled={isSubmitting} required />
              <FormControlLabel
                control={<Switch checked={form.use_ssl} onChange={e => setForm(f => ({ ...f, use_ssl: e.target.checked }))} disabled={isSubmitting} />}
                label="SSL"
                sx={{ color: 'white' }}
              />
            </Box>

            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>SMTP Settings</Typography>
            </Divider>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 2, mb: 2 }}>
              <TextField label="SMTP Host" value={form.smtp_host} onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))} disabled={isSubmitting} required />
              <TextField label="Port" type="number" value={form.smtp_port} onChange={e => setForm(f => ({ ...f, smtp_port: parseInt(e.target.value) || 465 }))} disabled={isSubmitting} required inputProps={{ min: 1, max: 65535 }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField label="SMTP Username" value={form.smtp_username} onChange={e => setForm(f => ({ ...f, smtp_username: e.target.value }))} disabled={isSubmitting} required />
              <TextField label="SMTP Password" type="password" value={form.smtp_password} onChange={e => setForm(f => ({ ...f, smtp_password: e.target.value }))} disabled={isSubmitting} required />
              <FormControlLabel
                control={<Switch checked={form.smtp_use_ssl} onChange={e => setForm(f => ({ ...f, smtp_use_ssl: e.target.checked }))} disabled={isSubmitting} />}
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
                {isTesting ? 'Testing IMAP...' : 'Test IMAP'}
              </Button>
              {testResult && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {testResult.ok
                    ? <><IoCheckmarkCircle color="#4caf50" size={20} /><Typography variant="body2" sx={{ color: '#4caf50' }}>IMAP Connected</Typography></>
                    : <><IoCloseCircle color="#f44336" size={20} /><Typography variant="body2" sx={{ color: '#f44336' }}>{testResult.error || 'Failed'}</Typography></>
                  }
                </Box>
              )}
              <Button variant="outlined" onClick={handleSmtpTest} disabled={isSmtpTesting || !form.smtp_host || !form.smtp_username || !form.smtp_password}
                sx={{ px: 3, py: 1.5, textTransform: 'none' }}>
                {isSmtpTesting ? 'Testing SMTP...' : 'Test SMTP'}
              </Button>
              {smtpTestResult && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {smtpTestResult.ok
                    ? <><IoCheckmarkCircle color="#4caf50" size={20} /><Typography variant="body2" sx={{ color: '#4caf50' }}>SMTP Connected</Typography></>
                    : <><IoCloseCircle color="#f44336" size={20} /><Typography variant="body2" sx={{ color: '#f44336' }}>{smtpTestResult.error || 'Failed'}</Typography></>
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
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>IMAP Host</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>IMAP Port</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Username</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>SMTP Host</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>SMTP Port</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>IMAP Status</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>SMTP Status</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mailAccounts && mailAccounts.length > 0 ? mailAccounts.map(account => {
                const status = accountStatuses[account.id];
                return (
                  <TableRow key={account.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                    <TableCell sx={{ color: 'white' }}>{account.name}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{account.imap_host}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{account.imap_port}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{account.imap_username}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{account.smtp_host || '—'}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{account.smtp_port || '—'}</TableCell>
                    <TableCell>
                      {!status || status.loading
                        ? <CircularProgress size={16} />
                        : status.imap?.ok
                          ? <Tooltip title="Connected"><Box component="span"><IoCheckmarkCircle color="#4caf50" size={20} /></Box></Tooltip>
                          : <Tooltip title={status.imap?.error || 'Failed'}><Box component="span"><IoCloseCircle color="#f44336" size={20} /></Box></Tooltip>
                      }
                    </TableCell>
                    <TableCell>
                      {!status || status.loading
                        ? <CircularProgress size={16} />
                        : status.smtp === null
                          ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>—</Typography>
                          : status.smtp.ok
                            ? <Tooltip title="Connected"><Box component="span"><IoCheckmarkCircle color="#4caf50" size={20} /></Box></Tooltip>
                            : <Tooltip title={status.smtp.error || 'Failed'}><Box component="span"><IoCloseCircle color="#f44336" size={20} /></Box></Tooltip>
                      }
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Refresh status">
                        <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => fetchAccountStatus(account.id)} disabled={status?.loading}>
                          <IoRefresh size={18} />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => openEdit(account)}>
                        <IoPencil size={18} />
                      </IconButton>
                      <IconButton size="small" sx={{ color: '#f44336' }} onClick={() => setDeleteTarget(account)}>
                        <IoTrash size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={9} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
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
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>IMAP</Typography>
            </Divider>
            <TextField label="IMAP Host" value={editForm.imap_host || ''} onChange={e => setEditForm(f => ({ ...f, imap_host: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="IMAP Port" type="number" value={editForm.imap_port || ''} onChange={e => setEditForm(f => ({ ...f, imap_port: parseInt(e.target.value) || undefined }))} disabled={isEditSubmitting} inputProps={{ min: 1, max: 65535 }} sx={{ flex: 1 }} />
              <FormControlLabel control={<Switch checked={editForm.use_ssl ?? true} onChange={e => setEditForm(f => ({ ...f, use_ssl: e.target.checked }))} disabled={isEditSubmitting} />} label="SSL" sx={{ flex: 1 }} />
            </Box>
            <TextField label="IMAP Username" value={editForm.imap_username || ''} onChange={e => setEditForm(f => ({ ...f, imap_username: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <TextField label="IMAP Password (leave blank to keep)" type="password" value={editForm.imap_password || ''} onChange={e => setEditForm(f => ({ ...f, imap_password: e.target.value || undefined }))} disabled={isEditSubmitting} fullWidth />
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>SMTP</Typography>
            </Divider>
            <TextField label="SMTP Host" value={editForm.smtp_host || ''} onChange={e => setEditForm(f => ({ ...f, smtp_host: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="SMTP Port" type="number" value={editForm.smtp_port || ''} onChange={e => setEditForm(f => ({ ...f, smtp_port: parseInt(e.target.value) || undefined }))} disabled={isEditSubmitting} inputProps={{ min: 1, max: 65535 }} sx={{ flex: 1 }} />
              <FormControlLabel control={<Switch checked={editForm.smtp_use_ssl ?? true} onChange={e => setEditForm(f => ({ ...f, smtp_use_ssl: e.target.checked }))} disabled={isEditSubmitting} />} label="SSL" sx={{ flex: 1 }} />
            </Box>
            <TextField label="SMTP Username" value={editForm.smtp_username || ''} onChange={e => setEditForm(f => ({ ...f, smtp_username: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <TextField label="SMTP Password (leave blank to keep)" type="password" value={editForm.smtp_password || ''} onChange={e => setEditForm(f => ({ ...f, smtp_password: e.target.value || undefined }))} disabled={isEditSubmitting} fullWidth />
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
