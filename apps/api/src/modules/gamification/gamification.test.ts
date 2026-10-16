import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import {
  achievementDefinitions,
  achievementShares,
  challengeEnrollments,
  challenges,
  classes,
  classMemberships,
  leaderboardEntries,
  organizations,
  orgMemberships,
  streakDays,
  studySessionCompletions,
  userAchievements,
  userProfiles,
  users,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { GamificationController } from './gamification.controller.js';
import { GamificationService, getLocalDateForTimezone } from './gamification.service.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

function createMockUser(userId: string, name = 'Student A', timezone = 'Asia/Ho_Chi_Minh'): AuthUserContext {
  return {
    userId,
    email: `${userId}@jlpt.test`,
    name,
    role: 'student',
    sessionId: generateUuidV7(),
    sessionToken: 'test-token',
    emailVerified: true,
    tenantId: 'default',
  };
}

describe('A05: Gamification & Public Statistics Module (GAME-01..05, GAME-10)', () => {
  let dbClient: DbClientInstance;
  let outboxService: OutboxService;
  let gamificationService: GamificationService;
  let gamificationController: GamificationController;

  const user1Id = generateUuidV7();
  const user2Id = generateUuidV7();
  const mockUser1 = createMockUser(user1Id, 'Minh Nguyen', 'Asia/Ho_Chi_Minh');
  const mockUser2 = createMockUser(user2Id, 'Kenji Sato', 'Asia/Tokyo');

  beforeAll(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    outboxService = new OutboxService(dbClient);
    gamificationService = new GamificationService(dbClient, outboxService);
    gamificationController = new GamificationController(gamificationService);

    // Seed users
    await dbClient.db.insert(users).values({
      id: user1Id,
      email: `${user1Id}@jlpt.test`,
      name: 'Minh Nguyen',
      role: 'student',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    await dbClient.db.insert(users).values({
      id: user2Id,
      email: `${user2Id}@jlpt.test`,
      name: 'Kenji Sato',
      role: 'student',
      timezone: 'Asia/Tokyo',
    });

    await gamificationService.ensureDefinitions();
  });

  afterAll(async () => {
    await dbClient.close();
  });

  beforeEach(async () => {
    // Reset user gamification states
    await dbClient.db.delete(achievementShares);
    await dbClient.db.delete(userAchievements);
    await dbClient.db.delete(challengeEnrollments);
    await dbClient.db.delete(leaderboardEntries);
    await dbClient.db.delete(streakDays);
    await dbClient.db.delete(userProfiles);
  });

  describe('Acceptance 5: Streak timezone anti-replay (GAME-01)', () => {
    it('prevents replay attacks: multiple activities on same local day increment activityCount without inflating streak', async () => {
      // Activity 1 on Day 1
      const res1 = await gamificationController.recordActivity(mockUser1, {
        activityType: 'study_session',
        timestamp: '2026-10-10T08:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      });

      expect(res1.currentStreak).toBe(1);
      expect(res1.longestStreak).toBe(1);
      expect(res1.totalActiveDays).toBe(1);

      // Activity 2 on Day 1 (2 hours later)
      const res2 = await gamificationController.recordActivity(mockUser1, {
        activityType: 'quiz',
        timestamp: '2026-10-10T10:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      });

      // Streak MUST remain 1, anti-replay verified
      expect(res2.currentStreak).toBe(1);
      expect(res2.longestStreak).toBe(1);
      expect(res2.totalActiveDays).toBe(1);
      expect(res2.history[0]?.activityCount).toBe(2);

      // Activity 3 on Day 1 (evening: 12:00 UTC = 19:00 VN)
      const res3 = await gamificationController.recordActivity(mockUser1, {
        activityType: 'flashcard',
        timestamp: '2026-10-10T12:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      });

      expect(res3.currentStreak).toBe(1);
      expect(res3.history[0]?.activityCount).toBe(3);
    });

    it('increments streak on consecutive days and resets after a calendar day is missed', async () => {
      // Day 1
      await gamificationController.recordActivity(mockUser1, {
        timestamp: '2026-10-10T08:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      });

      // Day 2 (Consecutive)
      const resDay2 = await gamificationController.recordActivity(mockUser1, {
        timestamp: '2026-10-11T09:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      });
      expect(resDay2.currentStreak).toBe(2);
      expect(resDay2.longestStreak).toBe(2);

      // Day 3 (Consecutive)
      const resDay3 = await gamificationController.recordActivity(mockUser1, {
        timestamp: '2026-10-12T07:30:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      });
      expect(resDay3.currentStreak).toBe(3);
      expect(resDay3.longestStreak).toBe(3);

      // Day 4 MISSED!
      // Day 5 Activity (gap of 2 days: 2026-10-12 -> 2026-10-14)
      const resDay5 = await gamificationController.recordActivity(mockUser1, {
        timestamp: '2026-10-14T08:00:00Z',
        timezone: 'Asia/Ho_Chi_Minh',
      });

      // Streak must reset to 1 because Oct 13 was missed, but longest streak preserves 3!
      expect(resDay5.currentStreak).toBe(1);
      expect(resDay5.longestStreak).toBe(3);
    });

    it('accurately resolves local date according to user timezone across day boundaries', () => {
      // UTC: 2026-10-15 16:30:00
      // In Asia/Ho_Chi_Minh (UTC+7): 23:30 on 2026-10-15
      // In Asia/Tokyo (UTC+9): 01:30 on 2026-10-16
      const timestamp = new Date('2026-10-15T16:30:00Z');

      const vnDate = getLocalDateForTimezone(timestamp, 'Asia/Ho_Chi_Minh');
      const tokyoDate = getLocalDateForTimezone(timestamp, 'Asia/Tokyo');

      expect(vnDate).toBe('2026-10-15');
      expect(tokyoDate).toBe('2026-10-16');
    });
  });

  describe('Achievements & Badges (GAME-02, GAME-03)', () => {
    it('GAME-02: automatically unlocks first_exam badge when completing an exam', async () => {
      await gamificationController.recordActivity(mockUser1, {
        activityType: 'exam',
      });

      const achievements = await gamificationController.getMyAchievements(mockUser1);
      const firstExamBadge = achievements.find((a) => a.id === 'first_exam');

      expect(firstExamBadge).toBeDefined();
      expect(firstExamBadge?.unlocked).toBe(true);
      expect(firstExamBadge?.unlockedAt).toBeDefined();
    });

    it('GAME-03: unlocks streak_7 badge when streak reaches 7 days', async () => {
      // Simulate 7 consecutive days
      for (let i = 1; i <= 7; i++) {
        const dayStr = i < 10 ? `0${i}` : `${i}`;
        await gamificationController.recordActivity(mockUser1, {
          activityType: 'study_session',
          timestamp: `2026-10-${dayStr}T10:00:00Z`,
          timezone: 'Asia/Ho_Chi_Minh',
        });
      }

      const streak = await gamificationController.getMyStreak(mockUser1);
      expect(streak.longestStreak).toBe(7);

      const achievements = await gamificationController.getMyAchievements(mockUser1);
      const streak7Badge = achievements.find((a) => a.id === 'streak_7');
      expect(streak7Badge?.unlocked).toBe(true);
    });

    it('shares achievement with pseudonymous token and no PII leak', async () => {
      // Unlock first
      await gamificationService.unlockAchievement(user1Id, 'first_exam');

      const share = await gamificationController.shareAchievement(mockUser1, {
        achievementId: 'first_exam',
      });

      expect(share.shareToken).toHaveLength(32);
      expect(share.pseudonymousUser).toBe(`Học viên #${user1Id.slice(0, 8)}`);
      expect(share.expiresAt).toBeDefined();
      expect(share).not.toHaveProperty('email');
      expect(share).not.toHaveProperty('name');
    });
  });

  describe('Acceptance 5: Voluntary separate leaderboards (GAME-04)', () => {
    it('strictly separates leaderboards across incomparable conditions (different levels and periods)', async () => {
      // Opt in both users
      await gamificationController.updateOptIn(mockUser1, { optIn: true, displayName: 'Minh Pro' });
      await gamificationController.updateOptIn(mockUser2, { optIn: true, displayName: 'Kenji Master' });

      // Record User 1 in N3 weekly
      await gamificationService.recordLeaderboardScore(user1Id, 850, 'N3', 'weekly');
      // Record User 2 in N2 weekly
      await gamificationService.recordLeaderboardScore(user2Id, 920, 'N2', 'weekly');
      // Record User 1 in N3 monthly
      await gamificationService.recordLeaderboardScore(user1Id, 2500, 'N3', 'monthly');

      // Query N3 weekly
      const n3Weekly = await gamificationController.getLeaderboard({ level: 'N3', period: 'weekly' });
      expect(n3Weekly).toHaveLength(1);
      expect(n3Weekly[0]?.userId).toBe(user1Id);
      expect(n3Weekly[0]?.score).toBe(850);
      expect(n3Weekly[0]?.displayName).toBe('Minh Pro');

      // Query N2 weekly: only User 2 should appear, never combined with N3!
      const n2Weekly = await gamificationController.getLeaderboard({ level: 'N2', period: 'weekly' });
      expect(n2Weekly).toHaveLength(1);
      expect(n2Weekly[0]?.userId).toBe(user2Id);
      expect(n2Weekly[0]?.score).toBe(920);

      // Query N3 monthly
      const n3Monthly = await gamificationController.getLeaderboard({ level: 'N3', period: 'monthly' });
      expect(n3Monthly).toHaveLength(1);
      expect(n3Monthly[0]?.score).toBe(2500);
    });

    it('enforces voluntary opt-in: users who do not opt in are strictly excluded from public leaderboard', async () => {
      // User 1 opts in
      await gamificationController.updateOptIn(mockUser1, { optIn: true, displayName: 'Opted In Learner' });
      // User 2 does NOT opt in (default false)
      await gamificationController.updateOptIn(mockUser2, { optIn: false });

      await gamificationService.recordLeaderboardScore(user1Id, 500, 'N3', 'weekly');
      await gamificationService.recordLeaderboardScore(user2Id, 9999, 'N3', 'weekly'); // higher score, but not opted in!

      const leaderboard = await gamificationController.getLeaderboard({ level: 'N3', period: 'weekly' });

      // User 2 MUST NOT appear on public leaderboard!
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0]?.userId).toBe(user1Id);
      expect(leaderboard[0]?.displayName).toBe('Opted In Learner');
    });
  });

  describe('Challenges (GAME-05)', () => {
    it('lists available 7, 30, and 60 day challenges and tracks progress upon joining', async () => {
      const list = await gamificationController.listChallenges(mockUser1);
      expect(list.length).toBeGreaterThanOrEqual(3);

      const challenge7 = list.find((c) => c.targetGoal === 7);
      expect(challenge7).toBeDefined();

      // Join 7-day challenge
      const joined = await gamificationController.joinChallenge(mockUser1, challenge7!.id);
      expect(joined.enrolled).toBe(true);
      expect(joined.progress).toBe(0);

      // Update progress
      const updated = await gamificationService.updateChallengeProgress(user1Id, challenge7!.id, 7);
      expect(updated.progress).toBe(7);
      expect(updated.isCompleted).toBe(true);

      const listAfter = await gamificationController.listChallenges(mockUser1);
      const after = listAfter.find((c) => c.id === challenge7!.id);
      expect(after?.isCompleted).toBe(true);
    });
  });

  describe('Class / Cohort Statistics (GAME-10)', () => {
    it('aggregates active streaks, average streak, and top achievements for enrolled class members', async () => {
      // 1. Create Organization and Teacher
      const teacherId = generateUuidV7();
      await dbClient.db.insert(users).values({
        id: teacherId,
        email: `teacher-${teacherId}@jlpt.test`,
        name: 'Sensei Tanaka',
        role: 'teacher',
      });

      const orgId = generateUuidV7();
      await dbClient.db.insert(organizations).values({
        id: orgId,
        name: 'Tokyo JLPT Academy',
        slug: `org-${orgId}`,
        createdAt: new Date(),
      });

      await dbClient.db.insert(orgMemberships).values({
        id: generateUuidV7(),
        orgId,
        userId: teacherId,
        role: 'teacher',
      });

      // 2. Create Class
      const classId = generateUuidV7();
      await dbClient.db.insert(classes).values({
        id: classId,
        orgId,
        teacherId,
        name: 'JLPT N3 Fast-Track Fall 2026',
        level: 'N3',
      });

      // 3. Enroll User 1 and User 2
      await dbClient.db.insert(classMemberships).values({
        id: generateUuidV7(),
        classId,
        studentId: user1Id,
        joinedAt: new Date(),
      });
      await dbClient.db.insert(classMemberships).values({
        id: generateUuidV7(),
        classId,
        studentId: user2Id,
        joinedAt: new Date(),
      });

      // User 1 has 3-day streak ending today
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

      await gamificationController.recordActivity(mockUser1, { timestamp: twoDaysAgo.toISOString() });
      await gamificationController.recordActivity(mockUser1, { timestamp: yesterday.toISOString() });
      await gamificationController.recordActivity(mockUser1, { timestamp: now.toISOString() });

      // User 2 has 1-day streak on today
      await gamificationController.recordActivity(mockUser2, { timestamp: now.toISOString() });

      // Both unlocked first_exam
      await gamificationService.unlockAchievement(user1Id, 'first_exam');
      await gamificationService.unlockAchievement(user2Id, 'first_exam');

      // User 1 unlocked weekly_goal
      await gamificationService.unlockAchievement(user1Id, 'weekly_goal');

      const stats = await gamificationController.getClassStats(classId);

      expect(stats.totalLearners).toBe(2);
      expect(stats.activeStreakCount).toBe(2);
      expect(stats.averageStreak).toBe(2); // (3 + 1) / 2 = 2.0
      expect(stats.topAchievements.length).toBeGreaterThan(0);
      expect(stats.topAchievements[0]?.id).toBe('first_exam');
      expect(stats.topAchievements[0]?.count).toBe(2);
      expect(stats.totalSessionsCompleted).toBe(4); // 3 (User 1) + 1 (User 2) = 4
    });
  });
});
