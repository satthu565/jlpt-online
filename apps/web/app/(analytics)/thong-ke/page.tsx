'use client';

import { BarChart3, Sparkles } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AnalyticsDashboard } from '../../../features/analytics';
import type { AttemptRecord, QuestionAttemptRecord } from '../../../features/analytics/types';
import type { MistakeRecord } from '../../../features/analytics/components/analytics-mistake-library';
import type { IntelligenceItem, ConfusedPair } from '../../../features/analytics/components/analytics-mistake-intelligence';
import type { Level, Skill, MondaiType } from '@jlpt/schema';
import { ExamHero } from '../../../features/library';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import { useI18n } from '../../../lib/i18n';

// Sample realistic demo data for visitors exploring the analytics dashboard
const DEMO_ATTEMPTS: AttemptRecord[] = [
  {
    id: 'demo-att-1',
    examId: 'jlpt-n3-2021-07',
    examTitle: 'Đề thi JLPT N3 chính thức (07/2021)',
    level: 'N3',
    mode: 'real',
    totalScore: 92,
    maxScore: 180,
    accuracy: 51.1,
    passed: false,
    durationSec: 5400,
    submittedAt: '2026-07-15T09:30:00Z',
  },
  {
    id: 'demo-att-2',
    examId: 'jlpt-n3-2022-12',
    examTitle: 'Đề thi JLPT N3 chính thức (12/2022)',
    level: 'N3',
    mode: 'real',
    totalScore: 108,
    maxScore: 180,
    accuracy: 60.0,
    passed: true,
    durationSec: 5200,
    submittedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'demo-att-3',
    examId: 'jlpt-n3-2023-07',
    examTitle: 'Đề thi JLPT N3 chính thức (07/2023)',
    level: 'N3',
    mode: 'real',
    totalScore: 122,
    maxScore: 180,
    accuracy: 67.8,
    passed: true,
    durationSec: 4900,
    submittedAt: '2026-09-25T14:15:00Z',
  },
  {
    id: 'demo-att-4',
    examId: 'jlpt-n3-2024-12',
    examTitle: 'Đề thi JLPT N3 chính thức (12/2024)',
    level: 'N3',
    mode: 'practice',
    totalScore: 136,
    maxScore: 180,
    accuracy: 75.6,
    passed: true,
    durationSec: 4650,
    submittedAt: '2026-10-30T16:00:00Z',
  },
];

