import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Providers } from '../app/providers';
import HomePage from '../app/page';
import LoginPage from '../app/(auth)/dang-nhap/page';
import RegisterPage from '../app/(auth)/dang-ky/page';
import ForgotPasswordPage from '../app/(auth)/quen-mat-khau/page';
import ResetPasswordPage from '../app/(auth)/dat-lai-mat-khau/page';
import AccountPage from '../app/(account)/tai-khoan/page';
import NotebookPage from '../app/(learning)/so-tay/page';
import PlannerPage from '../app/(planner)/ke-hoach/page';
import ClassroomPage from '../app/(classroom)/lop-hoc/page';
import ExamEventPage from '../app/(community)/su-kien/page';
import DiscussionsPage from '../app/(community)/thao-luan/page';
import { PlannerDashboard } from '../features/planner';
import { ClassroomDashboard } from '../features/classroom';
import { ExamEventLobby, QuestionDiscussions } from '../features/community';
import MembershipPage from '../app/(billing)/goi-thanh-vien/page';

const h = React.createElement;

describe('Web Application Accessibility (SYS-14 & WCAG 2.1 AA)', () => {
  it('Providers render skip link and primary landmarks', () => {
    const html = renderToString(
      h(Providers, null, h('div', null, 'Content')),
    );

    // Skip to content link
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('skip-link');

    // Landmarks
    expect(html).toContain('<header');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('<footer');
    expect(html).toContain('<nav');
  });

  it('HomePage contains heading hierarchy and responsive level cards', () => {
    const html = renderToString(
      h(Providers, null, h(HomePage)),
    );

    // H1 and H2 structure
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<h3');

    // 5 JLPT Levels
    expect(html).toContain('N1');
    expect(html).toContain('N2');
    expect(html).toContain('N3');
    expect(html).toContain('N4');
    expect(html).toContain('N5');
  });

  it('LoginPage forms have explicit label-input associations and autoComplete attributes', () => {
    const html = renderToString(
      h(Providers, null, h(LoginPage)),
    );

    expect(html).toContain('for="login-email"');
    expect(html).toContain('id="login-email"');
    expect(html).toMatch(/autocomplete="email"/i);

    expect(html).toContain('for="login-password"');
    expect(html).toContain('id="login-password"');
    expect(html).toMatch(/autocomplete="current-password"/i);

    expect(html).toContain('id="remember-me"');
  });

  it('RegisterPage forms associate all fields with labels and terms agreement', () => {
    const html = renderToString(
      h(Providers, null, h(RegisterPage)),
    );

    expect(html).toContain('for="register-name"');
    expect(html).toContain('id="register-name"');

    expect(html).toContain('for="register-email"');
    expect(html).toContain('id="register-email"');

    expect(html).toContain('for="register-password"');
    expect(html).toContain('id="register-password"');

    expect(html).toContain('for="register-confirm-password"');
    expect(html).toContain('id="register-confirm-password"');

    expect(html).toContain('id="agree-terms"');
  });

  it('ForgotPasswordPage provides clear accessible instructions and inputs', () => {
    const html = renderToString(
      h(Providers, null, h(ForgotPasswordPage)),
    );

    expect(html).toContain('for="forgot-email"');
    expect(html).toContain('id="forgot-email"');
    expect(html).toContain('type="submit"');
  });

  it('ResetPasswordPage includes accessible password fields', () => {
    const html = renderToString(
      h(Providers, null, h(ResetPasswordPage)),
    );

    expect(html).toContain('for="reset-new-password"');
    expect(html).toContain('id="reset-new-password"');
    expect(html).toContain('for="reset-confirm-password"');
    expect(html).toContain('id="reset-confirm-password"');
  });

  it('AccountPage includes accessible ARIA tablist, tabs, and tabpanels', () => {
    const html = renderToString(
      h(Providers, null, h(AccountPage)),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('for="target-level-select"');
    expect(html).toContain('id="target-level-select"');
  });

  it('NotebookPage includes accessible headings, search input, filters and ARIA tablist', () => {
    const html = renderToString(
      h(Providers, null, h(NotebookPage)),
    );

    expect(html).toContain('<h1');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('id="notebook-search"');
    expect(html).toContain('data-testid="export-csv-button"');
    expect(html).toContain('data-testid="add-item-button"');
  });

  it('PlannerPage provides accessible plan overview, streak indicator and today runner', () => {
    const emptyHtml = renderToString(
      h(Providers, null, h(PlannerPage)),
    );

    expect(emptyHtml).toContain('<h1');
    expect(emptyHtml).toContain('data-testid="planner-no-plan-card"');
    expect(emptyHtml).toContain('data-testid="create-plan-button"');

    const dashboardHtml = renderToString(
      h(Providers, null, h(PlannerDashboard, {
        plan: {
          id: 'plan-1',
          userId: 'u1',
          targetLevel: 'N2',
          targetDate: '2026-12-06',
          status: 'active',
          currentVersion: 1,
          daysRemaining: 45,
          totalSessions: 60,
          completedSessions: 15,
          completionRate: 25,
          currentStreak: 5,
          isFinalSprint: false,
          createdAt: '2026-01-01',
          config: {
            dailyMinutes: 45,
            durationDays: 60,
            timezone: 'Asia/Ho_Chi_Minh',
            focusSkills: ['vocabulary', 'grammar'],
            mockExamIntervalDays: 7,
            finalSprintDays: 14,
            skillDistribution: { vocabulary: 30, grammar: 30, reading: 20, listening: 20 },
          },
        },
        todaySession: {
          id: 'ses-1',
          planId: 'plan-1',
          scheduledDate: '2026-10-18',
          durationMinutes: 45,
          status: 'pending',
          sessionType: 'lesson',
          skill: 'grammar',
          topic: 'N2 Grammar Patterns',
        },
        onCreatePlan: async () => {},
        onCompleteSession: async () => {},
        onReplan: async () => {},
      })),
    );

    expect(dashboardHtml).toContain('data-testid="today-session-card"');
    expect(dashboardHtml).toContain('data-testid="replan-button"');
    expect(dashboardHtml).toContain('data-testid="reminder-settings-card"');
  });

  it('ClassroomPage provides accessible cohort privacy badge, class selector and tabs', () => {
    const emptyHtml = renderToString(
      h(Providers, null, h(ClassroomPage)),
    );

    expect(emptyHtml).toContain('<h1');
    expect(emptyHtml).toContain('Gia nhập lớp học bằng mã mời:');

    const dashboardHtml = renderToString(
      h(Providers, null, h(ClassroomDashboard, {
        organizations: [{ id: 'org-1', name: 'Tokyo Japanese Center', role: 'teacher', createdAt: '2026-01-01' }],
        classes: [{ id: 'c-1', orgId: 'org-1', name: 'N2 Shinkanzen Intensive', level: 'N2', createdAt: '2026-01-01' }],
        selectedClassId: 'c-1',
        members: [],
        assignments: [],
        onSelectClass: () => {},
        onCreateAssignment: async () => {},
        onLoadAssignmentAnalytics: async () => ({
          assignmentId: 'a1',
          totalLearners: 20,
          submissionCount: 15,
          submissionRate: 75,
          averageScore: 82,
          passRate: 80,
          highestScore: 98,
          lowestScore: 65,
          submissions: [],
        }),
        onExportGrades: async (_classId, format) => ({
          className: 'N2 Shinkanzen Intensive',
          level: 'N2',
          exportedAt: '2026-10-17T00:00:00Z',
          format,
          rowCount: 0,
          items: [],
        }),
        onSupplementAssignment: async () => {},
      })),
    );

    expect(dashboardHtml).toContain('data-testid="cohort-privacy-badge"');
    expect(dashboardHtml).toContain('id="select-class-dropdown"');
    expect(dashboardHtml).toContain('role="tablist"');
    expect(dashboardHtml).toContain('data-testid="open-create-assignment-button"');
    expect(dashboardHtml).toContain('data-testid="open-export-modal-button"');
  });

  it('ExamEventPage provides accessible event countdown, lobby card and registration controls', () => {
    const emptyHtml = renderToString(
      h(Providers, null, h(ExamEventPage)),
    );

    expect(emptyHtml).toContain('<h1');

    const lobbyHtml = renderToString(
      h(Providers, null, h(ExamEventLobby, {
        lobbyInfo: {
          event: {
            id: 'event-mock',
            title: 'Sự kiện thi thử N2 Toàn Quốc',
            examId: 'n2-mock-1',
            level: 'N2',
            opensAt: '2026-12-01T07:00:00Z',
            startsAt: '2026-12-01T08:00:00Z',
            endsAt: '2026-12-01T11:00:00Z',
            resultReleaseAt: '2026-12-01T12:00:00Z',
            capacity: 5000,
            status: 'UPCOMING',
          },
          serverTime: '2026-12-01T07:30:00Z',
          startsInSeconds: 1800,
          isRegistered: false,
          participantCount: 1420,
          canStart: false,
          isEmbargoed: true,
        },
        leaderboard: [],
        onRegister: async () => {},
        onStartExam: async () => {},
      })),
    );

    expect(lobbyHtml).toContain('data-testid="event-lobby-card"');
    expect(lobbyHtml).toContain('data-testid="lobby-countdown"');
    expect(lobbyHtml).toContain('data-testid="embargo-notice"');
  });

  it('DiscussionsPage provides accessible comment thread and gated completion controls', () => {
    const emptyHtml = renderToString(
      h(Providers, null, h(DiscussionsPage)),
    );

    expect(emptyHtml).toContain('<h1');
    expect(emptyHtml).toContain('data-testid="discussion-gated-card"');

    const discussionsHtml = renderToString(
      h(Providers, null, h(QuestionDiscussions, {
        questionId: 'q-sample',
        isCompleted: true,
        comments: [],
        onAddComment: async () => {},
        onReportComment: async () => {},
      })),
    );

    expect(discussionsHtml).toContain('data-testid="question-discussions-view"');
    expect(discussionsHtml).toContain('id="discussion-comment-input"');
    expect(discussionsHtml).toContain('data-testid="post-comment-button"');
  });

  it('MembershipPage provides accessible pricing matrix, coupon input and checkout summary', () => {
    const html = renderToString(
      h(Providers, null, h(MembershipPage)),
    );

    expect(html).toContain('<h1');
    expect(html).toContain('data-testid="pricing-table"');
    expect(html).toContain('data-testid="coupon-code-input"');
    expect(html).toContain('data-testid="apply-coupon-button"');
    expect(html).toContain('data-testid="checkout-card"');
    expect(html).toContain('data-testid="confirm-checkout-button"');
  });
});
