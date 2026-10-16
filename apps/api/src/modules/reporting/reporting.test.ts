import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { seedDatabase } from '../../db/seed.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { ReportingService } from './reporting.service.js';
import { ReportingController } from './reporting.controller.js';

describe('A04 Reporting System (REPORT-01..15, ADM-01, ADM-17)', () => {
  let dbClient: DbClientInstance;
  let service: ReportingService;
  let controller: ReportingController;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    await seedDatabase(dbClient);

    service = new ReportingService(dbClient);
    controller = new ReportingController(service);
  });

  afterEach(async () => {
    if (dbClient) {
      await dbClient.close();
    }
  });

  it('ADM-01: Dashboard tổng quan hệ thống trả về đầy đủ các chỉ số', async () => {
    const dashboard = await service.getDashboardOverview();
    expect(dashboard.totalUsers).toBeGreaterThanOrEqual(1);
    expect(dashboard.totalExams).toBeGreaterThanOrEqual(5);
    expect(dashboard.overallCompletionRate).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(dashboard.recentActivities)).toBe(true);
    expect(dashboard.recentActivities.length).toBeGreaterThan(0);
  });

  it('REPORT-01: Báo cáo người dùng mới theo ngày/tháng (Acquisition)', async () => {
    const u1 = generateUuidV7();
    const u2 = generateUuidV7();
    await dbClient.db.insert(schema.users).values([
      { id: u1, email: 'learner1@test.local', role: 'student', locale: 'vi' },
      { id: u2, email: 'learner2@test.local', role: 'student', locale: 'ja' },
    ]);

    const report = await service.getAcquisitionReport();
    expect(report.totalNewUsers).toBeGreaterThanOrEqual(3);
    expect(report.byPeriod.length).toBeGreaterThanOrEqual(1);
    expect(report.byRole['student']).toBeGreaterThanOrEqual(2);
    expect(report.byLocale['ja']).toBeGreaterThanOrEqual(1);
  });

  it('REPORT-02: Báo cáo người dùng hoạt động (DAU/MAU)', async () => {
    const report = await service.getActivityReport();
    expect(typeof report.dau).toBe('number');
    expect(typeof report.mau).toBe('number');
    expect(Array.isArray(report.dailyActiveUsers)).toBe(true);
  });

  it('REPORT-03 & REPORT-04: Tỷ lệ hoàn thành và bỏ dở bài thi (Completion & Abandonment)', async () => {
    const userId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: userId,
      email: 'exam_user@test.local',
      role: 'student',
    });

    const exams = await dbClient.db.select().from(schema.exams).limit(1);
    const examId = exams[0].id;

    // 1 attempt completed (submitted), 1 in progress
    await dbClient.db.insert(schema.examAttempts).values([
      {
        id: generateUuidV7(),
        userId,
        examId,
        examVersion: 1,
        mode: 'real',
        startedAt: new Date(Date.now() - 3600000),
        submittedAt: new Date(),
        status: 'submitted',
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        result: { score: 140, passed: true },
      },
      {
        id: generateUuidV7(),
        userId,
        examId,
        examVersion: 1,
        mode: 'practice',
        startedAt: new Date(Date.now() - 1800000),
        submittedAt: null,
        status: 'in_progress',
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
      },
    ]);

    const completion = await service.getExamCompletionReport();
    expect(completion.started).toBeGreaterThanOrEqual(2);
    expect(completion.completed).toBeGreaterThanOrEqual(1);
    expect(completion.inProgress).toBeGreaterThanOrEqual(1);
    expect(completion.completionRate).toBeGreaterThan(0);

    const abandonment = await service.getAbandonmentReport();
    expect(abandonment.abandoned).toBeGreaterThanOrEqual(1);
    expect(abandonment.abandonmentRate).toBeGreaterThan(0);
    expect(Math.round(completion.completionRate + abandonment.abandonmentRate)).toBe(100);
  });

  it('REPORT-05: Thống kê cấp độ được luyện nhiều nhất (Levels N1-N5)', async () => {
    const report = await service.getLevelsReport();
    expect(report.levels.length).toBeGreaterThanOrEqual(5);
    const levels = report.levels.map((l) => l.level);
    expect(levels).toContain('N1');
    expect(levels).toContain('N2');
    expect(levels).toContain('N3');
    expect(levels).toContain('N4');
    expect(levels).toContain('N5');
  });

  it('REPORT-06: Thống kê bộ đề phổ biến', async () => {
    const report = await service.getPopularExamsReport();
    expect(report.popularExams.length).toBeGreaterThanOrEqual(5);
    expect(report.popularExams[0]).toHaveProperty('title');
    expect(report.popularExams[0]).toHaveProperty('attempts');
    expect(report.popularExams[0]).toHaveProperty('avgScore');
  });

  it('REPORT-07: Thống kê thời gian sử dụng trung bình (Session Duration)', async () => {
    const report = await service.getSessionDurationReport();
    expect(report).toHaveProperty('avgDurationSeconds');
    expect(report).toHaveProperty('medianDurationSeconds');
    expect(report.distribution.length).toBe(4);
  });

  it('REPORT-08 & Acceptance 4: D7/D30 Retention hiển thị insufficient-data khi chưa đủ thời gian quan sát', async () => {
    const report = await service.getRetentionReport();

    // Acceptance 4: D7/D30 reports hiển thị insufficient-data thay số thật giả
    expect(report.dataStatus).toBe('insufficient_data');
    expect(report.summaryD7).toBeNull();
    expect(report.summaryD30).toBeNull();

    for (const cohort of report.cohorts) {
      if (cohort.daysSinceCohort < 7) {
        expect(cohort.d7Status).toBe('insufficient_data');
        expect(cohort.d7Rate).toBeNull();
      }
      if (cohort.daysSinceCohort < 30) {
        expect(cohort.d30Status).toBe('insufficient_data');
        expect(cohort.d30Rate).toBeNull();
      }
    }
    expect(report.message).toContain('insufficient-data');
  });

  it('REPORT-09: Phân tích phễu đăng ký và bắt đầu làm đề (Funnel Report)', async () => {
    const funnel = await service.getFunnelReport();
    expect(funnel.steps.length).toBe(4);
    expect(funnel.steps[0].step).toBe('registration');
    expect(funnel.steps[1].step).toBe('browse_exams');
    expect(funnel.steps[2].step).toBe('start_attempt');
    expect(funnel.steps[3].step).toBe('complete_attempt');
    expect(funnel.steps[0].conversionFromPrevious).toBe(100);
  });

  it('REPORT-10: Thống kê kết quả kiểm duyệt gói dữ liệu nhập', async () => {
    const report = await service.getContentReviewReport();
    expect(report).toHaveProperty('totalPackages');
    expect(report).toHaveProperty('byStatus');
    expect(report.byStatus).toHaveProperty('completed');
    expect(report.byStatus).toHaveProperty('failed');
    expect(Array.isArray(report.recentJobs)).toBe(true);
  });

  it('REPORT-11: Thống kê lỗi câu hỏi và audio (không có chỉ số nhận dạng PDF)', async () => {
    const report = await service.getContentIncidentsReport();
    expect(report).toHaveProperty('totalIncidents');
    expect(report).toHaveProperty('questionReportsCount');
    expect(report).toHaveProperty('audioIncidentsCount');
    expect(report.notes).toContain('Không tích hợp mô hình nhận dạng OCR/PDF');
  });

  it('REPORT-12: Thống kê sử dụng tính năng trộn đề (Mix Usage)', async () => {
    const userId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: userId,
      email: 'mix_student@test.local',
      role: 'student',
    });

    await dbClient.db.insert(schema.generatedExams).values({
      id: generateUuidV7(),
      ownerId: userId,
      configJson: { level: 'N2', mode: 'Balanced', questionCount: 40 },
      seed: 'seed-test-123',
      engineVersion: '1.0.0',
      selectionHash: 'hash-abc',
    });

    const report = await service.getMixUsageReport();
    expect(report.totalMixedExams).toBeGreaterThanOrEqual(1);
    expect(report.byLevel['N2']).toBeGreaterThanOrEqual(1);
    expect(report.byMode['Balanced']).toBeGreaterThanOrEqual(1);
    expect(report.avgQuestionCount).toBeGreaterThan(0);
  });

  it('REPORT-13 & Acceptance 2: Báo cáo chuyển đổi Free -> Premium khớp dữ liệu đơn hàng', async () => {
    const userId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: userId,
      email: 'paying_student@test.local',
      role: 'student',
    });

    await dbClient.db.insert(schema.orders).values({
      id: generateUuidV7(),
      userId,
      totalAmount: 199000,
      currency: 'VND',
      status: 'paid',
    });

    const report = await service.getConversionReport();
    expect(report.paidUsers).toBeGreaterThanOrEqual(1);
    expect(report.grossRevenueMinor).toBeGreaterThanOrEqual(199000);
    expect(report.netRevenueMinor).toBeGreaterThanOrEqual(199000);
    expect(report.conversionRate).toBeGreaterThan(0);
    expect(report.arpuMinor).toBeGreaterThan(0);
  });

  it('REPORT-14: Báo cáo chi phí AI và lưu trữ (Provider Costs)', async () => {
    const report = await service.getProviderCostsReport();
    expect(report).toHaveProperty('aiRequestsCount');
    expect(report).toHaveProperty('estimatedAiCostUsd');
    expect(report).toHaveProperty('storageSizeMb');
    expect(report).toHaveProperty('totalEstimatedCostVnd');
  });

  it('REPORT-15: Hiệu quả thử nghiệm A/B giao diện', async () => {
    await dbClient.db.insert(schema.experimentDefinitions).values({
      id: 'exp_onboarding_test',
      name: 'Thử nghiệm giao diện Onboarding Mới',
      variants: [{ key: 'control' }, { key: 'variant_b' }],
      isActive: true,
    });

    const report = await service.getExperimentPerformanceReport();
    expect(report.experiments.length).toBeGreaterThanOrEqual(1);
    const exp = report.experiments.find((e) => e.experimentId === 'exp_onboarding_test');
    expect(exp).toBeDefined();
    expect(exp?.variants.length).toBe(2);
    expect(exp?.hasStatisticalSignificance).toBe(false);
  });

  it('ADM-17: Xuất báo cáo CSV với bảo vệ Formula Injection', async () => {
    const csvLevels = await service.exportReportToCsv('levels');
    expect(csvLevels).toContain('Level,Attempts,Completed,Average Score,Pass Rate (%)');
    expect(csvLevels).toContain('N1');

    const sanitizedFormula = (service as any).sanitizeCsvCell('=SUM(A1:A10)');
    expect(sanitizedFormula).toBe("'=SUM(A1:A10)");

    const sanitizedAt = (service as any).sanitizeCsvCell('@cmd');
    expect(sanitizedAt).toBe("'@cmd");

    const sanitizedPlus = (service as any).sanitizeCsvCell('+123456');
    expect(sanitizedPlus).toBe("'+123456");

    const sanitizedMinus = (service as any).sanitizeCsvCell('-500');
    expect(sanitizedMinus).toBe("'-500");
  });

  it('ADM-01 & Controller: Chặn truy cập báo cáo nếu chưa xác thực tài khoản', async () => {
    await expect(controller.getDashboard(undefined)).rejects.toThrowError(
      'Yêu cầu đăng nhập tài khoản nhân sự.',
    );
    await expect(controller.getReport('activity', {}, undefined)).rejects.toThrowError(
      'Yêu cầu đăng nhập tài khoản nhân sự.',
    );
  });
});
