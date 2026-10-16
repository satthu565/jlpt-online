import { describe, expect, it } from 'vitest';
import {
  CorpusAggregator,
  DictionaryAdapter,
  extractKanjiCharacters,
  getKanjiInfo,
  GrammarAnalyzer,
  lemmatize,
  normalizeJapaneseTextNFC,
  tagQuestion,
  tokenizeJapaneseText,
  tokenizeRichText,
} from '../src/index.js';

describe('N05: NLP, Dictionary, Tagging & Corpus Statistics', () => {
  describe('DATA-01 & DATA-02: Text Extraction & Lemmatization', () => {
    it('normalizes Japanese text to Unicode NFC and preserves characters', () => {
      const text = '食べる';
      const normalized = normalizeJapaneseTextNFC(text);
      expect(normalized).toBe('食べる');
      expect(typeof normalized).toBe('string');
    });

    it('lemmatizes irregular verbs (する, くる, 行く)', () => {
      // する
      expect(lemmatize('します').baseForm).toBe('する');
      expect(lemmatize('しました').baseForm).toBe('する');
      expect(lemmatize('しない').baseForm).toBe('する');
      expect(lemmatize('しなかった').baseForm).toBe('する');
      expect(lemmatize('して').baseForm).toBe('する');
      expect(lemmatize('された').baseForm).toBe('する');

      // くる
      expect(lemmatize('来ます').baseForm).toBe('来る');
      expect(lemmatize('来ました').baseForm).toBe('来る');
      expect(lemmatize('来ない').baseForm).toBe('来る');
      expect(lemmatize('来て').baseForm).toBe('来る');

      // 行く
      expect(lemmatize('行きます').baseForm).toBe('行く');
      expect(lemmatize('行きました').baseForm).toBe('行く');
      expect(lemmatize('行った').baseForm).toBe('行く');
      expect(lemmatize('行って').baseForm).toBe('行く');
      expect(lemmatize('行かない').baseForm).toBe('行く');
    });

    it('lemmatizes polite forms of Godan verbs to dictionary base form', () => {
      expect(lemmatize('書きます').baseForm).toBe('書く');
      expect(lemmatize('飲みます').baseForm).toBe('飲む');
      expect(lemmatize('話します').baseForm).toBe('話す');
      expect(lemmatize('待ちます').baseForm).toBe('待つ');
      expect(lemmatize('呼びます').baseForm).toBe('呼ぶ');
      expect(lemmatize('買います').baseForm).toBe('買う');
      expect(lemmatize('泳ぎます').baseForm).toBe('泳ぐ');
      expect(lemmatize('帰ります').baseForm).toBe('帰る');
    });

    it('lemmatizes Ichidan verbs to base form', () => {
      expect(lemmatize('食べます').baseForm).toBe('食べる');
      expect(lemmatize('食べました').baseForm).toBe('食べる');
      expect(lemmatize('食べない').baseForm).toBe('食べる');
      expect(lemmatize('見ます').baseForm).toBe('見る');
      expect(lemmatize('見ました').baseForm).toBe('見る');
      expect(lemmatize('見て').baseForm).toBe('見る');
    });

    it('lemmatizes I-adjectives and Na-adjectives', () => {
      expect(lemmatize('高くなかった').baseForm).toBe('高い');
      expect(lemmatize('高くない').baseForm).toBe('高い');
      expect(lemmatize('高かった').baseForm).toBe('高い');
      expect(lemmatize('高くて').baseForm).toBe('高い');

      expect(lemmatize('静かな').baseForm).toBe('静か');
      expect(lemmatize('静かだった').baseForm).toBe('静か');
    });

    it('extracts tokens from RichText and plain text preserving readings', () => {
      const tokens = tokenizeJapaneseText('富士山に登りました。');
      expect(tokens.length).toBeGreaterThan(0);
      const yama = tokens.find((t) => t.surface === '富士山' || t.baseForm === '山');
      expect(yama).toBeDefined();

      const noboru = tokens.find((t) => t.baseForm === '登る');
      expect(noboru).toBeDefined();
      expect(noboru?.surface).toBe('登りました');
    });
  });

  describe('DATA-07 & Acceptance 1: Từ xuất hiện trong đề khác từ được hỏi trực tiếp', () => {
    it('distinguishes directly tested target words from incidental words in RichText', () => {
      // In JLPT, the word being tested is underlined: [ { t: "underline", children: [{ t: "text", text: "山" }] }, { t: "text", text: "に登りました。" } ]
      const richText = [
        {
          t: 'underline' as const,
          children: [{ t: 'text' as const, text: '山' }],
        },
        {
          t: 'text' as const,
          text: 'に登りました。',
        },
      ];

      const tokens = tokenizeRichText(richText, 'stem', false);

      const targetWord = tokens.find((t) => t.baseForm === '山');
      expect(targetWord).toBeDefined();
      expect(targetWord?.isTarget).toBe(true);

      const incidentalWord = tokens.find((t) => t.baseForm === '登る');
      expect(incidentalWord).toBeDefined();
      expect(incidentalWord?.isTarget).toBe(false);
    });

    it('aggregates target count separately from incidental count in corpus', () => {
      const aggregator = new CorpusAggregator({ datasetId: 'ds-test' });

      // Ingest tokens where 山 is target once, and incidental twice
      aggregator.recordTokens(
        [
          {
            surface: '山',
            baseForm: '山',
            partOfSpeech: 'noun',
            isTarget: true,
            role: 'stem',
          },
        ],
        { examId: 'exam-1', level: 'N5' },
      );

      aggregator.recordTokens(
        [
          {
            surface: '山',
            baseForm: '山',
            partOfSpeech: 'noun',
            isTarget: false,
            role: 'passage',
          },
          {
            surface: '山',
            baseForm: '山',
            partOfSpeech: 'noun',
            isTarget: false,
            role: 'option',
          },
        ],
        { examId: 'exam-2', level: 'N5' },
      );

      const res = aggregator.getVocabularyAnalysis({ search: '山' });
      expect(res.items.length).toBe(1);
      const item = res.items[0]!;

      expect(item.count).toBe(3);
      expect(item.targetCount).toBe(1);
      expect(item.incidentalCount).toBe(2);
      expect(item.distinctExamsCount).toBe(2);
      expect(item.examIds).toEqual(['exam-1', 'exam-2']);
    });
  });

  describe('DATA-03, DATA-04, DATA-05, DATA-06, DATA-08, DATA-09, DATA-10 & Acceptance 2: Frequency theo kỳ level skill nguồn và role câu', () => {
    it('aggregates frequency across exam session, JLPT level, skill, source, and sentence role', () => {
      const aggregator = new CorpusAggregator({
        datasetId: 'ds-jlpt-gold',
        name: 'JLPT Gold Dataset',
        version: '1.2.0',
        source: 'Official & Verified Exam Corpus',
        date: '2026-10-16',
      });

      // Exam 2023-12 (N5, Official)
      aggregator.ingestExam({
        packageId: 'exam-2023-12-n5',
        source: {
          name: 'Đề thi chính thức 12/2023 N5',
          level: 'N5',
          year: 2023,
          session: '12',
        },
        exam: {
          title: 'JLPT N5 2023-12',
          groups: [
            {
              id: 'g-1',
              instructions: [{ t: 'text', text: '下線の言葉の読み方を選んでください。' }],
              questions: [
                {
                  id: 'q-1',
                  skill: 'kanji',
                  stem: [
                    { t: 'underline', children: [{ t: 'text', text: '山' }] },
                    { t: 'text', text: 'に登りました。' },
                  ],
                  options: [
                    { id: 'opt-1', content: [{ t: 'text', text: 'やま' }] },
                    { id: 'opt-2', content: [{ t: 'text', text: 'かわ' }] },
                  ],
                },
              ],
            },
          ],
        },
      });

      // Exam 2022-07 (N5, Official)
      aggregator.ingestExam({
        packageId: 'exam-2022-07-n5',
        source: {
          name: 'Đề thi chính thức 07/2022 N5',
          level: 'N5',
          year: 2022,
          session: '07',
        },
        exam: {
          title: 'JLPT N5 2022-07',
          groups: [
            {
              id: 'g-2',
              passage: [
                {
                  type: 'paragraph',
                  content: [{ t: 'text', text: '休みの日に山へ行きました。とても高い山でした。' }],
                },
              ],
              questions: [
                {
                  id: 'q-2',
                  skill: 'reading',
                  stem: [{ t: 'text', text: '休みの日にどこへ行きましたか。' }],
                  options: [
                    { id: 'opt-1', content: [{ t: 'text', text: '山' }] },
                    { id: 'opt-2', content: [{ t: 'text', text: '海' }] },
                  ],
                },
              ],
            },
          ],
        },
      });

      const analysis = aggregator.getVocabularyAnalysis();
      expect(analysis.total).toBeGreaterThan(0);

      // Check rankings (DATA-09)
      expect(analysis.rankings.length).toBeGreaterThan(0);
      expect(analysis.rankings[0]!.rank).toBe(1);
      expect(analysis.rankings[0]!.frequency).toBeGreaterThanOrEqual(
        analysis.rankings[1]?.frequency ?? 0,
      );

      // Check specific word: 山
      const yamaAnalysis = aggregator.getVocabularyAnalysis({ search: '山' });
      const yama = yamaAnalysis.items[0];
      expect(yama).toBeDefined();

      // Distinct exams count (DATA-10)
      expect(yama?.distinctExamsCount).toBe(2);
      expect(yama?.examIds).toContain('exam-2023-12-n5');
      expect(yama?.examIds).toContain('exam-2022-07-n5');

      // Breakdown by session (DATA-05: 2023-12 and 2022-07)
      expect(yama?.bySession['2023-12']).toBeGreaterThan(0);
      expect(yama?.bySession['2022-07']).toBeGreaterThan(0);

      // Breakdown by level (DATA-04: N5)
      expect(yama?.byLevel['N5']).toBeGreaterThan(0);

      // Breakdown by skill (DATA-06: kanji, reading)
      expect(yama?.bySkill['kanji']).toBeGreaterThan(0);
      expect(yama?.bySkill['reading']).toBeGreaterThan(0);

      // Breakdown by role (DATA-08: stem, option, passage)
      expect(yama?.byRole['stem']).toBeGreaterThan(0);
      expect(yama?.byRole['passage']).toBeGreaterThan(0);
      expect(yama?.byRole['option']).toBeGreaterThan(0);
    });
  });

  describe('DATA-19, DATA-20, DATA-21: Grammar Pattern Analysis', () => {
    it('identifies grammar patterns in question stems and sentences (DATA-19)', () => {
      const analyzer = new GrammarAnalyzer();
      const matches1 = analyzer.findPatterns('ここで写真を撮ってはいけません。');
      expect(matches1.some((m) => m.patternId === 'n5-te-wa-ikemasen')).toBe(true);

      const matches2 = analyzer.findPatterns('大事な会議があるので休むわけにはいきません。');
      expect(matches2.some((m) => m.patternId === 'n3-wake-ni-wa-ikanai')).toBe(true);
      expect(matches2.find((m) => m.patternId === 'n3-wake-ni-wa-ikanai')?.level).toBe('N3');

      const matches3 = analyzer.findPatterns('年をとるにつれて体力が衰えてくる。');
      expect(matches3.some((m) => m.patternId === 'n2-ni-tsurete')).toBe(true);
    });

    it('aggregates grammar pattern frequencies (DATA-20) and shows exams testing that pattern (DATA-21)', () => {
      const analyzer = new GrammarAnalyzer();

      analyzer.recordText('ここでタバコを吸ってはいけません。', {
        examId: 'exam-n5-2021',
        level: 'N5',
        role: 'stem',
      });
      analyzer.recordText('教室で走ってはいけません。', {
        examId: 'exam-n5-2022',
        level: 'N5',
        role: 'option',
      });

      const stats = analyzer.getAnalysis();
      const item = stats.items.find((i) => i.patternId === 'n5-te-wa-ikemasen');
      expect(item).toBeDefined();
      expect(item?.count).toBe(2);
      expect(item?.distinctExamsCount).toBe(2);
      expect(item?.examIds).toEqual(['exam-n5-2021', 'exam-n5-2022']);
      expect(item?.roles.stem).toBe(1);
      expect(item?.roles.option).toBe(1);

      // DATA-21: View exams testing that grammar pattern
      const exams = analyzer.getExamsForPattern('n5-te-wa-ikemasen');
      expect(exams).toEqual(['exam-n5-2021', 'exam-n5-2022']);
    });
  });

  describe('DATA-22 & DATA-23: Kanji Statistics & Knowledge Classification', () => {
    it('extracts kanji characters and classifies by level and knowledge group', () => {
      const text = '日曜日と月曜日に学校へ行きます。';
      const kanjis = extractKanjiCharacters(text);
      expect(kanjis).toContain('日');
      expect(kanjis).toContain('月');
      expect(kanjis).toContain('曜');
      expect(kanjis).toContain('学');
      expect(kanjis).toContain('校');
      expect(kanjis).toContain('行');

      const nichiInfo = getKanjiInfo('日');
      expect(nichiInfo.level).toBe('N5');
      expect(nichiInfo.knowledgeGroup).toBe('time');
      expect(nichiInfo.strokeCount).toBe(4);

      const gakuInfo = getKanjiInfo('学');
      expect(gakuInfo.level).toBe('N5');
      expect(gakuInfo.knowledgeGroup).toBe('education');
    });

    it('aggregates kanji frequency, distinct exams, and knowledge groups across corpus', () => {
      const aggregator = new CorpusAggregator();

      aggregator.ingestExam({
        packageId: 'exam-k-1',
        source: { level: 'N5' },
        exam: {
          title: 'Exam 1',
          groups: [
            {
              id: 'g-1',
              questions: [
                {
                  id: 'q-1',
                  skill: 'kanji',
                  stem: [{ t: 'text', text: '日本へ行きます。' }],
                },
              ],
            },
          ],
        },
      });

      const kanjiStats = aggregator.getKanjiAnalysis();
      expect(kanjiStats.totalCount).toBeGreaterThan(0);
      expect(kanjiStats.byKnowledgeGroup['time']).toBeGreaterThan(0); // '日' is time
      expect(kanjiStats.byKnowledgeGroup['society']).toBeGreaterThan(0); // '本' is society
      expect(kanjiStats.byKnowledgeGroup['action']).toBeGreaterThan(0); // '行' is action

      const nichi = kanjiStats.items.find((k) => k.kanji === '日');
      expect(nichi).toBeDefined();
      expect(nichi?.count).toBe(1);
      expect(nichi?.distinctExamsCount).toBe(1);
    });
  });

  describe('QB-09: Gắn từ vựng, Kanji, mẫu ngữ pháp (Question Tagging)', () => {
    it('automatically generates vocabulary, kanji, and grammar tags for a question', () => {
      const question = {
        id: 'q-demo-1',
        skill: 'kanji',
        level: 'N5',
        mondai: 1,
        stem: [
          {
            t: 'underline' as const,
            children: [{ t: 'text' as const, text: '山' }],
          },
          {
            t: 'text' as const,
            text: 'に登ってはいけません。',
          },
        ],
        options: [
          { id: 'opt-1', content: [{ t: 'text' as const, text: 'やま' }] },
          { id: 'opt-2', content: [{ t: 'text' as const, text: 'かわ' }] },
        ],
      };

      const tags = tagQuestion(question);

      // Verify level and skill tags
      expect(tags.some((t) => t.tag === 'level:N5')).toBe(true);
      expect(tags.some((t) => t.tag === 'skill:kanji')).toBe(true);
      expect(tags.some((t) => t.tag === 'mondai:1')).toBe(true);

      // Verify target vocab tag
      expect(tags.some((t) => t.tag === 'target_vocab:山')).toBe(true);

      // Verify incidental vocab tags
      expect(tags.some((t) => t.tag.startsWith('vocab:'))).toBe(true);

      // Verify kanji tags
      expect(tags.some((t) => t.tag === 'kanji:山')).toBe(true);

      // Verify grammar tag (てはいけない)
      expect(tags.some((t) => t.tag === 'grammar:n5-te-wa-ikemasen')).toBe(true);
    });
  });

  describe('Acceptance 3: Dataset version, size, source, date', () => {
    it('provides complete dataset provenance and metadata', () => {
      const aggregator = new CorpusAggregator({
        datasetId: 'dataset-2026-v2',
        name: 'JLPT Complete Corpus 2026',
        version: '2.1.0',
        source: 'Official Japanese Language Proficiency Test Releases',
        date: '2026-10-16',
        licenseAttribution: 'EDRDG JMdict / CC-BY-SA 4.0; JLPT Official Released Content',
      });

      aggregator.recordTokens(
        [
          { surface: '学生', baseForm: '学生', partOfSpeech: 'noun', isTarget: false, role: 'stem' },
          { surface: '先生', baseForm: '先生', partOfSpeech: 'noun', isTarget: true, role: 'stem' },
        ],
        { examId: 'ex-1', level: 'N5' },
      );

      const metadata = aggregator.getMetadata();

      expect(metadata.datasetId).toBe('dataset-2026-v2');
      expect(metadata.name).toBe('JLPT Complete Corpus 2026');
      expect(metadata.version).toBe('2.1.0');
      expect(metadata.source).toBe('Official Japanese Language Proficiency Test Releases');
      expect(metadata.date).toBe('2026-10-16');
      expect(metadata.documentCount).toBe(1);
      expect(metadata.totalTokens).toBe(2);
      expect(metadata.uniqueVocabCount).toBe(2);
      expect(metadata.licenseAttribution).toContain('CC-BY-SA 4.0');
    });
  });

  describe('Acceptance 4: Dictionary license và attribution đầy đủ', () => {
    it('returns dictionary entry with readings, meanings, examples, license and attribution', () => {
      const adapter = new DictionaryAdapter({ providerType: 'sandbox' });

      // Direct lookup
      const result = adapter.lookup('学校');
      expect(result).not.toBeNull();
      expect(result?.entry).toBe('学校');
      expect(result?.readings).toContain('がっこう');
      expect(result?.meanings).toContain('trường học');
      expect(result?.examples.length).toBeGreaterThan(0);
      expect(result?.license).toBe('CC-BY-SA-4.0');
      expect(result?.attribution).toContain('JMdict');
      expect(result?.status).toBe('SANDBOX');
    });

    it('lemmatizes inflected forms when performing dictionary lookup', () => {
      const adapter = new DictionaryAdapter();

      // Look up inflected verb '食べました' -> resolves to '食べる'
      const result = adapter.lookup('食べました');
      expect(result).not.toBeNull();
      expect(result?.entry).toBe('食べる');
      expect(result?.readings).toContain('たべる');
      expect(result?.meanings).toContain('ăn');
    });

    it('returns null gracefully when word not found in sandbox dictionary', () => {
      const adapter = new DictionaryAdapter();
      const result = adapter.lookup('xyznonexistentword');
      expect(result).toBeNull();
    });

    it('provides license metadata for external provider compliance verification', () => {
      const adapter = new DictionaryAdapter();
      const meta = adapter.getLicenseMetadata();
      expect(meta.license).toBe('CC-BY-SA-4.0');
      expect(meta.attribution).toContain('JMdict');
      expect(meta.provider).toBe('JMdict-EDRDG');
      expect(meta.status).toBe('SANDBOX_FALLBACK');
    });
  });
});
