export interface PartitionMonth {
  year: number;
  month: number; // 1-12
  startDate: string; // YYYY-MM-01
  endDate: string; // next month YYYY-MM-01
  tableName: string; // attempt_events_yYYYYmMM
}

/**
 * Calculates partition target months starting from baseDate
 * Defaults to current month + next 2 months (total 3 months).
 */
export function getPartitionMonths(baseDate: Date = new Date(), count: number = 3): PartitionMonth[] {
  const result: PartitionMonth[] = [];
  const start = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), 1));

  for (let i = 0; i < count; i++) {
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const next = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));

    const year = cur.getUTCFullYear();
    const month = cur.getUTCMonth() + 1;
    const monthPad = String(month).padStart(2, '0');
    const nextYear = next.getUTCFullYear();
    const nextMonthPad = String(next.getUTCMonth() + 1).padStart(2, '0');

    result.push({
      year,
      month,
      startDate: `${year}-${monthPad}-01`,
      endDate: `${nextYear}-${nextMonthPad}-01`,
      tableName: `attempt_events_y${year}m${monthPad}`,
    });
  }

  return result;
}

/**
 * Ensures attempt_events partitions exist for the current and upcoming months.
 * Fully idempotent.
 */
export async function ensureAttemptEventsPartitions(
  sqlExecutor: { query: (sql: string) => Promise<unknown> },
  months?: PartitionMonth[],
): Promise<PartitionMonth[]> {
  const targetMonths = months ?? getPartitionMonths();

  for (const m of targetMonths) {
    try {
      // Try creating as a partition of partitioned table
      await sqlExecutor.query(`
        CREATE TABLE IF NOT EXISTS "${m.tableName}"
        PARTITION OF "attempt_events"
        FOR VALUES FROM ('${m.startDate}') TO ('${m.endDate}');
      `);
    } catch {
      // Fallback if attempt_events is a regular table or standalone partition table
      await sqlExecutor.query(`
        CREATE TABLE IF NOT EXISTS "${m.tableName}" (
          LIKE "attempt_events" INCLUDING ALL
        );
      `);
    }
  }

  return targetMonths;
}
