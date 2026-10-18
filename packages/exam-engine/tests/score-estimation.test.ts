import { describe, it, expect, beforeEach } from 'vitest';
import type { JlptScoringTableConfig, Level } from '@jlpt/schema';
import {
  DEFAULT_SCORING_TABLE_VERSION,
  ESTIMATED_LABEL,
  ESTIMATED_SCORING_DISCLAIMER,
  OFFICIAL_JLPT_SCORING_TABLE_V1,
  estimateJlptScore,
  getAllScoringTableVersions,
  getLevelScoringConfig,
  getPassingScore,
  getSectionalMinPass,
  registerScoringTable,
  resetScoringTableRegistry,
} from '../src/score-estimation.js';

describe('P01: JLPT Score Estimation and Section Floor Verification', () => {
  beforeEach(() => {
    resetScoringTableRegistry();
  });

  // Acceptance 1: Test cho cả 5 cấp: đỗ khi đủ tổng và đủ sàn; trượt khi đủ tổng nhưng dưới sàn một phần; trượt khi thiếu tổng
  describe('Acceptance 1: Full 5-Level JLPT Threshold Matrix (N1–N5)', () => {
    const ALL_LEVELS: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

    it('verifies passing thresholds and floor specifications for all 5 levels', () => {
      expect(getPassingScore('N1')).toBe(100);
      expect(getPassingScore('N2')).toBe(90);
      expect(getPassingScore('N3')).toBe(95);
      expect(getPassingScore('N4')).toBe(90);
      expect(getPassingScore('N5')).toBe(80);

      expect(getSectionalMinPass('N1', 'language')).toBe(19);
      expect(getSectionalMinPass('N4', 'language_reading')).toBe(38);
      expect(getSectionalMinPass('N5', 'listening')).toBe(19);

      // N1–N3 floors: 19 each for 3 sections
      for (const level of ['N1', 'N2', 'N3'] as Level[]) {
        const conf = getLevelScoringConfig(level);
        expect(conf.sections).toHaveLength(3);
        expect(conf.totalMax).toBe(180);
        for (const sec of conf.sections) {
          expect(sec.maxScaled).toBe(60);
          expect(sec.minPass).toBe(19);
        }
      }

      // N4–N5 floors: 38 for language_reading (120 max), 19 for listening (60 max)
      for (const level of ['N4', 'N5'] as Level[]) {
        const conf = getLevelScoringConfig(level);
        expect(conf.sections).toHaveLength(2);
        expect(conf.totalMax).toBe(180);

        const langReading = conf.sections.find((s) => s.code === 'language_reading');
        expect(langReading).toBeDefined();
        expect(langReading?.maxScaled).toBe(120);
        expect(langReading?.minPass).toBe(38);

        const listening = conf.sections.find((s) => s.code === 'listening');
        expect(listening).toBeDefined();
        expect(listening?.maxScaled).toBe(60);
        expect(listening?.minPass).toBe(19);
      }
    });

    describe('N1 (Total pass: 100/180, Floor: 19/60 each in Language, Reading, Listening)', () => {
      it('ĐỖ khi đủ tổng và đủ sàn: 35/35/35 (Tổng 105 >= 100, mọi phần >= 19)', () => {
        const res = estimateJlptScore({
          level: 'N1',
          sections: {
            language: { raw: 35, rawMax: 60 },
            reading: { raw: 35, rawMax: 60 },
            listening: { raw: 35, rawMax: 60 },
          },
        });

        expect(res.passed).toBe(true);
        expect(res.isTotalPassed).toBe(true);
        expect(res.isAllSectionsPassed).toBe(true);
        expect(res.totalScaled).toBe(105);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.outcome).toBe('PASS');
        expect(res.summary.reason).toBe('PASSED');
      });

      it('TRƯỢT khi đủ tổng nhưng dưới sàn một phần: 50/50/15 (Tổng 115 >= 100, Listening 15 < 19)', () => {
        const res = estimateJlptScore({
          level: 'N1',
          sections: {
            language: { raw: 50, rawMax: 60 },
            reading: { raw: 50, rawMax: 60 },
            listening: { raw: 15, rawMax: 60 },
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(true);
        expect(res.isAllSectionsPassed).toBe(false);
        expect(res.totalScaled).toBe(115);
        expect(res.failedSections).toEqual(['listening']);
        expect(res.summary.outcome).toBe('FAIL');
        expect(res.summary.reason).toBe('FAILED_SECTION_FLOOR');
        expect(res.summary.message).toContain('listening');
      });

      it('TRƯỢT khi thiếu tổng (dù đủ sàn các phần): 30/30/30 (Tổng 90 < 100, mọi phần >= 19)', () => {
        const res = estimateJlptScore({
          level: 'N1',
          sections: {
            language: { raw: 30, rawMax: 60 },
            reading: { raw: 30, rawMax: 60 },
            listening: { raw: 30, rawMax: 60 },
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(false);
        expect(res.isAllSectionsPassed).toBe(true);
        expect(res.totalScaled).toBe(90);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.outcome).toBe('FAIL');
        expect(res.summary.reason).toBe('FAILED_TOTAL_SCORE');
      });

      it('TRƯỢT khi vừa thiếu tổng vừa dưới sàn: 25/25/10 (Tổng 60 < 100, Listening 10 < 19)', () => {
        const res = estimateJlptScore({
          level: 'N1',
          sections: {
            language: 25,
            reading: 25,
            listening: 10,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(false);
        expect(res.isAllSectionsPassed).toBe(false);
        expect(res.failedSections).toEqual(['listening']);
        expect(res.summary.reason).toBe('FAILED_TOTAL_AND_SECTION');
      });
    });

    describe('N2 (Total pass: 90/180, Floor: 19/60 each)', () => {
      it('ĐỖ khi đủ tổng và đủ sàn: 32/32/32 (Tổng 96 >= 90, mọi phần >= 19)', () => {
        const res = estimateJlptScore({
          level: 'N2',
          sections: [
            { code: 'language', raw: 32, rawMax: 60 },
            { code: 'reading', raw: 32, rawMax: 60 },
            { code: 'listening', raw: 32, rawMax: 60 },
          ],
        });

        expect(res.passed).toBe(true);
        expect(res.totalScaled).toBe(96);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.outcome).toBe('PASS');
      });

      it('TRƯỢT khi đủ tổng nhưng dưới sàn một phần: 18/42/40 (Tổng 100 >= 90, Language 18 < 19)', () => {
        const res = estimateJlptScore({
          level: 'N2',
          sections: {
            language: 18,
            reading: 42,
            listening: 40,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(true);
        expect(res.totalScaled).toBe(100);
        expect(res.failedSections).toEqual(['language']);
        expect(res.summary.reason).toBe('FAILED_SECTION_FLOOR');
      });

      it('TRƯỢT khi thiếu tổng: 28/29/28 (Tổng 85 < 90, mọi phần >= 19)', () => {
        const res = estimateJlptScore({
          level: 'N2',
          sections: { language: 28, reading: 29, listening: 28 },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(false);
        expect(res.totalScaled).toBe(85);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.reason).toBe('FAILED_TOTAL_SCORE');
      });
    });

    describe('N3 (Total pass: 95/180, Floor: 19/60 each)', () => {
      it('ĐỖ khi đủ tổng và đủ sàn: 33/33/33 (Tổng 99 >= 95, mọi phần >= 19)', () => {
        const res = estimateJlptScore({
          level: 'N3',
          sections: { language: 33, reading: 33, listening: 33 },
        });

        expect(res.passed).toBe(true);
        expect(res.totalScaled).toBe(99);
        expect(res.failedSections).toHaveLength(0);
      });

      it('TRƯỢT khi đủ tổng nhưng dưới sàn một phần: 45/17/43 (Tổng 105 >= 95, Reading 17 < 19)', () => {
        const res = estimateJlptScore({
          level: 'N3',
          sections: { language: 45, reading: 17, listening: 43 },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(true);
        expect(res.totalScaled).toBe(105);
        expect(res.failedSections).toEqual(['reading']);
        expect(res.summary.reason).toBe('FAILED_SECTION_FLOOR');
      });

      it('TRƯỢT khi thiếu tổng: 30/30/30 (Tổng 90 < 95, mọi phần >= 19)', () => {
        const res = estimateJlptScore({
          level: 'N3',
          sections: { language: 30, reading: 30, listening: 30 },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(false);
        expect(res.totalScaled).toBe(90);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.reason).toBe('FAILED_TOTAL_SCORE');
      });
    });

    describe('N4 (Total pass: 90/180, Floor: Language&Reading combined 38/120, Listening 19/60)', () => {
      it('ĐỖ khi đủ tổng và đủ sàn: language_reading 60/120, listening 35/60 (Tổng 95 >= 90)', () => {
        const res = estimateJlptScore({
          level: 'N4',
          sections: {
            language_reading: { raw: 60, rawMax: 120 },
            listening: { raw: 35, rawMax: 60 },
          },
        });

        expect(res.passed).toBe(true);
        expect(res.totalScaled).toBe(95);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.outcome).toBe('PASS');
      });

      it('ĐỖ khi truyền riêng language và reading: tự động gộp điểm cho N4', () => {
        const res = estimateJlptScore({
          level: 'N4',
          sections: {
            language: { raw: 30, rawMax: 60 },
            reading: { raw: 32, rawMax: 60 },
            listening: { raw: 35, rawMax: 60 },
          },
        });

        expect(res.passed).toBe(true);
        // language_reading raw = 62/120 -> scaled = 62; listening = 35 -> total = 97 >= 90
        expect(res.sections).toHaveLength(2);
        const lrSec = res.sections.find((s) => s.code === 'language_reading');
        expect(lrSec?.scaled).toBe(62);
        expect(lrSec?.passed).toBe(true);
      });

      it('xử lý đúng khi chỉ truyền scaled một phần trong cặp gộp (ví dụ chỉ language: 30)', () => {
        const res = estimateJlptScore({
          level: 'N4',
          sections: {
            language: 30,
            listening: 35,
          },
        });

        // language: 30 quy đổi, reading: 0 quy đổi -> language_reading = 30/120 (< floor 38)
        const lrSec = res.sections.find((s) => s.code === 'language_reading');
        expect(lrSec?.scaled).toBe(30);
        expect(lrSec?.passed).toBe(false);
        expect(res.totalScaled).toBe(65); // 30 + 35
        expect(res.passed).toBe(false);
        expect(res.failedSections).toContain('language_reading');
      });

      it('xử lý đúng khi chỉ truyền raw một phần trong cặp gộp (ví dụ raw 30/60 language): không bị nhân đôi điểm', () => {
        const res = estimateJlptScore({
          level: 'N4',
          sections: [
            { code: 'language', raw: 30, rawMax: 60 },
            { code: 'listening', raw: 35, rawMax: 60 },
          ],
        });

        // language raw 30/60 -> 30 quy đổi; reading thiếu -> 0 quy đổi; tổng language_reading = 30/120 (không bị nhân đôi thành 60/120)
        const lrSec = res.sections.find((s) => s.code === 'language_reading');
        expect(lrSec?.scaled).toBe(30);
        expect(lrSec?.passed).toBe(false);
        expect(res.totalScaled).toBe(65);
        expect(res.passed).toBe(false);
        expect(res.failedSections).toContain('language_reading');
      });

      it('TRƯỢT khi đủ tổng nhưng dưới sàn Listening: 75/120, listening 18/60 (Tổng 93 >= 90, Listening 18 < 19)', () => {
        const res = estimateJlptScore({
          level: 'N4',
          sections: {
            language_reading: 75,
            listening: 18,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(true);
        expect(res.totalScaled).toBe(93);
        expect(res.failedSections).toEqual(['listening']);
        expect(res.summary.reason).toBe('FAILED_SECTION_FLOOR');
      });

      it('TRƯỢT khi đủ tổng nhưng dưới sàn Language & Reading: 37/120, listening 55/60 (Tổng 92 >= 90, LR 37 < 38)', () => {
        const res = estimateJlptScore({
          level: 'N4',
          sections: {
            language_reading: 37,
            listening: 55,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(true);
        expect(res.totalScaled).toBe(92);
        expect(res.failedSections).toEqual(['language_reading']);
        expect(res.summary.reason).toBe('FAILED_SECTION_FLOOR');
      });

      it('TRƯỢT khi thiếu tổng: 50/120, listening 30/60 (Tổng 80 < 90, cả 2 phần đều đủ sàn)', () => {
        const res = estimateJlptScore({
          level: 'N4',
          sections: {
            language_reading: 50,
            listening: 30,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(false);
        expect(res.totalScaled).toBe(80);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.reason).toBe('FAILED_TOTAL_SCORE');
      });
    });

    describe('N5 (Total pass: 80/180, Floor: Language&Reading combined 38/120, Listening 19/60)', () => {
      it('ĐỖ khi đủ tổng và đủ sàn: language_reading 55/120, listening 30/60 (Tổng 85 >= 80)', () => {
        const res = estimateJlptScore({
          level: 'N5',
          sections: {
            language_reading: 55,
            listening: 30,
          },
        });

        expect(res.passed).toBe(true);
        expect(res.totalScaled).toBe(85);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.outcome).toBe('PASS');
      });

      it('TRƯỢT khi đủ tổng nhưng dưới sàn Listening: 70/120, listening 15/60 (Tổng 85 >= 80, Listening 15 < 19)', () => {
        const res = estimateJlptScore({
          level: 'N5',
          sections: {
            language_reading: 70,
            listening: 15,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(true);
        expect(res.totalScaled).toBe(85);
        expect(res.failedSections).toEqual(['listening']);
        expect(res.summary.reason).toBe('FAILED_SECTION_FLOOR');
      });

      it('TRƯỢT khi đủ tổng nhưng dưới sàn Language & Reading: 36/120, listening 46/60 (Tổng 82 >= 80, LR 36 < 38)', () => {
        const res = estimateJlptScore({
          level: 'N5',
          sections: {
            language_reading: 36,
            listening: 46,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(true);
        expect(res.totalScaled).toBe(82);
        expect(res.failedSections).toEqual(['language_reading']);
        expect(res.summary.reason).toBe('FAILED_SECTION_FLOOR');
      });

      it('TRƯỢT khi thiếu tổng: 48/120, listening 27/60 (Tổng 75 < 80, các phần đều đủ sàn)', () => {
        const res = estimateJlptScore({
          level: 'N5',
          sections: {
            language_reading: 48,
            listening: 27,
          },
        });

        expect(res.passed).toBe(false);
        expect(res.isTotalPassed).toBe(false);
        expect(res.totalScaled).toBe(75);
        expect(res.failedSections).toHaveLength(0);
        expect(res.summary.reason).toBe('FAILED_TOTAL_SCORE');
      });
    });

    describe('Boundary & Extreme Invariants for all 5 levels', () => {
      it('verifies exact threshold boundaries: exactly on pass mark and floor marks', () => {
        // N1 exact: 21 + 19 + 60 = 100 (all >= 19, max 60 per section)
        const n1Exact = estimateJlptScore({
          level: 'N1',
          sections: { language: 21, reading: 19, listening: 60 },
        });
        expect(n1Exact.passed).toBe(true);
        expect(n1Exact.totalScaled).toBe(100);

        // N4 exact: 38 + 52 = 90
        const n4Exact = estimateJlptScore({
          level: 'N4',
          sections: { language_reading: 38, listening: 52 },
        });
        expect(n4Exact.passed).toBe(true);
        expect(n4Exact.totalScaled).toBe(90);

        // N5 exact: 38 + 42 = 80
        const n5Exact = estimateJlptScore({
          level: 'N5',
          sections: { language_reading: 38, listening: 42 },
        });
        expect(n5Exact.passed).toBe(true);
        expect(n5Exact.totalScaled).toBe(80);
      });

      it('verifies 1 point below boundary conditions', () => {
        // N1: 99 total -> FAIL
        const n1Under = estimateJlptScore({
          level: 'N1',
          sections: { language: 33, reading: 33, listening: 33 },
        });
        expect(n1Under.totalScaled).toBe(99);
        expect(n1Under.passed).toBe(false);

        // N4: 89 total -> FAIL
        const n4Under = estimateJlptScore({
          level: 'N4',
          sections: { language_reading: 55, listening: 34 },
        });
        expect(n4Under.totalScaled).toBe(89);
        expect(n4Under.passed).toBe(false);

        // N5: 79 total -> FAIL
        const n5Under = estimateJlptScore({
          level: 'N5',
          sections: { language_reading: 50, listening: 29 },
        });
        expect(n5Under.totalScaled).toBe(79);
        expect(n5Under.passed).toBe(false);
      });

      it('verifies 0/180 and 180/180 extremes across all 5 levels', () => {
        for (const level of ALL_LEVELS) {
          const zero = estimateJlptScore({
            level,
            sections: { language: 0, reading: 0, listening: 0, language_reading: 0 },
          });
          expect(zero.totalScaled).toBe(0);
          expect(zero.passed).toBe(false);

          const perfect = estimateJlptScore({
            level,
            sections: { language: 60, reading: 60, listening: 60, language_reading: 120 },
          });
          expect(perfect.totalScaled).toBe(180);
          expect(perfect.passed).toBe(true);
          expect(perfect.failedSections).toHaveLength(0);
        }
      });
    });
  });

  // Acceptance 2: Bảng quy đổi có phiên bản, đổi bảng không cần sửa code
  describe('Acceptance 2: Versioned Scoring Tables and Hot-Swappable Configuration', () => {
    it('verifies default version is official-2024-v1 and matches official specs', () => {
      const versions = getAllScoringTableVersions();
      expect(versions).toContain(DEFAULT_SCORING_TABLE_VERSION);
      expect(DEFAULT_SCORING_TABLE_VERSION).toBe('official-2024-v1');

      const defConf = getLevelScoringConfig('N1');
      expect(defConf.totalPass).toBe(100);
    });

    it('allows passing custom tableConfig directly without code changes', () => {
      const customTable: JlptScoringTableConfig = {
        version: 'strict-mock-v2',
        name: 'Thang điểm tuyển dụng đặc biệt',
        effectiveFrom: '2026-01-01',
        isOfficial: false,
        levels: {
          ...OFFICIAL_JLPT_SCORING_TABLE_V1.levels,
          N1: {
            level: 'N1',
            totalMax: 180,
            totalPass: 120, // Stricter passing mark
            sections: [
              {
                code: 'language',
                label: 'Ngôn ngữ',
                skills: ['kanji', 'vocabulary', 'grammar'],
                maxScaled: 60,
                minPass: 25, // Stricter floor
                conversionMethod: 'linear_reference',
              },
              {
                code: 'reading',
                label: 'Đọc hiểu',
                skills: ['reading'],
                maxScaled: 60,
                minPass: 25,
                conversionMethod: 'linear_reference',
              },
              {
                code: 'listening',
                label: 'Nghe hiểu',
                skills: ['listening'],
                maxScaled: 60,
                minPass: 25,
                conversionMethod: 'linear_reference',
              },
            ],
          },
        },
      };

      // Under official table (totalPass = 100, minPass = 19): 105 points PASSES
      const officialResult = estimateJlptScore({
        level: 'N1',
        sections: { language: 35, reading: 35, listening: 35 },
      });
      expect(officialResult.passed).toBe(true);
      expect(officialResult.tableVersion).toBe('official-2024-v1');

      // Under custom table (totalPass = 120): 105 points FAILS without changing any code!
      const customResult = estimateJlptScore({
        level: 'N1',
        sections: { language: 35, reading: 35, listening: 35 },
        tableConfig: customTable,
      });
      expect(customResult.passed).toBe(false);
      expect(customResult.tableVersion).toBe('strict-mock-v2');
      expect(customResult.totalPass).toBe(120);
      expect(customResult.summary.reason).toBe('FAILED_TOTAL_SCORE');

      // Score of 20 in language under custom table fails the 25 floor!
      const floorFailCustom = estimateJlptScore({
        level: 'N1',
        sections: { language: 20, reading: 55, listening: 55 },
        tableConfig: customTable,
      });
      expect(floorFailCustom.passed).toBe(false);
      expect(floorFailCustom.failedSections).toEqual(['language']);
    });

    it('allows registering a new version in the registry and selecting it by version string', () => {
      const experimentalTable: JlptScoringTableConfig = {
        version: 'experimental-2027',
        name: 'Thí điểm chuẩn hóa mới',
        effectiveFrom: '2027-01-01',
        isOfficial: false,
        levels: {
          ...OFFICIAL_JLPT_SCORING_TABLE_V1.levels,
          N2: {
            ...OFFICIAL_JLPT_SCORING_TABLE_V1.levels.N2,
            totalPass: 110, // Raised pass threshold for N2
          },
        },
      };

      registerScoringTable(experimentalTable);
      expect(getAllScoringTableVersions()).toContain('experimental-2027');

      // Score 100 passes official N2 (90 threshold)
      const resOfficial = estimateJlptScore({
        level: 'N2',
        sections: { language: 35, reading: 35, listening: 30 },
      });
      expect(resOfficial.passed).toBe(true);

      // Score 100 fails experimental N2 (110 threshold) by specifying version string only
      const resExperimental = estimateJlptScore({
        level: 'N2',
        version: 'experimental-2027',
        sections: { language: 35, reading: 35, listening: 30 },
      });
      expect(resExperimental.passed).toBe(false);
      expect(resExperimental.tableVersion).toBe('experimental-2027');
      expect(resExperimental.totalPass).toBe(110);
    });

    it('supports custom non-linear rawToScaled lookup tables without code changes', () => {
      const nonLinearTable: JlptScoringTableConfig = {
        version: 'lookup-test-v1',
        name: 'Lookup Table Test',
        effectiveFrom: '2026-10-01',
        isOfficial: false,
        levels: {
          ...OFFICIAL_JLPT_SCORING_TABLE_V1.levels,
          N1: {
            level: 'N1',
            totalMax: 180,
            totalPass: 100,
            sections: [
              {
                code: 'language',
                label: 'Language',
                skills: ['kanji', 'vocabulary', 'grammar'],
                maxScaled: 60,
                minPass: 19,
                conversionMethod: 'lookup_table',
                // Non-linear mapping: raw 10 maps to 25 scaled
                rawToScaledTable: [
                  { raw: 0, scaled: 0 },
                  { raw: 10, scaled: 25 },
                  { raw: 20, scaled: 45 },
                  { raw: 30, scaled: 60 },
                ],
              },
              OFFICIAL_JLPT_SCORING_TABLE_V1.levels.N1.sections[1]!,
              OFFICIAL_JLPT_SCORING_TABLE_V1.levels.N1.sections[2]!,
            ],
          },
        },
      };

      const result = estimateJlptScore({
        level: 'N1',
        tableConfig: nonLinearTable,
        sections: {
          language: { raw: 10, rawMax: 30 }, // maps to 25 via table instead of 10/30*60=20
          reading: 40,
          listening: 40,
        },
      });

      const langSec = result.sections.find((s) => s.code === 'language');
      expect(langSec?.scaled).toBe(25);
    });
  });

  // Acceptance 3: Kết quả luôn có nhãn ước lượng; giải thích nguồn ngưỡng trong docs/decisions
  describe('Acceptance 3: Estimated Labels, Flags and Disclaimer Verification', () => {
    it('always includes isEstimated: true and label: "ước lượng" in every result', () => {
      const res = estimateJlptScore({
        level: 'N1',
        sections: { language: 35, reading: 35, listening: 35 },
      });

      expect(res.isEstimated).toBe(true);
      expect(res.label).toBe(ESTIMATED_LABEL);
      expect(res.label).toBe('ước lượng');
      expect(res.disclaimer).toBe(ESTIMATED_SCORING_DISCLAIMER);
      expect(res.disclaimer).toContain('ước lượng tham chiếu');
    });

    it('provides section margin and failure diagnostics', () => {
      const res = estimateJlptScore({
        level: 'N2',
        sections: { language: 18, reading: 40, listening: 40 },
      });

      const langSec = res.sections.find((s) => s.code === 'language')!;
      expect(langSec.margin).toBe(-1); // 18 - 19 = -1 point below floor
      expect(langSec.passed).toBe(false);

      const readingSec = res.sections.find((s) => s.code === 'reading')!;
      expect(readingSec.margin).toBe(21); // 40 - 19 = +21 points above floor
      expect(readingSec.passed).toBe(true);
    });
  });
});
