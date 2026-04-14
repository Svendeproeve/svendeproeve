const CATEGORY_COLORS = ['#ff9800', '#4caf50', '#9c27b0', '#2196f3', '#f44336', '#00bcd4'];

export const getCategoryColor = (index: number): string => CATEGORY_COLORS[index % CATEGORY_COLORS.length];
