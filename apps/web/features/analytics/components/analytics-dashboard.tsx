'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { BankStats, MondaiStatsByLevel } from '../bank';
import { mondaiAccuracy } from '../bank';
import type { ActivityData, DifficultyData, ExamMeta, LevelContent, ScheduleItem } from '../bank';
import { buildPracticeHref } from '../practice-link';
import { AnalyticsExamPlan } from './analytics-exam-plan';
import type { Level, Skill } from '@jlpt/schema';
import type { AttemptRecord, QuestionAttemptRecord } from '../types';
import { calculateSkillAccuracy, calculateMondaiAccuracy } from '../utils/calculator';

// New V4 Design Components
import { AnalyticsSidebarNav } from './analytics-sidebar-nav';
import { AnalyticsHeaderFilter } from './analytics-header-filter';
import { AnalyticsKpiCards } from './analytics-kpi-cards';
import { AnalyticsAssessment } from './analytics-assessment';
import { AnalyticsKnowledgeMap } from './analytics-knowledge-map';
import { AnalyticsFrequencyRanking } from './analytics-frequency-ranking';
import { AnalyticsYearTrends } from './analytics-year-trends';
import { AnalyticsErrorAnalysis } from './analytics-error-analysis';
import { AnalyticsMistakeLibrary, type MistakeRecord } from './analytics-mistake-library';
import { AnalyticsMistakeIntelligence, type IntelligenceItem, type ConfusedPair, type MasterySummary, type TimedSummary } from './analytics-mistake-intelligence';
import { AnalyticsPriorityMatrix } from './analytics-priority-matrix';
import { AnalyticsProgressionCharts } from './analytics-progression-charts';
import { AnalyticsSkillsMondai, type SkillCategoryItem } from './analytics-skills-mondai';
import { AnalyticsExamHistory } from './analytics-exam-history';
import { AnalyticsActivityHeatmap } from './analytics-activity-heatmap';
import { AnalyticsModals } from './analytics-modals';

// Legacy Unit Test Widgets (maintained for testid compatibility)

export interface AnalyticsDashboardProps {
  attempts: AttemptRecord[];
  questionAttempts: QuestionAttemptRecord[];
  targetLevel?: Level;
  targetScore?: number;
  className?: string;
  userName?: string;
  skillAggregates?: Array<{ skill: string; accuracyRate: number; sampleSize: number }>;
  isDemoMode?: boolean;
  mistakes?: Record<string, MistakeRecord[]>;
  totalWrongCount?: number;
  realStatsBySkillByLevel?: Record<string, Record<string, { wrong: number; total: number; blank?: number }>>;
  realCoverageByLevel?: Record<string, IntelligenceItem[]>;
  realPairsByLevel?: Record<string, ConfusedPair[]>;
  realMasteryByLevel?: Record<string, MasterySummary>;
  realReasonsByLevel?: Record<string, IntelligenceItem[]>;
  realTrapsByLevel?: Record<string, IntelligenceItem[]>;
  realTimedWeaknessByLevel?: Record<string, TimedSummary>;
  realMondaiStatsByLevel?: MondaiStatsByLevel;
  bank?: BankStats;
  activity?: ActivityData | null;
  exams?: ExamMeta[];
  schedules?: ScheduleItem[];
  content?: Record<string, LevelContent>;
  difficulty?: DifficultyData;
  onSaveReason?: (questionId: string, reason: string | null) => Promise<void>;
}

const LEVEL_THRESHOLDS: Record<Level, { total: number; minSections: number[] }> = {
  N1: { total: 100, minSections: [19, 19, 19] },
  N2: { total: 90, minSections: [19, 19, 19] },
  N3: { total: 95, minSections: [19, 19, 19] },
  N4: { total: 90, minSections: [38, 19] },
  N5: { total: 80, minSections: [38, 19] },
};

