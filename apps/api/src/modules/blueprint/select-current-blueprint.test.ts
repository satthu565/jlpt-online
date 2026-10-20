import { describe, it, expect } from 'vitest';
import { currentSession, selectCurrentBlueprint as selectRows } from './blueprint.service.js';

const selectCurrentBlueprint = (rows: Row[], now: Date) => selectRows(rows as never, now) as Row | undefined;

// I22: one level can have several active blueprints (demo synthetic, official 2010, official 2020).
type Row = {
  id: string;
  status: string;
  kind: string;
  isOfficial: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
};

const synthetic: Row = { id: 'synthetic-n5-demo', status: 'active', kind: 'synthetic', isOfficial: false, effectiveFrom: '2026-10', effectiveTo: null, version: 1 };
const n5_2010: Row = { id: 'jlpt-n5-2010', status: 'active', kind: 'official', isOfficial: true, effectiveFrom: '2010-07', effectiveTo: '2020-07', version: 1 };
const n5_2020: Row = { id: 'jlpt-n5-2020', status: 'active', kind: 'official', isOfficial: true, effectiveFrom: '2020-12', effectiveTo: null, version: 1 };
const now = new Date('2026-10-20T00:00:00Z');

describe('selectCurrentBlueprint', () => {
  it('prefers the official blueprint in force over the demo and the expired one', () => {
    expect(selectCurrentBlueprint([synthetic, n5_2010, n5_2020], now)?.id).toBe('jlpt-n5-2020');
    expect(selectCurrentBlueprint([n5_2020, synthetic, n5_2010], now)?.id).toBe('jlpt-n5-2020');
  });

  it('ignores blueprints that are not active', () => {
    expect(selectCurrentBlueprint([synthetic, { ...n5_2020, status: 'draft' }], now)?.id).toBe('synthetic-n5-demo');
  });

  it('falls back to an expired blueprint only when nothing else is active', () => {
    expect(selectCurrentBlueprint([n5_2010], now)?.id).toBe('jlpt-n5-2010');
  });

  it('picks the newest effectiveFrom, then the highest version, among official blueprints', () => {
    const v2 = { ...n5_2020, id: 'jlpt-n5-2020-v2', version: 2 };
    expect(selectCurrentBlueprint([n5_2020, v2], now)?.id).toBe('jlpt-n5-2020-v2');
  });

  it('returns undefined when the level has no active blueprint', () => {
    expect(selectCurrentBlueprint([], now)).toBeUndefined();
  });

  it('formats the session as YYYY-MM', () => {
    expect(currentSession(now)).toBe('2026-10');
  });
});
