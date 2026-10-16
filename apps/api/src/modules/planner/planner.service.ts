import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  studyPlanVersions,
  studyPlans,
  studySessionCompletions,
  studySessions,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  CompleteSessionDto,
  CompleteSessionResponseDto,
  CreateStudyPlanDto,
  JLPTSkill,
  ReminderDto,
  ReplanRequestDto,
  ReplanResponseDto,
  StudyPlanConfig,
  StudyPlanDto,
  StudySessionDto,
} from './planner.types.js';

/**
 * Returns YYYY-MM-DD local date string for a given Date or ISO string in the specified timezone.
 */
export function getLocalDateString(
  dateInput: Date | string = new Date(),
  timezone: string = 'Asia/Ho_Chi_Minh',
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Calculates calendar days remaining until targetDate in a specific timezone (PLAN-02, Acceptance 2).
 * Deterministic: whole calendar day diff between asOf date and targetDate.
 */
export function calculateDaysRemaining(
  targetDateStr: string,
  timezone: string = 'Asia/Ho_Chi_Minh',
  asOfDateInput: Date | string = new Date(),
): number {
  const asOfLocal = getLocalDateString(asOfDateInput, timezone);
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const [aY, aM, aD] = asOfLocal.split('-').map(Number);

  const targetUtc = Date.UTC(tY!, tM! - 1, tD!);
  const asOfUtc = Date.UTC(aY!, aM! - 1, aD!);

  const diffMs = targetUtc - asOfUtc;
  return Math.max(0, Math.round(diffMs / 86400000));
}

/**
 * Computes skill time distribution percentages based on weak skills (PLAN-06).
 */
export function computeSkillDistribution(
  focusSkills: JLPTSkill[] = [],
): Record<JLPTSkill, number> {
  const allSkills: JLPTSkill[] = ['vocabulary', 'grammar', 'reading', 'listening'];

  if (focusSkills.length === 0) {
    return {
      vocabulary: 25,
      grammar: 25,
      reading: 25,
      listening: 25,
    };
  }

  // Allocate 50% to focus skills, 50% to remaining skills
  const focusWeight = 50 / focusSkills.length;
  const remainingSkills = allSkills.filter((s) => !focusSkills.includes(s));
  const otherWeight = remainingSkills.length > 0 ? 50 / remainingSkills.length : 0;

  const result = {} as Record<JLPTSkill, number>;
  for (const s of allSkills) {
    result[s] = focusSkills.includes(s) ? Math.round(focusWeight) : Math.round(otherWeight);
  }
  return result;
}

@Injectable()
export class PlannerService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Creates a structured study plan with 30/60/90 day roadmap and periodic mock exams (PLAN-01..PLAN-06).
   */
  async createStudyPlan(userId: string, dto: CreateStudyPlanDto): Promise<StudyPlanDto> {
    if (!dto.targetLevel || !['N1', 'N2', 'N3', 'N4', 'N5'].includes(dto.targetLevel)) {
      throw new BadRequestException("Invalid target level. Must be 'N1', 'N2', 'N3', 'N4', or 'N5'");
    }

    if (!dto.targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(dto.targetDate)) {
      throw new BadRequestException("Target date must be in 'YYYY-MM-DD' format");
    }

    const timezone = dto.timezone ?? 'Asia/Ho_Chi_Minh';
    const dailyMinutes = dto.dailyMinutes ?? 30;
    const durationDays = dto.durationDays ?? 30;
    const focusSkills = dto.focusSkills ?? [];
    const mockExamIntervalDays = dto.mockExamIntervalDays ?? 7;
    const finalSprintDays = 7;
    const skillDistribution = computeSkillDistribution(focusSkills);

    const planId = generateUuidV7();
    const now = new Date();

    // 1. Insert study plan
    await this.dbClient.db.insert(studyPlans).values({
      id: planId,
      userId,
      targetLevel: dto.targetLevel,
      targetDate: dto.targetDate,
      status: 'active',
      createdAt: now,
    });

    // 2. Initial config & schedule version
    const config: StudyPlanConfig = {
      dailyMinutes,
      durationDays,
      timezone,
      focusSkills,
      mockExamIntervalDays,
      finalSprintDays,
      skillDistribution,
      replanHistory: [],
    };

    await this.dbClient.db.insert(studyPlanVersions).values({
      planId,
      version: 1,
      weeklySchedule: config,
      createdAt: now,
    });

    // 3. Generate daily sessions
    const startDateStr = dto.startDate ?? getLocalDateString(now, timezone);
    const [sY, sM, sD] = startDateStr.split('-').map(Number);
    const startUtc = new Date(Date.UTC(sY!, sM! - 1, sD!));

    const skillsSequence: JLPTSkill[] = ['vocabulary', 'grammar', 'reading', 'listening'];
    if (focusSkills.length > 0) {
      // Prioritize focus skills in rotation
      for (const fs of focusSkills) {
        skillsSequence.unshift(fs);
      }
    }

    const createdSessions: StudySessionDto[] = [];

    for (let day = 0; day < durationDays; day++) {
      const curDate = new Date(startUtc);
      curDate.setUTCDate(curDate.getUTCDate() + day);

      const curDateStr = curDate.toISOString().slice(0, 10);
      const daysToTarget = calculateDaysRemaining(dto.targetDate, timezone, curDateStr);

      const sessionId = generateUuidV7();
      let sessionType: StudySessionDto['sessionType'] = 'lesson';
      const skill: JLPTSkill = skillsSequence[day % skillsSequence.length]!;
      let topic = `Buổi học ngày ${day + 1}: Kỹ năng ${skill}`;

      // Check periodic mock exam day
      if ((day + 1) % mockExamIntervalDays === 0) {
        sessionType = 'mock_exam';
        topic = `Đề thi thử định kỳ số ${Math.floor((day + 1) / mockExamIntervalDays)} (${dto.targetLevel})`;
      } else if (daysToTarget <= finalSprintDays && daysToTarget > 0) {
        // Final sprint review
        sessionType = 'final_sprint';
        topic = `Tổng ôn nước rút: Đề thi thử & xem lại kiến thức trọng tâm`;
      }

      await this.dbClient.db.insert(studySessions).values({
        id: sessionId,
        planId,
        userId,
        scheduledDate: curDateStr,
        durationMinutes: dailyMinutes,
        status: 'pending',
      });

      createdSessions.push({
        id: sessionId,
        planId,
        userId,
        scheduledDate: curDateStr,
        durationMinutes: dailyMinutes,
        status: 'pending',
        sessionType,
        topic,
        skill,
      });
    }

    const daysRemaining = calculateDaysRemaining(dto.targetDate, timezone, now);

    return {
      id: planId,
      userId,
      targetLevel: dto.targetLevel,
      targetDate: dto.targetDate,
      status: 'active',
      currentVersion: 1,
      daysRemaining,
      totalSessions: createdSessions.length,
      completedSessions: 0,
      completionRate: 0,
      currentStreak: 0,
      isFinalSprint: daysRemaining <= finalSprintDays,
      createdAt: now.toISOString(),
      config,
      sessions: createdSessions,
    };
  }

  /**
   * Retrieves a study plan with countdown, completion rate, and current streak (PLAN-02, PLAN-08).
   */
  async getStudyPlan(userId: string, planId: string): Promise<StudyPlanDto> {
    const planRows = await this.dbClient.db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
      .limit(1);

    if (planRows.length === 0) {
      throw new NotFoundException(`Study plan '${planId}' not found`);
    }

    const plan = planRows[0]!;

    // Latest version
    const versionRows = await this.dbClient.db
      .select()
      .from(studyPlanVersions)
      .where(eq(studyPlanVersions.planId, planId))
      .orderBy(desc(studyPlanVersions.version))
      .limit(1);

    const latestVersion = versionRows.length > 0 ? versionRows[0]!.version : 1;
    const config = (versionRows[0]?.weeklySchedule ?? {}) as StudyPlanConfig;
    const timezone = config.timezone ?? 'Asia/Ho_Chi_Minh';

    // Sessions
    const sessions = await this.dbClient.db
      .select()
      .from(studySessions)
      .where(eq(studySessions.planId, planId))
      .orderBy(asc(studySessions.scheduledDate));

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s: typeof studySessions.$inferSelect) => s.status === 'completed').length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const daysRemaining = calculateDaysRemaining(plan.targetDate, timezone);
    const isFinalSprint = daysRemaining <= (config.finalSprintDays ?? 7);

    // Calculate streak
    const streak = await this.calculateUserStreak(userId);

    return {
      id: plan.id,
      userId: plan.userId,
      targetLevel: plan.targetLevel as StudyPlanDto['targetLevel'],
      targetDate: plan.targetDate,
      status: plan.status,
      currentVersion: latestVersion,
      daysRemaining,
      totalSessions,
      completedSessions,
      completionRate,
      currentStreak: streak,
      isFinalSprint,
      createdAt: plan.createdAt.toISOString(),
      config,
      sessions: sessions.map((s: typeof studySessions.$inferSelect) => ({
        id: s.id,
        planId: s.planId,
        userId: s.userId,
        scheduledDate: s.scheduledDate,
        durationMinutes: s.durationMinutes,
        status: s.status as StudySessionDto['status'],
      })),
    };
  }

  /**
   * Deterministic replanning when study sessions are missed (PLAN-10, Acceptance 2).
   * Identifies missed sessions prior to asOfDate, preserves completed sessions immutably,
   * redistributes missed minutes/topics across remaining sessions, and generates a new plan version.
   */
  async replanMissedSessions(
    userId: string,
    planId: string,
    dto: ReplanRequestDto = {},
  ): Promise<ReplanResponseDto> {
    const planRows = await this.dbClient.db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
      .limit(1);

    if (planRows.length === 0) {
      throw new NotFoundException(`Study plan '${planId}' not found`);
    }

    const _plan = planRows[0]!;

    // Latest version
    const versionRows = await this.dbClient.db
      .select()
      .from(studyPlanVersions)
      .where(eq(studyPlanVersions.planId, planId))
      .orderBy(desc(studyPlanVersions.version))
      .limit(1);

    const currentVersion = versionRows.length > 0 ? versionRows[0]!.version : 1;
    const currentConfig = (versionRows[0]?.weeklySchedule ?? {}) as StudyPlanConfig;
    const timezone = currentConfig.timezone ?? 'Asia/Ho_Chi_Minh';

    // Determine deterministic asOf date string
    const asOfLocal = dto.asOfDate ?? getLocalDateString(new Date(), timezone);

    // Fetch all sessions
    const sessions = await this.dbClient.db
      .select()
      .from(studySessions)
      .where(eq(studySessions.planId, planId))
      .orderBy(asc(studySessions.scheduledDate));

    // 1. Identify missed sessions: pending and scheduledDate < asOfLocal
    const missedSessions = sessions.filter(
      (s: typeof studySessions.$inferSelect) => s.status === 'pending' && s.scheduledDate < asOfLocal,
    );

    // 2. Identify remaining future sessions: pending and scheduledDate >= asOfLocal
    const remainingSessions = sessions.filter(
      (s: typeof studySessions.$inferSelect) => s.status === 'pending' && s.scheduledDate >= asOfLocal,
    );

    let totalMissedMinutes = 0;
    for (const ms of missedSessions) {
      totalMissedMinutes += ms.durationMinutes;
      // Mark as missed - immutable audit trail, NOT deleted!
      await this.dbClient.db
        .update(studySessions)
        .set({ status: 'missed' })
        .where(eq(studySessions.id, ms.id));
    }

    // 3. Redistribute missed minutes across remaining future sessions
    let _redistributedMinutes = 0;
    if (remainingSessions.length > 0 && totalMissedMinutes > 0) {
      const additionalMinutesPerSession = Math.ceil(totalMissedMinutes / remainingSessions.length);
      for (const rs of remainingSessions) {
        const newDuration = rs.durationMinutes + additionalMinutesPerSession;
        await this.dbClient.db
          .update(studySessions)
          .set({ durationMinutes: newDuration })
          .where(eq(studySessions.id, rs.id));
        _redistributedMinutes += additionalMinutesPerSession;
      }
    }

    // 4. Create new plan version in studyPlanVersions
    const newVersion = currentVersion + 1;
    const updatedConfig: StudyPlanConfig = {
      ...currentConfig,
      replanHistory: [
        ...(currentConfig.replanHistory ?? []),
        {
          replanVersion: newVersion,
          replanDate: asOfLocal,
          missedCount: missedSessions.length,
          redistributedMinutes: totalMissedMinutes,
          reason: dto.reason ?? 'Tự động điều chỉnh phân bổ lại các buổi học bị bỏ lỡ',
        },
      ],
    };

    await this.dbClient.db.insert(studyPlanVersions).values({
      planId,
      version: newVersion,
      weeklySchedule: updatedConfig,
      createdAt: new Date(),
    });

    return {
      planId,
      previousVersion: currentVersion,
      newVersion,
      missedSessionsCount: missedSessions.length,
      redistributedMinutes: totalMissedMinutes,
      remainingSessionsCount: remainingSessions.length,
      updatedWeeklySchedule: updatedConfig,
      updatedSessionsCount: remainingSessions.length,
    };
  }

  /**
   * Retrieves recommended study sessions and practice for today (PLAN-07).
   */
  async getTodayRecommendations(userId: string, timezone = 'Asia/Ho_Chi_Minh', asOfDate?: string) {
    const todayLocal = asOfDate ?? getLocalDateString(new Date(), timezone);

    const activePlans = await this.dbClient.db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.userId, userId), eq(studyPlans.status, 'active')))
      .limit(1);

    if (activePlans.length === 0) {
      return {
        todayDate: todayLocal,
        timezone,
        sessions: [],
        totalMinutes: 0,
        message: 'Bạn chưa có kế hoạch học tập đang kích hoạt. Hãy tạo kế hoạch 30/60/90 ngày!',
      };
    }

    const plan = activePlans[0]!;
    const sessions = await this.dbClient.db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.planId, plan.id),
          eq(studySessions.scheduledDate, todayLocal),
        ),
      );

    const daysRemaining = calculateDaysRemaining(plan.targetDate, timezone, todayLocal);

    return {
      todayDate: todayLocal,
      timezone,
      targetLevel: plan.targetLevel,
      daysRemaining,
      isFinalSprint: daysRemaining <= 7,
      sessions: sessions.map((s: typeof studySessions.$inferSelect) => ({
        id: s.id,
        planId: s.planId,
        scheduledDate: s.scheduledDate,
        durationMinutes: s.durationMinutes,
        status: s.status,
      })),
      totalMinutes: sessions.reduce((acc: number, s: typeof studySessions.$inferSelect) => acc + s.durationMinutes, 0),
    };
  }

  /**
   * Idempotently completes a study session with clientEventId (PLAN-08).
   */
  async completeStudySession(
    userId: string,
    sessionId: string,
    dto: CompleteSessionDto,
  ): Promise<CompleteSessionResponseDto> {
    const sessions = await this.dbClient.db
      .select()
      .from(studySessions)
      .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, userId)))
      .limit(1);

    if (sessions.length === 0) {
      throw new NotFoundException(`Study session '${sessionId}' not found`);
    }

    // Check idempotency: if clientEventId was already recorded
    const existingCompletions = await this.dbClient.db
      .select()
      .from(studySessionCompletions)
      .where(eq(studySessionCompletions.clientEventId, dto.clientEventId))
      .limit(1);

    if (existingCompletions.length > 0) {
      const comp = existingCompletions[0]!;
      const streak = await this.calculateUserStreak(userId);
      return {
        sessionId,
        status: 'completed',
        completedAt: comp.completedAt.toISOString(),
        clientEventId: comp.clientEventId,
        isIdempotentReplay: true,
        streak,
      };
    }

    const now = dto.completedAt ? new Date(dto.completedAt) : new Date();

    // Mark session as completed
    await this.dbClient.db
      .update(studySessions)
      .set({ status: 'completed' })
      .where(eq(studySessions.id, sessionId));

    // Record completion event
    await this.dbClient.db.insert(studySessionCompletions).values({
      id: generateUuidV7(),
      sessionId,
      clientEventId: dto.clientEventId,
      completedAt: now,
      timeSpentSeconds: dto.timeSpentSeconds ?? 1800,
    });

    const streak = await this.calculateUserStreak(userId);

    return {
      sessionId,
      status: 'completed',
      completedAt: now.toISOString(),
      clientEventId: dto.clientEventId,
      isIdempotentReplay: false,
      streak,
    };
  }

  /**
   * Returns reminder notification configuration for the study plan (PLAN-09).
   */
  async getPlanReminders(userId: string, planId: string): Promise<ReminderDto> {
    const plan = await this.getStudyPlan(userId, planId);
    const todayLocal = getLocalDateString(new Date(), plan.config.timezone);

    const todaySessions = (plan.sessions ?? []).filter((s) => s.scheduledDate === todayLocal);
    const hasMockExam = todaySessions.some((s) => s.durationMinutes >= 60);
    const totalMins = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    let body = `Hôm nay bạn có ${todaySessions.length} buổi học (${totalMins} phút). Hãy duy trì chuỗi học tập đều đặn!`;
    if (hasMockExam) {
      body = `Hôm nay bạn có 1 bài thi thử định kỳ cấp độ ${plan.targetLevel}. Hãy chuẩn bị không gian yên tĩnh và bắt đầu!`;
    }

    return {
      planId: plan.id,
      targetDate: plan.targetDate,
      daysRemaining: plan.daysRemaining,
      reminderTime: '20:00',
      title: `Nhắc nhở học tập JLPT ${plan.targetLevel} (Còn ${plan.daysRemaining} ngày)`,
      body,
      recommendedToday: {
        sessionsCount: todaySessions.length,
        totalMinutes: totalMins,
        hasMockExam,
      },
    };
  }

  /**
   * Calculates consecutive days with completed study sessions for the user.
   */
  private async calculateUserStreak(userId: string): Promise<number> {
    const completedRows = await this.dbClient.db
      .select({
        completedAt: studySessionCompletions.completedAt,
      })
      .from(studySessionCompletions)
      .innerJoin(studySessions, eq(studySessionCompletions.sessionId, studySessions.id))
      .where(eq(studySessions.userId, userId))
      .orderBy(desc(studySessionCompletions.completedAt));

    if (completedRows.length === 0) return 0;

    const uniqueDates = new Set<string>();
    for (const r of completedRows) {
      const d = r.completedAt.toISOString().slice(0, 10);
      uniqueDates.add(d);
    }

    const sortedDates = Array.from(uniqueDates).sort().reverse();
    let streak = 0;
    const nowLocal = new Date().toISOString().slice(0, 10);

    let expectedDate = new Date(nowLocal);
    // Allow today or yesterday as the start of the streak
    const firstDate = sortedDates[0]!;
    const diffToToday = Math.round((new Date(nowLocal).getTime() - new Date(firstDate).getTime()) / 86400000);

    if (diffToToday > 1) {
      return 0;
    }

    expectedDate = new Date(firstDate);
    for (const dStr of sortedDates) {
      const expectedStr = expectedDate.toISOString().slice(0, 10);
      if (dStr === expectedStr) {
        streak += 1;
        expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }
}
