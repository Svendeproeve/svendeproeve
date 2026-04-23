'use client';

import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { Email } from '@/lib/api';
import { useNowTick } from '@/lib/time';

export type ThreadTableColumn = {
  key: string;
  header: string;
  render: (email: Email) => ReactNode;
  cellSx?: SxProps<Theme>;
};

export type ThreadTableProps = {
  rows: Email[];
  columns: ThreadTableColumn[];
  onRowClick?: (email: Email) => void;
  isRowClickable?: (email: Email) => boolean;
  rowKey?: (email: Email) => string;
  emptyMessage?: string;
};

export default function ThreadTable({
  rows,
  columns,
  onRowClick,
  isRowClickable,
  rowKey = (e) => e.id,
  emptyMessage = 'No threads to display.',
}: ThreadTableProps) {
  useNowTick();

  const clickable = (email: Email) => {
    if (isRowClickable) return isRowClickable(email);
    return Boolean(onRowClick);
  };

  return (
    <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.key} sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((email) => {
              const canClick = clickable(email);
              return (
                <TableRow
                  key={rowKey(email)}
                  hover
                  onClick={canClick && onRowClick ? () => onRowClick(email) : undefined}
                  sx={{
                    cursor: canClick ? 'pointer' : 'default',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} sx={col.cellSx}>
                      {col.render(email)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
