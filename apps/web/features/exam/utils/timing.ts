/**
 * Exam Timing & Server Synchronization Helpers
 * Pure mathematical functions for countdown and clock calculation.
 * Self-contained in web app to avoid pulling heavy engine packages into Client SSR bundle.
 */

export function toEpochMs(val: Date | string | number): number {
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function computeServerOffset(
  serverNow: Date | string | number,
  clientNow: Date | string | number,
): number {
  return toEpochMs(serverNow) - toEpochMs(clientNow);
}

export function computeClientRemainingMs(
  deadline: Date | string | number,
  serverNow: Date | string | number,
  clientNow: Date | string | number,
): number {
  const deadlineMs = toEpochMs(deadline);
  const offset = computeServerOffset(serverNow, clientNow);
  const estimatedServerNow = toEpochMs(clientNow) + offset;
  return Math.max(0, deadlineMs - estimatedServerNow);
}
