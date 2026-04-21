'use client';

import { useState } from 'react';
import { Box, TextField, Button, Typography, Link, Alert } from '@mui/material';
import NextLink from 'next/link';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Request failed. Please try again.');
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
          Reset Password
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: 'text.secondary',
            textAlign: 'center',
          }}
        >
          Enter your email address and we'll send you a link to reset your password.
        </Typography>

        {error && (
          <Alert severity="error" data-testid="forgot-password-error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" data-testid="forgot-password-success" sx={{ mb: 2 }}>
            If the email exists, a password reset link has been sent. Please check your inbox.
          </Alert>
        )}

        <Typography
          variant="body1"
          sx={{ mb: 1, color: 'white', fontWeight: 500 }}
        >
          Email
        </Typography>
        <TextField
          fullWidth
          type="email"
          placeholder="you@example.com"
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          inputProps={{ 'data-testid': 'forgot-password-email-input' }}
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          disabled={isLoading}
          data-testid="forgot-password-submit-button"
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
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
