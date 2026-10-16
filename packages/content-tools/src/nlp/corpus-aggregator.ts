import type { RichBlock, RichText } from '@jlpt/schema';
import { GrammarAnalyzer } from './grammar-analyzer.js';
import { richTextToPlainText } from './japanese-text.js';
import { KanjiAnalyzer } from './kanji-analyzer.js';
import { tokenizeRichBlocks, tokenizeRichText } from './tokenizer.js';
import type {
  CorpusFilter,
  CorpusMetadata,
  CorpusRankingItem,
  JlptLevel,
  QuestionSkill,
  SentenceRole,
  VocabOccurrenceItem,
  WordToken,
} from './types.js';

export interface ExamPackageInput {
  packageId: string;
  revision?: number;
  source?: {
    name?: string;
    level?: string;
    year?: number | null;
    session?: string | null;
    provenance?: string;
    licenseRef?: string;
  };
  exam: {
    title: string;
    slug?: string;
    sections?: Array<{
      code: string;
      title: string;
      groupIds: string[];
      listeningTimeline?: Array<{
        groupId: string;
        transcript?: unknown;
      }>;
    }>;
    groups?: Array<{
      id: string;
      instructions?: RichText | unknown;
      passage?: RichBlock[] | unknown;
      questions?: Array<{
        id: string;
        skill: string;
        stem: RichText | unknown;
        options?: Array<{
          id: string;
          content: RichText | unknown;
        }>;
      }>;
    }>;
  };
}

export interface CorpusQuestionItem {
  id: string;
  examId: string;
  examTitle: string;
  level: JlptLevel;
  skill: QuestionSkill;
  stem: unknown;
  stemText: string;
  options?: Array<{ id: string; content: unknown; text: string }>;
  terms: string[];
  grammarPatternIds: string[];
}

export interface VocabDetailedStatsDto {
  term: string;
  baseForm: string;
  level: JlptLevel;
  partOfSpeech?: string;
  totalCount: number;
  targetCount: number;
  incidentalCount: number;
  distinctExamsCount: number;
  examIds: string[];
  byLevel: Record<JlptLevel, number>;
  bySkill: Record<QuestionSkill, number>;
  byRole: Record<SentenceRole, number>;
  bySession: Record<string, number>;
  bySource: Record<string, number>;
  rank: number;
  percentageOfLevel: number;
}

export interface LevelComparisonItemDto {
  level: JlptLevel;
  totalTokens: number;
  uniqueVocabCount: number;
  percentage: number;
}

export interface LevelComparisonResultDto {
  datasetId: string;
  levels: Record<JlptLevel, LevelComparisonItemDto>;
  termDistributions?: Array<{
    term: string;
    counts: Record<JlptLevel, number>;
    primaryLevel: JlptLevel;
  }>;
}

export interface TimeSeriesSessionDto {
  session: string;
  documentCount: number;
  totalTokens: number;
  uniqueVocabCount: number;
  levelDistribution: Record<JlptLevel, number>;
  topVocab: Array<{ term: string; count: number }>;
}

export interface StudyListItemDto {
  rank: number;
  baseForm: string;
  surface: string;
  level: JlptLevel;
  partOfSpeech?: string;
  frequency: number;
  targetFrequency: number;
  distinctExamsCount: number;
  priorityTier: 'TIER_1_CRITICAL' | 'TIER_2_HIGH' | 'TIER_3_MODERATE';
}

export interface YearlyTrendItemDto {
  term: string;
  level: JlptLevel;
  totalFrequency: number;
  distinctYearsCount: number;
  yearlyCounts: Record<string, number>;
  trend: 'increasing' | 'decreasing' | 'stable' | 'emerging';
}

export interface GrammarPracticeItemDto {
  patternId: string;
  pattern: string;
  level: JlptLevel;
  meaning: string;
  frequency: number;
  questions: CorpusQuestionItem[];
}

export class CorpusAggregator {
  private vocabMap = new Map<string, VocabOccurrenceItem>();
  private kanjiAnalyzer = new KanjiAnalyzer();
  private grammarAnalyzer = new GrammarAnalyzer();
  private questions: CorpusQuestionItem[] = [];
  private examIds = new Set<string>();
  private observedExamIds = new Set<string>();
  private syntheticExamIds = new Set<string>();
  private totalTokens = 0;
  private observedTokens = 0;
  private syntheticTokens = 0;
  private datasetId: string;
  private name: string;
  private version: string;
  private source: string;
  private date: string;
  private licenseAttribution: string;

