const INBOX_COLORS = ['#ff9800', '#4caf50', '#9c27b0', '#2196f3', '#f44336', '#00bcd4'];

export const getInboxColor = (index: number): string => INBOX_COLORS[index % INBOX_COLORS.length];
