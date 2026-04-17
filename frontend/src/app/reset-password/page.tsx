'use client';

import { useState, useEffect, Suspense } from 'react';
import { Box, TextField, Button, Typography, Link, Alert } from '@mui/material';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: '4rem',
          mb: 8,
          color: 'white',
        }}
      >
        Sortr
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            mb: 2,
            color: 'white',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Set New Password
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: 'text.secondary',
            textAlign: 'center',
          }}
        >
          Enter your new password below.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password reset successfully! Redirecting to login...
          </Alert>
        )}

        <Typography
          variant="body1"
          sx={{ mb: 1, color: 'white', fontWeight: 500 }}
        >
          New Password
        </Typography>
        <TextField
          fullWidth
          type="password"
          placeholder="••••••••••••••••"
          variant="outlined"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading || success}
          sx={{ mb: 2 }}
        />

        <Typography
          variant="body1"
          sx={{ mb: 1, color: 'white', fontWeight: 500 }}
        >
          Confirm New Password
        </Typography>
        <TextField
          fullWidth
          type="password"
          placeholder="••••••••••••••••"
          variant="outlined"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading || success}
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          disabled={isLoading || success}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {isLoading ? 'Resetting...' : success ? 'Success!' : 'Reset Password'}
        </Button>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Remember your password?{' '}
            <Link
              component={NextLink}
              href="/login"
              sx={{ color: 'white', textDecoration: 'underline' }}
            >
              Back to Login
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
