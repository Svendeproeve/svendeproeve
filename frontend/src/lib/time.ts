import { useEffect, useState } from 'react';

const EMPTY = '—';

function pluralize(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

export function formatRelativeTime(raw: string | null | undefined, now: Date = new Date()): string {
  if (!raw) return EMPTY;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return EMPTY;

  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    const remMin = diffMin - diffHour * 60;
    if (remMin === 0) return `${diffHour}h ago`;
    return `${diffHour}h ${remMin}m ago`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return pluralize(diffDay, 'day');

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return pluralize(diffWeek, 'week');

  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatAbsoluteDateTime(raw: string | null | undefined): string {
  if (!raw) return EMPTY;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw ?? EMPTY;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trigger a re-render on a fixed interval so relative time labels stay fresh
 * without a full data refetch. Default 60s granularity is sufficient because
 * our smallest unit is one minute.
 */
export function useNowTick(intervalMs: number = 60_000): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