  constructor(options: {
    datasetId?: string;
    name?: string;
    version?: string;
    source?: string;
    date?: string;
    licenseAttribution?: string;
  } = {}) {
    this.datasetId = options.datasetId ?? 'corpus-dataset-v1';
    this.name = options.name ?? 'JLPT Exam Corpus';
    this.version = options.version ?? '2.0.0';
    this.source = options.source ?? 'Official JLPT and Synthetic Prepared Data';
    this.date = options.date ?? new Date().toISOString().split('T')[0]!;
    this.licenseAttribution =
      options.licenseAttribution ??
      'Electronic Dictionary Research and Development Group (EDRDG) JMdict / CC-BY-SA 4.0; JLPT Prepared Data';
  }

  /**
   * Records a list of tokens into the corpus, differentiating observed vs synthetic data (Acceptance 4).
   */
  recordTokens(
    tokens: WordToken[],
    metadata: {
      examId: string;
      level?: JlptLevel;
      skill?: QuestionSkill;
      session?: string;
      source?: string;
      provenance?: string;
      isObserved?: boolean;
    },
  ): void {
    const examId = metadata.examId;
    this.examIds.add(examId);
    const level = metadata.level ?? 'N5';
    const skill = metadata.skill ?? 'vocabulary';
    const session = metadata.session ?? 'unknown';
    const sourceName = metadata.source ?? 'unknown';
    const provenance =
      metadata.provenance ?? (metadata.isObserved ? 'official_past_exam' : 'synthetic');
    const isObserved = metadata.isObserved ?? (provenance === 'official_past_exam');

    if (isObserved) {
      this.observedExamIds.add(examId);
    } else {
      this.syntheticExamIds.add(examId);
    }

    for (const token of tokens) {
      this.totalTokens += 1;
      if (isObserved) {
        this.observedTokens += 1;
      } else {
        this.syntheticTokens += 1;
      }
      const key = token.baseForm;

      let entry = this.vocabMap.get(key);
      if (!entry) {
        entry = {
          term: token.surface,
          baseForm: token.baseForm,
          level: token.level ?? level,
          partOfSpeech: token.partOfSpeech,
          count: 0,
          targetCount: 0,
          incidentalCount: 0,
          distinctExamsCount: 0,
          examIds: [],
          byLevel: { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 },
          bySkill: { kanji: 0, vocabulary: 0, grammar: 0, reading: 0, listening: 0 },
          byRole: { stem: 0, option: 0, passage: 0, instruction: 0, transcript: 0 },
          bySession: {},
          bySource: {},
          observedCount: 0,
          syntheticCount: 0,
          byProvenance: {},
        };
        this.vocabMap.set(key, entry);
      }

      entry.count += 1;
      if (isObserved) {
        entry.observedCount += 1;
      } else {
        entry.syntheticCount += 1;
      }
      entry.byProvenance[provenance] = (entry.byProvenance[provenance] ?? 0) + 1;

      if (token.isTarget) {
        entry.targetCount += 1;
      } else {
        entry.incidentalCount += 1;
      }

      if (!entry.examIds.includes(examId)) {
        entry.examIds.push(examId);
        entry.distinctExamsCount = entry.examIds.length;
      }

      entry.byLevel[level] = (entry.byLevel[level] ?? 0) + 1;
      entry.bySkill[skill] = (entry.bySkill[skill] ?? 0) + 1;
      entry.byRole[token.role] = (entry.byRole[token.role] ?? 0) + 1;
      entry.bySession[session] = (entry.bySession[session] ?? 0) + 1;
      entry.bySource[sourceName] = (entry.bySource[sourceName] ?? 0) + 1;
    }
  }