export function AnalyticsDashboard({
  attempts,
  questionAttempts,
  targetLevel = 'N3',
  targetScore = 120,
  className = '',
  userName = 'Nguyễn An',
  skillAggregates = [],
  isDemoMode = false,
  mistakes,
  totalWrongCount,
  realStatsBySkillByLevel,
  realCoverageByLevel,
  realPairsByLevel,
  realMasteryByLevel,
  realReasonsByLevel,
  realTrapsByLevel,
  realTimedWeaknessByLevel,
  realMondaiStatsByLevel,
  bank,
  activity,
  exams,
  schedules,
  content,
  difficulty,
  onSaveReason,
}: AnalyticsDashboardProps): React.JSX.Element {
  // Filter States
  const [currentLevel, setCurrentLevel] = useState<Level>(targetLevel);
  const [period, setPeriod] = useState<string>(isDemoMode ? 'all' : '30');
  const [scopeFirstOnly, setScopeFirstOnly] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Modal States
  const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
  const [questionModalRecord, setQuestionModalRecord] = useState<MistakeRecord | null>(null);
  const [studyModalState, setStudyModalState] = useState<{
    open: boolean;
    title: string;
    message: string;
    actionText: string;
    actionHref?: string;
  }>({
    open: false,
    title: '',
    message: '',
    actionText: 'Bắt đầu',
  });
  const [detailModalState, setDetailModalState] = useState<{
    open: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    open: false,
    title: '',
    content: null,
  });

  // Level configuration
  const thresholdInfo = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS.N3;

  // Filter attempts based on level, period, and scope
  const filteredAttempts = useMemo(() => {
    const isDone = (a: AttemptRecord) => a.status !== 'in_progress';
    let list = attempts.filter((a) => a.level === currentLevel);

    if (period !== 'all') {
      const days = Number.parseInt(period, 10) || 30;
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((a) => new Date(a.submittedAt).getTime() >= cutoffTime);
    }

    if (scopeFirstOnly) {
      // "Lượt đầu" = the first submitted attempt of each exam (over the whole history)
      const firstOfExam = new Map<string, string>();
      attempts
        .filter(isDone)
        .sort((x, y) => new Date(x.submittedAt).getTime() - new Date(y.submittedAt).getTime())
        .forEach((a) => {
          if (!firstOfExam.has(a.examId)) firstOfExam.set(a.examId, a.id);
        });
      list = list.filter((a) => !isDone(a) || firstOfExam.get(a.examId) === a.id);
    }

    return list;
  }, [attempts, currentLevel, period, scopeFirstOnly]);

  // Real KPI calculations: distinguish submitted vs in-progress attempts
  const submittedAttempts = useMemo(() => {
    return filteredAttempts.filter(
      (a) => a.status === 'submitted' || (a.status === undefined && a.totalScore > 0),
    );
  }, [filteredAttempts]);

  // Real answered / correct / blank counts at the current level
  const answerStats = useMemo(() => {
    // answer counts are per level over all submitted exams; hide them when the filters leave no submitted exam
    if (submittedAttempts.length === 0) return null;
    const real = realStatsBySkillByLevel?.[currentLevel];
    if (real) {
      const vals = Object.values(real);
      const total = vals.reduce((acc, v) => acc + v.total, 0);
      if (total > 0) {
        const wrong = vals.reduce((acc, v) => acc + v.wrong, 0);
        const blank = vals.reduce((acc, v) => acc + (v.blank ?? 0), 0);
        return { total, correct: total - wrong, blank };
      }
    }
    const own = questionAttempts.filter((q) => q.level === currentLevel);
    if (own.length > 0) {
      return { total: own.length, correct: own.filter((q) => q.isCorrect).length, blank: 0 };
    }
    return null;
  }, [realStatsBySkillByLevel, questionAttempts, currentLevel, submittedAttempts.length]);

  const levelExams = useMemo(() => (exams ?? []).filter((e) => e.level === currentLevel), [exams, currentLevel]);
  const levelAttempts = useMemo(() => attempts.filter((a) => a.level === currentLevel), [attempts, currentLevel]);
  const doneExamCount = useMemo(
    () => new Set(levelAttempts.filter((a) => a.status !== 'in_progress').map((a) => a.examId)).size,
    [levelAttempts],
  );
  const latestScore = useMemo(() => {
    const done = levelAttempts
      .filter((a) => a.status !== 'in_progress')
      .sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime());
    return done[0] ? done[0].totalScore : null;
  }, [levelAttempts]);

  const totalCompleted = submittedAttempts.length;
  const inProgressCount = filteredAttempts.filter((a) => a.status === 'in_progress').length;

  const avgScore = useMemo(() => {
    if (submittedAttempts.length === 0) return null;
    const sum = submittedAttempts.reduce((acc, a) => acc + a.totalScore, 0);
    return Math.round(sum / submittedAttempts.length);
  }, [submittedAttempts]);

  const avgAccuracy = useMemo(() => {
    if (submittedAttempts.length === 0) return null;
    const sum = submittedAttempts.reduce((acc, a) => acc + (a.accuracy || 0), 0);
    return Math.round(sum / submittedAttempts.length);
  }, [submittedAttempts]);

  const totalStudyHours = useMemo(() => {
    const MAX_ATTEMPT_SEC = 3 * 3600; // start-to-submit gaps of abandoned sessions are not study time
    const totalSec = submittedAttempts.reduce(
      (acc, a) => acc + Math.min(a.durationSec || 0, MAX_ATTEMPT_SEC),
      0,
    );
    return totalSec / 3600;
  }, [submittedAttempts]);

  // Streak days calculation
  const attemptStreakDays = useMemo(() => {
    if (attempts.length === 0) return 0;
    const activeDates = new Set<string>();
    attempts.forEach((a) => {
      if (a.submittedAt) {
        activeDates.add(a.submittedAt.slice(0, 10));
      }
    });
    if (activeDates.size === 0) return 0;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let checkDate: Date | null = activeDates.has(todayStr)
      ? today
      : activeDates.has(yesterdayStr)
      ? yesterday
      : null;

    if (!checkDate) return 0;

    let streak = 0;
    while (true) {
      const dStr = checkDate.toISOString().slice(0, 10);
      if (activeDates.has(dStr)) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
    return streak;
  }, [attempts]);
  const streakDays = activity ? activity.currentStreak : attemptStreakDays;

  // Dynamic Delta compared to previous attempt
  const { scoreDelta, accuracyDelta } = useMemo(() => {
    if (submittedAttempts.length < 2) {
      return { scoreDelta: null, accuracyDelta: null };
    }
    const sorted = [...submittedAttempts].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    );
    const latest = sorted[sorted.length - 1]!;
    const prev = sorted[sorted.length - 2]!;
    return {
      scoreDelta: latest.totalScore - prev.totalScore,
      accuracyDelta: Math.round((latest.accuracy - prev.accuracy) * 10) / 10,
    };
  }, [submittedAttempts]);

  // Dynamic weakest section discovery based on real question attempts or skill aggregates
  const weakestInfo = useMemo(() => {
    // 1. From real question attempts if available
    if (questionAttempts.length > 0) {
      const statsBySkill: Record<string, { total: number; wrong: number; name: string }> = {
        vocabulary: { total: 0, wrong: 0, name: 'Từ vựng & Chữ Hán' },
        kanji: { total: 0, wrong: 0, name: 'Chữ Hán' },
        grammar: { total: 0, wrong: 0, name: 'Ngữ pháp' },
        reading: { total: 0, wrong: 0, name: 'Đọc hiểu' },
        listening: { total: 0, wrong: 0, name: 'Nghe hiểu' },
      };
      questionAttempts.forEach((q) => {
        const entry = statsBySkill[q.skill];
        if (entry) {
          entry.total++;
          if (!q.isCorrect) entry.wrong++;
        }
      });
      const candidates = Object.values(statsBySkill).filter((s) => s.total > 0);
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.wrong / b.total - a.wrong / a.total);
        const worst = candidates[0]!;
        const acc = Math.round(((worst.total - worst.wrong) / worst.total) * 100);
        const totalWrong = candidates.reduce((sum, c) => sum + c.wrong, 0);
        return {
          name: worst.name,
          accuracy: acc,
          wrongCount: totalWrong,
        };
      }
    }

    // 1b. From the learner's real answered/wrong counts per skill (current level)
    const realSkill = realStatsBySkillByLevel?.[currentLevel];
    if (realSkill) {
      const names: Record<string, string> = {
        vocabulary: 'Từ vựng',
        kanji: 'Chữ Hán',
        grammar: 'Ngữ pháp',
        reading: 'Đọc hiểu',
        listening: 'Nghe hiểu',
      };
      const cands = Object.entries(realSkill).filter(([k, v]) => names[k] && v.total > 0);
      if (cands.length > 0) {
        cands.sort((x, y) => y[1].wrong / y[1].total - x[1].wrong / x[1].total);
        const [key, worst] = cands[0]!;
        return {
          name: names[key]!,
          accuracy: Math.round(((worst.total - worst.wrong) / worst.total) * 100),
          wrongCount: cands.reduce((sum, [, v]) => sum + v.wrong, 0),
        };
      }
    }

    // 2. From real skill aggregates if available
    if (skillAggregates && skillAggregates.length > 0) {
      const activeSkills = skillAggregates.filter((s) => s.sampleSize > 0);
      if (activeSkills.length > 0) {
        activeSkills.sort((a, b) => a.accuracyRate - b.accuracyRate);
        const worst = activeSkills[0]!;
        const skillNameMap: Record<string, string> = {
          vocabulary: 'Từ vựng',
          kanji: 'Chữ Hán',
          grammar: 'Ngữ pháp',
          reading: 'Đọc hiểu',
          listening: 'Nghe hiểu',
          language_knowledge: 'Kiến thức ngôn ngữ',
        };
        const totalWrong = activeSkills.reduce(
          (sum, s) => sum + Math.round(s.sampleSize * (1 - s.accuracyRate / 100)),
          0,
        );
        return {
          name: skillNameMap[worst.skill] || worst.skill,
          accuracy: Math.round(worst.accuracyRate),
          wrongCount: totalWrong,
        };
      }
    }

    // 3. If user has not completed any questions/exams yet
    return {
      name: '',
      accuracy: null as number | null,
      wrongCount: 0,
    };
  }, [questionAttempts, skillAggregates, realStatsBySkillByLevel, currentLevel]);

  // Section Score Breakdown: average real section scores from submitted attempts
  const sectionScores = useMemo(() => {
    const attemptsWithSections = submittedAttempts.filter(
      (a) => a.sections && a.sections.length > 0,
    );

    if (attemptsWithSections.length > 0) {
      const sectionTotals: Record<
        string,
        { name: string; code?: string; scoreSum: number; count: number; maxScore: number; minCutoff: number }
      > = {};

      attemptsWithSections.forEach((a) => {
        a.sections?.forEach((s) => {
          const key = s.code || s.name;
          if (!sectionTotals[key]) {
            sectionTotals[key] = {
              name: s.name,
              code: s.code,
              scoreSum: 0,
              count: 0,
              maxScore: s.maxScore || 60,
              minCutoff: s.minCutoff || 19,
            };
          }
          sectionTotals[key]!.scoreSum += s.score;
          sectionTotals[key]!.count += 1;
        });
      });

      return Object.values(sectionTotals).map((item) => ({
        name: item.name,
        code: item.code,
        score: Math.round(item.scoreSum / item.count),
        maxScore: item.maxScore,
        minCutoff: item.minCutoff,
      }));
    }

    // Default structure for level when no submitted sections exist
    const isN4N5 = currentLevel === 'N4' || currentLevel === 'N5';
    if (isN4N5) {
      return [
        {
          name: 'Kiến thức ngôn ngữ + Đọc hiểu',
          score: 0,
          maxScore: 120,
          minCutoff: thresholdInfo.minSections[0] || 38,
        },
        {
          name: 'Nghe hiểu',
          score: 0,
          maxScore: 60,
          minCutoff: thresholdInfo.minSections[1] || 19,
        },
      ];
    }
    return [
      {
        name: 'Kiến thức ngôn ngữ',
        score: 0,
        maxScore: 60,
        minCutoff: 19,
      },
      {
        name: 'Đọc hiểu',
        score: 0,
        maxScore: 60,
        minCutoff: 19,
      },
      {
        name: 'Nghe hiểu',
        score: 0,
        maxScore: 60,
        minCutoff: 19,
      },
    ];
  }, [submittedAttempts, currentLevel, thresholdInfo]);

  // Real Progression Data Points for Chart
  const progressionPoints = useMemo(() => {
    const done = filteredAttempts.filter(
      (a) => a.status === 'submitted' || (a.status === undefined && a.totalScore > 0),
    );
    if (done.length < 2) return undefined;
    const sorted = [...done].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    );
    return sorted.slice(-10).map((a, idx) => ({
      attemptNumber: idx + 1,
      score: a.totalScore,
      accuracy: Math.round(a.accuracy),
      durationMin: Math.round(a.durationSec / 60),
      label: a.examTitle,
    }));
  }, [filteredAttempts]);

  const skillStats = useMemo(() => calculateSkillAccuracy(questionAttempts), [questionAttempts]);
  const mondaiStats = useMemo(() => calculateMondaiAccuracy(questionAttempts), [questionAttempts]);

  // Skill category mapping for Section 11 & 12
  const skillCategories: SkillCategoryItem[] = useMemo(() => {
    const realSkill = realStatsBySkillByLevel?.[currentLevel];
    const realMondai = realMondaiStatsByLevel?.[currentLevel];
    const hasLocal = questionAttempts.length > 0;

    type Cell = { accuracy: number | null; total: number; blank: number };
    const empty: Cell = { accuracy: null, total: 0, blank: 0 };

    const getSkillCell = (sks: Skill[]): Cell => {
      if (hasLocal) {
        const matched = skillStats.filter((x) => sks.includes(x.skill));
        const total = matched.reduce((acc, x) => acc + x.total, 0);
        const correct = matched.reduce((acc, x) => acc + x.correct, 0);
        return total > 0 ? { accuracy: Math.round((correct / total) * 100), total, blank: 0 } : empty;
      }
      if (realSkill) {
        const total = sks.reduce((acc, k) => acc + (realSkill[k]?.total ?? 0), 0);
        const wrong = sks.reduce((acc, k) => acc + (realSkill[k]?.wrong ?? 0), 0);
        const blank = sks.reduce((acc, k) => acc + (realSkill[k]?.blank ?? 0), 0);
        return total > 0 ? { accuracy: Math.round(((total - wrong) / total) * 100), total, blank } : empty;
      }
      return empty;
    };

    const getMondaiData = (types: string[]): { accuracy: number | null; totalQuestions: number; blank: number; wrong: number } => {
      if (hasLocal) {
        const matched = mondaiStats.filter((m) => types.includes(m.mondaiType));
        const total = matched.reduce((acc, m) => acc + m.total, 0);
        const correct = matched.reduce((acc, m) => acc + m.correct, 0);
        return total > 0
          ? { accuracy: Math.round((correct / total) * 100), totalQuestions: total, blank: 0, wrong: total - correct }
          : { accuracy: null, totalQuestions: 0, blank: 0, wrong: 0 };
      }
      const r = mondaiAccuracy(realMondai, types);
      return r
        ? { accuracy: r.accuracy, totalQuestions: r.total, blank: r.blank, wrong: r.wrong }
        : { accuracy: null, totalQuestions: 0, blank: 0, wrong: 0 };
    };

    const typeItem = (label: string, types: string[]) => {
      const d = getMondaiData(types);
      return {
        label,
        accuracy: d.accuracy,
        totalQuestions: d.totalQuestions,
        blank: d.blank,
        href: buildPracticeHref({
          level: currentLevel,
          pool: d.wrong > 0 ? 'wrong' : 'unseen',
          mondaiTypes: types,
          count: d.wrong > 0 ? Math.min(15, Math.max(5, d.wrong)) : 15,
          label,
        }),
      };
    };

    return [
      {
        key: 'vocab',
        name: 'Từ vựng & Kanji',
        ...(() => { const c = getSkillCell(['vocabulary', 'kanji']); return { accuracy: c.accuracy, total: c.total, blank: c.blank }; })(),
        color: 'bg-emerald-500',
        types: [
          typeItem('Cách đọc Kanji', ['kanji_reading']),
          typeItem('Từ vựng theo ngữ cảnh', ['contextual']),
          typeItem('Từ gần nghĩa', ['paraphrase']),
          typeItem('Cách viết chữ Hán', ['orthography']),
          typeItem('Cách sử dụng từ', ['usage', 'word_formation']),
        ],
      },
      {
        key: 'grammar',
        name: 'Ngữ pháp',
        ...(() => { const c = getSkillCell(['grammar']); return { accuracy: c.accuracy, total: c.total, blank: c.blank }; })(),
        color: 'bg-indigo-500',
        types: [
          typeItem('Chọn mẫu ngữ pháp', ['grammar_form']),
          typeItem('Sắp xếp câu', ['sentence_composition']),
          typeItem('Ngữ pháp trong đoạn', ['text_grammar']),
        ],
      },
      {
        key: 'reading',
        name: 'Đọc hiểu',
        ...(() => { const c = getSkillCell(['reading']); return { accuracy: c.accuracy, total: c.total, blank: c.blank }; })(),
        color: 'bg-amber-500',
        types: [
          typeItem('Đọc hiểu đoạn ngắn', ['comprehension_short']),
          typeItem('Đọc hiểu đoạn trung bình', ['comprehension_mid']),
          typeItem('Đọc hiểu đoạn dài', ['comprehension_long', 'thematic']),
          typeItem('Tìm kiếm thông tin', ['info_retrieval', 'integrated_reading']),
        ],
      },
      {
        key: 'listening',
        name: 'Nghe hiểu',
        ...(() => { const c = getSkillCell(['listening']); return { accuracy: c.accuracy, total: c.total, blank: c.blank }; })(),
        color: 'bg-blue-500',
        types: [
          typeItem('Hiểu nhiệm vụ', ['task_based']),
          typeItem('Hiểu điểm chính', ['point']),
          typeItem('Hiểu khái quát', ['summary', 'integrated_listening']),
          typeItem('Phản hồi nhanh', ['quick_response', 'utterance']),
        ],
      },
    ];
  }, [skillStats, mondaiStats, questionAttempts, realStatsBySkillByLevel, realMondaiStatsByLevel, currentLevel]);

  // Handlers for Modals
  const handleOpenStudyModal = useCallback((mode: string, param?: string, href?: string) => {
    let title = 'Luyện tập trọng tâm';
    let message = 'Hệ thống đã chuẩn bị phiên luyện tập theo đúng kỹ năng và cấp độ của bạn.';
    let actionText = 'Bắt đầu luyện ngay';
    let actionHref: string | undefined =
      href ?? buildPracticeHref({ level: currentLevel, pool: 'wrong', count: 15 });

    if (mode === 'review') {
      title = 'Ôn lại các câu trả lời sai';
      message = 'Ôn tập các câu hỏi bạn đã từng làm sai trong các đề thi gần nhất để củng cố phản xạ.';
    } else if (mode === 'type') {
      title = `Luyện dạng: ${param || 'Đọc hiểu đoạn dài'}`;
      message = `Tập trung 15 câu dạng "${param || 'Đọc hiểu'}" với phân tích chi tiết và canh thời gian chuẩn.`;
    } else if (mode === 'priority') {
      title = `Nội dung ưu tiên: ${param || 'Đọc hiểu đoạn dài'}`;
      message = 'Gợi ý: luyện 15 câu chuyên sâu, gạch chân từ nối và tóm tắt luận điểm sau mỗi đoạn.';
    } else if (mode === 'skills') {
      title = 'Phân tích kỹ năng chuyên sâu';
      message = 'Xem chi tiết mức độ thành thạo và phân bố dạng câu hỏi cho toàn bộ 4 kỹ năng JLPT.';
      actionText = 'Đã hiểu';
      actionHref = undefined;
    } else if (mode === 'roadmap') {
      title = 'Lộ trình học cá nhân hóa';
      message = 'Lộ trình đề xuất: luyện dạng câu bạn sai nhiều nhất → ôn lại các câu từng sai → làm một đề thi mới để đo lại năng lực.';
      actionText = 'Xem chi tiết';
    }

    setStudyModalState({
      open: true,
      title,
      message,
      actionText,
      actionHref,
    });
  }, [currentLevel]);

  const handleOpenExamDetail = useCallback((attempt: AttemptRecord) => {
    handleOpenStudyModal('review', attempt.examTitle);
  }, [handleOpenStudyModal]);

  return (
    <div
      data-testid="analytics-dashboard"
      className={`jlpt-analytics-dashboard ${className}`}
    >
      {/* Layout Grid: Sticky In-Page Sidebar on left + Content Modules on right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sticky Sidebar Navigator */}
        <AnalyticsSidebarNav
          activeSection={activeSection}
          onNavigate={setActiveSection}
          targetLevel={currentLevel}
          completedExamsCount={doneExamCount}
          monthlyTargetCount={levelExams.length || bank?.[currentLevel]?.examsCount || 16}
          userName={userName}
        />

        {/* Main Dashboard Content Stream */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Top Header Filter Bar */}
          <AnalyticsHeaderFilter
            level={currentLevel}
            onLevelChange={setCurrentLevel}
            period={period}
            onPeriodChange={setPeriod}
            scopeFirstOnly={scopeFirstOnly}
            onToggleScope={() => setScopeFirstOnly((v) => !v)}
          />

          {submittedAttempts.length === 0 && attempts.some((a) => a.status !== 'in_progress') && (
            <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
              Không có bài nào khớp bộ lọc hiện tại ({currentLevel}
              {period !== 'all' ? `, ${period} ngày gần nhất` : ''}
              {scopeFirstOnly ? ', chỉ lượt đầu' : ''}). Hãy đổi cấp độ, mở rộng khoảng thời gian hoặc chọn "Bao gồm làm lại".
            </p>
          )}

          {/* Section 1: Overview KPIs */}
          <AnalyticsKpiCards
            avgScore={avgScore}
            completedExams={totalCompleted}
            inProgressExams={inProgressCount}
            accuracyRate={avgAccuracy}
            totalStudyHours={totalStudyHours}
            streakDays={streakDays}
            scoreChange={scoreDelta}
            accuracyChange={accuracyDelta}
            answerStats={answerStats}
          />
          {answerStats && !isDemoMode && (
            <p className="-mt-3 mb-6 text-[11px] text-slate-400 dark:text-slate-500">
              Tỷ lệ câu đúng và bỏ trống tính trên mọi bài đã nộp ở {currentLevel}, không phụ thuộc khoảng thời gian.
            </p>
          )}

          {/* Section 2: Assessment & Personal Plan */}
          <AnalyticsAssessment
            level={currentLevel}
            totalScore={avgScore ?? 0}
            thresholdScore={thresholdInfo.total}
            sections={sectionScores}
            weakestSectionName={weakestInfo.name}
            weakestAccuracy={weakestInfo.accuracy}
            wrongQuestionsCount={weakestInfo.wrongCount}
            blankRate={answerStats && answerStats.total > 0 ? Math.round((answerStats.blank / answerStats.total) * 100) : null}
            hasSubmitted={totalCompleted > 0}
            onOpenInfoModal={() => setInfoModalOpen(true)}
            onOpenStudyModal={handleOpenStudyModal}
          />

          {/* Countdown to the next sitting and progress through the exam bank */}
          <AnalyticsExamPlan
            level={currentLevel}
            exams={levelExams}
            attempts={levelAttempts}
            schedules={schedules ?? []}
            thresholdScore={thresholdInfo.total}
            latestScore={latestScore}
          />

          {/* Section 3: Knowledge Map */}
          <AnalyticsKnowledgeMap level={currentLevel} bank={bank?.[currentLevel]} />

          {/* Section 4: Frequency Ranking */}
          <AnalyticsFrequencyRanking level={currentLevel} bank={bank?.[currentLevel]} content={content?.[currentLevel]} />

          {/* Section 5: Year Trends Heatmap */}
          <AnalyticsYearTrends level={currentLevel} bank={bank?.[currentLevel]} content={content?.[currentLevel]} difficulty={difficulty} />

          {/* Section 6: Error Analysis */}
          <AnalyticsErrorAnalysis
            attempts={attempts}
            questionAttempts={questionAttempts}
            level={currentLevel}
            scopeFirstOnly={scopeFirstOnly}
            mondaiStats={realMondaiStatsByLevel?.[currentLevel]}
            onOpenStudyModal={handleOpenStudyModal}
          />

          {/* Section 7: Mistake Library */}
          <AnalyticsMistakeLibrary
            attempts={attempts}
            questionAttempts={questionAttempts}
            level={currentLevel}
            isDemoMode={isDemoMode}
            mistakes={mistakes}
            totalErrors={totalWrongCount}
            onOpenQuestionDetail={(rec) => setQuestionModalRecord(rec)}
            onReviewAll={(count) => handleOpenStudyModal('review', `${count} mục`)}
          />

          {/* Section 8: Mistake Intelligence (06 angles) */}
          <AnalyticsMistakeIntelligence
            attempts={attempts}
            questionAttempts={questionAttempts}
            level={currentLevel}
            realSkillStatsByLevel={realStatsBySkillByLevel}
            realCoverageByLevel={realCoverageByLevel}
                        realPairsByLevel={realPairsByLevel}
            realMasteryByLevel={realMasteryByLevel}
            realReasonsByLevel={realReasonsByLevel}
            realTrapsByLevel={realTrapsByLevel}
            realTimedWeaknessByLevel={realTimedWeaknessByLevel}
            isDemoMode={isDemoMode}
            onOpenDetailModal={(title, content) =>
              setDetailModalState({ open: true, title, content })
            }
          />

          {/* Section 9: Priority Matrix */}
          <AnalyticsPriorityMatrix
            attempts={attempts}
            questionAttempts={questionAttempts}
            level={currentLevel}
            mondaiStats={realMondaiStatsByLevel?.[currentLevel]}
            bankMondai={bank?.[currentLevel]?.mondai.map((m) => ({ type: m.type, count: m.count }))}
            onOpenStudyModal={handleOpenStudyModal}
          />

          {/* Section 10: Progression Line Chart & Mini Charts */}
          <AnalyticsProgressionCharts
            points={progressionPoints}
            thresholdScore={thresholdInfo.total}
          />

          {/* Section 11 & 12: Skills & Question Types (All on 1 page) */}
          <AnalyticsSkillsMondai
            skills={skillCategories}
            onOpenStudyModal={handleOpenStudyModal}
          />

          {/* Section 13: Exam History */}
          <AnalyticsExamHistory
            attempts={filteredAttempts}
            targetThreshold={thresholdInfo.total}
            onOpenExamDetail={handleOpenExamDetail}
            onOpenAllHistoryModal={() => handleOpenStudyModal('review')}
          />

          {/* Section 14: Activity Heatmap & Insights */}
          <AnalyticsActivityHeatmap
            attempts={filteredAttempts}
            currentStreakDays={streakDays}
            activity={activity}
            weakestSkill={weakestInfo.accuracy !== null ? { name: weakestInfo.name, accuracy: weakestInfo.accuracy } : null}
          />
        </div>
      </div>

      {/* HeroUI Modals */}
      <AnalyticsModals
        onSaveReason={onSaveReason}
        infoModalOpen={infoModalOpen}
        onCloseInfoModal={() => setInfoModalOpen(false)}
        questionModalRecord={questionModalRecord}
        onCloseQuestionModal={() => setQuestionModalRecord(null)}
        studyModalState={studyModalState}
        onCloseStudyModal={() => setStudyModalState((prev) => ({ ...prev, open: false }))}
        detailModalState={detailModalState}
        onCloseDetailModal={() => setDetailModalState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
