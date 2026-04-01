/**
 * Returns an ISO date string for the start (00:00:00) of the given date.
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns an ISO date string for the end (23:59:59.999) of the given date.
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Returns a Date set to the first millisecond of the given month (0-indexed).
 */
export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

/**
 * Returns a Date set to the last millisecond of the given month (0-indexed).
 */
export function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

/**
 * Returns the ISO week number (1-53) for the given date.
 */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/**
 * Returns a short month label like "Jan 2025".
 */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns an array of the last N months as { year, month } objects,
 * sorted oldest → newest.
 */
export function lastNMonths(n: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}
