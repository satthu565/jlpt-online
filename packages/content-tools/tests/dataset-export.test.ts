import { describe, expect, it } from 'vitest';
import {
  CorpusAggregator,
  createZipBuffer,
  exportDatasetToCsv,
  exportDatasetToXlsx,
  parseDatasetCsv,
  parseDatasetXlsx,
  readZipBuffer,
  sanitizeCsvField,
  sanitizeXlsxValue,
  verifyExportRoundtrip,
  type ExamPackageInput,
} from '../src/index.js';

describe('DATA-18 & Acceptance 6: Corpus Provenance, CSV/XLSX Export and Roundtrip', () => {
  function createSampleAggregator(): CorpusAggregator {
    const agg = new CorpusAggregator({
      datasetId: 'jlpt-official-2026',
      name: 'JLPT 2026 Comprehensive Dataset',
      version: '1.2.0',
      source: 'Official JLPT and Synthetic Prepared Data',
      date: '2026-10-16',
      licenseAttribution: 'EDRDG JMdict / CC-BY-SA 4.0; JLPT Prepared Data',
    });

    const samplePackage: ExamPackageInput = {
      packageId: 'exam-sample-n3',
      source: {
        name: 'JLPT July 2023 Official',
        level: 'N3',
        year: 2023,
        session: '07',
      },
      exam: {
        title: 'JLPT N3 Real Exam 2023-07',
        groups: [
          {
            id: 'grp-1',
            instructions: [{ text: '次の文の（　）に入れるのに最もよいものを、選びなさい。' }],
            passage: [
              {
                type: 'paragraph',
                content: [{ text: '田中さんは昨日、新しい学校へ行きました。' }],
              },
            ],
            questions: [
              {
                id: 'q-101',
                skill: 'vocabulary',
                stem: [{ text: '昨日の試験はとても' }, { text: '難しかった', t: 'underline' }, { text: 'です。' }],
                options: [
                  { id: 'opt-1', content: [{ text: 'やさしかった' }] },
                  { id: 'opt-2', content: [{ text: 'むずかしかった' }] },
                  { id: 'opt-3', content: [{ text: 'おもしろかった' }] },
                  { id: 'opt-4', content: [{ text: 'たのしかった' }] },
                ],
              },
              {
                id: 'q-102',
                skill: 'grammar',
                stem: [{ text: '熱があるから、学校へ行く' }, { text: 'わけにはいかない', t: 'underline' }, { text: '。' }],
                options: [
                  { id: 'opt-a', content: [{ text: 'わけにはいかない' }] },
                  { id: 'opt-b', content: [{ text: 'かもしれない' }] },
                  { id: 'opt-c', content: [{ text: 'はずがない' }] },
                  { id: 'opt-d', content: [{ text: 'にちがいない' }] },
                ],
              },
            ],
          },
        ],
      },
    };

    const pastPackage: ExamPackageInput = {
      packageId: 'exam-sample-n3-2020',
      source: {
        name: 'JLPT Dec 2020 Official',
        level: 'N3',
        year: 2020,
        session: '12',
      },
      exam: {
        title: 'JLPT N3 Real Exam 2020-12',
        groups: [
          {
            id: 'grp-2',
            questions: [
              {
                id: 'q-201',
                skill: 'vocabulary',
                stem: [{ text: '先生に本を借りました。' }],
                options: [{ id: 'opt-21', content: [{ text: 'せんせい' }] }],
              },
            ],
          },
        ],
      },
    };

    agg.ingestExam(samplePackage);
    agg.ingestExam(pastPackage);
    return agg;
  }

  describe('1. ZIP Archive Creation & Extraction Roundtrip', () => {
    it('creates standard zip buffer and extracts exact file contents', () => {
      const files = [
        { name: 'hello.txt', data: 'Hello World!' },
        { name: 'japanese.txt', data: '日本語のテキスト: 先生, 学校, 難しい' },
        { name: 'data/test.json', data: JSON.stringify({ id: 123, status: 'ok' }) },
      ];

      const zipBuf = createZipBuffer(files);
      expect(zipBuf).toBeInstanceOf(Buffer);
      expect(zipBuf.length).toBeGreaterThan(100);

      const extracted = readZipBuffer(zipBuf);
      expect(Buffer.from(extracted['hello.txt']!).toString('utf8')).toBe('Hello World!');
      expect(Buffer.from(extracted['japanese.txt']!).toString('utf8')).toBe(
        '日本語のテキスト: 先生, 学校, 難しい',
      );
      expect(Buffer.from(extracted['data/test.json']!).toString('utf8')).toBe(
        JSON.stringify({ id: 123, status: 'ok' }),
      );
    });
  });

  describe('2. Formula Injection Protection', () => {
    it('neutralizes dangerous formula characters in CSV fields', () => {
      expect(sanitizeCsvField('=1+2')).toBe("'=1+2");
      expect(sanitizeCsvField('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)");
      expect(sanitizeCsvField('-100')).toBe("'-100");
      expect(sanitizeCsvField('@cmd')).toBe("'@cmd");
      expect(sanitizeCsvField('\tTAB_PREFIX')).toBe("'\tTAB_PREFIX");
      expect(sanitizeCsvField('|PIPE')).toBe("'|PIPE");
      expect(sanitizeCsvField('%PERCENT')).toBe("'%PERCENT");
      expect(sanitizeCsvField(';SEMICOLON')).toBe("';SEMICOLON");

      // Benign Japanese and ASCII
      expect(sanitizeCsvField('学校')).toBe('学校');
      expect(sanitizeCsvField('Hello World')).toBe('Hello World');
    });

    it('neutralizes dangerous formula characters in XLSX string values', () => {
      expect(sanitizeXlsxValue('=1+2')).toBe("'=1+2");
      expect(sanitizeXlsxValue('+100')).toBe("'+100");
      expect(sanitizeXlsxValue(42)).toBe(42);
      expect(sanitizeXlsxValue('日本語')).toBe('日本語');
    });
  });

  describe('3. CSV Export and Roundtrip with Provenance', () => {
    it('exports vocabulary to CSV with BOM and provenance headers', () => {
      const agg = createSampleAggregator();
      const exportRes = exportDatasetToCsv(agg, { format: 'csv', type: 'vocabulary' });

      expect(exportRes.mimeType).toContain('text/csv');
      expect(exportRes.rowCount).toBeGreaterThan(0);
      expect(exportRes.provenance.datasetId).toBe('jlpt-official-2026');
      expect(exportRes.provenance.name).toBe('JLPT 2026 Comprehensive Dataset');
      expect(exportRes.provenance.license).toBe('CC-BY-SA-4.0');

      const csvStr = exportRes.data as string;
      // Check UTF-8 BOM
      expect(csvStr.charCodeAt(0)).toBe(0xfeff);

      // Check headers
      expect(csvStr).toContain('Rank,BaseForm,Surface,Level,PartOfSpeech,Frequency');
      expect(csvStr).toContain('jlpt-official-2026');
      expect(csvStr).toContain('CC-BY-SA-4.0');
    });

    it('parses CSV back and verifies exact roundtrip match', () => {
      const agg = createSampleAggregator();
      const exportRes = exportDatasetToCsv(agg, { format: 'csv', type: 'vocabulary' });
      const csvStr = exportRes.data as string;

      const parsed = parseDatasetCsv(csvStr);
      expect(parsed.format).toBe('csv');
      expect(parsed.type).toBe('vocabulary');
      expect(parsed.provenance.datasetId).toBe('jlpt-official-2026');
      expect(parsed.provenance.version).toBe('1.2.0');
      expect(parsed.provenance.license).toBe('CC-BY-SA-4.0');
      expect(parsed.rows.length).toBe(exportRes.rowCount);

      // Verify specific row integrity
      const firstRow = parsed.rows[0]!;
      expect(firstRow['Rank']).toBe(1);
      expect(typeof firstRow['Frequency']).toBe('number');
      expect(firstRow['DatasetId']).toBe('jlpt-official-2026');
    });

    it('exports and roundtrips grammar and kanji CSV', () => {
      const agg = createSampleAggregator();

      // Grammar
      const grammarRes = exportDatasetToCsv(agg, { format: 'csv', type: 'grammar' });
      const parsedGrammar = parseDatasetCsv(grammarRes.data as string);
      expect(parsedGrammar.type).toBe('grammar');
      expect(parsedGrammar.rows.length).toBe(grammarRes.rowCount);

      // Kanji
      const kanjiRes = exportDatasetToCsv(agg, { format: 'csv', type: 'kanji' });
      const parsedKanji = parseDatasetCsv(kanjiRes.data as string);
      expect(parsedKanji.type).toBe('kanji');
      expect(parsedKanji.rows.length).toBe(kanjiRes.rowCount);
    });
  });

  describe('4. XLSX Export and Roundtrip with Provenance', () => {
    it('exports vocabulary to OpenXML XLSX buffer with multiple sheets and provenance', () => {
      const agg = createSampleAggregator();
      const exportRes = exportDatasetToXlsx(agg, { format: 'xlsx', type: 'vocabulary' });

      expect(exportRes.mimeType).toContain('spreadsheetml.sheet');
      expect(exportRes.data).toBeInstanceOf(Buffer);
      expect((exportRes.data as Buffer).length).toBeGreaterThan(500);

      const parsed = parseDatasetXlsx(exportRes.data as Buffer);
      expect(parsed.format).toBe('xlsx');
      expect(parsed.type).toBe('vocabulary');
      expect(parsed.provenance.datasetId).toBe('jlpt-official-2026');
      expect(parsed.provenance.name).toBe('JLPT 2026 Comprehensive Dataset');
      expect(parsed.provenance.license).toBe('CC-BY-SA-4.0');
      expect(parsed.rows.length).toBe(exportRes.rowCount);

      // Roundtrip verification
      const isExactMatch = verifyExportRoundtrip(
        agg.getVocabularyAnalysis().rankings as unknown as Array<Record<string, unknown>>,
        parsed.rows,
      );
      expect(isExactMatch).toBe(true);
    });

    it('exports grammar to XLSX and parses back with provenance', () => {
      const agg = createSampleAggregator();
      const exportRes = exportDatasetToXlsx(agg, { format: 'xlsx', type: 'grammar' });

      const parsed = parseDatasetXlsx(exportRes.data as Buffer);
      expect(parsed.type).toBe('grammar');
      expect(parsed.provenance.datasetId).toBe('jlpt-official-2026');
      expect(parsed.rows.length).toBe(exportRes.rowCount);
    });
  });

  describe('5. Analytical Queries & Zero Answer Leak Guard (DATA-11..15, DATA-24, DATA-25)', () => {
    it('DATA-11: queries questions for a word without leaking answer keys or correct options', () => {
      const agg = createSampleAggregator();
      const questions = agg.getQuestionsForWord('難しい');

      expect(questions.length).toBeGreaterThan(0);
      const q = questions[0]!;
      expect(q.id).toBe('q-101');
      expect(q.examTitle).toBe('JLPT N3 Real Exam 2023-07');
      expect(q.level).toBe('N3');

      // CRITICAL: Verify zero answer leak
      expect((q as unknown as Record<string, unknown>)['answerKey']).toBeUndefined();
      expect((q as unknown as Record<string, unknown>)['correct']).toBeUndefined();
      expect((q as unknown as Record<string, unknown>)['correctAnswer']).toBeUndefined();
      for (const opt of q.options ?? []) {
        expect((opt as unknown as Record<string, unknown>)['correct']).toBeUndefined();
        expect((opt as unknown as Record<string, unknown>)['isCorrect']).toBeUndefined();
      }
    });

    it('DATA-12: retrieves comprehensive word statistics', () => {
      const agg = createSampleAggregator();
      const stats = agg.getWordStatistics('難しい');

      expect(stats).not.toBeNull();
      expect(stats?.term).toBe('難しい');
      expect(stats?.level).toBe('N3');
      expect(stats?.targetCount).toBeGreaterThan(0);
      expect(stats?.distinctExamsCount).toBeGreaterThan(0);
      expect(stats?.byLevel.N3).toBeGreaterThan(0);
      expect(stats?.rank).toBeGreaterThan(0);
    });

    it('DATA-13: compares level distribution across N1..N5', () => {
      const agg = createSampleAggregator();
      const comp = agg.compareLevels(['難しい', '先生']);

      expect(comp.datasetId).toBe('jlpt-official-2026');
      expect(comp.levels.N3.totalTokens).toBeGreaterThan(0);
      expect(comp.termDistributions).toBeDefined();
      expect(comp.termDistributions?.length).toBe(2);
      expect(comp.termDistributions?.[0]?.term).toBe('難しい');
    });

    it('DATA-14: groups statistics by session time-series', () => {
      const agg = createSampleAggregator();
      const ts = agg.getTimeSeries();

      expect(ts.sessions.length).toBeGreaterThanOrEqual(2);
      const session2023 = ts.sessions.find((s) => s.session === '2023-07');
      expect(session2023).toBeDefined();
      expect(session2023?.totalTokens).toBeGreaterThan(0);
      expect(session2023?.topVocab.length).toBeGreaterThan(0);
    });

    it('DATA-15: creates prioritized study list with tiers', () => {
      const agg = createSampleAggregator();
      const studyList = agg.createStudyList({ level: 'N3', prioritizeTarget: true });

      expect(studyList.total).toBeGreaterThan(0);
      expect(studyList.items[0]?.priorityTier).toBeDefined();
      // Target word should be top priority
      expect(studyList.items.some((i) => i.priorityTier === 'TIER_1_CRITICAL')).toBe(true);
    });

    it('DATA-24: calculates yearly trend classifications', () => {
      const agg = createSampleAggregator();
      const trends = agg.getYearlyTrends();

      expect(trends.trends.length).toBeGreaterThan(0);
      for (const t of trends.trends) {
        expect(['increasing', 'decreasing', 'stable', 'emerging']).toContain(t.trend);
        expect(t.yearlyCounts).toBeDefined();
      }
    });

    it('DATA-25: links grammar pattern with practice questions without answer leaks', () => {
      const agg = createSampleAggregator();
      const practice = agg.getGrammarPractice('N3:わけにはいかない');

      expect(practice).not.toBeNull();
      expect(practice?.patternId).toBe('n3-wake-ni-wa-ikanai');
      expect(practice?.pattern).toBe('わけにはいかない');
      expect(practice?.questions.length).toBeGreaterThan(0);

      // Verify zero answer leak
      const q = practice!.questions[0];
      expect(q).toBeDefined();
      expect((q as unknown as Record<string, unknown>)['answerKey']).toBeUndefined();
      expect((q as unknown as Record<string, unknown>)['correct']).toBeUndefined();
    });
  });
});
