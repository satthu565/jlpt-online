import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { seedDatabase } from '../../db/seed.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { ExperimentService } from './experiment.service.js';
import { ExperimentController } from './experiment.controller.js';

describe('A04 Experiment System & Consented Analytics (REPORT-15, Acceptance 3)', () => {
  let dbClient: DbClientInstance;
  let service: ExperimentService;
  let controller: ExperimentController;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    await seedDatabase(dbClient);

    service = new ExperimentService(dbClient);
    controller = new ExperimentController(service);

    // Seed test experiment definition
    await service.createExperiment({
      id: 'exp_checkout_layout_v1',
      name: 'Thử nghiệm giao diện thanh toán đơn giản hóa',
      description: 'So sánh giữa quy trình thanh toán 1 bước và 2 bước',
      variants: [
        { key: 'control', name: 'Giao diện gốc', weight: 50 },
        { key: 'variant_b', name: 'Thanh toán 1 chạm', weight: 50 },
      ],
      isActive: true,
    });
  });

  afterEach(async () => {
    if (dbClient) {
      await dbClient.close();
    }
  });

  describe('Acceptance 3: Sticky Assignment & Zero PII Leakage', () => {
    it('Sticky assignment: Cùng một đối tượng luôn nhận cùng một variant qua các lần gọi', async () => {
      const subjectA = 'sub_learner_abc123';
      const first = await service.getOrAssignVariant('exp_checkout_layout_v1', subjectA);
      expect(first.isNewAssignment).toBe(true);
      expect(['control', 'variant_b']).toContain(first.variant);

      // Lần gọi thứ 2 với cùng subjectId
      const second = await service.getOrAssignVariant('exp_checkout_layout_v1', subjectA);
      expect(second.isNewAssignment).toBe(false);
      expect(second.variant).toBe(first.variant);

      // Lần gọi thứ 3
      const third = await service.getOrAssignVariant('exp_checkout_layout_v1', subjectA);
      expect(third.variant).toBe(first.variant);
    });

    it('Không làm rò rỉ dữ liệu định danh cá nhân (PII): Email/SĐT được ẩn danh hóa trước khi lưu vào DB', async () => {
      const rawEmail = 'sensitive_student@gmail.com';
      const assignment = await service.getOrAssignVariant('exp_checkout_layout_v1', rawEmail);

      expect(assignment.subjectId).not.toContain('@');
      expect(assignment.subjectId).not.toContain('sensitive_student');
      expect(assignment.subjectId.startsWith('anon_')).toBe(true);

      // Kiểm tra trực tiếp bảng experiment_assignments trong DB
      const dbRows = (await dbClient.db
        .select()
        .from(schema.experimentAssignments)) as Array<{
        experimentId: string;
        subjectId: string;
      }>;

      const hasRawPii = dbRows.some(
        (r) => r.subjectId.includes('@') || r.subjectId.includes('sensitive_student'),
      );
      expect(hasRawPii).toBe(false);
    });

    it('Thử nghiệm chưa kích hoạt (isActive: false) luôn gán biến thể control', async () => {
      await service.createExperiment({
        id: 'exp_inactive_test',
        name: 'Thử nghiệm đang tắt',
        variants: [{ key: 'control' }, { key: 'treatment' }],
        isActive: false,
      });

      const res = await service.getOrAssignVariant('exp_inactive_test', 'random_user_99');
      expect(res.variant).toBe('control');
      expect(res.isNewAssignment).toBe(false);
    });
  });

  describe('Consent Gating: Kiểm soát thu thập dữ liệu phân tích', () => {
    it('Chặn ghi nhận sự kiện nếu người dùng từ chối theo dõi (trackingAllowed: false)', async () => {
      const userId = generateUuidV7();
      await dbClient.db.insert(schema.users).values({
        id: userId,
        email: 'optout_user@test.local',
        role: 'student',
      });

      // Người dùng từ chối thu thập analytics
      await service.setAnalyticsConsent(userId, false);

      const result = await service.trackAnalyticsEvent({
        userId,
        eventName: 'button_clicked',
        properties: { button: 'start_exam' },
      });

      expect(result.tracked).toBe(false);
      expect(result.reason).toBe('consent_denied');

      // Xác nhận DB không có sự kiện nào của user này
      const events = (await dbClient.db
        .select()
        .from(schema.analyticsEvents)) as Array<{ userId: string | null }>;
      expect(events.some((e) => e.userId === userId)).toBe(false);
    });

    it('Cho phép ghi nhận sự kiện khi người dùng đồng ý và lọc bỏ thuộc tính nhạy cảm (passwords, cards)', async () => {
      const userId = generateUuidV7();
      await dbClient.db.insert(schema.users).values({
        id: userId,
        email: 'optin_user@test.local',
        role: 'student',
      });

      await service.setAnalyticsConsent(userId, true);

      const result = await service.trackAnalyticsEvent({
        userId,
        eventName: 'checkout_step',
        properties: {
          step: 2,
          amount: 299000,
          password: 'super_secret_password',
          cardNumber: '4111222233334444',
          cvv: '123',
        },
      });

      expect(result.tracked).toBe(true);

      const events = (await dbClient.db
        .select()
        .from(schema.analyticsEvents)) as Array<{
        userId: string | null;
        properties: unknown;
      }>;

      const userEvent = events.find((e) => e.userId === userId);
      expect(userEvent).toBeDefined();

      const props = userEvent?.properties as Record<string, unknown>;
      expect(props['step']).toBe(2);
      expect(props['amount']).toBe(299000);
      expect(props['password']).toBeUndefined();
      expect(props['cardNumber']).toBeUndefined();
      expect(props['cvv']).toBeUndefined();
    });
  });

  describe('REPORT-15: Đánh giá hiệu quả thử nghiệm A/B', () => {
    it('Đánh giá chính xác tỷ lệ chuyển đổi và số lượt tiếp xúc theo từng biến thể', async () => {
      const expId = 'exp_checkout_layout_v1';

      // Tạo đối tượng và gán biến thể
      const sub1 = 'user_test_1';
      const sub2 = 'user_test_2';
      const sub3 = 'user_test_3';
      const sub4 = 'user_test_4';

      const a1 = await service.getOrAssignVariant(expId, sub1);
      const a2 = await service.getOrAssignVariant(expId, sub2);
      await service.getOrAssignVariant(expId, sub3);
      await service.getOrAssignVariant(expId, sub4);

      // Ghi nhận lượt exposure
      await service.trackExposure({ experimentId: expId, subjectId: sub1 });
      await service.trackExposure({ experimentId: expId, subjectId: sub2 });
      await service.trackExposure({ experimentId: expId, subjectId: sub3 });
      await service.trackExposure({ experimentId: expId, subjectId: sub4 });

      // Ghi nhận chuyển đổi mua hàng cho sub1 và sub2
      await service.trackAnalyticsEvent({
        eventName: 'checkout_completed',
        properties: {
          experimentId: expId,
          variant: a1.variant,
        },
      });

      await service.trackAnalyticsEvent({
        eventName: 'checkout_completed',
        properties: {
          experimentId: expId,
          variant: a2.variant,
        },
      });

      const evaluation = await service.evaluateExperiment(expId);
      expect(evaluation.experimentId).toBe(expId);
      expect(evaluation.totalAssignments).toBe(4);
      expect(evaluation.totalExposures).toBe(4);
      expect(evaluation.variants.length).toBe(2);

      for (const v of evaluation.variants) {
        expect(v).toHaveProperty('assignments');
        expect(v).toHaveProperty('exposures');
        expect(v).toHaveProperty('conversions');
        expect(v).toHaveProperty('conversionRate');
      }
    });
  });

  describe('ExperimentController Permissions', () => {
    it('Chặn truy cập API quản trị nếu chưa xác thực Admin', async () => {
      await expect(
        controller.listExperiments(undefined),
      ).rejects.toThrow();

      await expect(
        controller.createExperiment(
          { id: 'bad', name: 'bad', variants: [{ key: 'control' }] },
          undefined,
        ),
      ).rejects.toThrow();
    });
  });
});
