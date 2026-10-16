import { GRAMMAR_DATABASE, type GrammarPatternDefinition } from './grammar-dict.js';
import { normalizeJapaneseTextNFC } from './japanese-text.js';
import type {
  GrammarMatch,
  GrammarOccurrence,
  JlptLevel,
  SentenceRole,
} from './types.js';

export interface GrammarAnalysisResult {
  totalCount: number;
  uniqueCount: number;
  byLevel: Record<JlptLevel, number>;
  items: GrammarOccurrence[];
}

export class GrammarAnalyzer {
  private occurrences = new Map<
    string,
    {
      definition: GrammarPatternDefinition;
      count: number;
      exams: Set<string>;
      roles: Record<SentenceRole, number>;
    }
  >();

  /**
   * Scans a text string and finds all matching grammar patterns.
   */
  findPatterns(
    text: string,
    options: {
      role?: SentenceRole;
      isTarget?: boolean;
    } = {},
  ): GrammarMatch[] {
    const normalized = normalizeJapaneseTextNFC(text);
    const role = options.role ?? 'stem';
    const isTarget = options.isTarget ?? false;
    const matches: GrammarMatch[] = [];

    for (const pattern of GRAMMAR_DATABASE) {
      const match = pattern.regex.exec(normalized);
      if (match && match.index !== undefined) {
        matches.push({
          patternId: pattern.id,
          pattern: pattern.pattern,
          level: pattern.level,
          surface: match[0],
          meaning: pattern.meaning,
          role,
          isTarget,
          span: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Records grammar patterns found in text for corpus aggregation.
   */
  recordText(
    text: string,
    metadata: {
      examId?: string;
      level?: JlptLevel;
      role?: SentenceRole;
      isTarget?: boolean;
    } = {},
  ): GrammarMatch[] {
    const matches = this.findPatterns(text, metadata);
    const examId = metadata.examId ?? 'default';
    const role = metadata.role ?? 'stem';

    for (const match of matches) {
      let entry = this.occurrences.get(match.patternId);
      if (!entry) {
        const def = GRAMMAR_DATABASE.find((p) => p.id === match.patternId)!;
        entry = {
          definition: def,
          count: 0,
          exams: new Set(),
          roles: { stem: 0, option: 0, passage: 0, instruction: 0, transcript: 0 },
        };
        this.occurrences.set(match.patternId, entry);
      }

      entry.count += 1;
      entry.exams.add(examId);
      entry.roles[role] = (entry.roles[role] ?? 0) + 1;
    }

    return matches;
  }

  /**
   * Gets list of distinct exam IDs where a grammar pattern appeared (DATA-21).
   */
  getExamsForPattern(patternId: string): string[] {
    const entry = this.occurrences.get(patternId);
    if (!entry) return [];
    return Array.from(entry.exams);
  }

  /**
   * Gets aggregated grammar statistics (DATA-20).
   */
  getAnalysis(): GrammarAnalysisResult {
    let totalCount = 0;
    const byLevel: Record<JlptLevel, number> = { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 };
    const items: GrammarOccurrence[] = [];

    for (const [id, data] of this.occurrences.entries()) {
      totalCount += data.count;
      byLevel[data.definition.level] = (byLevel[data.definition.level] ?? 0) + data.count;

      items.push({
        patternId: id,
        pattern: data.definition.pattern,
        level: data.definition.level,
        meaning: data.definition.meaning,
        count: data.count,
        distinctExamsCount: data.exams.size,
        examIds: Array.from(data.exams),
        roles: { ...data.roles },
      });
    }

    // Sort by frequency descending
    items.sort((a, b) => b.count - a.count);

    return {
      totalCount,
      uniqueCount: items.length,
      byLevel,
      items,
    };
  }

  clear(): void {
    this.occurrences.clear();
  }
}
