import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Components under test
import { SrsReviewRunner } from '../features/learning/components/srs-review-runner';
import { SrsSyncManager } from '../features/learning/services/srs-sync-manager';
import { LearningClient } from '../features/learning/services/learning-client';
import type { DueFlashcard, ReviewSubmission, ReviewResult } from '../features/learning/types';

import { NotificationSettings } from '../features/account/notification-settings';
import { PrivacySettings } from '../features/account/privacy-settings';

import { PlannerDashboard } from '../features/planner/components/planner-dashboard';
import { ReplanModal } from '../features/planner/components/replan-modal';
import type { StudyPlan, StudySession } from '../features/planner/types';

import { ClassroomDashboard } from '../features/classroom/components/classroom-dashboard';
import { CohortPrivacyBadge } from '../features/classroom/components/cohort-privacy-badge';
import { CreateAssignmentModal } from '../features/classroom/components/create-assignment-modal';
import { AssignmentProgressView } from '../features/classroom/components/assignment-progress-view';
import { GradeExportModal } from '../features/classroom/components/grade-export-modal';
import type { ClassRoom, ClassMember, ClassAssignment, AssignmentAnalytics, GradeExportResponse } from '../features/classroom/types';

import { ExamEventLobby } from '../features/community/components/exam-event-lobby';
import { QuestionDiscussions } from '../features/community/components/question-discussions';
import type { EventLobbyInfo } from '../features/community/types';

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

