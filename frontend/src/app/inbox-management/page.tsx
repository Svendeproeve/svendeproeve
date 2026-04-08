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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Checkbox,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import { IoTrash, IoPencil, IoLockClosed } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useInboxes } from '@/hooks/useInboxes';
import { inboxApi, mailAccountApi, InboxCreateData, InboxUpdateData, Inbox, MailAccount, organizationApi, Member } from '@/lib/api';
import useSWR from 'swr';

const DEFAULT_FORM: InboxCreateData = { name: '', description: '' };

export default function InboxManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user, token, isLoading: isLoadingAuth } = useAuth();
  const { organizations, currentOrg, isLoading: isLoadingOrgs } = useOrganizations();

  const { inboxes, isLoading: isLoadingInboxes, mutate } = useInboxes();

  const { data: mailAccounts } = useSWR<MailAccount[]>(
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

  const [form, setForm] = useState<InboxCreateData>(DEFAULT_FORM);
  const [selectedMailAccountIds, setSelectedMailAccountIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editInbox, setEditInbox] = useState<Inbox | null>(null);
  const [editForm, setEditForm] = useState<InboxUpdateData>({});
  const [editSelectedMailAccountIds, setEditSelectedMailAccountIds] = useState<string[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Inbox | null>(null);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentOrg || !token) return;
    setIsSubmitting(true);
    try {
      await inboxApi.create(currentOrg.id, {
        name: form.name,
        description: form.description || undefined,
        mail_account_ids: selectedMailAccountIds.length > 0 ? selectedMailAccountIds : undefined,
      }, token);
      await mutate();
      setForm(DEFAULT_FORM);
      setSelectedMailAccountIds([]);
      setSuccess(`Category "${form.name}" created`);
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (inbox: Inbox) => {
    setEditInbox(inbox);
    setEditForm({ name: inbox.name, description: inbox.description || '' });
    setEditSelectedMailAccountIds(inbox.mail_account_ids ?? []);
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInbox || !currentOrg || !token) return;
    setIsEditSubmitting(true);
    setEditError('');
    try {
      await inboxApi.update(currentOrg.id, editInbox.id, {
        ...editForm,
        mail_account_ids: editSelectedMailAccountIds,
      }, token);
      await mutate();
      setEditInbox(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update category');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !currentOrg || !token) return;
    setIsDeleting(true);
    try {
      await inboxApi.delete(currentOrg.id, deleteTarget.id, token);
      await mutate();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMailAccount = (id: string, current: string[], setter: (ids: string[]) => void) => {
    setter(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
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
        Categories
      </Typography>

      <Card sx={{ mb: 4, bgcolor: '#2c2c2c' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, color: 'white' }}>Add Category</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleCreate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={isSubmitting}
                required
              />
              <TextField
                label="Description (for AI)"
                value={form.description || ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                disabled={isSubmitting}
                multiline
                rows={3}
                required
              />
            </Box>

            {mailAccounts && mailAccounts.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  Scope to mail accounts (leave empty to apply to all)
                </Typography>
                <FormGroup row>
                  {mailAccounts.map(ma => (
                    <FormControlLabel
                      key={ma.id}
                      control={
                        <Checkbox
                          checked={selectedMailAccountIds.includes(ma.id)}
                          onChange={() => toggleMailAccount(ma.id, selectedMailAccountIds, setSelectedMailAccountIds)}
                          disabled={isSubmitting}
                          size="small"
                        />
                      }
                      label={ma.name}
                      sx={{ color: 'white' }}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            <Button type="submit" variant="contained"
              disabled={isSubmitting || !form.name.trim() || !form.description?.trim()}
              sx={{ px: 4, py: 1.5, fontWeight: 600, textTransform: 'none' }}>
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Existing Categories</Typography>

      {isLoadingInboxes ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Mail Accounts</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inboxes.length > 0 ? inboxes.map(inbox => (
                <TableRow key={inbox.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: 'white' }}>
                    {inbox.name}
                    {inbox.is_system && (
                      <Chip label="system" size="small" sx={{ ml: 1, bgcolor: '#444', color: 'text.secondary', fontSize: '0.65rem' }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{inbox.description || '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {inbox.mail_account_ids && inbox.mail_account_ids.length > 0
                      ? inbox.mail_account_ids.map(id => mailAccounts?.find(ma => ma.id === id)?.name || id).join(', ')
                      : 'All'}
                  </TableCell>
                  <TableCell>
                    {inbox.is_system ? (
                      <IoLockClosed size={16} color="#555" />
                    ) : (
                      <>
                        <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => openEdit(inbox)}>
                          <IoPencil size={18} />
                        </IconButton>
                        <IconButton size="small" sx={{ color: '#f44336' }} onClick={() => setDeleteTarget(inbox)}>
                          <IoTrash size={18} />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    No categories yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editInbox} onClose={() => setEditInbox(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{editError}</Alert>}
          <Box component="form" id="edit-form" onSubmit={handleEdit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} disabled={isEditSubmitting} fullWidth />
            <TextField label="Description (for AI)" value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} disabled={isEditSubmitting} fullWidth multiline rows={2} />
            {mailAccounts && mailAccounts.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  Scope to mail accounts (leave empty to apply to all)
                </Typography>
                <FormGroup row>
                  {mailAccounts.map(ma => (
                    <FormControlLabel key={ma.id}
                      control={<Checkbox checked={editSelectedMailAccountIds.includes(ma.id)} onChange={() => toggleMailAccount(ma.id, editSelectedMailAccountIds, setEditSelectedMailAccountIds)} disabled={isEditSubmitting} size="small" />}
                      label={ma.name}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditInbox(null)} disabled={isEditSubmitting}>Cancel</Button>
          <Button type="submit" form="edit-form" variant="contained" disabled={isEditSubmitting}>
            {isEditSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Category</DialogTitle>
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
