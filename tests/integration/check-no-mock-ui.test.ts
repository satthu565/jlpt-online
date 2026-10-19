import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  scanCodeString,
  fileToRoute,
  isCoveredByBaseline,
  runNoMockUiCheck,
  type ScannedFileResult,
  type BaselineEntry,
  type ViolationMatch,
} from './check-no-mock-ui.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRootDir = path.resolve(__dirname, '../../');

describe('check:no-mock-ui Scanner & Baseline Gate', () => {
  describe('Rule Category 1: ALL_SAMPLE detection', () => {
    it('catches ALL_SAMPLE and ALL_SAMPLE_EXAMS identifiers', () => {
      const code = `
        import React from 'react';
        export const exam = ALL_SAMPLE_EXAMS.find(e => e.id === '1');
        const list = ALL_SAMPLE;
      `;
      const matches: ViolationMatch[] = scanCodeString(code);
      const allSampleMatches = matches.filter((m: ViolationMatch) => m.category === 'ALL_SAMPLE');

      expect(allSampleMatches.length).toBeGreaterThanOrEqual(2);
      expect(allSampleMatches.some((m: ViolationMatch) => m.matched === 'ALL_SAMPLE_EXAMS')).toBe(true);
      expect(allSampleMatches.some((m: ViolationMatch) => m.matched === 'ALL_SAMPLE')).toBe(true);
    });
  });

  describe('Rule Category 2: Mảng mẫu / Hardcoded sample data detection', () => {
    it('catches SAMPLE_* and MOCK_* constants', () => {
      const code = `
        const SAMPLE_USERS = [{ id: 'u1', name: 'Sample' }];
        const MOCK_EXAM_LIST = [1, 2, 3];
      `;
      const matches: ViolationMatch[] = scanCodeString(code);
      const sampleMatches = matches.filter((m: ViolationMatch) => m.category === 'mảng mẫu');

      expect(sampleMatches.some((m: ViolationMatch) => m.matched === 'SAMPLE_USERS')).toBe(true);
      expect(sampleMatches.some((m: ViolationMatch) => m.matched === 'MOCK_EXAM_LIST')).toBe(true);
    });

    it('catches imports from fixture directories in application code', () => {
      const code = `
        import { SAMPLE_N5_EXAM_SNAPSHOT } from '../../../features/exam/fixtures/sample-exam';
        import { ALL_SAMPLE_EXAMS } from '../../features/exam/fixtures/exam-fixtures';
      `;
      const matches: ViolationMatch[] = scanCodeString(code);
      const fixtureImports = matches.filter((m: ViolationMatch) => m.ruleId === 'RULE_FIXTURE_IMPORT');

      expect(fixtureImports.length).toBe(2);
    });

    it('catches hardcoded sample identifiers in state or components', () => {
      const code = `
        const initialLogs = [{ id: 'aud_sample_1', text: 'audit' }];
        const reconciliationRun = { id: 'rec_run_sample_1' };
      `;
      const matches: ViolationMatch[] = scanCodeString(code);
      const idMatches = matches.filter((m: ViolationMatch) => m.ruleId === 'RULE_SAMPLE_RECORD_IDENTIFIER');

      expect(idMatches.some((m: ViolationMatch) => m.matched === 'aud_sample_1')).toBe(true);
      expect(idMatches.some((m: ViolationMatch) => m.matched === 'rec_run_sample_1')).toBe(true);
    });
  });

  describe('Rule Category 3: Đăng nhập giả / Mock Auth detection', () => {
    it('catches mockId, admin_tok_, and mock recovery secrets', () => {
      const code = `
        const mockId = 'usr_12345';
        const sessionToken = 'admin_tok_998877';
        this.mockHashedRecoveryCodes = ['code1'];
        this.mockActiveSecret = 'secret';
      `;
      const matches: ViolationMatch[] = scanCodeString(code);
      const authMatches = matches.filter((m: ViolationMatch) => m.category === 'đăng nhập giả');

      expect(authMatches.some((m: ViolationMatch) => m.matched === 'mockId')).toBe(true);
      expect(authMatches.some((m: ViolationMatch) => m.matched === 'admin_tok_998877')).toBe(true);
      expect(authMatches.some((m: ViolationMatch) => m.matched === 'mockHashedRecoveryCodes')).toBe(true);
      expect(authMatches.some((m: ViolationMatch) => m.matched === 'mockActiveSecret')).toBe(true);
    });

    it('catches mode: "mock" in API client configuration', () => {
      const code = `
        const client = new AdminApiClient({ mode: 'mock' });
      `;
      const matches: ViolationMatch[] = scanCodeString(code);
      const modeMatches = matches.filter((m: ViolationMatch) => m.ruleId === 'RULE_MOCK_AUTH_MODE');

      expect(modeMatches.length).toBe(1);
    });
  });

  describe('Clean Code Behavior', () => {
    it('reports zero violations for real API integrated code', () => {
      const cleanCode = `
        'use client';
        import React, { useEffect, useState } from 'react';
        import { useQuery } from '@tanstack/react-query';

        export default function CleanExamsPage() {
          const [exams, setExams] = useState([]);
          useEffect(() => {
            fetch('/api/v1/exams')
              .then(res => res.json())
              .then(data => setExams(data.items));
          }, []);
          return <div>{exams.length} exams loaded</div>;
        }
      `;
      const matches = scanCodeString(cleanCode);
      expect(matches).toHaveLength(0);
    });
  });

  describe('Route normalization', () => {
    it('normalizes Next.js route group file paths correctly', () => {
      expect(fileToRoute('web', 'apps/web/app/(exam)/phong-thi/page.tsx')).toBe('/phong-thi');
      expect(fileToRoute('web', 'apps/web/app/(library)/de-thi/[slug]/page.tsx')).toBe('/de-thi/[slug]');
      expect(fileToRoute('web', 'apps/web/app/(seo)/[level]/de-thi/page.tsx')).toBe('/[level]/de-thi');
      expect(fileToRoute('web', 'apps/web/app/page.tsx')).toBe('/');
      expect(fileToRoute('admin', 'apps/admin/app/users/page.tsx')).toBe('/users');
      expect(fileToRoute('admin', 'apps/admin/lib/auth-context.tsx')).toBe('apps/admin/lib/auth-context.tsx');
    });
  });

  describe('Baseline comparison logic', () => {
    const baseline: BaselineEntry[] = [
      {
        app: 'web',
        route: '/phong-thi',
        file: 'apps/web/app/(exam)/phong-thi/page.tsx',
        violations: ['ALL_SAMPLE'],
      },
      {
        app: 'admin',
        route: '/users',
        file: 'apps/admin/app/users/page.tsx',
        violations: ['mảng mẫu'],
      },
    ];

    it('recognizes files present in baseline as covered', () => {
      const sampleItem: ScannedFileResult = {
        app: 'web',
        route: '/phong-thi',
        file: 'apps/web/app/(exam)/phong-thi/page.tsx',
        violations: [
          {
            ruleId: 'RULE_ALL_SAMPLE',
            category: 'ALL_SAMPLE',
            matched: 'ALL_SAMPLE_EXAMS',
            line: 10,
            snippet: 'ALL_SAMPLE_EXAMS',
          },
        ],
      };

      expect(isCoveredByBaseline(sampleItem, baseline)).toBe(true);
    });

    it('flags files NOT present in baseline as new violations', () => {
      const unexpectedItem: ScannedFileResult = {
        app: 'web',
        route: '/new-unapproved-page',
        file: 'apps/web/app/new-unapproved-page/page.tsx',
        violations: [
          {
            ruleId: 'RULE_SAMPLE_CONSTANT',
            category: 'mảng mẫu',
            matched: 'SAMPLE_NEW_DATA',
            line: 5,
            snippet: 'const SAMPLE_NEW_DATA = []',
          },
        ],
      };

      expect(isCoveredByBaseline(unexpectedItem, baseline)).toBe(false);
    });
  });

  describe('Rule Category 4: Empty Baseline Gate (I07 Acceptance)', () => {
    const baselinePath = path.join(repoRootDir, 'tests/integration/mock-ui-baseline.json');

    it('enforces tests/integration/mock-ui-baseline.json is strictly empty ([])', () => {
      expect(fs.existsSync(baselinePath)).toBe(true);
      const raw = fs.readFileSync(baselinePath, 'utf8');
      const parsed = JSON.parse(raw);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toEqual([]);
    });

    it('runNoMockUiCheck passes with 0 violations and 0 baseline entries on current workspace', () => {
      const result = runNoMockUiCheck(repoRootDir, baselinePath);
      expect(result.baselineCount).toBe(0);
      expect(result.knownViolations).toHaveLength(0);
      expect(result.newViolations).toHaveLength(0);
      expect(result.violatingFiles).toHaveLength(0);
      expect(result.passed).toBe(true);
    });

    it('fails runNoMockUiCheck if baseline contains any legacy or bypassed mock entries', () => {
      const tempBaseline = path.join(repoRootDir, 'tests/integration/.tmp-non-empty-baseline.json');
      fs.writeFileSync(tempBaseline, JSON.stringify(['apps/web/app/fake-page/page.tsx']));
      try {
        const result = runNoMockUiCheck(repoRootDir, tempBaseline);
        expect(result.baselineCount).toBe(1);
        expect(result.passed).toBe(false);
      } finally {
        if (fs.existsSync(tempBaseline)) {
          fs.unlinkSync(tempBaseline);
        }
      }
    });
  });
});
