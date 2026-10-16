import { describe, it, expect } from 'vitest';
import {
  normalizeJapaneseText,
  computeQuestionSimilarity,
  detectCrossSourceDuplicates,
  findDuplicatesInBank,
} from '../src/dedupe/index.js';

describe('Question Deduplication and Cross-Source Similarity (MIX-11, QB-12)', () => {
  describe('Japanese Text Normalization & Unicode NFC', () => {
    it('preserves Unicode NFC and removes whitespace, punctuation, and brackets', () => {
      const raw = ' これは、テストです！　「日本語」を勉強します。 ';
      const normalized = normalizeJapaneseText(raw);
      expect(normalized).toBe('これはテストです日本語を勉強します');
      expect(normalized.normalize('NFC')).toBe(normalized);
    });

    it('strips ruby / furigana markup while preserving base text', () => {
      const raw = '彼が<ruby>来<rt>き</rt></ruby>ました。';
      const normalized = normalizeJapaneseText(raw);
      expect(normalized).toBe('彼が来ました');
    });
  });

  describe('QB-12: Phát hiện câu hỏi trùng hoặc gần trùng', () => {
    it('detects EXACT match when stems are identical modulo formatting and ruby', () => {
      const q1 = {
        id: 'q-1',
        stem: '彼が<ruby>来<rt>き</rt></ruby>ました。',
        options: ['きのう', 'きょう', 'あした', 'あさって'],
      };
      const q2 = {
        id: 'q-2',
        stem: '彼が 来ました 。',
        options: ['きのう', 'きょう', 'あした', 'あさって'],
      };

      const result = computeQuestionSimilarity(q1, q2);
      expect(result.stemSimilarity).toBe(1.0);
      expect(result.optionsSimilarity).toBe(1.0);
      expect(result.overallSimilarity).toBe(1.0);
      expect(result.matchType).toBe('EXACT');
    });

    it('detects NEAR_DUPLICATE when minor particle or phrasing differs', () => {
      const qA = {
        id: 'q-a',
        stem: '図書館で本を借りました。とても面白かったです。',
        options: ['かりました', 'かしました', 'よみました', 'かいました'],
      };
      const qB = {
        id: 'q-b',
        stem: '図書館で本を借りた。とても面白かったです。',
        options: ['かりました', 'かしました', 'よみました', 'かいました'],
      };

      const result = computeQuestionSimilarity(qA, qB);
      expect(result.overallSimilarity).toBeGreaterThanOrEqual(0.85);
      expect(result.matchType).toBe('NEAR_DUPLICATE');
    });

    it('identifies DISTINCT questions with low similarity', () => {
      const qX = {
        id: 'q-x',
        stem: '明日、東京へ出張に行きます。準備をしなければなりません。',
        options: ['しゅっちょう', 'りょこう', 'けんがく', 'かいぎ'],
      };
      const qY = {
        id: 'q-y',
        stem: '雨が降っているので、傘を持って出かけましょう。',
        options: ['かさ', 'ぼうし', 'くつ', 'かばん'],
      };

      const result = computeQuestionSimilarity(qX, qY);
      expect(result.overallSimilarity).toBeLessThan(0.3);
      expect(result.matchType).toBe('DISTINCT');
    });

    it('finds all duplicates in bank above threshold (findDuplicatesInBank)', () => {
      const bank = [
        { id: '1', stem: '毎朝、コーヒーを飲みます。' },
        { id: '2', stem: '毎朝、珈琲を飲みます。' }, // Similar
        { id: '3', stem: '毎朝、コーヒーを飲みます！' }, // Exact
        { id: '4', stem: '週末は友達と映画を見に行きました。' }, // Distinct
      ];

      const duplicates = findDuplicatesInBank(bank, { similarityThreshold: 0.85 });

      expect(duplicates.length).toBeGreaterThanOrEqual(1);
      const exactMatch = duplicates.find(
        (d) => (d.questionIdA === '1' && d.questionIdB === '3') || (d.questionIdA === '3' && d.questionIdB === '1'),
      );
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.overallSimilarity).toBe(1.0);
      expect(exactMatch?.matchType).toBe('EXACT');
    });
  });

  describe('MIX-11: Phát hiện câu giống nhau ở nhiều nguồn', () => {
    it('detects cross-source duplicates and clusters them by exam session', () => {
      const questions = [
        {
          id: 'q-2023-1',
          stem: 'このレストランの料理はとても美味しいですが、少し高いです。',
          options: ['おいしい', 'まずい', 'あまい', 'からい'],
          sourceSession: '2023-12',
        },
        {
          id: 'q-2022-1',
          stem: 'このレストランの料理はとても美味しいですが、少し高いです。',
          options: ['おいしい', 'まずい', 'あまい', 'からい'],
          sourceSession: '2022-07',
        },
        {
          id: 'q-2021-1',
          stem: 'このレストランの料理はとてもおいしいですが、少し高いです。',
          options: ['おいしい', 'まずい', 'あまい', 'からい'],
          sourceSession: '2021-12',
        },
        {
          id: 'q-unique',
          stem: '来週の月曜日に新しいプロジェクトが始まります。',
          options: ['プロジェクト', 'イベント', 'コンサート', 'ミーティング'],
          sourceSession: '2023-12',
        },
      ];

      const report = detectCrossSourceDuplicates(questions, { similarityThreshold: 0.80 });

      expect(report.totalExamined).toBe(4);
      expect(report.duplicatePairCount).toBeGreaterThanOrEqual(2);
      expect(report.clusters.length).toBe(1);

      const cluster = report.clusters[0]!;
      expect(cluster.memberQuestionIds).toContain('q-2023-1');
      expect(cluster.memberQuestionIds).toContain('q-2022-1');
      expect(cluster.memberQuestionIds).toContain('q-2021-1');
      expect(cluster.sources).toContain('2023-12');
      expect(cluster.sources).toContain('2022-07');
      expect(cluster.sources).toContain('2021-12');
    });
  });
});
