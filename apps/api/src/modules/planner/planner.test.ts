import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { users } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { PlannerController } from './planner.controller.js';
import {
  calculateDaysRemaining,
  computeSkillDistribution,
  getLocalDateString,
  PlannerService,
} from './planner.service.js';

function mockUser(userId: string): AuthUserContext {
  return {
    userId,
    email: `planner-${userId}@jlpt.local`,
    name: 'Planner Learner',
    role: 'student',
    sessionId: 'test-session-id',
    sessionToken: 'test-session-token',
    emailVerified: true,
    tenantId: 'default',
  };
}

describe('L05: Planner Module Tests (PLAN-01..11, Acceptance 2)', () => {
  let dbClient: DbClientInstance;
  let plannerService: PlannerService;
  let plannerController: PlannerController;

  const testUserId = generateUuidV7();

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    await dbClient.db.insert(users).values({
      id: testUserId,
      email: `planner-${testUserId}@jlpt.local`,
      name: 'Planner Learner',
      role: 'user',
    });

    plannerService = new PlannerService(dbClient);
    plannerController = new PlannerController(plannerService);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // Acceptance 2: Timezone goal dates và missed-session replanning có deterministic tests
  // ---------------------------------------------------------------------------
  describe('Acceptance 2: Timezone goal dates và missed-session replanning có deterministic tests', () => {
    it('calculates goal date countdown deterministically across different timezones', () => {
      const examDate = '2026-12-06';

      // Fixed point in time: 2026-10-16T18:30:00Z
      // In UTC+7 (Asia/Ho_Chi_Minh): local time is Oct 17 01:30 -> countdown to Dec 06 is 50 days
      // In UTC-5 (America/New_York): local time is Oct 16 13:30 -> countdown to Dec 06 is 51 days
      const utcTime = new Date('2026-10-16T18:30:00Z');

      const daysHcm = calculateDaysRemaining(examDate, 'Asia/Ho_Chi_Minh', utcTime);
      const daysNy = calculateDaysRemaining(examDate, 'America/New_York', utcTime);

      expect(daysHcm).toBe(50);
      expect(daysNy).toBe(51);

      // Repeat calculation: 100% deterministic
      expect(calculateDaysRemaining(examDate, 'Asia/Ho_Chi_Minh', utcTime)).toBe(daysHcm);
      expect(calculateDaysRemaining(examDate, 'America/New_York', utcTime)).toBe(daysNy);
    });

    it('performs deterministic missed-session replanning without mutating completed sessions (PLAN-10)', async () => {
      // 1. Create a 30-day study plan starting on 2026-10-01
      const plan = await plannerService.createStudyPlan(testUserId, {
        targetLevel: 'N3',
        targetDate: '2026-12-06',
        dailyMinutes: 30,
        durationDays: 30,
        timezone: 'Asia/Ho_Chi_Minh',
        startDate: '2026-10-01',
      });

      expect(plan.currentVersion).toBe(1);
      expect(plan.sessions?.length).toBe(30);

      const session1 = plan.sessions![0]!; // 2026-10-01
      const session2 = plan.sessions![1]!; // 2026-10-02
      // session3 (2026-10-03) and session4 (2026-10-04) will be missed!

      // 2. User completes session 1 and session 2
      const comp1 = await plannerService.completeStudySession(testUserId, session1.id, {
        clientEventId: generateUuidV7(),
        completedAt: '2026-10-01T20:30:00.000Z',
      });
      expect(comp1.status).toBe('completed');

      const comp2 = await plannerService.completeStudySession(testUserId, session2.id, {
        clientEventId: generateUuidV7(),
        completedAt: '2026-10-02T20:30:00.000Z',
      });
      expect(comp2.status).toBe('completed');

      // 3. User skips studying on Oct 03, Oct 04, and resumes on Oct 05
      // asOfDate is '2026-10-05'
      const replanRes1 = await plannerService.replanMissedSessions(testUserId, plan.id, {
        asOfDate: '2026-10-05',
        reason: 'Bận công việc đầu tháng, học bù vào các ngày tiếp theo',
      });

      // 4. Verify replan outcome:
      // - Missed sessions count: exactly 2 sessions (Oct 03 and Oct 04)
      expect(replanRes1.missedSessionsCount).toBe(2);
      // - Total missed minutes: 2 * 30 = 60 minutes
      expect(replanRes1.redistributedMinutes).toBe(60);
      // - Previous version: 1, New version: 2
      expect(replanRes1.previousVersion).toBe(1);
      expect(replanRes1.newVersion).toBe(2);
      // - Remaining sessions count: 26 sessions (from Oct 05 to Oct 30)
      expect(replanRes1.remainingSessionsCount).toBe(26);

      // 5. Verify immutability of completed sessions:
      const updatedPlan = await plannerService.getStudyPlan(testUserId, plan.id);
      expect(updatedPlan.currentVersion).toBe(2);

      const s1After = updatedPlan.sessions!.find((s) => s.id === session1.id)!;
      const s2After = updatedPlan.sessions!.find((s) => s.id === session2.id)!;
      expect(s1After.status).toBe('completed');
      expect(s2After.status).toBe('completed');
      expect(s1After.durationMinutes).toBe(30); // Historical completed duration preserved!
      expect(s2After.durationMinutes).toBe(30);

      // Missed sessions marked as 'missed', NOT deleted
      const s3After = updatedPlan.sessions!.find((s) => s.scheduledDate === '2026-10-03')!;
      const s4After = updatedPlan.sessions!.find((s) => s.scheduledDate === '2026-10-04')!;
      expect(s3After.status).toBe('missed');
      expect(s4After.status).toBe('missed');

      // Future session duration increased by redistributed minutes
      const futureSession = updatedPlan.sessions!.find((s) => s.scheduledDate === '2026-10-05')!;
      expect(futureSession.status).toBe('pending');
      // 60 minutes redistributed across 26 sessions -> ceil(60/26) = 3 mins per session -> 33 mins
      expect(futureSession.durationMinutes).toBe(33);
    });
  });

  // ---------------------------------------------------------------------------
  // Features PLAN-01..09, PLAN-11
  // ---------------------------------------------------------------------------
  describe('Study Plan Creation, Roadmap, Weak-Skill Adjustment, and Reminders (PLAN-01..09, PLAN-11)', () => {
    it('creates 30 / 60 / 90 day roadmap with periodic mock exams (PLAN-01..05)', async () => {
      const plan30 = await plannerController.createStudyPlan(
        mockUser(testUserId),
        {
          targetLevel: 'N2',
          targetDate: '2026-12-06',
          dailyMinutes: 45,
          durationDays: 30,
          mockExamIntervalDays: 7,
        },
      );

      expect(plan30.targetLevel).toBe('N2');
      expect(plan30.config.dailyMinutes).toBe(45);
      expect(plan30.config.durationDays).toBe(30);
      expect(plan30.sessions?.length).toBe(30);

      // Verify periodic mock exams scheduled every 7 days (day 7, 14, 21, 28)
      const mockSessions = plan30.sessions!.filter((s) => s.sessionType === 'mock_exam');
      expect(mockSessions.length).toBe(4);
      expect(mockSessions[0]!.topic).toContain('Đề thi thử định kỳ');
    });

    it('rebalances study time distribution for weak skills (PLAN-06)', () => {
      // Balanced
      const balanced = computeSkillDistribution([]);
      expect(balanced.vocabulary).toBe(25);
      expect(balanced.reading).toBe(25);

      // Weak reading & listening
      const weakReading = computeSkillDistribution(['reading']);
      expect(weakReading.reading).toBe(50);
      expect(weakReading.vocabulary).toBe(17);
      expect(weakReading.grammar).toBe(17);
      expect(weakReading.listening).toBe(17);
    });

    it('returns today recommendations and flags final sprint phase when exam is within 7 days (PLAN-07, PLAN-11)', async () => {
      const today = getLocalDateString(new Date(), 'Asia/Ho_Chi_Minh');

      // Create plan where exam is in 5 days (final sprint!)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 5);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      await plannerService.createStudyPlan(testUserId, {
        targetLevel: 'N1',
        targetDate: targetDateStr,
        dailyMinutes: 60,
        durationDays: 30,
        startDate: today,
      });

      const todayRec = await plannerController.getTodaySessions(
        mockUser(testUserId),
        'Asia/Ho_Chi_Minh',
      );

      expect(todayRec.todayDate).toBe(today);
      expect(todayRec.targetLevel).toBe('N1');
      expect(todayRec.daysRemaining).toBeLessThanOrEqual(5);
      expect(todayRec.isFinalSprint).toBe(true); // Final sprint activated!
      expect(todayRec.sessions.length).toBeGreaterThan(0);
    });

    it('tracks completion rate, streak, and handles idempotent session completion (PLAN-08)', async () => {
      const plan = await plannerService.createStudyPlan(testUserId, {
        targetLevel: 'N4',
        targetDate: '2026-12-06',
        dailyMinutes: 20,
        durationDays: 30,
      });

      const session = plan.sessions![0]!;
      const clientEventId = generateUuidV7();

      // First completion
      const comp1 = await plannerController.completeStudySession(
        mockUser(testUserId),
        session.id,
        { clientEventId },
      );

      expect(comp1.status).toBe('completed');
      expect(comp1.isIdempotentReplay).toBe(false);
      expect(comp1.streak).toBeGreaterThanOrEqual(1);

      // Replay completion with identical clientEventId
      const comp2 = await plannerController.completeStudySession(
        mockUser(testUserId),
        session.id,
        { clientEventId },
      );

      expect(comp2.status).toBe('completed');
      expect(comp2.isIdempotentReplay).toBe(true); // Idempotent!
    });

    it('generates reminder notifications payload for scheduled daily study (PLAN-09)', async () => {
      const plan = await plannerService.createStudyPlan(testUserId, {
        targetLevel: 'N3',
        targetDate: '2026-12-06',
        dailyMinutes: 30,
        durationDays: 30,
      });

      const reminder = await plannerController.getPlanReminders(
        mockUser(testUserId),
        plan.id,
      );

      expect(reminder.planId).toBe(plan.id);
      expect(reminder.reminderTime).toBe('20:00');
      expect(reminder.title).toContain('JLPT N3');
      expect(reminder.body.length).toBeGreaterThan(0);
      expect(reminder.recommendedToday).toBeDefined();
    });
  });
});
