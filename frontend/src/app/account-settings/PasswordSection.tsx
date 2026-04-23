'use client';

import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { userApi } from '@/lib/api';
import { useSnackbar } from '@/contexts/SnackbarContext';

export default function PasswordSection() {
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar('All password fields are required', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showSnackbar('New password must be at least 8 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    if (!token || !user) return;

    setIsSubmitting(true);
    try {
      await userApi.changePassword(
        user.id,
        { current_password: currentPassword, new_password: newPassword },
        token
      );
      showSnackbar('Password changed successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to change password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>

      <Card sx={{ bgcolor: '#2c2c2c' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, color: 'white' }}>
            Change Password
          </Typography>

          <Box component="form" onSubmit={handleChangePassword}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Current Password
            </Typography>
            <TextField
              fullWidth
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              New Password
            </Typography>
            <TextField
              fullWidth
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 2 }}
              helperText="Must be at least 8 characters"
            />

            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Confirm New Password
            </Typography>
            <TextField
              fullWidth
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isSubmitting ? 'Changing...' : 'Change Password'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
