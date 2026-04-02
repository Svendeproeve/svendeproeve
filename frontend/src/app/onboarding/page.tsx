'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { organizationApi } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const { hasOrganizations, isLoading: isLoadingOrgs, mutate } = useOrganizations();

  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!isLoadingOrgs && hasOrganizations) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, hasOrganizations, isLoadingOrgs, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    if (orgName.length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    if (!token) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);

    try {
      await organizationApi.create({ name: orgName }, token);
      await mutate();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingOrgs) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || hasOrganizations) {
    return null;
  }

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
          fontWeight: 400,
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
        Let's create your first organization
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 400,
        }}
      >
        {error && (
          <Alert severity="error" data-testid="onboarding-error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

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
          sx={{ mb: 3 }}
        />

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
          {isLoading ? 'Creating...' : 'Create Organization'}
        </Button>
      </Box>
    </Box>
  );
}
