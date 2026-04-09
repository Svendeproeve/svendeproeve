'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Container, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
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

  if (isAuthenticated) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            textAlign: 'center',
            mb: 8,
            mt: 8,
          }}
        >
          <Typography
            variant="h1"
            data-testid="landing-title"
            sx={{
              fontSize: { xs: '3rem', md: '5rem' },
              
              mb: 3,
              color: 'white',
            }}
          >
            Sortr
          </Typography>

          <Typography
            variant="h5"
            data-testid="landing-tagline"
            sx={{
              mb: 2,
              color: 'text.secondary',
              
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Smart email management powered by AI
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 5,
              color: 'text.secondary',
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Automatically organize, classify, and prioritize your emails with intelligent filtering and team collaboration.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              data-testid="get-started-button"
              onClick={() => router.push('/register')}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              data-testid="login-button"
              onClick={() => router.push('/login')}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              Login
            </Button>
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#4a4a4a', height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                  AI-Powered Classification
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Automatically classify and prioritize emails with advanced AI models that understand context and urgency.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#4a4a4a', height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                  Team Collaboration
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Work together with your team on shared inboxes with role-based access control and permissions.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#4a4a4a', height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                  Smart Filtering
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Create custom filters with natural language rules that intelligently route emails to the right inbox.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
