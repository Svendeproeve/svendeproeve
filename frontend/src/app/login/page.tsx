'use client';

import { Box, TextField, Button, Typography, Link } from '@mui/material';
import NextLink from 'next/link';

export default function LoginPage() {
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
          fontWeight: 400,
          mb: 8,
          color: 'white',
        }}
      >
        Sortr
      </Typography>

      <Box
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
          placeholder="you@example.com"
          variant="outlined"
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
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          Login
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
        </Box>
      </Box>
    </Box>
  );
}
