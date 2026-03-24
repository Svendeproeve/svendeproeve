'use client';

import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Stack
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import ContactMailIcon from '@mui/icons-material/ContactMail';

export default function Home() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Next.js + MUI App
          </Typography>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to Next.js with Material UI
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            This is a starter template with Next.js 15 and Material UI 6
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <HomeIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" component="h2">
                    Fast Development
                  </Typography>
                  <Typography color="text.secondary" align="center">
                    Build your app quickly with Next.js App Router and MUI components
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <InfoIcon color="secondary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" component="h2">
                    Modern UI
                  </Typography>
                  <Typography color="text.secondary" align="center">
                    Beautiful, responsive components following Material Design
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <ContactMailIcon color="success" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" component="h2">
                    TypeScript
                  </Typography>
                  <Typography color="text.secondary" align="center">
                    Full TypeScript support for better developer experience
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              Get Started
            </Typography>
            <Typography color="text.secondary" paragraph>
              Try out some Material UI components below:
            </Typography>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                label="Your Name"
                variant="outlined"
                fullWidth
              />
              <TextField
                label="Email"
                variant="outlined"
                type="email"
                fullWidth
              />
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Stack spacing={2} direction="row">
                <Button variant="contained" color="primary">
                  Submit
                </Button>
                <Button variant="outlined" color="secondary">
                  Cancel
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Edit src/app/page.tsx to customize this page
          </Typography>
        </Box>
      </Container>
    </>
  );
}
