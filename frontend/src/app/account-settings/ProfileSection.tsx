'use client';

import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { userApi } from '@/lib/api';
import { useSnackbar } from '@/contexts/SnackbarContext';

export default function ProfileSection() {
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showSnackbar('Full name is required', 'error');
      return;
    }

    if (!token || !user) return;

    setIsSubmitting(true);
    try {
      await userApi.updateProfile(user.id, { full_name: fullName }, token);
      showSnackbar('Profile updated successfully', 'success');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>

      <Card sx={{ bgcolor: '#2c2c2c' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, color: 'white' }}>
            Profile Information
          </Typography>

          <Box component="form" onSubmit={handleUpdateProfile}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Email
            </Typography>
            <TextField
              fullWidth
              value={user?.email || ''}
              disabled
              sx={{ mb: 2 }}
              helperText="Email cannot be changed"
            />

            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Full Name
            </Typography>
            <TextField
              fullWidth
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{
                px: 4,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
