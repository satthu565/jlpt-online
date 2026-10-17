import { describe, it, expect } from 'vitest';
import { runPitrDrill } from '../../infra/backup/drill-pitr.ts';

describe('Backup PITR Restore Drill & Metrics (SYS-08 / ADM-20)', () => {
  it('executes PITR drill, measures RPO and RTO within acceptance thresholds', async () => {
    const metrics = await runPitrDrill({
      targetRtoMaxSec: 3600, // 1 hour acceptance limit
      targetRpoMaxSec: 300,  // 5 minutes acceptance limit
    });

    expect(metrics.rtoAcceptable).toBe(true);
    expect(metrics.rpoAcceptable).toBe(true);
    expect(metrics.rtoSeconds).toBeLessThan(3600);
    expect(metrics.rpoSeconds).toBeLessThanOrEqual(300);
    expect(metrics.restoreJobStartedAtUTC).toBeDefined();
    expect(metrics.restoreJobFinishedAtUTC).toBeDefined();
    expect(metrics.targetRecoveryTime).toBeDefined();
    expect(metrics.latestRestoredTimestamp).toBeDefined();
    expect(metrics.stagingIsolated).toBe(true);
    expect(metrics.archiveModeDuringDrill).toBe('off');
    expect(metrics.postTargetRecordsExcluded).toBe(true);
    expect(metrics.recordsRestored).toBeGreaterThan(0);
  }, 30000);
});
