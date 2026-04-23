'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Link } from '@mui/material';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';

export default function LoginPage() {
  const router = useRouter();
  const { signin, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showSnackbar('All fields are required', 'error');
      return;
    }

    setIsLoading(true);

    try {
      await signin({ email, password });
      router.push('/dashboard');
    } catch (err: any) {
      showSnackbar(err.message || 'Login failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isAuthenticated) return null;

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
        data-testid="login-title"
        sx={{
          fontFamily: 'var(--font-inria-serif), serif',
          fontWeight: 700,
          letterSpacing: '-0.15em',
          fontSize: '3rem',
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
          maxWidth: 300,
        }}
      >
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
          inputProps={{ 'data-testid': 'login-email-input' }}
          sx={{ mb: 2 }}
        />

        <Typography
          variant="body1"
          sx={{ mb: 1, color: 'white', fontWeight: 500 }}
        >
          Password
        </Typography>
        <TextField
          fullWidth
          type="password"
          placeholder="••••••••••••••••"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          inputProps={{ 'data-testid': 'login-password-input' }}
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          disabled={isLoading}
          data-testid="login-submit-button"
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Don't have an account yet?{' '}
            <Link
              component={NextLink}
              href="/register"
              sx={{ color: 'white', textDecoration: 'underline' }}
            >
              Register here!
            </Link>
          </Typography>
          <Link
            component={NextLink}
            href="/forgot-password"
            data-testid="login-forgot-password-link"
            sx={{ display: 'inline-block', mt: 1, color: 'text.secondary', textDecoration: 'underline', fontSize: '0.875rem' }}
          >
            Forgot password?
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
