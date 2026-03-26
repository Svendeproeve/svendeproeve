'use client';

import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import DashboardLayout from '@/components/DashboardLayout';
import { getInboxById } from '@/lib/inboxes';

const statsData = [
  { label: 'Active Threads', value: '67' },
  { label: 'Critical Threads', value: '19' },
  { label: 'Average Response Time', value: '32 min' },
  { label: 'Closed Threads', value: '69' },
  { label: 'AI Accuracy', value: '98.8%' },
];

const threadsData = [
  {
    title: 'Issue with recent order delivery',
    inboxId: '550e8400-e29b-41d4-a716-446655440001',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '12 days',
  },
  {
    title: 'Question about invoice details',
    inboxId: '550e8400-e29b-41d4-a716-446655440002',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '6 days',
  },
  {
    title: 'Request for account information',
    inboxId: '550e8400-e29b-41d4-a716-446655440001',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '19 days',
  },
  {
    title: 'Unable to log into account',
    inboxId: '550e8400-e29b-41d4-a716-446655440001',
    classification: 'Critical',
    classificationColor: '#f44336',
    duration: '11 hours',
  },
  {
    title: 'Change of contact information',
    inboxId: '550e8400-e29b-41d4-a716-446655440003',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '67 days',
  },
  {
    title: 'Incorrect charge on account',
    inboxId: '550e8400-e29b-41d4-a716-446655440002',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '9 days',
  },
];

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <Typography variant="h4" sx={{ mb: 4, color: 'white', fontWeight: 400 }}>
        Goodmorning, John Doe!
      </Typography>

      <Typography variant="h6" sx={{ mb: 3, color: 'white', textAlign: 'center' }}>
        Weekly Statistics
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statsData.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
            <Card sx={{ bgcolor: '#4a4a4a', textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h3" sx={{ color: 'white', fontWeight: 400, mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" sx={{ mb: 2, color: 'white', fontWeight: 400 }}>
        Your Threads
      </Typography>

      <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Inbox</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Classification</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {threadsData.map((thread, index) => {
              const inbox = getInboxById(thread.inboxId);
              return (
                <TableRow key={index} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell sx={{ color: 'white' }}>{thread.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={inbox?.name || 'Unknown'}
                      sx={{
                        bgcolor: inbox?.color || '#666666',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={thread.classification}
                      sx={{
                        bgcolor: thread.classificationColor,
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>{thread.duration}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardLayout>
  );
}
