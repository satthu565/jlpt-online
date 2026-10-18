import type {
  EstimatedScoreResult,
  EstimatedSectionScore,
  JlptScoringTableConfig,
  Level,
  LevelScoringConfig,
  ScoreFailReason,
  ScoreOutcome,
  ScoringSectionConfig,
} from '@jlpt/schema';

export const ESTIMATED_SCORING_DISCLAIMER =
  'Điểm quy đổi chỉ mang tính chất ước lượng tham chiếu (Linear Reference Scaling), không thay thế chứng chỉ JLPT chính thức do Japan Foundation / JEES cấp.';

export const ESTIMATED_LABEL = 'ước lượng' as const;

export const DEFAULT_SCORING_TABLE_VERSION = 'official-2024-v1';

/**
 * Official JLPT scoring table configuration (Version 2024.1).
 * Thresholds based on published Japanese Language Proficiency Test guidelines:
 * https://www.jlpt.jp/e/guideline/results.html
 *
 * Scoring sections:
 * - N1–N3: 3 sections (Language Knowledge, Reading, Listening), 60 max each, minPass 19 each.
 *   Total max 180. Pass mark: N1=100, N2=90, N3=95.
 * - N4–N5: 2 sections (Language Knowledge & Reading combined 120 max, minPass 38; Listening 60 max, minPass 19).
 *   Total max 180. Pass mark: N4=90, N5=80.
 */
