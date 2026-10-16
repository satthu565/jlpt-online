import crypto from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  achievementDefinitions,
  achievementShares,
  challengeEnrollments,
  challenges,
  classMemberships,
  leaderboardEntries,
  streakDays,
  studySessionCompletions,
  userAchievements,
  userProfiles,
  users,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';
import type {
  AchievementDto,
  AchievementShareDto,
  ChallengeDto,
  ClassGamificationStatsDto,
  LeaderboardEntryDto,
  LeaderboardOptInDto,
  LeaderboardQueryDto,
  RecordStreakActivityDto,
  StreakResponseDto,
} from './gamification.types.js';

export function getLocalDateForTimezone(
  dateInput: Date | string = new Date(),
  timezone: string = 'Asia/Ho_Chi_Minh',
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function daysDiff(dateStr1: string, dateStr2: string): number {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const u1 = Date.UTC(y1!, m1! - 1, d1!);
  const u2 = Date.UTC(y2!, m2! - 1, d2!);
  return Math.round((u1 - u2) / (1000 * 60 * 60 * 24));
}

export const DEFAULT_ACHIEVEMENTS = [
  {
    id: 'first_exam',
    title: 'Khởi đầu vững chắc',
    description: 'Hoàn thành đề thi đầu tiên trên hệ thống (GAME-02)',
    badgeIcon: 'badge-first-exam',
    criteria: { completedExamsCount: 1 },
  },
  {
    id: 'n3_completed',
    title: 'Vượt ải N3',
    description: 'Hoàn thành bài thi cấp độ JLPT N3 đạt yêu cầu (GAME-02)',
    badgeIcon: 'badge-n3-complete',
    criteria: { level: 'N3', status: 'submitted' },
  },
  {
    id: 'streak_7',
    title: 'Chăm chỉ 7 ngày',
    description: 'Duy trì chuỗi học tập 7 ngày liên tục (GAME-03)',
    badgeIcon: 'badge-streak-7',
    criteria: { streakDays: 7 },
  },
  {
    id: 'streak_30',
    title: 'Bền bỉ 30 ngày',
    description: 'Duy trì chuỗi học tập 30 ngày liên tục (GAME-03)',
    badgeIcon: 'badge-streak-30',
    criteria: { streakDays: 30 },
  },
  {
    id: 'weekly_goal',
    title: 'Mục tiêu tuần',
    description: 'Hoàn thành đầy đủ mục tiêu học tập đề ra trong tuần (GAME-03)',
    badgeIcon: 'badge-weekly-goal',
    criteria: { weeklyGoalSessions: 5 },
  },
  {
    id: 'perfect_section',
    title: 'Điểm tuyệt đối',
    description: 'Đạt điểm tuyệt đối trong một phần thi',
    badgeIcon: 'badge-perfect-score',
    criteria: { perfectSection: true },
  },
] as const;

export const DEFAULT_CHALLENGES = [
  {
    id: '0192f000-0000-7000-8000-0000000000c1',
    title: 'Thử thách bứt phá 7 ngày',
    description: 'Học liên tục 7 ngày để khởi động thói quen ôn luyện (GAME-05)',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    targetType: 'study_days',
    targetGoal: 7,
  },
  {
    id: '0192f000-0000-7000-8000-0000000000c2',
    title: 'Thử thách chinh phục 30 ngày',
    description: 'Hoàn thành 30 ngày luyện tập từ vựng và ngữ pháp (GAME-05)',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    targetType: 'study_days',
    targetGoal: 30,
  },
  {
    id: '0192f000-0000-7000-8000-0000000000c3',
    title: 'Chặng đường 60 ngày về đích JLPT',
    description: 'Thử thách toàn diện 60 ngày làm đề và ghi nhớ kiến thức (GAME-05)',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    targetType: 'study_days',
    targetGoal: 60,
  },
] as const;

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);
  private initialized = false;

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  /**
   * Initializes default achievement and challenge definitions.
   */
  async ensureDefinitions(): Promise<void> {
    if (this.initialized) return;
    const db = this.dbClient.db;

    for (const ach of DEFAULT_ACHIEVEMENTS) {
      await db
        .insert(achievementDefinitions)
        .values({
          id: ach.id,
          title: ach.title,
          description: ach.description,
          badgeIcon: ach.badgeIcon,
          criteria: ach.criteria,
        })
        .onConflictDoNothing();
    }

    for (const ch of DEFAULT_CHALLENGES) {
      await db
        .insert(challenges)
        .values({
          id: ch.id,
          title: ch.title,
          description: ch.description,
          startDate: ch.startDate,
          endDate: ch.endDate,
          targetType: ch.targetType,
          targetGoal: ch.targetGoal,
        })
        .onConflictDoNothing();
    }

    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // 1. Streak Management with Timezone Anti-Replay (GAME-01)
  // ---------------------------------------------------------------------------

  /**
   * Records a study activity and updates streak for user.
   * Satisfies Acceptance 5: Streak timezone anti-replay.
   */
  async recordActivity(
    userId: string,
    dto: RecordStreakActivityDto = {},
  ): Promise<StreakResponseDto> {
    await this.ensureDefinitions();
    const db = this.dbClient.db;

    // Determine user timezone
    let timezone = dto.timezone;
    if (!timezone) {
      const [u] = await db
        .select({ timezone: users.timezone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      timezone = u?.timezone ?? 'Asia/Ho_Chi_Minh';
    }

    const activityDate = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const localDate = getLocalDateForTimezone(activityDate, timezone);

    // Upsert streakDays atomically (anti-replay: duplicate day increments activityCount, not streak)
    const existing = await db
      .select()
      .from(streakDays)
      .where(and(eq(streakDays.userId, userId), eq(streakDays.localDate, localDate)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(streakDays)
        .set({ activityCount: sql`${streakDays.activityCount} + 1` })
        .where(and(eq(streakDays.userId, userId), eq(streakDays.localDate, localDate)));
    } else {
      await db.insert(streakDays).values({
        userId,
        localDate,
        activityCount: 1,
      });
    }

    const streak = await this.getStreak(userId, timezone, activityDate);

    // Check streak milestones
    if (streak.currentStreak >= 7) {
      await this.unlockAchievement(userId, 'streak_7');
    }
    if (streak.currentStreak >= 30) {
      await this.unlockAchievement(userId, 'streak_30');
    }

    // Check activity type specific badges (GAME-02)
    if (dto.activityType === 'exam') {
      await this.unlockAchievement(userId, 'first_exam');
    }

    // Update challenge progress if enrolled in any study_days challenge
    const enrollments = await db
      .select({
        challengeId: challengeEnrollments.challengeId,
        progress: challengeEnrollments.progress,
      })
      .from(challengeEnrollments)
      .where(eq(challengeEnrollments.userId, userId));

    for (const enr of enrollments) {
      if (enr.progress < streak.currentStreak) {
        await this.updateChallengeProgress(userId, enr.challengeId, streak.currentStreak - enr.progress);
      }
    }

    return streak;
  }

  /**
   * Retrieves the current and longest streak for a user.
   */
  async getStreak(
    userId: string,
    timezoneOverride?: string,
    asOfDateInput: Date = new Date(),
  ): Promise<StreakResponseDto> {
    const db = this.dbClient.db;

    let timezone = timezoneOverride;
    if (!timezone) {
      const [u] = await db
        .select({ timezone: users.timezone })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      timezone = u?.timezone ?? 'Asia/Ho_Chi_Minh';
    }

    const rows = await db
      .select()
      .from(streakDays)
      .where(eq(streakDays.userId, userId))
      .orderBy(desc(streakDays.localDate));

    if (rows.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        activeToday: false,
        timezone,
        totalActiveDays: 0,
        history: [],
      };
    }

    const todayStr = getLocalDateForTimezone(asOfDateInput, timezone);
    const yesterdayStr = getLocalDateForTimezone(
      new Date(asOfDateInput.getTime() - 86400000),
      timezone,
    );

    const dates = rows.map((r: { localDate: string; activityCount: number }) => r.localDate);
    const activeToday = dates[0] === todayStr;

    // Compute current streak:
    // If the latest activity is neither today nor yesterday, streak is broken -> 0
    let currentStreak = 0;
    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 0; i < dates.length - 1; i++) {
        const diff = daysDiff(dates[i]!, dates[i + 1]!);
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Compute longest streak across all recorded dates
    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = daysDiff(dates[i]!, dates[i + 1]!);
      if (diff === 1) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    return {
      currentStreak,
      longestStreak,
      lastActiveDate: dates[0] ?? null,
      activeToday,
      timezone,
      totalActiveDays: rows.length,
      history: rows.slice(0, 30).map((r: { localDate: string; activityCount: number }) => ({
        date: r.localDate,
        activityCount: r.activityCount,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Achievements & Badges (GAME-02, GAME-03)
  // ---------------------------------------------------------------------------

  /**
   * Retrieves all achievements with unlock status for user.
   */
  async getAchievements(userId: string): Promise<AchievementDto[]> {
    await this.ensureDefinitions();
    const db = this.dbClient.db;

    const defs = await db.select().from(achievementDefinitions);
    const unlocked = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const unlockedMap = new Map(
      unlocked.map((u: { achievementId: string; unlockedAt: Date }) => [
        u.achievementId,
        u.unlockedAt.toISOString(),
      ]),
    );

    return defs.map((d: { id: string; title: string; description: string; badgeIcon: string | null; criteria: unknown }) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      badgeIcon: d.badgeIcon,
      criteria: (d.criteria as Record<string, unknown>) ?? {},
      unlocked: unlockedMap.has(d.id),
      unlockedAt: unlockedMap.get(d.id) ?? null,
    }));
  }

  /**
   * Unlocks an achievement for a user.
   */
  async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    await this.ensureDefinitions();
    const db = this.dbClient.db;

    const def = await db
      .select()
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.id, achievementId))
      .limit(1);

    if (def.length === 0) return false;

    const existing = await db
      .select()
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievementId),
        ),
      )
      .limit(1);

    if (existing.length > 0) return false; // Already unlocked

    await db.insert(userAchievements).values({
      userId,
      achievementId,
      unlockedAt: new Date(),
    });

    this.logger.log(`Achievement '${achievementId}' unlocked for user '${userId}'`);
    return true;
  }

  /**
   * Shares an achievement with a pseudonymous token, minimizing PII.
   */
  async shareAchievement(userId: string, achievementId: string): Promise<AchievementShareDto> {
    const db = this.dbClient.db;

    const unlocked = await db
      .select({
        achievementId: userAchievements.achievementId,
        unlockedAt: userAchievements.unlockedAt,
        title: achievementDefinitions.title,
        badgeIcon: achievementDefinitions.badgeIcon,
      })
      .from(userAchievements)
      .innerJoin(
        achievementDefinitions,
        eq(userAchievements.achievementId, achievementDefinitions.id),
      )
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievementId),
        ),
      )
      .limit(1);

    if (unlocked.length === 0) {
      throw new NotFoundException(`Achievement '${achievementId}' is not unlocked by user.`);
    }

    const shareId = generateUuidV7();
    const shareToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 86400000); // 30 days expiry

    const ach = unlocked[0]!;

    await db.insert(achievementShares).values({
      id: shareId,
      userId,
      shareToken,
      payload: {
        achievementId,
        title: ach.title,
        badgeIcon: ach.badgeIcon,
        pseudonymousUser: `Học viên #${userId.slice(0, 8)}`,
        unlockedAt: ach.unlockedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      shareId,
      shareToken,
      achievementId,
      title: ach.title,
      badgeIcon: ach.badgeIcon,
      pseudonymousUser: `Học viên #${userId.slice(0, 8)}`,
      unlockedAt: ach.unlockedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Challenges: 7 / 30 / 60 Days (GAME-05)
  // ---------------------------------------------------------------------------

  /**
   * Lists available challenges with enrollment and progress status.
   */
  async listChallenges(userId?: string): Promise<ChallengeDto[]> {
    await this.ensureDefinitions();
    const db = this.dbClient.db;

    const challengeRows = await db.select().from(challenges);

    const enrollmentMap = new Map<string, { progress: number; completedAt: Date | null }>();
    if (userId) {
      const enrollments = await db
        .select()
        .from(challengeEnrollments)
        .where(eq(challengeEnrollments.userId, userId));
      for (const e of enrollments) {
        enrollmentMap.set(e.challengeId, {
          progress: e.progress,
          completedAt: e.completedAt,
        });
      }
    }

    return challengeRows.map((c: { id: string; title: string; description: string; startDate: string; endDate: string; targetType: string; targetGoal: number }) => {
      const enr = enrollmentMap.get(c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        startDate: c.startDate,
        endDate: c.endDate,
        targetType: c.targetType,
        targetGoal: c.targetGoal,
        durationDays: c.targetGoal,
        progress: enr ? enr.progress : 0,
        isCompleted: Boolean(enr?.completedAt),
        enrolled: Boolean(enr),
      };
    });
  }

  /**
   * Enrolls user in a challenge.
   */
  async joinChallenge(userId: string, challengeId: string): Promise<ChallengeDto> {
    await this.ensureDefinitions();
    const db = this.dbClient.db;

    const [ch] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!ch) {
      throw new NotFoundException(`Challenge '${challengeId}' not found.`);
    }

    const existing = await db
      .select()
      .from(challengeEnrollments)
      .where(
        and(
          eq(challengeEnrollments.userId, userId),
          eq(challengeEnrollments.challengeId, challengeId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(challengeEnrollments).values({
        userId,
        challengeId,
        progress: 0,
      });
    }

    return {
      id: ch.id,
      title: ch.title,
      description: ch.description,
      startDate: ch.startDate,
      endDate: ch.endDate,
      targetType: ch.targetType,
      targetGoal: ch.targetGoal,
      durationDays: ch.targetGoal,
      progress: existing[0]?.progress ?? 0,
      isCompleted: Boolean(existing[0]?.completedAt),
      enrolled: true,
    };
  }

  /**
   * Updates challenge progress.
   */
  async updateChallengeProgress(
    userId: string,
    challengeId: string,
    delta: number,
  ): Promise<{ progress: number; isCompleted: boolean }> {
    const db = this.dbClient.db;

    const [ch] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!ch) throw new NotFoundException('Challenge not found');

    const [enr] = await db
      .select()
      .from(challengeEnrollments)
      .where(
        and(
          eq(challengeEnrollments.userId, userId),
          eq(challengeEnrollments.challengeId, challengeId),
        ),
      )
      .limit(1);

    if (!enr) {
      // Auto enroll
      await this.joinChallenge(userId, challengeId);
    }

    const newProgress = (enr?.progress ?? 0) + delta;
    const isCompleted = newProgress >= ch.targetGoal;
    const completedAt = isCompleted ? (enr?.completedAt ?? new Date()) : null;

    await db
      .update(challengeEnrollments)
      .set({
        progress: newProgress,
        completedAt,
      })
      .where(
        and(
          eq(challengeEnrollments.userId, userId),
          eq(challengeEnrollments.challengeId, challengeId),
        ),
      );

    return { progress: newProgress, isCompleted };
  }

  // ---------------------------------------------------------------------------
  // 4. Voluntary Separate Leaderboards (GAME-04)
  // ---------------------------------------------------------------------------

  /**
   * Sets leaderboard opt-in status in user profile.
   * Satisfies Acceptance 5: Voluntary leaderboards.
   */
  async setLeaderboardOptIn(userId: string, dto: LeaderboardOptInDto): Promise<void> {
    const db = this.dbClient.db;

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    const existingMeta = (profile?.metadata as Record<string, unknown>) ?? {};
    const updatedMeta = {
      ...existingMeta,
      leaderboardOptIn: dto.optIn,
      leaderboardDisplayName: dto.displayName,
    };

    if (profile) {
      await db
        .update(userProfiles)
        .set({ metadata: updatedMeta, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId));
    } else {
      await db.insert(userProfiles).values({
        userId,
        metadata: updatedMeta,
      });
    }
  }

  /**
   * Records a user's score in a specific partition and recalculates ranks.
   */
  async recordLeaderboardScore(
    userId: string,
    score: number,
    level: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly',
  ): Promise<void> {
    const db = this.dbClient.db;

    const existing = await db
      .select()
      .from(leaderboardEntries)
      .where(
        and(
          eq(leaderboardEntries.userId, userId),
          eq(leaderboardEntries.level, level),
          eq(leaderboardEntries.period, period),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(leaderboardEntries)
        .set({
          score: sql`${leaderboardEntries.score} + ${score}`,
          updatedAt: new Date(),
        })
        .where(eq(leaderboardEntries.id, existing[0]!.id));
    } else {
      await db.insert(leaderboardEntries).values({
        id: generateUuidV7(),
        userId,
        level,
        period,
        score,
        rank: 1,
        updatedAt: new Date(),
      });
    }

    // Recalculate ranks in partition
    const partitionRows = await db
      .select()
      .from(leaderboardEntries)
      .where(
        and(
          eq(leaderboardEntries.level, level),
          eq(leaderboardEntries.period, period),
        ),
      )
      .orderBy(desc(leaderboardEntries.score));

    for (let r = 0; r < partitionRows.length; r++) {
      const row = partitionRows[r]!;
      await db
        .update(leaderboardEntries)
        .set({ rank: r + 1 })
        .where(eq(leaderboardEntries.id, row.id));
    }
  }

  /**
   * Retrieves leaderboard entries for a given level and period.
   * Incomparable conditions (different levels/periods) are strictly separated.
   * Only users with voluntary optIn: true appear.
   */
  async getLeaderboard(
    query: LeaderboardQueryDto,
    requestingUserId?: string,
  ): Promise<LeaderboardEntryDto[]> {
    const db = this.dbClient.db;
    const limit = query.limit ?? 50;

    // Fetch entries in partition
    const rows = await db
      .select({
        id: leaderboardEntries.id,
        userId: leaderboardEntries.userId,
        score: leaderboardEntries.score,
        rank: leaderboardEntries.rank,
        level: leaderboardEntries.level,
        period: leaderboardEntries.period,
        userName: users.name,
        profileMeta: userProfiles.metadata,
      })
      .from(leaderboardEntries)
      .innerJoin(users, eq(leaderboardEntries.userId, users.id))
      .leftJoin(userProfiles, eq(leaderboardEntries.userId, userProfiles.userId))
      .where(
        and(
          eq(leaderboardEntries.level, query.level),
          eq(leaderboardEntries.period, query.period),
        ),
      )
      .orderBy(desc(leaderboardEntries.score))
      .limit(limit * 2);

    // Filter by voluntary optIn
    const voluntaryRows = rows.filter((r: { profileMeta: unknown }) => {
      const meta = (r.profileMeta as Record<string, unknown>) ?? {};
      return meta.leaderboardOptIn === true;
    });

    return voluntaryRows.slice(0, limit).map((r: { userId: string; score: number; level: string; period: string; userName: string | null; profileMeta: unknown }, index: number) => {
      const meta = (r.profileMeta as Record<string, unknown>) ?? {};
      const customName = (meta.leaderboardDisplayName as string) || r.userName;
      const isCurrentUser = r.userId === requestingUserId;
      const displayName = isCurrentUser
        ? (customName || 'Bạn')
        : (customName || `Học viên #${r.userId.slice(0, 8)}`);

      return {
        rank: index + 1,
        userId: r.userId,
        displayName,
        score: r.score,
        level: r.level,
        period: r.period,
        isCurrentUser,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Class / Cohort Statistics (GAME-10)
  // ---------------------------------------------------------------------------

  /**
   * Aggregates gamification statistics for a classroom/cohort.
   */
  async getClassGamificationStats(classId: string): Promise<ClassGamificationStatsDto> {
    const db = this.dbClient.db;

    // Fetch members of the class
    const members = await db
      .select({ userId: classMemberships.studentId })
      .from(classMemberships)
      .where(eq(classMemberships.classId, classId));

    if (members.length === 0) {
      return {
        classId,
        totalLearners: 0,
        activeStreakCount: 0,
        averageStreak: 0,
        topAchievements: [],
        totalSessionsCompleted: 0,
      };
    }

    const userIds = members.map((m: { userId: string }) => m.userId);

    // Calculate streaks for all class members
    let totalStreaks = 0;
    let activeStreakCount = 0;
    for (const uid of userIds) {
      const st = await this.getStreak(uid);
      if (st.currentStreak > 0) activeStreakCount++;
      totalStreaks += st.currentStreak;
    }
    const averageStreak = Math.round((totalStreaks / userIds.length) * 10) / 10;

    // Top unlocked achievements in class
    const achCounts = await db
      .select({
        achievementId: userAchievements.achievementId,
        count: sql<number>`count(*)::int`,
        title: achievementDefinitions.title,
      })
      .from(userAchievements)
      .innerJoin(
        achievementDefinitions,
        eq(userAchievements.achievementId, achievementDefinitions.id),
      )
      .where(inArray(userAchievements.userId, userIds))
      .groupBy(userAchievements.achievementId, achievementDefinitions.title)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // Total study activities completed
    const sessionCountRow = await db
      .select({ count: sql<number>`coalesce(sum(${streakDays.activityCount}), 0)::int` })
      .from(streakDays)
      .where(inArray(streakDays.userId, userIds));

    return {
      classId,
      totalLearners: userIds.length,
      activeStreakCount,
      averageStreak,
      topAchievements: achCounts.map((a: { achievementId: string; title: string; count: number }) => ({
        id: a.achievementId,
        title: a.title,
        count: Number(a.count),
      })),
      totalSessionsCompleted: Number(sessionCountRow[0]?.count ?? 0),
    };
  }
}
