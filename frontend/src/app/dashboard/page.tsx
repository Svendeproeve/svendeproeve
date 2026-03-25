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
    inbox: 'Support',
    inboxColor: '#ff9800',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '12 days',
  },
  {
    title: 'Question about invoice details',
    inbox: 'Accounting',
    inboxColor: '#4caf50',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '6 days',
  },
  {
    title: 'Request for account information',
    inbox: 'Support',
    inboxColor: '#ff9800',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '19 days',
  },
  {
    title: 'Unable to log into account',
    inbox: 'Support',
    inboxColor: '#ff9800',
    classification: 'Critical',
    classificationColor: '#f44336',
    duration: '11 hours',
  },
  {
    title: 'Change of contact information',
    inbox: 'HR',
    inboxColor: '#9c27b0',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '67 days',
  },
  {
    title: 'Incorrect charge on account',
    inbox: 'Accounting',
    inboxColor: '#4caf50',
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
          <Grid item xs={12} sm={6} md={2.4} key={index}>
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
            {threadsData.map((thread, index) => (
              <TableRow key={index} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                <TableCell sx={{ color: 'white' }}>{thread.title}</TableCell>
                <TableCell>
                  <Chip
                    label={thread.inbox}
                    sx={{
                      bgcolor: thread.inboxColor,
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardLayout>
  );
}