  /**
   * Ingests a complete exam package into the corpus aggregator.
   */
  ingestExam(pkg: ExamPackageInput): void {
    const examId = pkg.packageId;
    const levelStr = pkg.source?.level ?? 'N5';
    const level: JlptLevel = ['N1', 'N2', 'N3', 'N4', 'N5'].includes(levelStr)
      ? (levelStr as JlptLevel)
      : 'N5';
    const session =
      pkg.source?.year && pkg.source?.session
        ? `${pkg.source.year}-${pkg.source.session}`
        : pkg.source?.year
          ? `${pkg.source.year}`
          : 'synthetic';
    const provenance =
      pkg.source?.provenance ??
      (pkg.source?.year ? 'official_past_exam' : 'synthetic');
    const isObserved = provenance === 'official_past_exam';
    const sourceName = pkg.source?.name ?? pkg.exam?.title ?? 'exam';

    if (!pkg.exam?.groups) return;

    for (const group of pkg.exam.groups) {
      // 1. Group instructions
      if (group.instructions) {
        const tokens = tokenizeRichText(group.instructions as RichText, 'instruction', false);
        this.recordTokens(tokens, {
          examId,
          level,
          skill: 'reading',
          session,
          source: sourceName,
          provenance,
          isObserved,
        });
        const text = richTextToPlainText(group.instructions as RichText);
        this.kanjiAnalyzer.recordText(text, { examId, level, skill: 'reading', role: 'instruction' });
        this.grammarAnalyzer.recordText(text, { examId, level, role: 'instruction', isTarget: false });
      }

      // 2. Reading passages
      if (group.passage && Array.isArray(group.passage)) {
        const passageBlocks = group.passage as RichBlock[];
        const tokens = tokenizeRichBlocks(passageBlocks, 'passage');
        this.recordTokens(tokens, {
          examId,
          level,
          skill: 'reading',
          session,
          source: sourceName,
          provenance,
          isObserved,
        });
        for (const block of passageBlocks) {
          if (block.type === 'paragraph') {
            const text = richTextToPlainText(block.content);
            this.kanjiAnalyzer.recordText(text, { examId, level, skill: 'reading', role: 'passage' });
            this.grammarAnalyzer.recordText(text, { examId, level, role: 'passage', isTarget: false });
          }
        }
      }

      // 3. Questions
      if (group.questions) {
        for (const q of group.questions) {
          const rawSkill = (q.skill || 'vocabulary').toLowerCase();
          const skill: QuestionSkill = [
            'kanji',
            'vocabulary',
            'grammar',
            'reading',
            'listening',
          ].includes(rawSkill)
            ? (rawSkill as QuestionSkill)
            : 'vocabulary';

          let stemText = '';
          const questionTerms: string[] = [];
          // Stem
          if (q.stem) {
            const tokens = tokenizeRichText(q.stem as RichText, 'stem', false);
            this.recordTokens(tokens, {
              examId,
              level,
              skill,
              session,
              source: sourceName,
              provenance,
              isObserved,
            });
            stemText = richTextToPlainText(q.stem as RichText);
            this.kanjiAnalyzer.recordText(stemText, { examId, level, skill, role: 'stem' });
            this.grammarAnalyzer.recordText(stemText, { examId, level, role: 'stem', isTarget: skill === 'grammar' });
            for (const t of tokens) {
              if (!questionTerms.includes(t.baseForm)) {
                questionTerms.push(t.baseForm);
              }
            }
          }

          // Options (Zero answer leak: no answerKey, no correct flags!)
          const safeOptions: Array<{ id: string; content: unknown; text: string }> = [];
          if (q.options && Array.isArray(q.options)) {
            for (const opt of q.options) {
              if (opt.content) {
                const optTokens = tokenizeRichText(opt.content as RichText, 'option', false);
                this.recordTokens(optTokens, {
                  examId,
                  level,
                  skill,
                  session,
                  source: sourceName,
                  provenance,
                  isObserved,
                });
                const optText = richTextToPlainText(opt.content as RichText);
                this.kanjiAnalyzer.recordText(optText, { examId, level, skill, role: 'option' });
                this.grammarAnalyzer.recordText(optText, { examId, level, role: 'option', isTarget: skill === 'grammar' });
                safeOptions.push({
                  id: opt.id,
                  content: opt.content,
                  text: optText,
                });
                for (const t of optTokens) {
                  if (!questionTerms.includes(t.baseForm)) {
                    questionTerms.push(t.baseForm);
                  }
                }
              }
            }
          }

          const grammarMatches = this.grammarAnalyzer.findPatterns(stemText);
          const grammarPatternIds = grammarMatches.map((m) => m.patternId);

          this.questions.push({
            id: q.id,
            examId,
            examTitle: pkg.exam.title,
            level,
            skill,
            stem: q.stem,
            stemText,
            options: safeOptions,
            terms: questionTerms,
            grammarPatternIds,
          });
        }
      }
    }
  }

