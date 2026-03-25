export interface Inbox {
  id: string;
  name: string;
  color: string;
}

export const inboxes: Inbox[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Support',
    color: '#ff9800',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Accounting',
    color: '#4caf50',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'HR',
    color: '#9c27b0',
  },
];

export const getInboxById = (id: string): Inbox | undefined => {
  return inboxes.find((inbox) => inbox.id === id);
};
