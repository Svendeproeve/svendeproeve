'use client';

import {
  Box,
  Typography,
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
import { notFound } from 'next/navigation';

const threadsData = [
  {
    title: 'Issue with recent order delivery',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '12 days',
    assignedTo: 'John Doe',
    status: 'Waiting',
  },
  {
    title: 'Issue with recent order delivery',
    classification: 'Critical',
    classificationColor: '#f44336',
    duration: '12 days',
    assignedTo: 'Alicia Bathtub',
    status: 'Ready',
  },
  {
    title: 'Issue with recent order delivery',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '12 days',
    assignedTo: 'Alicia Bathtub',
    status: 'Ready',
  },
  {
    title: 'Issue with recent order delivery',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '12 days',
    assignedTo: 'Alicia Bathtub',
    status: 'Ready',
  },
  {
    title: 'Issue with recent order delivery',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '12 days',
    assignedTo: 'Alicia Bathtub',
    status: 'Ready',
  },
  {
    title: 'Issue with recent order delivery',
    classification: 'Non-Critical',
    classificationColor: '#2196f3',
    duration: '12 days',
    assignedTo: 'Alicia Bathtub',
    status: 'Ready',
  },
];

export default function InboxPage({ params }: { params: { id: string } }) {
  const inbox = getInboxById(params.id);

  if (!inbox) {
    notFound();
  }

  return (
    <DashboardLayout>
      <Typography variant="h4" sx={{ mb: 4, color: 'white', fontWeight: 400 }}>
        {inbox.name} Threads
      </Typography>

      <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Classification</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Duration</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Assigned to</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {threadsData.map((thread, index) => (
              <TableRow key={index} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                <TableCell sx={{ color: 'white' }}>{thread.title}</TableCell>
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
                <TableCell sx={{ color: 'white' }}>{thread.assignedTo}</TableCell>
                <TableCell sx={{ color: 'white' }}>{thread.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DashboardLayout>
  );
}