const DEMO_QUESTIONS: QuestionAttemptRecord[] = [
  // 1. Reading: Comprehension Long (4 items, 2 incorrect)
  { questionId: 'demo-rl1', questionNumber: '1', stemPreview: '筆者が考える「本当の豊かさ」とは何か。', level: 'N3', skill: 'reading', mondaiType: 'comprehension_long', isCorrect: false, timeSpentMs: 125000, exposureCount: 0, errorCategory: 'time_pressure', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-rl2', questionNumber: '2', stemPreview: '本文で「この現象」とあるが、具体的に何を指しているか。', level: 'N3', skill: 'reading', mondaiType: 'comprehension_long', isCorrect: false, timeSpentMs: 118000, exposureCount: 0, errorCategory: 'vocab_nuance', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-rl3', questionNumber: '3', stemPreview: '段落の論理展開と合致する記述はどれか。', level: 'N3', skill: 'reading', mondaiType: 'comprehension_long', isCorrect: true, timeSpentMs: 95000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-rl4', questionNumber: '4', stemPreview: '筆者の結論として最も適切なものはどれか。', level: 'N3', skill: 'reading', mondaiType: 'comprehension_long', isCorrect: true, timeSpentMs: 105000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },

  // 2. Reading: Information Retrieval (3 items, 2 incorrect)
  { questionId: 'demo-ir1', questionNumber: '5', stemPreview: '図書館の休館日と開館時間の組み合わせで正しいもの。', level: 'N3', skill: 'reading', mondaiType: 'info_retrieval', isCorrect: false, timeSpentMs: 95000, exposureCount: 0, errorCategory: 'time_pressure', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-ir2', questionNumber: '6', stemPreview: '割引キャンペーンの適用条件を満たす人物は誰か。', level: 'N3', skill: 'reading', mondaiType: 'info_retrieval', isCorrect: false, timeSpentMs: 110000, exposureCount: 0, errorCategory: 'time_pressure', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-ir3', questionNumber: '7', stemPreview: '案内チラシの連絡先と申込期限について。', level: 'N3', skill: 'reading', mondaiType: 'info_retrieval', isCorrect: true, timeSpentMs: 70000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },

  // 3. Grammar: Sentence Composition (4 items, 2 incorrect)
  { questionId: 'demo-sc1', questionNumber: '8', stemPreview: 'どんなに忙しくても、健康のために ★ ようにしている。', level: 'N3', skill: 'grammar', mondaiType: 'sentence_composition', isCorrect: false, timeSpentMs: 55000, exposureCount: 0, errorCategory: 'grammar_trap', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-sc2', questionNumber: '9', stemPreview: '彼が約束を破る ★ 信じられない。', level: 'N3', skill: 'grammar', mondaiType: 'sentence_composition', isCorrect: false, timeSpentMs: 62000, exposureCount: 0, errorCategory: 'grammar_trap', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-sc3', questionNumber: '10', stemPreview: '経済の悪化に伴って ★ 減少した。', level: 'N3', skill: 'grammar', mondaiType: 'sentence_composition', isCorrect: true, timeSpentMs: 45000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-sc4', questionNumber: '11', stemPreview: '雨が降らない ★ 傘を持っていこう。', level: 'N3', skill: 'grammar', mondaiType: 'sentence_composition', isCorrect: true, timeSpentMs: 38000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },

  // 4. Listening: Summary Understanding (4 items, 2 incorrect)
  { questionId: 'demo-su1', questionNumber: '12', stemPreview: 'スピーチの全体を通して、話者が最も伝えたいこと。', level: 'N3', skill: 'listening', mondaiType: 'summary', isCorrect: false, timeSpentMs: 60000, exposureCount: 0, errorCategory: 'listening_distractor', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-su2', questionNumber: '13', stemPreview: '会議で提案された新方針の要点は何か。', level: 'N3', skill: 'listening', mondaiType: 'summary', isCorrect: false, timeSpentMs: 60000, exposureCount: 0, errorCategory: 'listening_distractor', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-su3', questionNumber: '14', stemPreview: 'ラジオ放送で紹介された町の取り組みの概要。', level: 'N3', skill: 'listening', mondaiType: 'summary', isCorrect: true, timeSpentMs: 55000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-su4', questionNumber: '15', stemPreview: '大学の講義で教授が述べている研究の主旨。', level: 'N3', skill: 'listening', mondaiType: 'summary', isCorrect: true, timeSpentMs: 50000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },

  // 5. Vocabulary: Contextual Usage (5 items, 2 incorrect)
  { questionId: 'demo-cx1', questionNumber: '16', stemPreview: '約束の時間を勘違いして、友人を待たせてしまった。', level: 'N3', skill: 'vocabulary', mondaiType: 'contextual', isCorrect: false, timeSpentMs: 38000, exposureCount: 0, errorCategory: 'vocab_nuance', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-cx2', questionNumber: '17', stemPreview: '会議の資料をあらかじめ印刷して配付した。', level: 'N3', skill: 'vocabulary', mondaiType: 'contextual', isCorrect: false, timeSpentMs: 42000, exposureCount: 0, errorCategory: 'vocab_nuance', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-cx3', questionNumber: '18', stemPreview: 'この地域は観光業が盛んで、多くの人が訪れる。', level: 'N3', skill: 'vocabulary', mondaiType: 'contextual', isCorrect: true, timeSpentMs: 28000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-cx4', questionNumber: '19', stemPreview: 'プロジェクトのスケジュールを慎重に管理する。', level: 'N3', skill: 'vocabulary', mondaiType: 'contextual', isCorrect: true, timeSpentMs: 25000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-cx5', questionNumber: '20', stemPreview: '試験の結果を気に病むことはない。', level: 'N3', skill: 'vocabulary', mondaiType: 'contextual', isCorrect: true, timeSpentMs: 30000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },

  // 6. Grammar: Grammar Form (5 items, 2 incorrect)
  { questionId: 'demo-gf1', questionNumber: '21', stemPreview: '彼女の意見には賛成しかねる。', level: 'N3', skill: 'grammar', mondaiType: 'grammar_form', isCorrect: false, timeSpentMs: 40000, exposureCount: 0, errorCategory: 'grammar_trap', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-gf2', questionNumber: '22', stemPreview: '天候のせいで旅行が中止になりかねない。', level: 'N3', skill: 'grammar', mondaiType: 'grammar_form', isCorrect: false, timeSpentMs: 46000, exposureCount: 0, errorCategory: 'grammar_trap', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-gf3', questionNumber: '23', stemPreview: '彼の話は信じるに足らない。', level: 'N3', skill: 'grammar', mondaiType: 'grammar_form', isCorrect: true, timeSpentMs: 32000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-gf4', questionNumber: '24', stemPreview: 'これだけ練習したのだから、合格するに違いない。', level: 'N3', skill: 'grammar', mondaiType: 'grammar_form', isCorrect: true, timeSpentMs: 28000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-gf5', questionNumber: '25', stemPreview: 'この製品は環境に配慮して作られている。', level: 'N3', skill: 'grammar', mondaiType: 'grammar_form', isCorrect: true, timeSpentMs: 35000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },

  // 7. Listening: Task Based & Quick Response (6 items, 2 incorrect)
  { questionId: 'demo-tb1', questionNumber: '26', stemPreview: '男の人はこれからまず何をしますか。', level: 'N3', skill: 'listening', mondaiType: 'task_based', isCorrect: false, timeSpentMs: 58000, exposureCount: 0, errorCategory: 'listening_distractor', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-qr1', questionNumber: '27', stemPreview: '「昨日の映画、どうだった？」「それが、★」', level: 'N3', skill: 'listening', mondaiType: 'quick_response', isCorrect: false, timeSpentMs: 40000, exposureCount: 0, errorCategory: 'listening_distractor', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-tb2', questionNumber: '28', stemPreview: '女の人は明日何を持参しなければなりませんか。', level: 'N3', skill: 'listening', mondaiType: 'task_based', isCorrect: true, timeSpentMs: 50000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-qr2', questionNumber: '29', stemPreview: '「この書類、確認してもらえませんか。」「★」', level: 'N3', skill: 'listening', mondaiType: 'quick_response', isCorrect: true, timeSpentMs: 30000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-tb3', questionNumber: '30', stemPreview: '集合時間と場所について確認する。', level: 'N3', skill: 'listening', mondaiType: 'task_based', isCorrect: true, timeSpentMs: 48000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-qr3', questionNumber: '31', stemPreview: '「お待たせして申し訳ありませんでした。」「★」', level: 'N3', skill: 'listening', mondaiType: 'quick_response', isCorrect: true, timeSpentMs: 32000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },

  // 8. Kanji: Kanji Reading & Orthography (6 items, 2 incorrect)
  { questionId: 'demo-kr1', questionNumber: '32', stemPreview: 'この計画を「慎重」に進める必要がある。', level: 'N3', skill: 'kanji', mondaiType: 'kanji_reading', isCorrect: false, timeSpentMs: 32000, exposureCount: 0, errorCategory: 'kanji_confusion', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-ot1', questionNumber: '33', stemPreview: '書類を「はいふ」してください。', level: 'N3', skill: 'kanji', mondaiType: 'orthography', isCorrect: false, timeSpentMs: 36000, exposureCount: 0, errorCategory: 'kanji_confusion', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-kr2', questionNumber: '34', stemPreview: '環境に「配慮」する。', level: 'N3', skill: 'kanji', mondaiType: 'kanji_reading', isCorrect: true, timeSpentMs: 24000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-ot2', questionNumber: '35', stemPreview: '結果を「きろく」に残す。', level: 'N3', skill: 'kanji', mondaiType: 'orthography', isCorrect: true, timeSpentMs: 25000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-kr3', questionNumber: '36', stemPreview: '「盛ん」な産業。', level: 'N3', skill: 'kanji', mondaiType: 'kanji_reading', isCorrect: true, timeSpentMs: 22000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-ot3', questionNumber: '37', stemPreview: '会場を「せつえい」する。', level: 'N3', skill: 'kanji', mondaiType: 'orthography', isCorrect: true, timeSpentMs: 26000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },
];

export default function AnalyticsPage(): React.JSX.Element {
  const { user, session, isLoading: authLoading } = useAuth();
  const token = session?.token;
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<QuestionAttemptRecord[]>([]);
  const [skillAggregates, setSkillAggregates] = useState<Array<{ skill: string; accuracyRate: number; sampleSize: number }>>([]);
  const [realMistakes, setRealMistakes] = useState<Record<string, MistakeRecord[]> | undefined>();
  const [realTotalWrongCount, setRealTotalWrongCount] = useState<number | undefined>();
  const [realStatsBySkillByLevel, setRealStatsBySkillByLevel] = useState<Record<string, Record<string, { wrong: number; total: number }>> | undefined>();
  const [realCoverageByLevel, setRealCoverageByLevel] = useState<Record<string, IntelligenceItem[]> | undefined>();
  const [realTrapsByLevel, setRealTrapsByLevel] = useState<Record<string, IntelligenceItem[]> | undefined>();
  const [realPairsByLevel, setRealPairsByLevel] = useState<Record<string, ConfusedPair[]> | undefined>();
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      setIsUnauthorized(true);
      setAttempts([]);
      setQuestionAttempts([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const [attemptsRes, analyticsRes, examsRes, mistakesRes] = await Promise.all([
        fetch(`${baseUrl}/me/attempts`, {
          headers,
          credentials: 'include',
        }),
        fetch(`${baseUrl}/me/analytics?targetLevel=${encodeURIComponent(user.targetLevel || 'N3')}`, {
          headers,
          credentials: 'include',
        }),
        fetch(`${baseUrl}/exams?limit=100`, {
          headers,
          credentials: 'include',
        }),
        fetch(`/internal-api/analytics/mistakes?userId=${encodeURIComponent(user.id)}`).catch(() => null),
      ]);

      if (attemptsRes.status === 401 || attemptsRes.status === 403 || analyticsRes.status === 401 || analyticsRes.status === 403) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      const examsMap = new Map<string, { title: string; level: Level }>();
      if (examsRes && examsRes.ok) {
        try {
          const examsData = await examsRes.json();
          const examItems = Array.isArray(examsData) ? examsData : (examsData.items || []);
          examItems.forEach((ex: Record<string, unknown>) => {
            if (ex['id']) {
              examsMap.set(String(ex['id']), {
                title: String(ex['title'] || ''),
                level: (ex['level'] as Level) || 'N3',
              });
            }
          });
        } catch {
          // Ignore exams parse error
        }
      }

      if (mistakesRes && mistakesRes.ok) {
        try {
          const mistakesData = await mistakesRes.json();
          if (mistakesData.mistakes) {
            setRealMistakes(mistakesData.mistakes);
          }
          if (typeof mistakesData.totalWrongCount === 'number') {
            setRealTotalWrongCount(mistakesData.totalWrongCount);
          }
          if (mistakesData.statsBySkillByLevel) {
            setRealStatsBySkillByLevel(mistakesData.statsBySkillByLevel);
          }
          if (mistakesData.coverageByLevel) {
            setRealCoverageByLevel(mistakesData.coverageByLevel);
          }
          if (mistakesData.trapsByLevel) {
            setRealTrapsByLevel(mistakesData.trapsByLevel);
          }
          if (mistakesData.pairsByLevel) {
            setRealPairsByLevel(mistakesData.pairsByLevel);
          }
        } catch {
          // Ignore mistakes parse error
        }
      }

      let loadedAttempts: AttemptRecord[] = [];
      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        const rawItems = Array.isArray(attemptsData) ? attemptsData : (attemptsData.items || []);
        loadedAttempts = rawItems.map((att: Record<string, unknown>) => {
          const examId = String(att['examId'] || '');
          const examMeta = examsMap.get(examId);

          const status = String(att['status'] || (att['submittedAt'] ? 'submitted' : 'in_progress')) as 'submitted' | 'in_progress';
          const isSubmitted = status === 'submitted' || Boolean(att['submittedAt']);

          const score = typeof att['score'] === 'number' ? att['score'] : 0;
          const level = (examMeta?.level || att['level'] || user.targetLevel || 'N3') as Level;
          const examTitle = examMeta?.title || String(att['examTitle'] || `ﾄ雪ｻ・thi JLPT ${level} (${String(att['id']).slice(0, 8)})`);

          let durationSec = typeof att['durationSec'] === 'number' ? att['durationSec'] : 0;
          if (!durationSec && att['startedAt'] && att['submittedAt']) {
            const start = new Date(att['startedAt'] as string).getTime();
            const end = new Date(att['submittedAt'] as string).getTime();
            if (end > start) {
              durationSec = Math.round((end - start) / 1000);
            }
          }

          const rawSections = Array.isArray(att['sections']) ? (att['sections'] as Record<string, unknown>[]) : [];
          const parsedSections = rawSections.map((s) => ({
            code: String(s['code'] || ''),
            name: String(s['label'] || s['name'] || s['code'] || ''),
            score: typeof s['scaled'] === 'number' ? s['scaled'] : (typeof s['score'] === 'number' ? s['score'] : 0),
            maxScore: typeof s['maxScaled'] === 'number' ? s['maxScaled'] : (typeof s['maxScore'] === 'number' ? s['maxScore'] : 60),
            minCutoff: typeof s['minPass'] === 'number' ? s['minPass'] : (typeof s['minCutoff'] === 'number' ? s['minCutoff'] : 19),
            passed: Boolean(s['passed']),
          }));

          const accuracy = isSubmitted && score > 0 ? Math.round((score / 180) * 1000) / 10 : 0;

          return {
            id: String(att['id']),
            examId,
            examTitle,
            level,
            mode: att['mode'] === 'real' ? 'real' : 'practice',
            status,
            totalScore: score,
            maxScore: 180,
            accuracy,
            passed: Boolean(att['passed']),
            durationSec,
            submittedAt: String(att['submittedAt'] || att['startedAt'] || new Date().toISOString()),
            sections: parsedSections,
          };
        });
      }

      let loadedQuestionAttempts: QuestionAttemptRecord[] = [];
      let loadedSkills: Array<{ skill: string; accuracyRate: number; sampleSize: number }> = [];
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (Array.isArray(analyticsData.skills)) {
          loadedSkills = analyticsData.skills.map((s: Record<string, unknown>) => ({
            skill: String(s['skill'] || ''),
            accuracyRate: typeof s['accuracyRate'] === 'number' ? s['accuracyRate'] : 0,
            sampleSize: typeof s['sampleSize'] === 'number' ? s['sampleSize'] : 0,
          }));
        }
        if (Array.isArray(analyticsData.questionHistory)) {
          loadedQuestionAttempts = analyticsData.questionHistory.map((q: Record<string, unknown>, idx: number) => {
            const isCorrect = Boolean(q['isCorrect']);
            const skill = ((q['skill'] || 'vocabulary') as Skill);
            let errorCategory = q['errorCategory'] as QuestionAttemptRecord['errorCategory'];
            if (!errorCategory && !isCorrect) {
              if (skill === 'grammar') errorCategory = 'grammar_trap';
              else if (skill === 'reading') errorCategory = 'time_pressure';
              else if (skill === 'vocabulary') errorCategory = 'vocab_nuance';
              else if (skill === 'kanji') errorCategory = 'kanji_confusion';
              else if (skill === 'listening') errorCategory = 'listening_distractor';
            }
            return {
              questionId: String(q['questionId'] || `q-${idx}`),
              questionNumber: String(q['questionNumber'] || idx + 1),
              stemPreview: typeof q['stemPreview'] === 'string' ? q['stemPreview'] : undefined,
              level: ((q['level'] || user.targetLevel || 'N3') as Level),
              skill,
              mondaiType: q['mondaiType'] as MondaiType | undefined,
              isCorrect,
              timeSpentMs: typeof q['timeSpentMs'] === 'number' ? q['timeSpentMs'] : 60000,
              exposureCount: typeof q['exposureCount'] === 'number' ? q['exposureCount'] : 0,
              errorCategory,
              submittedAt: String(q['submittedAt'] || q['answeredAt'] || new Date().toISOString()),
            };
          });
        }
      }

      // If backend did not return granular question history, synthesize from submitted attempts
      if (loadedQuestionAttempts.length === 0 && loadedAttempts.length > 0) {
        const submittedExams = loadedAttempts.filter((a) => a.status === 'submitted' || Boolean(a.submittedAt));
        const synthesized: QuestionAttemptRecord[] = [];

        const N3_MONDAI_BLUEPRINT: Array<{
          mondaiType: MondaiType;
          skill: Skill;
          countPerExam: number;
          sectionCode: 'language' | 'reading' | 'listening';
          errorCategory: QuestionAttemptRecord['errorCategory'];
        }> = [
          { mondaiType: 'comprehension_long', skill: 'reading', countPerExam: 4, sectionCode: 'reading', errorCategory: 'time_pressure' },
          { mondaiType: 'info_retrieval', skill: 'reading', countPerExam: 2, sectionCode: 'reading', errorCategory: 'time_pressure' },
          { mondaiType: 'comprehension_mid', skill: 'reading', countPerExam: 6, sectionCode: 'reading', errorCategory: 'vocab_nuance' },
          { mondaiType: 'comprehension_short', skill: 'reading', countPerExam: 4, sectionCode: 'reading', errorCategory: 'vocab_nuance' },
          { mondaiType: 'sentence_composition', skill: 'grammar', countPerExam: 5, sectionCode: 'language', errorCategory: 'grammar_trap' },
          { mondaiType: 'grammar_form', skill: 'grammar', countPerExam: 13, sectionCode: 'language', errorCategory: 'grammar_trap' },
          { mondaiType: 'text_grammar', skill: 'grammar', countPerExam: 4, sectionCode: 'language', errorCategory: 'grammar_trap' },
          { mondaiType: 'contextual', skill: 'vocabulary', countPerExam: 11, sectionCode: 'language', errorCategory: 'vocab_nuance' },
          { mondaiType: 'kanji_reading', skill: 'kanji', countPerExam: 6, sectionCode: 'language', errorCategory: 'kanji_confusion' },
          { mondaiType: 'orthography', skill: 'kanji', countPerExam: 6, sectionCode: 'language', errorCategory: 'kanji_confusion' },
          { mondaiType: 'paraphrase', skill: 'vocabulary', countPerExam: 5, sectionCode: 'language', errorCategory: 'vocab_nuance' },
          { mondaiType: 'usage', skill: 'vocabulary', countPerExam: 5, sectionCode: 'language', errorCategory: 'vocab_nuance' },
          { mondaiType: 'summary', skill: 'listening', countPerExam: 3, sectionCode: 'listening', errorCategory: 'listening_distractor' },
          { mondaiType: 'quick_response', skill: 'listening', countPerExam: 9, sectionCode: 'listening', errorCategory: 'listening_distractor' },
          { mondaiType: 'task_based', skill: 'listening', countPerExam: 6, sectionCode: 'listening', errorCategory: 'listening_distractor' },
          { mondaiType: 'point', skill: 'listening', countPerExam: 6, sectionCode: 'listening', errorCategory: 'listening_distractor' },
        ];

        submittedExams.forEach((att, attIdx) => {
          const examLevel = att.level || user.targetLevel || 'N3';
          const submittedAt = att.submittedAt || new Date().toISOString();
          const exposureCount = attIdx === 0 ? 0 : 1;

          const secMap: Record<string, number> = {};
          (att.sections || []).forEach((s) => {
            const ratio = s.maxScore > 0 ? s.score / s.maxScore : 0;
            if (s.code.includes('lang') || s.code === 'language_knowledge') {
              secMap['language'] = ratio;
            } else if (s.code.includes('read')) {
              secMap['reading'] = ratio;
            } else if (s.code.includes('list')) {
              secMap['listening'] = ratio;
            }
          });

          let qNum = 1;
          N3_MONDAI_BLUEPRINT.forEach((m) => {
            const acc = secMap[m.sectionCode] ?? (att.accuracy > 0 ? att.accuracy / 100 : 0.05);
            const correctCount = Math.round(m.countPerExam * acc);

            for (let i = 0; i < m.countPerExam; i++) {
              const isCorrect = i < correctCount;
              synthesized.push({
                questionId: `att-${att.id}-${m.mondaiType}-${i}`,
                questionNumber: String(qNum++),
                level: examLevel,
                skill: m.skill,
                mondaiType: m.mondaiType,
                isCorrect,
                timeSpentMs: 45000,
                exposureCount,
                errorCategory: isCorrect ? undefined : m.errorCategory,
                submittedAt,
              });
            }
          });
        });

        if (synthesized.length > 0) {
          loadedQuestionAttempts = synthesized;
        }
      }

      setSkillAggregates(loadedSkills);
      setAttempts(loadedAttempts);
      setQuestionAttempts(loadedQuestionAttempts);
      if (loadedAttempts.length > 0) {
        setIsDemoMode(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối máy chủ phân tích';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user, token]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const isGuest = !user || isUnauthorized;
  const showDemo = isDemoMode;
  const currentAttempts = showDemo ? DEMO_ATTEMPTS : attempts;
  const currentQuestionAttempts = showDemo ? DEMO_QUESTIONS : questionAttempts;
  const hasData = currentAttempts.length > 0 || currentQuestionAttempts.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="analytics-page">
      <ExamHero
        title={t('analytics.page.title')}
        subtitle={t('analytics.page.subtitle')}
        minimal
        background="gradient"
      />

      <div className="container py-8 w-full space-y-6" data-testid="analytics-page-container">
        {isGuest && (
          <Alert variant="warning" className="mb-6" data-testid="analytics-auth-required">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>{t('analytics.auth.required')}</span>
              <div className="flex items-center gap-2">
                {!showDemo && (
                  <Button size="sm" variant="outline" onClick={() => setIsDemoMode(true)}>
                    <Sparkles className="size-3.5 inline mr-1" aria-hidden="true" />
                    Xem demo mẫu
                  </Button>
                )}
                <Link href="/dang-nhap?redirect=/thong-ke">
                  <Button size="sm" variant="primary">
                    {t('analytics.auth.signIn')}
                  </Button>
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {showDemo && (
          <Alert variant="info" className="mb-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <span className="text-xs">
                ✨ <strong>Chế độ xem trước dữ liệu mẫu (Demo):</strong> Bạn đang trải nghiệm đầy đủ các biểu đồ và phân tích của một học viên ôn thi JLPT N3 thực tế.
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsDemoMode(false)}>
                  Thoát chế độ demo
                </Button>
                <Link href="/dang-nhap?redirect=/thong-ke">
                  <Button size="sm" variant="primary">
                    Đăng nhập tài khoản thật
                  </Button>
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {error && !isGuest && (
          <Alert variant="error" className="my-4" data-testid="analytics-error-alert">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={fetchAnalyticsData}>
                {t('common.buttons.retry')}
              </Button>
            </div>
          </Alert>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3" data-testid="analytics-loading-spinner">
            <Spinner size="lg" aria-label={t('analytics.status.syncing')} />
            <p className="text-sm text-slate-500">{t('analytics.status.syncing')}</p>
          </div>
        )}

        {!isLoading && isGuest && !showDemo && (
          <div
            data-testid="analytics-empty-state"
            className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-200 dark:border-slate-800"
          >
            <BarChart3 className="mx-auto size-10 text-slate-400" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Đăng nhập để xem thống kê học tập
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Đăng nhập hoặc đăng ký tài khoản để theo dõi biểu đồ tiến độ ôn luyện, phân tích điểm số các kỹ năng JLPT và nhận đề xuất học tập cá nhân hóa.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="primary" size="md" onClick={() => setIsDemoMode(true)}>
                <Sparkles className="size-4 inline mr-1.5" aria-hidden="true" />
                Xem trước dữ liệu mẫu (Demo)
              </Button>
              <Link href="/dang-nhap?redirect=/thong-ke" className="self-center">
                <Button variant="outline" size="md">
                  Đăng nhập hoặc Đăng ký
                </Button>
              </Link>
              <Link href="/de-thi" className="self-center">
                <Button variant="ghost" size="md">
                  Khám phá thư viện đề thi
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && !isGuest && !error && !hasData && !showDemo && (
          <div
            data-testid="analytics-empty-state"
            className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-200 dark:border-slate-800"
          >
            <BarChart3 className="mx-auto size-10 text-slate-400" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t('analytics.empty.title')}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t('analytics.empty.description')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="outline" size="md" onClick={() => setIsDemoMode(true)}>
                <Sparkles className="size-4 inline mr-1.5" aria-hidden="true" />
                Xem trước dữ liệu mẫu (Demo)
              </Button>
              <Link href="/de-thi" className="self-center">
                <Button variant="primary" size="md">
                  {t('analytics.empty.toExams')}
                </Button>
              </Link>
              <Link href="/luyen-tap" className="self-center">
                <Button variant="ghost" size="md">
                  {t('analytics.empty.toPractice')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {(!isLoading && hasData) && (
          <AnalyticsDashboard
            attempts={currentAttempts}
            questionAttempts={currentQuestionAttempts}
            skillAggregates={skillAggregates}
            targetLevel={(user?.targetLevel as Level) || 'N3'}
            targetScore={120}
            userName={user?.name || user?.email?.split('@')[0] || 'Nguyễn An'}
            isDemoMode={showDemo}
            mistakes={showDemo ? undefined : realMistakes}
            totalWrongCount={showDemo ? undefined : realTotalWrongCount}
            realStatsBySkillByLevel={showDemo ? undefined : realStatsBySkillByLevel}
            realCoverageByLevel={showDemo ? undefined : realCoverageByLevel}
            realTrapsByLevel={showDemo ? undefined : realTrapsByLevel}
            realPairsByLevel={showDemo ? undefined : realPairsByLevel}
          />
        )}
      </div>
    </div>
  );
}
