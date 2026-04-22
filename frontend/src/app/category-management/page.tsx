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
import { useCategories } from '@/hooks/useCategories';
import { categoryApi, mailAccountApi, CategoryCreateData, CategoryUpdateData, Category, MailAccount, organizationApi, Member } from '@/lib/api';
import useSWR from 'swr';
import { useSnackbar } from '@/contexts/SnackbarContext';

const DEFAULT_FORM: CategoryCreateData = { name: '', description: '', color: undefined };

export default function CategoryManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user, token, isLoading: isLoadingAuth } = useAuth();
  const { organizations, currentOrg, isLoading: isLoadingOrgs } = useOrganizations();
  const { showSnackbar } = useSnackbar();

  const { categories, isLoading: isLoadingCategories, mutate } = useCategories();

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

  const [form, setForm] = useState<CategoryCreateData>(DEFAULT_FORM);
  const [selectedMailAccountIds, setSelectedMailAccountIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState<CategoryUpdateData>({});
  const [editSelectedMailAccountIds, setEditSelectedMailAccountIds] = useState<string[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
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
    if (!currentOrg || !token) return;
    setIsSubmitting(true);
    try {
      await categoryApi.create(currentOrg.id, {
        name: form.name,
        description: form.description || undefined,
        color: form.color || undefined,
        mail_account_ids: selectedMailAccountIds.length > 0 ? selectedMailAccountIds : undefined,
      }, token);
      await mutate();
      const categoryName = form.name;
      setForm(DEFAULT_FORM);
      setSelectedMailAccountIds([]);
      showSnackbar(`Category "${categoryName}" created`, 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to create category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (category: Category) => {
    setEditCategory(category);
    setEditForm({ name: category.name, description: category.description || '', color: category.color });
    setEditSelectedMailAccountIds(category.mail_account_ids ?? []);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory || !currentOrg || !token) return;
    setIsEditSubmitting(true);
    try {
      await categoryApi.update(currentOrg.id, editCategory.id, {
        ...editForm,
        mail_account_ids: editSelectedMailAccountIds,
      }, token);
      await mutate();
      setEditCategory(null);
      showSnackbar('Category updated successfully', 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to update category', 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !currentOrg || !token) return;
    setIsDeleting(true);
    try {
      await categoryApi.delete(currentOrg.id, deleteTarget.id, token);
      await mutate();
      setDeleteTarget(null);
      showSnackbar('Category deleted successfully', 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to delete category', 'error');
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

          <Box component="form" onSubmit={handleCreate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={isSubmitting}
                required
                inputProps={{ 'data-testid': 'category-name-input' }}
              />
              <TextField
                label="Description (for AI)"
                value={form.description || ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                disabled={isSubmitting}
                multiline
                rows={3}
                required
                inputProps={{ 'data-testid': 'category-description-input' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 1,
                    bgcolor: form.color || '#444',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }} />
                  <Box
                    component="input"
                    type="color"
                    value={form.color || '#888888'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, color: e.target.value }))}
                    disabled={isSubmitting}
                    sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />
                </Box>
                <TextField
                  label="Color (hex)"
                  value={form.color || ''}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value || undefined }))}
                  placeholder="None"
                  inputProps={{ maxLength: 20 }}
                  disabled={isSubmitting}
                  size="small"
                  sx={{ width: 140 }}
                />
                {form.color && (
                  <Button size="small" onClick={() => setForm(f => ({ ...f, color: undefined }))} sx={{ textTransform: 'none', fontSize: '0.75rem', color: 'text.secondary' }}>
                    Clear
                  </Button>
                )}
              </Box>
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
              data-testid="category-submit"
              disabled={isSubmitting || !form.name.trim() || !form.description?.trim()}
              sx={{ px: 4, py: 1.5, fontWeight: 600, textTransform: 'none' }}>
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Existing Categories</Typography>

      {isLoadingCategories ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600, width: 60 }}>Color</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Mail Accounts</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length > 0 ? categories.map(category => (
                <TableRow key={category.id} data-testid={`category-row-${category.id}`} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: 'white' }}>
                    {category.name}
                    {category.is_system && (
                      <Chip label="System" size="small" sx={{ ml: 1, bgcolor: '#444', color: 'text.secondary', fontSize: '0.65rem' }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {category.color ? (
                      <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: category.color, border: '1px solid rgba(255,255,255,0.15)' }} />
                    ) : (
                      <Typography variant="body2" sx={{ color: '#555' }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{category.description || '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {category.mail_account_ids && category.mail_account_ids.length > 0
                      ? category.mail_account_ids.map(id => mailAccounts?.find(ma => ma.id === id)?.name || id).join(', ')
                      : 'All'}
                  </TableCell>
                  <TableCell>
                    {category.is_system ? (
                      <IoLockClosed size={16} color="#555" />
                    ) : (
                      <>
                        <IconButton size="small" sx={{ color: 'text.secondary' }} data-testid={`category-edit-${category.id}`} onClick={() => openEdit(category)}>
                          <IoPencil size={18} />
                        </IconButton>
                        <IconButton size="small" sx={{ color: '#f44336' }} data-testid={`category-delete-${category.id}`} onClick={() => setDeleteTarget(category)}>
                          <IoTrash size={18} />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    No categories yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editCategory} onClose={() => setEditCategory(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <Box component="form" id="edit-form" onSubmit={handleEdit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} disabled={isEditSubmitting} fullWidth inputProps={{ 'data-testid': 'category-edit-name' }} />
            <TextField label="Description (for AI)" value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} disabled={isEditSubmitting} fullWidth multiline rows={2} inputProps={{ 'data-testid': 'category-edit-description' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 1,
                  bgcolor: editForm.color || '#444',
                  border: '2px solid rgba(255,255,255,0.15)',
                }} />
                <Box
                  component="input"
                  type="color"
                  value={editForm.color || '#888888'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, color: e.target.value }))}
                  disabled={isEditSubmitting}
                  sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                />
              </Box>
              <TextField
                label="Color (hex)"
                value={editForm.color || ''}
                onChange={e => setEditForm(f => ({ ...f, color: e.target.value || undefined }))}
                placeholder="None"
                inputProps={{ maxLength: 20 }}
                disabled={isEditSubmitting}
                size="small"
                sx={{ width: 140 }}
              />
              {editForm.color && (
                <Button size="small" onClick={() => setEditForm(f => ({ ...f, color: undefined }))} sx={{ textTransform: 'none', fontSize: '0.75rem', color: 'text.secondary' }}>
                  Clear
                </Button>
              )}
            </Box>
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
          <Button onClick={() => setEditCategory(null)} disabled={isEditSubmitting}>Cancel</Button>
          <Button type="submit" form="edit-form" variant="contained" disabled={isEditSubmitting} data-testid="category-edit-save">
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
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting} data-testid="category-delete-confirm">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
