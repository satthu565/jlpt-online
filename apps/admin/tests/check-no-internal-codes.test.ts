import { describe, expect, it } from 'vitest';
import {
  INTERNAL_CODE_PATTERN,
  scanJsonObject,
  sanitizeCodeForScan,
  runCheckNoInternalCodes,
} from '../scripts/check-no-internal-codes';

describe('D07: Check No Internal Feature Codes Suite', () => {
  it('detects internal code patterns with pattern (XXX-YY)', () => {
    const pattern = new RegExp(INTERNAL_CODE_PATTERN.source, 'g');
    expect('(ADM-01)'.match(pattern)).toEqual(['(ADM-01)']);
    expect('(LIB-06)'.match(pattern)).toEqual(['(LIB-06)']);
    expect('(EXAM-03)'.match(pattern)).toEqual(['(EXAM-03)']);
    expect('(PAY-12)'.match(pattern)).toEqual(['(PAY-12)']);
    expect('(SYS-08)'.match(pattern)).toEqual(['(SYS-08)']);
    expect('(PDF-26)'.match(pattern)).toEqual(['(PDF-26)']);

    // Non-matching regular text in parentheses
    pattern.lastIndex = 0;
    expect('(Teacher / Org)'.match(pattern)).toBeNull();
    pattern.lastIndex = 0;
    expect('(N1 - N5)'.match(pattern)).toBeNull();
    pattern.lastIndex = 0;
    expect('(Markdown)'.match(pattern)).toBeNull();
  });

  it('scans JSON translation objects and flags violations', () => {
    const dirtyJson = {
      header: {
        title: 'Trang quản trị (ADM-01)',
      },
      cleanKey: 'Tiêu đề sạch',
    };

    const violations = scanJsonObject(dirtyJson, 'messages/test.json');
    expect(violations.length).toBe(1);
    expect(violations[0]?.matched).toBe('(ADM-01)');
    expect(violations[0]?.keyPath).toBe('header.title');

    const cleanJson = {
      header: {
        title: 'Trang quản trị hệ thống',
      },
    };
    expect(scanJsonObject(cleanJson, 'messages/test.json').length).toBe(0);
  });

  it('sanitizes code to permit internal codes in comments and data-testid only', () => {
    const sampleCode = `
      // Single line comment (ADM-01)
      /* Multi line comment (LIB-06) */
      {/* JSX comment (EXAM-03) */}
      <div data-testid="dashboard-card-(ADM-01)">
        <h1>Tiêu đề sạch</h1>
      </div>
    `;

    const clean = sanitizeCodeForScan(sampleCode);
    INTERNAL_CODE_PATTERN.lastIndex = 0;
    expect(clean.match(INTERNAL_CODE_PATTERN)).toBeNull();

    const sampleViolatingCode = `
      <div>
        <h1>Tiêu đề hiển thị (ADM-01)</h1>
      </div>
    `;
    const dirtyClean = sanitizeCodeForScan(sampleViolatingCode);
    INTERNAL_CODE_PATTERN.lastIndex = 0;
    expect(dirtyClean.match(INTERNAL_CODE_PATTERN)).toEqual(['(ADM-01)']);
  });

  it('verifies apps/admin is 100% clean of internal feature codes in UI and translations', () => {
    const result = runCheckNoInternalCodes(process.cwd(), 'admin');
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });
});