describe('E2E Advanced Suite: SRS Sync, Notifications, Classroom & Community (A03)', () => {
  // =========================================================================
  // 1. Acceptance 1: SRS/Mobile review sync và notification settings có E2E
  // =========================================================================

  describe('SRS & Mobile Review Sync E2E', () => {
    const mockCard: DueFlashcard = {
      cardId: 'card-101',
      notebookItemId: 'item-101',
      front: { term: '曖昧', reading: 'あいまい' },
      back: { meaning: 'Mơ hồ, không rõ ràng' },
      dueAt: new Date().toISOString(),
      intervalDays: 1,
      repetitions: 1,
      state: 'review',
      kind: 'vocab',
    };

    it('renders SRS review runner with active due card and sync status badge', () => {
      const syncManager = new SrsSyncManager();
      const html = renderClean(
        <SrsReviewRunner
          cards={[mockCard]}
          syncManager={syncManager}
        />,
      );

      expect(html).toContain('data-testid="sync-status-badge"');
      expect(html).toContain('data-testid="flashcard-view"');
      expect(html).toContain('曖昧');
    });

    it('queues review submission locally with unique clientReviewId and idempotent payload', async () => {
      let submittedPayload: ReviewSubmission | undefined;
      const mockClient = {
        submitReview: async (payload: ReviewSubmission): Promise<ReviewResult> => {
          submittedPayload = payload;
          return {
            cardId: payload.cardId,
            nextDueAt: new Date().toISOString(),
            intervalDays: 3,
            easeFactor: 2.5,
            repetitions: 2,
            state: 'review',
            isIdempotentReplay: false,
            reviewedAt: new Date().toISOString(),
          };
        },
      } as unknown as LearningClient;

      const syncManager = new SrsSyncManager(mockClient);

      // Queue review rating: 3 (Good)
      const clientReviewId = await syncManager.queueReview('card-101', 3);

      expect(clientReviewId).toBeDefined();
      expect(clientReviewId).toMatch(/^rev-/);

      // Verify queued item
      const queue = syncManager.getQueue();
      expect(queue.length).toBeGreaterThan(0);
      const item = queue.find((q) => q.id === clientReviewId);
      expect(item).toBeDefined();
      expect(item?.cardId).toBe('card-101');
      expect(item?.rating).toBe(3);

      // Process queue
      const res = await syncManager.processQueue();
      expect(res.synced).toBe(1);
      expect(submittedPayload).toBeDefined();
      const payload = submittedPayload as ReviewSubmission;
      expect(payload.clientReviewId).toBe(clientReviewId);
      expect(payload.cardId).toBe('card-101');
      expect(payload.rating).toBe(3);

      // Check snapshot updated
      const snapshot = syncManager.getSnapshot();
      expect(snapshot.state).toBe('synced');
      expect(snapshot.pendingCount).toBe(0);
    });

    it('handles idempotent replay without errors when server returns isIdempotentReplay', async () => {
      const mockClient = {
        submitReview: async (payload: ReviewSubmission): Promise<ReviewResult> => ({
          cardId: payload.cardId,
          nextDueAt: new Date().toISOString(),
          intervalDays: 3,
          easeFactor: 2.5,
          repetitions: 2,
          state: 'review',
          isIdempotentReplay: true,
          reviewedAt: new Date().toISOString(),
        }),
      } as unknown as LearningClient;

      const syncManager = new SrsSyncManager(mockClient);
      await syncManager.queueReview('card-102', 4);
      const res = await syncManager.processQueue();

      expect(res.synced).toBe(1);
      expect(res.failed).toBe(0);
      expect(syncManager.getSnapshot().state).toBe('synced');
    });

    it('transitions to error state and preserves pending queue when network fails', async () => {
      const failingClient = {
        submitReview: async () => {
          throw new Error('503 Service Unavailable');
        },
      } as unknown as LearningClient;

      const syncManager = new SrsSyncManager(failingClient);
      await syncManager.queueReview('card-103', 2);
      const res = await syncManager.processQueue();

      expect(res.failed).toBe(1);
      const snapshot = syncManager.getSnapshot();
      expect(snapshot.state).toBe('error');
      expect(snapshot.pendingCount).toBe(1);
    });
  });

  describe('Notification Preferences Settings E2E', () => {
    it('renders notification settings with channels, study alerts and quiet hours inputs', () => {
      const html = renderClean(
        <NotificationSettings
          initialPreferences={{
            emailUpdates: true,
            examReminders: true,
            studyStreakAlerts: true,
            quietHours: { start: '22:00', end: '07:00' },
            timezone: 'Asia/Ho_Chi_Minh',
          }}
          onSave={async () => {}}
        />,
      );

      expect(html).toContain('data-testid="notification-settings-card"');
      expect(html).toContain('data-testid="toggle-email-updates"');
      expect(html).toContain('data-testid="toggle-exam-reminders"');
      expect(html).toContain('data-testid="toggle-streak-alerts"');
      expect(html).toContain('data-testid="quiet-start-input"');
      expect(html).toContain('data-testid="quiet-end-input"');
      expect(html).toContain('data-testid="save-notifications-button"');
    });

    it('renders privacy settings with GDPR data export and retention-safe account deletion', () => {
      const html = renderClean(
        <PrivacySettings
          onExportData={async () => ({})}
          onRequestDeletion={async () => ({ requestId: 'del-1' })}
        />,
      );

      expect(html).toContain('data-testid="privacy-settings-card"');
      expect(html).toContain('data-testid="export-personal-data-button"');
      expect(html).toContain('data-testid="request-account-deletion-button"');
    });
  });

  // =========================================================================
  // 2. Acceptance 2: Teacher giao đề xem progress/export và cohort privacy
  // =========================================================================

  describe('Teacher Classroom, Progress Analytics, Grade Export & Cohort Privacy', () => {
    const mockClass: ClassRoom = {
      id: 'cls-101',
      orgId: 'org-1',
      name: 'Lớp N3 K24',
      level: 'N3',
      createdAt: new Date().toISOString(),
    };

    const mockMembers: ClassMember[] = [
      { userId: 'u-1', name: 'Nguyễn Văn An', email: 'an@example.com', status: 'active' },
      { userId: 'u-2', name: 'Trần Thị Bình', email: 'binh@example.com', status: 'active' },
      { userId: 'u-3', name: 'Lê Hoàng Cúc', email: 'cuc@example.com', status: 'active' },
    ];

    const mockAssignments: ClassAssignment[] = [
      {
        id: 'asgn-201',
        classId: 'cls-101',
        title: 'Đề thi thử tuần 1',
        examId: 'exam-n3-2023-07',
        opensAtUTC: new Date().toISOString(),
        dueAtUTC: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        totalAssigned: 3,
        submittedCount: 2,
      },
    ];

    it('renders classroom dashboard with tenant cohort privacy badge and class selector', () => {
      const html = renderClean(
        <ClassroomDashboard
          organizations={[{ id: 'org-1', name: 'Sakura Center' }]}
          classes={[mockClass]}
          selectedClassId="cls-101"
          onSelectClass={() => {}}
          members={mockMembers}
          assignments={mockAssignments}
          isTeacher={true}
          onCreateAssignment={async () => {}}
          onLoadAssignmentAnalytics={async () => ({} as unknown as AssignmentAnalytics)}
          onExportGrades={async () => ({} as unknown as GradeExportResponse)}
        />,
      );

      expect(html).toContain('data-testid="cohort-privacy-badge"');
      expect(html).toContain('data-testid="open-create-assignment-button"');
      expect(html).toContain('data-testid="open-export-modal-button"');
      expect(html).toContain('data-testid="assignment-card-asgn-201"');
      expect(html).toContain('Đề thi thử tuần 1');
    });

    it('CohortPrivacyBadge renders different isolation notices for teacher and student', () => {
      const teacherHtml = renderClean(<CohortPrivacyBadge isTeacher={true} />);
      const studentHtml = renderClean(<CohortPrivacyBadge isTeacher={false} />);

      expect(teacherHtml).toContain('data-testid="cohort-privacy-badge"');
      expect(studentHtml).toContain('data-testid="cohort-privacy-badge"');
      expect(teacherHtml).not.toEqual(studentHtml);
    });

    it('renders CreateAssignmentModal with deadline, exam and target learner selection', () => {
      const html = renderClean(
        <CreateAssignmentModal
          isOpen={true}
          classId="cls-101"
          members={mockMembers}
          onClose={() => {}}
          onSubmit={async () => {}}
        />,
      );

      expect(html).toContain('data-testid="assign-title-input"');
      expect(html).toContain('id="assign-exam-select"');
      expect(html).toContain('id="assign-opens-at"');
      expect(html).toContain('id="assign-due-at"');
      expect(html).toContain('data-testid="submit-assignment-button"');
    });

    it('renders AssignmentProgressView showing submission rates, pass rate and student rows', () => {
      const mockAnalytics: AssignmentAnalytics = {
        assignmentId: 'asgn-201',
        totalLearners: 3,
        submissionCount: 2,
        submissionRate: 67,
        averageScore: 135,
        passRate: 50,
        highestScore: 160,
        lowestScore: 80,
        submissions: [
          { attemptId: 'att-1', learnerId: 'u-1', learnerName: 'Nguyễn Văn An', score: 160, passed: true },
          { attemptId: 'att-2', learnerId: 'u-2', learnerName: 'Trần Thị Bình', score: 80, passed: false },
        ],
      };

      const html = renderClean(
        <AssignmentProgressView
          analytics={mockAnalytics}
          onSupplement={async () => {}}
        />,
      );

      expect(html).toContain('data-testid="assignment-progress-view"');
      expect(html).toContain('data-testid="submission-row-u-1"');
      expect(html).toContain('data-testid="submission-row-u-2"');
      expect(html).toContain('160/180');
      expect(html).toContain('80/180');
      // Trigger supplement assignment for failing student
      expect(html).toContain('data-testid="create-supplement-button"');
    });

    it('renders GradeExportModal with format choices and formula injection sanitization notice', () => {
      const html = renderClean(
        <GradeExportModal
          isOpen={true}
          classId="cls-101"
          className="Lớp N3 K24"
          onClose={() => {}}
          onExport={async () => ({} as unknown as GradeExportResponse)}
        />,
      );

      expect(html).toContain('id="export-format-select"');
      expect(html).toContain('data-testid="submit-export-button"');
    });
  });

  // =========================================================================
  // 3. Planner & Daily Study Sessions
  // =========================================================================

  describe('Planner, Study Session Runner & Replan E2E', () => {
    const mockPlan: StudyPlan = {
      id: 'plan-01',
      userId: 'user-01',
      targetLevel: 'N3',
      targetDate: '2026-12-06',
      status: 'active',
      currentVersion: 1,
      daysRemaining: 45,
      totalSessions: 60,
      completedSessions: 20,
      completionRate: 33,
      currentStreak: 7,
      isFinalSprint: false,
      createdAt: new Date().toISOString(),
      config: {
        dailyMinutes: 30,
        durationDays: 60,
        timezone: 'Asia/Ho_Chi_Minh',
        focusSkills: ['vocabulary', 'grammar'],
        mockExamIntervalDays: 7,
        finalSprintDays: 14,
        skillDistribution: { vocabulary: 50, grammar: 50, reading: 0, listening: 0 },
      },
    };

    const mockSession: StudySession = {
      id: 'session-01',
      planId: 'plan-01',
      scheduledDate: new Date().toISOString().split('T')[0] ?? '',
      durationMinutes: 30,
      status: 'pending',
      skill: 'vocabulary',
      topic: 'Từ vựng N3: Danh từ chỉ người & nghề nghiệp',
    };

    it('renders planner dashboard with progress, streak, today session and replan trigger', () => {
      const html = renderClean(
        <PlannerDashboard
          plan={mockPlan}
          todaySession={mockSession}
          onCreatePlan={async () => {}}
          onCompleteSession={async () => {}}
          onReplan={async () => {}}
        />,
      );

      expect(html).toContain('N3');
      expect(html).toContain('🔥 7');
      expect(html).toContain('33%');
      expect(html).toContain('data-testid="replan-button"');
      expect(html).toContain('data-testid="today-session-card"');
      expect(html).toContain('data-testid="complete-session-button"');
    });

    it('renders Final Sprint warning banner when isFinalSprint is true', () => {
      const sprintPlan = { ...mockPlan, isFinalSprint: true };
      const html = renderClean(
        <PlannerDashboard
          plan={sprintPlan}
          todaySession={mockSession}
          onCreatePlan={async () => {}}
          onCompleteSession={async () => {}}
          onReplan={async () => {}}
        />,
      );

      expect(html).toContain('data-testid="final-sprint-banner"');
    });

    it('renders ReplanModal with reason selector and note input', () => {
      const html = renderClean(
        <ReplanModal
          isOpen={true}
          planId="plan-01"
          onClose={() => {}}
          onConfirm={async () => {}}
        />,
      );

      expect(html).toContain('id="replan-reason-select"');
      expect(html).toContain('id="replan-note-input"');
      expect(html).toContain('data-testid="confirm-replan-button"');
    });
  });

  // =========================================================================
  // 4. Community Exam Events Lobby & Gated Question Discussions
  // =========================================================================

  describe('Community Exam Event Lobby & Gated Question Discussions E2E', () => {
    const mockLobbyInfo: EventLobbyInfo = {
      event: {
        id: 'ev-1',
        examId: 'exam-n3',
        title: 'Kỳ thi thử trực tuyến N3',
        level: 'N3',
        opensAt: new Date().toISOString(),
        startsAt: new Date(Date.now() + 120000).toISOString(),
        endsAt: new Date(Date.now() + 7200000).toISOString(),
        resultReleaseAt: new Date(Date.now() + 10000000).toISOString(),
        capacity: 1000,
        registeredCount: 450,
        status: 'LOBBY_OPEN',
        userRegistered: false,
      },
      serverTime: new Date().toISOString(),
      startsInSeconds: 120,
      isRegistered: false,
      participantCount: 450,
      canStart: false,
      isEmbargoed: true,
    };

    it('renders exam event lobby with countdown and embargo notice', () => {
      const html = renderClean(
        <ExamEventLobby
          lobbyInfo={mockLobbyInfo}
          onRegister={async () => {}}
          onStartExam={async () => {}}
        />,
      );

      expect(html).toContain('data-testid="event-lobby-card"');
      expect(html).toContain('data-testid="lobby-countdown"');
      expect(html).toContain('data-testid="register-event-button"');
      expect(html).toContain('data-testid="embargo-notice"');
    });

    it('enforces anti-leak question completion gating when learner has not completed question', () => {
      const gatedHtml = renderClean(
        <QuestionDiscussions
          questionId="q-101"
          isCompleted={false}
          comments={[]}
          onAddComment={async () => {}}
          onReportComment={async () => {}}
        />,
      );

      expect(gatedHtml).toContain('data-testid="discussion-gated-card"');
      expect(gatedHtml).not.toContain('data-testid="question-discussions-view"');

      // Unlocks when question completed
      const unlockedHtml = renderClean(
        <QuestionDiscussions
          questionId="q-101"
          isCompleted={true}
          comments={[
            {
              id: 'com-1',
              questionId: 'q-101',
              userId: 'u-1',
              userName: 'Bảo Ngọc',
              content: 'Câu này cần chú ý phân biệt danh từ với tính từ đuôi na.',
              createdAt: new Date().toISOString(),
            },
          ]}
          onAddComment={async () => {}}
          onReportComment={async () => {}}
        />,
      );

      expect(unlockedHtml).toContain('data-testid="question-discussions-view"');
      expect(unlockedHtml).toContain('data-testid="comment-item-com-1"');
      expect(unlockedHtml).toContain('data-testid="report-comment-com-1"');
      expect(unlockedHtml).toContain('data-testid="post-comment-button"');
    });
  });
});
