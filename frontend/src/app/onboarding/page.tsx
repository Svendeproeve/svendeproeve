'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert, Card, CardContent, List, ListItem, ListItemButton, ListItemText, Divider } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations, setStoredOrgId, getStoredOrgId } from '@/hooks/useOrganizations';
import { organizationApi } from '@/lib/api';
import { useSnackbar } from '@/contexts/SnackbarContext';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceSwitch = searchParams.get('switch') === 'true';
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { organizations, isLoading: isLoadingOrgs, mutate } = useOrganizations();
  const { showSnackbar } = useSnackbar();

  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!forceSwitch && !isLoadingOrgs && organizations.length > 0) {
      const storedOrgId = getStoredOrgId();
      const hasValidStoredOrg = organizations.some(o => o.id === storedOrgId);
      if (hasValidStoredOrg) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, authLoading, isLoadingOrgs, organizations, router, forceSwitch]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      showSnackbar('Organization name is required', 'error');
      return;
    }

    if (orgName.length < 2) {
      showSnackbar('Organization name must be at least 2 characters', 'error');
      return;
    }

    if (!token) {
      showSnackbar('Not authenticated', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const created = await organizationApi.create({ name: orgName }, token);
      setStoredOrgId(created.id);
      await mutate();
      setOrgName('');
      setShowCreateForm(false);
      router.push('/dashboard');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to create organization', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrganization = (orgId: string) => {
    setStoredOrgId(orgId);
    router.push('/dashboard');
  };

  if (authLoading || isLoadingOrgs || !isAuthenticated) return null;

  const storedOrgId = getStoredOrgId();
  const willAutoRedirect = !forceSwitch && organizations.length > 0 && organizations.some(o => o.id === storedOrgId);
  if (willAutoRedirect) return null;

  const hasOrganizations = organizations.length > 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Typography
        variant="h1"
        data-testid="onboarding-welcome-title"
        sx={{
          fontSize: '4rem',
          
          mb: 2,
          color: 'white',
        }}
      >
        Welcome to Sortr
      </Typography>

      <Typography
        variant="h6"
        data-testid="onboarding-subtitle"
        sx={{
          mb: 6,
          color: 'text.secondary',
          textAlign: 'center',
        }}
      >
        {hasOrganizations ? 'Select or create an organization' : 'Get started by creating an organization'}
      </Typography>

      <Box
        sx={{
          width: '100%',
          maxWidth: 600,
        }}
      >
        {/* Organization List */}
        {hasOrganizations && (
          <Card sx={{ mb: 3, bgcolor: '#2c2c2c' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                Your Organizations
              </Typography>
              <List>
                {organizations.map((org, index) => (
                  <Box key={org.id}>
                    {index > 0 && <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleSelectOrganization(org.id)}
                        data-testid={`select-org-${org.id}`}
                        sx={{
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                        }}
                      >
                        <ListItemText
                          primary={org.name}
                          secondary={`Created ${new Date(org.created_at).toLocaleDateString()}`}
                          sx={{
                            '& .MuiListItemText-primary': { color: 'white' },
                            '& .MuiListItemText-secondary': { color: 'text.secondary' },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* No Organizations Message */}
        {!hasOrganizations && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Either create an organization or join by invite from organization owner.
          </Alert>
        )}

        {/* Create Organization Section */}
        {!showCreateForm ? (
          <Button
            fullWidth
            variant="contained"
            onClick={() => setShowCreateForm(true)}
            data-testid="show-create-org-button"
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Create New Organization
          </Button>
        ) : (
          <Card sx={{ bgcolor: '#2c2c2c' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                Create Organization
              </Typography>
              <Box component="form" onSubmit={handleCreateOrganization}>
                <Typography
                  variant="body1"
                  sx={{ mb: 1, color: 'white', fontWeight: 500 }}
                >
                  Organization Name
                </Typography>
                <TextField
                  fullWidth
                  placeholder="My Company"
                  variant="outlined"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  inputProps={{ 'data-testid': 'onboarding-org-name-input' }}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    data-testid="onboarding-create-org-button"
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                    }}
                  >
                    {isLoading ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setShowCreateForm(false);
                      setOrgName('');
                    }}
                    disabled={isLoading}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
