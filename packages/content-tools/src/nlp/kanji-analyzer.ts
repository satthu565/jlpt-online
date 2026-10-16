import { extractKanjiCharacters } from './japanese-text.js';
import { getKanjiInfo } from './kanji-dict.js';
import type {
  JlptLevel,
  KanjiOccurrence,
  QuestionSkill,
  SentenceRole,
} from './types.js';

export interface KanjiAnalysisResult {
  totalCount: number;
  uniqueCount: number;
  byLevel: Record<JlptLevel, number>;
  byKnowledgeGroup: Record<string, number>;
  items: KanjiOccurrence[];
}

export class KanjiAnalyzer {
  private occurrences = new Map<string, {
    info: ReturnType<typeof getKanjiInfo>;
    count: number;
    exams: Set<string>;
    roles: Record<SentenceRole, number>;
    levels: Record<JlptLevel, number>;
    skills: Record<QuestionSkill, number>;
  }>();

  /**
   * Records kanji characters found in a piece of text.
   */
  recordText(
    text: string,
    metadata: {
      examId?: string;
      level?: JlptLevel;
      skill?: QuestionSkill;
      role?: SentenceRole;
    } = {},
  ): string[] {
    const kanjis = extractKanjiCharacters(text);
    const role = metadata.role ?? 'stem';
    const level = metadata.level ?? 'N5';
    const skill = metadata.skill ?? 'kanji';
    const examId = metadata.examId ?? 'default';

    for (const k of kanjis) {
      let entry = this.occurrences.get(k);
      if (!entry) {
        entry = {
          info: getKanjiInfo(k),
          count: 0,
          exams: new Set(),
          roles: { stem: 0, option: 0, passage: 0, instruction: 0, transcript: 0 },
          levels: { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 },
          skills: { kanji: 0, vocabulary: 0, grammar: 0, reading: 0, listening: 0 },
        };
        this.occurrences.set(k, entry);
      }

      entry.count += 1;
      entry.exams.add(examId);
      entry.roles[role] = (entry.roles[role] ?? 0) + 1;
      entry.levels[level] = (entry.levels[level] ?? 0) + 1;
      entry.skills[skill] = (entry.skills[skill] ?? 0) + 1;
    }

    return kanjis;
  }

  /**
   * Produces aggregated analysis of all recorded kanji.
   */
  getAnalysis(): KanjiAnalysisResult {
    let totalCount = 0;
    const byLevel: Record<JlptLevel, number> = { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 };
    const byKnowledgeGroup: Record<string, number> = {};
    const items: KanjiOccurrence[] = [];

    for (const [kanji, data] of this.occurrences.entries()) {
      totalCount += data.count;
      const kanjiLevel = data.info.level;
      byLevel[kanjiLevel] = (byLevel[kanjiLevel] ?? 0) + data.count;

      const group = data.info.knowledgeGroup;
      byKnowledgeGroup[group] = (byKnowledgeGroup[group] ?? 0) + data.count;

      items.push({
        kanji,
        level: data.info.level,
        strokeCount: data.info.strokeCount,
        knowledgeGroup: data.info.knowledgeGroup,
        count: data.count,
        distinctExamsCount: data.exams.size,
        roles: { ...data.roles },
        levels: { ...data.levels },
        skills: { ...data.skills },
      });
    }

    // Sort items by count descending
    items.sort((a, b) => b.count - a.count);

    return {
      totalCount,
      uniqueCount: items.length,
      byLevel,
      byKnowledgeGroup,
      items,
    };
  }

  clear(): void {
    this.occurrences.clear();
  }
}
