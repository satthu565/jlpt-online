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

export class CorpusAggregator {
  private vocabMap = new Map<string, VocabOccurrenceItem>();
  private kanjiAnalyzer = new KanjiAnalyzer();
  private grammarAnalyzer = new GrammarAnalyzer();
  private examIds = new Set<string>();
  private totalTokens = 0;
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
   * Records a list of tokens into the corpus.
   */
  recordTokens(
    tokens: WordToken[],
    metadata: {
      examId: string;
      level?: JlptLevel;
      skill?: QuestionSkill;
      session?: string;
      source?: string;
    },
  ): void {
    const examId = metadata.examId;
    this.examIds.add(examId);
    const level = metadata.level ?? 'N5';
    const skill = metadata.skill ?? 'vocabulary';
    const session = metadata.session ?? 'unknown';
    const sourceName = metadata.source ?? 'unknown';

    for (const token of tokens) {
      this.totalTokens += 1;
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
        };
        this.vocabMap.set(key, entry);
      }

      entry.count += 1;
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
    const sourceName = pkg.source?.name ?? pkg.exam.title;

    if (!pkg.exam.groups) return;

    for (const group of pkg.exam.groups) {
      // 1. Group instructions
      if (group.instructions) {
        const tokens = tokenizeRichText(group.instructions as RichText, 'instruction', false);
        this.recordTokens(tokens, { examId, level, skill: 'reading', session, source: sourceName });
        const text = richTextToPlainText(group.instructions as RichText);
        this.kanjiAnalyzer.recordText(text, { examId, level, skill: 'reading', role: 'instruction' });
        this.grammarAnalyzer.recordText(text, { examId, level, role: 'instruction', isTarget: false });
      }

      // 2. Reading passages
      if (group.passage && Array.isArray(group.passage)) {
        const passageBlocks = group.passage as RichBlock[];
        const tokens = tokenizeRichBlocks(passageBlocks, 'passage');
        this.recordTokens(tokens, { examId, level, skill: 'reading', session, source: sourceName });
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

          // Stem
          if (q.stem) {
            const tokens = tokenizeRichText(q.stem as RichText, 'stem', false);
            this.recordTokens(tokens, { examId, level, skill, session, source: sourceName });
            const stemText = richTextToPlainText(q.stem as RichText);
            this.kanjiAnalyzer.recordText(stemText, { examId, level, skill, role: 'stem' });
            this.grammarAnalyzer.recordText(stemText, { examId, level, role: 'stem', isTarget: skill === 'grammar' });
          }

          // Options
          if (q.options && Array.isArray(q.options)) {
            for (const opt of q.options) {
              if (opt.content) {
                const optTokens = tokenizeRichText(opt.content as RichText, 'option', false);
                this.recordTokens(optTokens, { examId, level, skill, session, source: sourceName });
                const optText = richTextToPlainText(opt.content as RichText);
                this.kanjiAnalyzer.recordText(optText, { examId, level, skill, role: 'option' });
                this.grammarAnalyzer.recordText(optText, { examId, level, role: 'option', isTarget: skill === 'grammar' });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Returns metadata about the corpus (Acceptance 3).
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
    };
  }

  /**
   * Queries and filters vocabulary statistics with rankings (DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10).
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

    // Sort by total frequency descending (DATA-09 Ranking)
    items.sort((a, b) => b.count - a.count);

    const rankings: CorpusRankingItem[] = items.map((item, index) => ({
      rank: index + 1,
      baseForm: item.baseForm,
      surface: item.term,
      level: item.level,
      partOfSpeech: item.partOfSpeech,
      frequency: item.count,
      targetFrequency: item.targetCount,
      incidentalFrequency: item.incidentalCount,
      distinctExamsCount: item.distinctExamsCount,
    }));

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

  clear(): void {
    this.vocabMap.clear();
    this.kanjiAnalyzer.clear();
    this.grammarAnalyzer.clear();
    this.examIds.clear();
    this.totalTokens = 0;
  }
}