  /**
   * Returns metadata about the corpus with observed vs synthetic breakdown (DATA-18, Acceptance 4).
   */
  getMetadata(): CorpusMetadata {
    const items = Array.from(this.vocabMap.values());
    const levelCounts: Record<JlptLevel, number> = { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 };
    const skillCounts: Record<QuestionSkill, number> = {
      kanji: 0,
      vocabulary: 0,
      grammar: 0,
      reading: 0,
      listening: 0,
    };

    for (const item of items) {
      if (item.level) {
        levelCounts[item.level] = (levelCounts[item.level] ?? 0) + item.count;
      }
      for (const [sk, count] of Object.entries(item.bySkill)) {
        skillCounts[sk as QuestionSkill] = (skillCounts[sk as QuestionSkill] ?? 0) + count;
      }
    }

    const kanjiAnalysis = this.kanjiAnalyzer.getAnalysis();
    const grammarAnalysis = this.grammarAnalyzer.getAnalysis();

    return {
      datasetId: this.datasetId,
      name: this.name,
      version: this.version,
      source: this.source,
      date: this.date,
      documentCount: this.examIds.size,
      totalTokens: this.totalTokens,
      uniqueVocabCount: this.vocabMap.size,
      uniqueKanjiCount: kanjiAnalysis.uniqueCount,
      uniqueGrammarCount: grammarAnalysis.uniqueCount,
      levels: levelCounts,
      skills: skillCounts,
      licenseAttribution: this.licenseAttribution,
      observedTokens: this.observedTokens,
      syntheticTokens: this.syntheticTokens,
      observedDocuments: this.observedExamIds.size,
      syntheticDocuments: this.syntheticExamIds.size,
      breakdown: {
        observed: this.observedExamIds.size,
        synthetic: this.syntheticExamIds.size,
      },
    };
  }

  /**
   * Queries and filters vocabulary statistics with rankings, distinguishing observed and synthetic data (DATA-03..10, Acceptance 4).
   */
  getVocabularyAnalysis(filter: CorpusFilter = {}): {
    total: number;
    items: VocabOccurrenceItem[];
    rankings: CorpusRankingItem[];
  } {
    let items = Array.from(this.vocabMap.values());

    if (filter.level) {
      items = items.filter((i) => i.level === filter.level || i.byLevel[filter.level!] > 0);
    }
    if (filter.skill) {
      items = items.filter((i) => (i.bySkill[filter.skill!] ?? 0) > 0);
    }
    if (filter.role) {
      items = items.filter((i) => (i.byRole[filter.role!] ?? 0) > 0);
    }
    if (filter.isTarget === true) {
      items = items.filter((i) => i.targetCount > 0);
    } else if (filter.isTarget === false) {
      items = items.filter((i) => i.incidentalCount > 0);
    }
    if (filter.session) {
      items = items.filter((i) => (i.bySession[filter.session!] ?? 0) > 0);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (i) => i.baseForm.toLowerCase().includes(q) || i.term.toLowerCase().includes(q),
      );
    }
    // Filter by observed vs synthetic (Acceptance 4)
    if (filter.dataType === 'observed') {
      items = items.filter((i) => i.observedCount > 0);
    } else if (filter.dataType === 'synthetic') {
      items = items.filter((i) => i.syntheticCount > 0);
    }
    if (filter.provenance) {
      items = items.filter((i) => (i.byProvenance[filter.provenance!] ?? 0) > 0);
    }

    // Sort by appropriate frequency descending
    items.sort((a, b) => {
      const freqA =
        filter.dataType === 'observed'
          ? a.observedCount
          : filter.dataType === 'synthetic'
            ? a.syntheticCount
            : a.count;
      const freqB =
        filter.dataType === 'observed'
          ? b.observedCount
          : filter.dataType === 'synthetic'
            ? b.syntheticCount
            : b.count;
      return freqB - freqA;
    });

