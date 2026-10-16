export interface LocalDayParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Gets timezone offset in milliseconds for a specific UTC date.
 * Positive if timezone is ahead of UTC (e.g. +7h for Asia/Ho_Chi_Minh).
 */
export function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce(
    (acc, p) => {
      acc[p.type] = p.value;
      return acc;
    },
    {} as Record<string, string>,
  );

  const h = parts['hour'] === '24' ? 0 : Number(parts['hour']);
  const asUtc = Date.UTC(
    Number(parts['year']),
    Number(parts['month']) - 1,
    Number(parts['day']),
    h,
    Number(parts['minute']),
    Number(parts['second']),
  );

  return asUtc - date.getTime();
}

/**
 * Extracts local date parts (year, month, day, hour, minute, second) in given timezone.
 */
export function getLocalDayParts(date: Date, timezone: string): LocalDayParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce(
    (acc, p) => {
      acc[p.type] = p.value;
      return acc;
    },
    {} as Record<string, string>,
  );

  const h = parts['hour'] === '24' ? 0 : Number(parts['hour']);
  return {
    year: Number(parts['year']),
    month: Number(parts['month']),
    day: Number(parts['day']),
    hour: h,
    minute: Number(parts['minute']),
    second: Number(parts['second']),
  };
}

/**
 * Constructs exact UTC Date matching year, month, day, hour in the given timezone.
 */
export function getLocalMidnightUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  timezone: string,
): Date {
  const approxUtc = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
  const offset = getTimezoneOffsetMs(new Date(approxUtc), timezone);
  const target = new Date(approxUtc - offset);
  const refinedOffset = getTimezoneOffsetMs(target, timezone);
  return new Date(approxUtc - refinedOffset);
}

/**
 * Aligns scheduled review interval to the midnight boundary of the target day
 * in the user's timezone.
 *
 * If cutoffHour > 0 (e.g. 4 for 4:00 AM), the logical "day" starts at cutoffHour.
 */
export function alignIntervalToMidnight(
  baseDate: Date,
  scheduledDays: number,
  timezone = 'Asia/Ho_Chi_Minh',
  cutoffHour = 0,
): Date {
  const parts = getLocalDayParts(baseDate, timezone);

  // If baseDate is before cutoffHour, it belongs to previous calendar day
  let effectiveDay = parts.day;
  if (parts.hour < cutoffHour) {
    effectiveDay -= 1;
  }

  // Target local date is effectiveDay + scheduledDays
  const targetLocalUtc = new Date(Date.UTC(parts.year, parts.month - 1, effectiveDay + scheduledDays));
  const targetYear = targetLocalUtc.getUTCFullYear();
  const targetMonth = targetLocalUtc.getUTCMonth() + 1;
  const targetDay = targetLocalUtc.getUTCDate();

  return getLocalMidnightUtc(targetYear, targetMonth, targetDay, cutoffHour, timezone);
}

/**
 * Returns the exact UTC Date marking the beginning of the local day (00:00:00 or cutoffHour).
 */
export function getStartOfLocalDay(
  date: Date,
  timezone = 'Asia/Ho_Chi_Minh',
  cutoffHour = 0,
): Date {
  const parts = getLocalDayParts(date, timezone);
  let effectiveDay = parts.day;
  if (parts.hour < cutoffHour) {
    effectiveDay -= 1;
  }
  const localUtc = new Date(Date.UTC(parts.year, parts.month - 1, effectiveDay));
  return getLocalMidnightUtc(
    localUtc.getUTCFullYear(),
    localUtc.getUTCMonth() + 1,
    localUtc.getUTCDate(),
    cutoffHour,
    timezone,
  );
}

/**
 * Returns the exact UTC Date marking the end of the local day (just before next cutoff/midnight).
 */
export function getEndOfLocalDay(
  date: Date,
  timezone = 'Asia/Ho_Chi_Minh',
  cutoffHour = 0,
): Date {
  const startOfNextDay = alignIntervalToMidnight(date, 1, timezone, cutoffHour);
  return new Date(startOfNextDay.getTime() - 1);
}

/**
 * Determines whether a card due at `due` is due today or overdue as of `asOf`
 * in the given timezone and cutoffHour.
 */
export function isCardDue(
  due: Date | string,
  asOf: Date = new Date(),
  timezone = 'Asia/Ho_Chi_Minh',
  cutoffHour = 0,
): boolean {
  const dueDate = typeof due === 'string' ? new Date(due) : due;
  const endOfDay = getEndOfLocalDay(asOf, timezone, cutoffHour);
  return dueDate.getTime() <= endOfDay.getTime();
}

/**
 * Filters an array of cards and returns only those that are due today or overdue
 * in the user's timezone.
 */
export function filterDueCards<T extends { due: Date | string }>(
  cards: T[],
  asOf: Date = new Date(),
  timezone = 'Asia/Ho_Chi_Minh',
  cutoffHour = 0,
): T[] {
  const endOfDay = getEndOfLocalDay(asOf, timezone, cutoffHour);
  const endOfDayMs = endOfDay.getTime();
  return cards.filter((c) => {
    const dueMs = typeof c.due === 'string' ? new Date(c.due).getTime() : c.due.getTime();
    return dueMs <= endOfDayMs;
  });
}