export const OFFICIAL_JLPT_SCORING_TABLE_V1: JlptScoringTableConfig = {
  version: 'official-2024-v1',
  name: 'Bảng quy đổi và ngưỡng điểm chính thức JLPT (v2024)',
  effectiveFrom: '2010-07-01',
  source: 'https://www.jlpt.jp/e/guideline/results.html',
  isOfficial: true,
  levels: {
    N1: {
      level: 'N1',
      totalMax: 180,
      totalPass: 100,
      sections: [
        {
          code: 'language',
          label: '言語知識（文字・語彙・文法）',
          skills: ['kanji', 'vocabulary', 'grammar'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'reading',
          label: '読解',
          skills: ['reading'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'listening',
          label: '聴解',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
      ],
    },
    N2: {
      level: 'N2',
      totalMax: 180,
      totalPass: 90,
      sections: [
        {
          code: 'language',
          label: '言語知識（文字・語彙・文法）',
          skills: ['kanji', 'vocabulary', 'grammar'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'reading',
          label: '読解',
          skills: ['reading'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'listening',
          label: '聴解',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
      ],
    },
    N3: {
      level: 'N3',
      totalMax: 180,
      totalPass: 95,
      sections: [
        {
          code: 'language',
          label: '言語知識（文字・語彙・文法）',
          skills: ['kanji', 'vocabulary', 'grammar'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'reading',
          label: '読解',
          skills: ['reading'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'listening',
          label: '聴解',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
      ],
    },
    N4: {
      level: 'N4',
      totalMax: 180,
      totalPass: 90,
      sections: [
        {
          code: 'language_reading',
          label: '言語知識（文字・語彙・文法）・読解',
          skills: ['kanji', 'vocabulary', 'grammar', 'reading'],
          maxScaled: 120,
          minPass: 38,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'listening',
          label: '聴解',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
      ],
    },
    N5: {
      level: 'N5',
      totalMax: 180,
      totalPass: 80,
      sections: [
        {
          code: 'language_reading',
          label: '言語知識（文字・語彙・文法）・読解',
          skills: ['kanji', 'vocabulary', 'grammar', 'reading'],
          maxScaled: 120,
          minPass: 38,
          conversionMethod: 'linear_reference',
        },
        {
          code: 'listening',
          label: '聴解',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
          conversionMethod: 'linear_reference',
        },
      ],
    },
  },
};

const tableRegistry = new Map<string, JlptScoringTableConfig>();
tableRegistry.set(OFFICIAL_JLPT_SCORING_TABLE_V1.version, OFFICIAL_JLPT_SCORING_TABLE_V1);

/**
 * Registers a versioned scoring table configuration.
 * Allows adding or updating conversion tables at runtime without modifying code.
 */
export function registerScoringTable(table: JlptScoringTableConfig): void {
  tableRegistry.set(table.version, table);
}

/**
 * Returns all registered scoring table versions.
 */
export function getAllScoringTableVersions(): string[] {
  return Array.from(tableRegistry.keys());
}

/**
 * Retrieves a full scoring table configuration by version.
 */
export function getScoringTableConfig(
  version: string = DEFAULT_SCORING_TABLE_VERSION,
): JlptScoringTableConfig {
  const table = tableRegistry.get(version);
  if (!table) {
    throw new Error(`Bảng quy đổi điểm phiên bản '${version}' chưa được đăng ký trong hệ thống.`);
  }
  return table;
}

/**
 * Retrieves the level scoring configuration for a level and version.
 */
export function getLevelScoringConfig(
  level: Level,
  version: string = DEFAULT_SCORING_TABLE_VERSION,
): LevelScoringConfig {
  const table = getScoringTableConfig(version);
  const config = table.levels[level];
  if (!config) {
    throw new Error(
      `Cấp độ '${level}' không tồn tại trong cấu hình bảng quy đổi phiên bản '${version}'.`,
    );
  }
  return config;
}

/**
 * Resets table registry to only the default official table (useful in test teardown).
 */
export function resetScoringTableRegistry(): void {
  tableRegistry.clear();
  tableRegistry.set(OFFICIAL_JLPT_SCORING_TABLE_V1.version, OFFICIAL_JLPT_SCORING_TABLE_V1);
}

export interface SectionScoreInput {
  code: string;
  raw?: number;
  rawMax?: number;
  scaled?: number;
}

export interface EstimateJlptScoreParams {
  level: Level;
  sections:
    | SectionScoreInput[]
    | Record<string, number | { raw?: number; rawMax?: number; scaled?: number }>;
  tableConfig?: JlptScoringTableConfig | LevelScoringConfig;
  version?: string;
  disclaimer?: string;
}

/**
 * Section code alias matcher for flexible input mapping.
 */
function normalizeSectionKey(key: string): string {
  const lower = key.toLowerCase().trim();
  if (lower === 'language_vocab' || lower === 'vocab' || lower === 'vocabulary') {
    return 'language';
  }
  if (lower === 'language_grammar_reading') {
    return 'language_reading';
  }
  return lower;
}

/**
 * Pure function: Scales a raw score given a section configuration.
 */
function scaleSectionScore(
  input: { raw?: number; rawMax?: number; scaled?: number },
  secConfig: ScoringSectionConfig,
): number {
  if (input.scaled !== undefined) {
    return Math.max(0, Math.min(secConfig.maxScaled, Math.round(input.scaled)));
  }

  const raw = input.raw ?? 0;

  // 1. Lookup table mode if custom mapping is configured
  if (secConfig.rawToScaledTable && secConfig.rawToScaledTable.length > 0) {
    const exact = secConfig.rawToScaledTable.find((entry) => entry.raw === raw);
    if (exact) {
      return Math.max(0, Math.min(secConfig.maxScaled, exact.scaled));
    }
    // Interpolation or closest bracket fallback
    const sorted = [...secConfig.rawToScaledTable].sort((a, b) => a.raw - b.raw);
    if (raw <= sorted[0]!.raw) {
      return sorted[0]!.scaled;
    }
    const last = sorted[sorted.length - 1]!;
    if (raw >= last.raw) {
      return last.scaled;
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const low = sorted[i]!;
      const high = sorted[i + 1]!;
      if (raw >= low.raw && raw <= high.raw) {
        const range = high.raw - low.raw;
        const ratio = range > 0 ? (raw - low.raw) / range : 0;
        return Math.round(low.scaled + ratio * (high.scaled - low.scaled));
      }
    }
  }

  // 2. Linear reference scaling
  const rawMax = input.rawMax ?? secConfig.maxScaled;
  if (rawMax <= 0) {
    return 0;
  }
  const ratio = Math.max(0, Math.min(1, raw / rawMax));
  return Math.round(ratio * secConfig.maxScaled);
}

/**
 * Pure function: Estimates JLPT scaled score (0–180), compares against total pass mark
 * and sectional floor marks for any JLPT level N1–N5.
 *
 * (N1–N3: 3 sections; N4–N5: 2 sections with Language Knowledge & Reading combined).
 *
 * Rules:
 * - A candidate passes (đỗ) if and only if totalScaled >= totalPass AND all sections >= minPass.
 * - If totalScaled >= totalPass BUT any section is below its floor, result is FAIL (trượt).
 * - If totalScaled < totalPass, result is FAIL (trượt).
 * - Always includes the 'ước lượng' (estimated) flag and label.
 * - Table configuration and thresholds are versioned and can be overridden without code modification.
 */
export function estimateJlptScore(params: EstimateJlptScoreParams): EstimatedScoreResult {
  const { level, sections: rawSectionsInput, tableConfig, version, disclaimer } = params;

  let levelConfig: LevelScoringConfig;
  let tableVersion: string;

  if (tableConfig) {
    if ('levels' in tableConfig) {
      const fullTable = tableConfig as JlptScoringTableConfig;
      tableVersion = fullTable.version;
      const conf = fullTable.levels[level];
      if (!conf) {
        throw new Error(
          `Cấp độ '${level}' không tồn tại trong cấu hình bảng quy đổi truyền vào.`,
        );
      }
      levelConfig = conf;
    } else {
      levelConfig = tableConfig as LevelScoringConfig;
      tableVersion = version ?? 'custom';
    }
  } else {
    tableVersion = version ?? DEFAULT_SCORING_TABLE_VERSION;
    levelConfig = getLevelScoringConfig(level, tableVersion);
  }

  // Normalize input into a Map keyed by normalized code
  const inputMap = new Map<string, { raw?: number; rawMax?: number; scaled?: number }>();

  if (Array.isArray(rawSectionsInput)) {
    for (const item of rawSectionsInput) {
      const key = normalizeSectionKey(item.code);
      inputMap.set(key, { raw: item.raw, rawMax: item.rawMax, scaled: item.scaled });
    }
  } else {
    for (const [key, val] of Object.entries(rawSectionsInput)) {
      const normKey = normalizeSectionKey(key);
      if (typeof val === 'number') {
        inputMap.set(normKey, { scaled: val });
      } else if (val && typeof val === 'object') {
        inputMap.set(normKey, { raw: val.raw, rawMax: val.rawMax, scaled: val.scaled });
      }
    }
  }

  // Handle N4/N5 combination of language and reading if supplied separately
  if (
    levelConfig.sections.some((s) => s.code === 'language_reading') &&
    !inputMap.has('language_reading')
  ) {
    const lang = inputMap.get('language');
    const read = inputMap.get('reading');
    if (lang || read) {
      const lrSecConfig = levelConfig.sections.find((s) => s.code === 'language_reading');
      const partMaxScaled = Math.round((lrSecConfig?.maxScaled ?? 120) / 2);

      let langScaled = 0;
      let langRaw = 0;
      let langRawMax = partMaxScaled;
      if (lang) {
        if (lang.scaled !== undefined) {
          langScaled = Math.max(0, Math.min(partMaxScaled, Math.round(lang.scaled)));
          langRaw = lang.raw ?? langScaled;
          langRawMax = lang.rawMax ?? partMaxScaled;
        } else if (lang.raw !== undefined) {
          langRaw = Math.max(0, lang.raw);
          langRawMax = lang.rawMax ?? partMaxScaled;
          langScaled =
            langRawMax > 0
              ? Math.round(Math.max(0, Math.min(1, langRaw / langRawMax)) * partMaxScaled)
              : 0;
        }
      }

      let readScaled = 0;
      let readRaw = 0;
      let readRawMax = partMaxScaled;
      if (read) {
        if (read.scaled !== undefined) {
          readScaled = Math.max(0, Math.min(partMaxScaled, Math.round(read.scaled)));
          readRaw = read.raw ?? readScaled;
          readRawMax = read.rawMax ?? partMaxScaled;
        } else if (read.raw !== undefined) {
          readRaw = Math.max(0, read.raw);
          readRawMax = read.rawMax ?? partMaxScaled;
          readScaled =
            readRawMax > 0
              ? Math.round(Math.max(0, Math.min(1, readRaw / readRawMax)) * partMaxScaled)
              : 0;
        }
      }

      const combScaled = Math.min(
        lrSecConfig?.maxScaled ?? 120,
        langScaled + readScaled,
      );
      const combRaw = langRaw + readRaw;
      const combRawMax = langRawMax + readRawMax;

      inputMap.set('language_reading', {
        scaled: combScaled,
        raw: combRaw,
        rawMax: combRawMax,
      });
    }
  }

  const scoredSections: EstimatedSectionScore[] = [];
  const failedSections: string[] = [];
  let totalScaled = 0;

  for (const secConfig of levelConfig.sections) {
    const normCode = normalizeSectionKey(secConfig.code);
    const input = inputMap.get(normCode) ?? inputMap.get(secConfig.code) ?? { raw: 0, rawMax: 0 };

    const scaled = scaleSectionScore(input, secConfig);
    const raw = input.raw ?? (input.scaled !== undefined ? input.scaled : 0);
    const rawMax = input.rawMax ?? secConfig.maxScaled;
    const passed = scaled >= secConfig.minPass;
    const margin = scaled - secConfig.minPass;

    if (!passed) {
      failedSections.push(secConfig.code);
    }

    scoredSections.push({
      code: secConfig.code,
      label: secConfig.label,
      raw,
      rawMax,
      scaled,
      maxScaled: secConfig.maxScaled,
      minPass: secConfig.minPass,
      passed,
      margin,
    });

    totalScaled += scaled;
  }

  // Cap totalScaled at totalMax
  totalScaled = Math.max(0, Math.min(levelConfig.totalMax, totalScaled));

  const isTotalPassed = totalScaled >= levelConfig.totalPass;
  const isAllSectionsPassed = failedSections.length === 0;
  const passed = isTotalPassed && isAllSectionsPassed;

  let outcome: ScoreOutcome;
  let reason: ScoreFailReason;
  let message: string;

  if (passed) {
    outcome = 'PASS';
    reason = 'PASSED';
    message = `Đỗ ${level}: Đạt tổng điểm ước lượng ${totalScaled}/${levelConfig.totalMax} (ngưỡng đỗ: ${levelConfig.totalPass}) và vượt điểm sàn toàn bộ ${scoredSections.length} phần thi.`;
  } else if (!isTotalPassed && !isAllSectionsPassed) {
    outcome = 'FAIL';
    reason = 'FAILED_TOTAL_AND_SECTION';
    message = `Trượt ${level}: Không đạt điểm đỗ tổng (${totalScaled}/${levelConfig.totalPass}) và dưới điểm sàn ở các phần: ${failedSections.join(', ')}.`;
  } else if (isTotalPassed && !isAllSectionsPassed) {
    outcome = 'FAIL';
    reason = 'FAILED_SECTION_FLOOR';
    message = `Trượt ${level}: Đạt điểm tổng (${totalScaled}/${levelConfig.totalPass}) nhưng không đạt điểm sàn ở các phần: ${failedSections.join(', ')}.`;
  } else {
    outcome = 'FAIL';
    reason = 'FAILED_TOTAL_SCORE';
    message = `Trượt ${level}: Đạt điểm sàn các phần nhưng thiếu tổng điểm đỗ (${totalScaled}/${levelConfig.totalPass}).`;
  }

  return {
    level,
    tableVersion,
    isEstimated: true,
    label: ESTIMATED_LABEL,
    disclaimer: disclaimer ?? ESTIMATED_SCORING_DISCLAIMER,
    totalScaled,
    totalMax: levelConfig.totalMax,
    totalPass: levelConfig.totalPass,
    passed,
    isTotalPassed,
    isAllSectionsPassed,
    failedSections,
    sections: scoredSections,
    summary: {
      outcome,
      reason,
      message,
    },
  };
}

/**
 * Returns the passing threshold score for a level and version.
 * Dynamic and version-driven (not hardcoded).
 */
export function getPassingScore(
  level: Level,
  version: string = DEFAULT_SCORING_TABLE_VERSION,
): number {
  return getLevelScoringConfig(level, version).totalPass;
}

/**
 * Returns minimum sectional pass threshold for a level and section code.
 */
export function getSectionalMinPass(
  level: Level,
  sectionCode: string,
  version: string = DEFAULT_SCORING_TABLE_VERSION,
): number {
  const conf = getLevelScoringConfig(level, version);
  const norm = normalizeSectionKey(sectionCode);
  const sec = conf.sections.find((s) => normalizeSectionKey(s.code) === norm || s.code === sectionCode);
  if (!sec) {
    throw new Error(`Phần thi '${sectionCode}' không tồn tại trong cấu hình cấp độ ${level}.`);
  }
  return sec.minPass;
}