    const rankings: CorpusRankingItem[] = items.map((item, index) => {
      const frequency =
        filter.dataType === 'observed'
          ? item.observedCount
          : filter.dataType === 'synthetic'
            ? item.syntheticCount
            : item.count;
      return {
        rank: index + 1,
        baseForm: item.baseForm,
        surface: item.term,
        level: item.level,
        partOfSpeech: item.partOfSpeech,
        frequency,
        targetFrequency: item.targetCount,
        incidentalFrequency: item.incidentalCount,
        distinctExamsCount: item.distinctExamsCount,
        observedFrequency: item.observedCount,
        syntheticFrequency: item.syntheticCount,
        dataType:
          item.observedCount > 0 && item.syntheticCount > 0
            ? 'mixed'
            : item.observedCount > 0
              ? 'observed'
              : 'synthetic',
      };
    });

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      total: items.length,
      items: paginatedItems,
      rankings: rankings.slice(offset, offset + limit),
    };
  }

  getKanjiAnalysis() {
    return this.kanjiAnalyzer.getAnalysis();
  }

  getGrammarAnalysis() {
    return this.grammarAnalyzer.getAnalysis();
  }

  getExamsForGrammar(patternId: string): string[] {
    return this.grammarAnalyzer.getExamsForPattern(patternId);
  }

  /**
   * Returns questions containing a specific term without answer leaks (DATA-11).
   */
  getQuestionsForWord(
    term: string,
    options?: { level?: JlptLevel; limit?: number },
  ): CorpusQuestionItem[] {
    const qTerm = term.trim().toLowerCase();
    let matches = this.questions.filter((q) => {
      if (options?.level && q.level !== options.level) return false;
      return (
        q.terms.some((t) => t.toLowerCase() === qTerm) ||
        q.stemText.toLowerCase().includes(qTerm) ||
        (q.options && q.options.some((opt) => opt.text.toLowerCase().includes(qTerm)))
      );
    });
    if (options?.limit) {
      matches = matches.slice(0, options.limit);
    }
    return matches;
  }

  /**
   * Retrieves comprehensive statistics for a single vocabulary term (DATA-12).
   */
  getWordStatistics(term: string): VocabDetailedStatsDto | null {
    const qTerm = term.trim().toLowerCase();
    const item = Array.from(this.vocabMap.values()).find(
      (v) => v.baseForm.toLowerCase() === qTerm || v.term.toLowerCase() === qTerm,
    );
    if (!item) return null;

    const allRanked = Array.from(this.vocabMap.values()).sort((a, b) => b.count - a.count);
    const rank = allRanked.findIndex((v) => v.baseForm === item.baseForm) + 1;

    const level = item.level ?? 'N5';
    const totalInLevel = Array.from(this.vocabMap.values())
      .filter((v) => (v.level ?? 'N5') === level)
      .reduce((sum, v) => sum + v.count, 0);

    const percentageOfLevel =
      totalInLevel > 0 ? Math.round((item.count / totalInLevel) * 10000) / 100 : 0;

    return {
      term: item.baseForm,
      baseForm: item.baseForm,
      level,
      partOfSpeech: item.partOfSpeech,
      totalCount: item.count,
      targetCount: item.targetCount,
      incidentalCount: item.incidentalCount,
      distinctExamsCount: item.distinctExamsCount,
      examIds: item.examIds,
      byLevel: item.byLevel,
      bySkill: item.bySkill,
      byRole: item.byRole,
      bySession: item.bySession,
      bySource: item.bySource,
      rank,
      percentageOfLevel,
    };
  }

  /**
   * Compares appearance levels across N1..N5 for terms or entire corpus (DATA-13).
   */
  compareLevels(terms?: string[]): LevelComparisonResultDto {
    const meta = this.getMetadata();
    const levelsRecord: Record<JlptLevel, LevelComparisonItemDto> = {
      N1: { level: 'N1', totalTokens: meta.levels.N1, uniqueVocabCount: 0, percentage: 0 },
      N2: { level: 'N2', totalTokens: meta.levels.N2, uniqueVocabCount: 0, percentage: 0 },
      N3: { level: 'N3', totalTokens: meta.levels.N3, uniqueVocabCount: 0, percentage: 0 },
      N4: { level: 'N4', totalTokens: meta.levels.N4, uniqueVocabCount: 0, percentage: 0 },
      N5: { level: 'N5', totalTokens: meta.levels.N5, uniqueVocabCount: 0, percentage: 0 },
    };

    for (const v of this.vocabMap.values()) {
      for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5'] as JlptLevel[]) {
        if (v.byLevel[lvl] > 0) {
          levelsRecord[lvl].uniqueVocabCount += 1;
        }
      }
    }

    const totalTokensAll = meta.totalTokens || 1;
    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5'] as JlptLevel[]) {
      levelsRecord[lvl].percentage =
        Math.round((levelsRecord[lvl].totalTokens / totalTokensAll) * 10000) / 100;
    }

    let termDistributions: LevelComparisonResultDto['termDistributions'];
    if (terms && terms.length > 0) {
      termDistributions = [];
      for (const t of terms) {
        const stats = this.getWordStatistics(t);
        const counts: Record<JlptLevel, number> = stats
          ? stats.byLevel
          : { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 };
        let maxLvl: JlptLevel = 'N5';
        let maxCount = -1;
        for (const [lvl, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count;
            maxLvl = lvl as JlptLevel;
          }
        }
        termDistributions.push({
          term: t,
          counts,
          primaryLevel: maxLvl,
        });
      }
    }

    return {
      datasetId: this.datasetId,
      levels: levelsRecord,
      termDistributions,
    };
  }

  /**
   * Groups statistics by exam session or time period (DATA-14).
   */
  getTimeSeries(): { sessions: TimeSeriesSessionDto[] } {
    const sessionMap = new Map<
      string,
      {
        exams: Set<string>;
        totalTokens: number;
        vocabSet: Set<string>;
        levels: Record<JlptLevel, number>;
        vocabCounts: Map<string, number>;
      }
    >();

    for (const v of this.vocabMap.values()) {
      for (const [session, count] of Object.entries(v.bySession)) {
        if (count <= 0) continue;
        let sData = sessionMap.get(session);
        if (!sData) {
          sData = {
            exams: new Set(),
            totalTokens: 0,
            vocabSet: new Set(),
            levels: { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 },
            vocabCounts: new Map(),
          };
          sessionMap.set(session, sData);
        }
        sData.totalTokens += count;
        sData.vocabSet.add(v.baseForm);
        const lvl = v.level ?? 'N5';
        sData.levels[lvl] = (sData.levels[lvl] ?? 0) + count;
        sData.vocabCounts.set(v.baseForm, (sData.vocabCounts.get(v.baseForm) ?? 0) + count);
      }
    }

    for (const q of this.questions) {
      for (const [, sData] of sessionMap.entries()) {
        sData.exams.add(q.examId);
      }
    }

    const sessions: TimeSeriesSessionDto[] = Array.from(sessionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([session, data]) => {
        const topVocab = Array.from(data.vocabCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([term, count]) => ({ term, count }));

        return {
          session,
          documentCount: Math.max(1, data.exams.size),
          totalTokens: data.totalTokens,
          uniqueVocabCount: data.vocabSet.size,
          levelDistribution: data.levels,
          topVocab,
        };
      });

    return { sessions };
  }

  /**
   * Generates a curated study list prioritizing frequent vocabulary (DATA-15).
   */
  createStudyList(
    options: {
      level?: JlptLevel;
      minFrequency?: number;
      prioritizeTarget?: boolean;
      limit?: number;
    } = {},
  ): { total: number; items: StudyListItemDto[] } {
    let items = Array.from(this.vocabMap.values());
    if (options.level) {
      items = items.filter((i) => i.level === options.level || i.byLevel[options.level!] > 0);
    }
    const minFreq = options.minFrequency ?? 1;
    items = items.filter((i) => i.count >= minFreq);

    if (options.prioritizeTarget) {
      items.sort((a, b) => b.targetCount - a.targetCount || b.count - a.count);
    } else {
      items.sort((a, b) => b.count - a.count);
    }

    const total = items.length;
    const limit = options.limit ?? 100;
    const paginated = items.slice(0, limit);

    const studyList: StudyListItemDto[] = paginated.map((item, idx) => {
      let tier: StudyListItemDto['priorityTier'] = 'TIER_3_MODERATE';
      if (item.targetCount >= 1) {
        tier = 'TIER_1_CRITICAL';
      } else if (item.count >= 2) {
        tier = 'TIER_2_HIGH';
      }
      return {
        rank: idx + 1,
        baseForm: item.baseForm,
        surface: item.term,
        level: item.level ?? options.level ?? 'N5',
        partOfSpeech: item.partOfSpeech,
        frequency: item.count,
        targetFrequency: item.targetCount,
        distinctExamsCount: item.distinctExamsCount,
        priorityTier: tier,
      };
    });

    return { total, items: studyList };
  }

  /**
   * Analyzes multi-year frequency trends for vocabulary (DATA-24).
   */
  getYearlyTrends(options: { minOccurrences?: number } = {}): {
    trends: YearlyTrendItemDto[];
    topByLevel: Record<JlptLevel, YearlyTrendItemDto[]>;
  } {
    const minOcc = options.minOccurrences ?? 1;
    const trends: YearlyTrendItemDto[] = [];
    const topByLevel: Record<JlptLevel, YearlyTrendItemDto[]> = {
      N1: [],
      N2: [],
      N3: [],
      N4: [],
      N5: [],
    };

    for (const v of this.vocabMap.values()) {
      if (v.count < minOcc) continue;
      const yearlyCounts: Record<string, number> = {};
      for (const [sess, count] of Object.entries(v.bySession)) {
        const year = sess.split('-')[0] ?? sess;
        yearlyCounts[year] = (yearlyCounts[year] ?? 0) + count;
      }

      const years = Object.keys(yearlyCounts).sort();
      let trend: YearlyTrendItemDto['trend'] = 'stable';
      if (years.length >= 2) {
        const firstHalf = years.slice(0, Math.floor(years.length / 2));
        const secondHalf = years.slice(Math.floor(years.length / 2));
        const firstSum = firstHalf.reduce((sum, y) => sum + (yearlyCounts[y] ?? 0), 0);
        const secondSum = secondHalf.reduce((sum, y) => sum + (yearlyCounts[y] ?? 0), 0);
        if (secondSum > firstSum * 1.5) {
          trend = firstSum === 0 ? 'emerging' : 'increasing';
        } else if (firstSum > secondSum * 1.5) {
          trend = 'decreasing';
        }
      }

      const item: YearlyTrendItemDto = {
        term: v.baseForm,
        level: v.level ?? 'N5',
        totalFrequency: v.count,
        distinctYearsCount: Object.keys(yearlyCounts).length,
        yearlyCounts,
        trend,
      };
      trends.push(item);
      const lvl = v.level ?? 'N5';
      topByLevel[lvl].push(item);
    }

    trends.sort((a, b) => b.totalFrequency - a.totalFrequency);
    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5'] as JlptLevel[]) {
      topByLevel[lvl].sort((a, b) => b.totalFrequency - a.totalFrequency);
    }

    return { trends, topByLevel };
  }

  /**
   * Returns grammar pattern details and practice questions without answer leaks (DATA-25).
   */
  getGrammarPractice(patternIdOrName: string): GrammarPracticeItemDto | null {
    const analysis = this.grammarAnalyzer.getAnalysis();
    const query = patternIdOrName.trim().toLowerCase();
    const gItem = analysis.items.find(
      (i) =>
        i.patternId.toLowerCase() === query ||
        i.pattern.toLowerCase() === query ||
        query.includes(i.patternId.toLowerCase()) ||
        query.includes(i.pattern.toLowerCase()) ||
        i.patternId.toLowerCase().includes(query) ||
        i.pattern.toLowerCase().includes(query),
    );
    if (!gItem) return null;

    const matchingQuestions = this.questions.filter(
      (q) =>
        q.grammarPatternIds.includes(gItem.patternId) ||
        q.stemText.includes(gItem.pattern),
    );

    return {
      patternId: gItem.patternId,
      pattern: gItem.pattern,
      level: gItem.level,
      meaning: gItem.meaning,
      frequency: gItem.count,
      questions: matchingQuestions,
    };
  }

  clear(): void {
    this.vocabMap.clear();
    this.kanjiAnalyzer.clear();
    this.grammarAnalyzer.clear();
    this.questions = [];
    this.examIds.clear();
    this.totalTokens = 0;
  }
}
