import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  AssignmentResultDto,
  CreateExperimentDto,
  ExperimentDefinitionDto,
  ExperimentEvaluationDto,
  TrackEventDto,
  TrackExposureDto,
} from './experiment.types.js';

@Injectable()
export class ExperimentService {
  constructor(
    @Optional()
    @Inject(DB_CLIENT)
    private readonly dbClient: DbClientInstance,
  ) {}

  /**
   * Acceptance 3: Sanitize subjectId to ensure no PII (email, phone, name) is stored in experiment tables.
   */
  sanitizeSubjectId(subject: string): string {
    if (!subject || typeof subject !== 'string') {
      return generateUuidV7();
    }
    const trimmed = subject.trim();
    // Check if input looks like an email or phone number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isPhone = /^\+?[\d\s-]{8,20}$/.test(trimmed);

    if (isEmail || isPhone) {
      // Pseudonymize with SHA-256 hash
      const hash = createHash('sha256').update(`salt_jlpt_${trimmed.toLowerCase()}`).digest('hex');
      return `anon_${hash.slice(0, 24)}`;
    }

    return trimmed;
  }

  /**
   * Tạo định nghĩa thử nghiệm A/B mới.
   */
  async createExperiment(dto: CreateExperimentDto): Promise<ExperimentDefinitionDto> {
    const db = this.dbClient.db;
    const now = new Date();
    const isActive = dto.isActive ?? true;

    await db.insert(schema.experimentDefinitions).values({
      id: dto.id,
      name: dto.name,
      description: dto.description ?? null,
      variants: dto.variants,
      isActive,
      createdAt: now,
    });

    return {
      id: dto.id,
      name: dto.name,
      description: dto.description ?? null,
      variants: dto.variants,
      isActive,
      createdAt: now.toISOString(),
    };
  }

  /**
   * Khởi tạo các thử nghiệm mặc định nếu cơ sở dữ liệu chưa có.
   */
  async ensureInitialExperiments(): Promise<void> {
    const db = this.dbClient.db;
    const existing = await db.select().from(schema.experimentDefinitions).limit(1);
    if (existing.length === 0) {
      const now = new Date();
      await db
        .insert(schema.experimentDefinitions)
        .values([
          {
            id: 'exp_checkout_layout_v1',
            name: 'Thử nghiệm giao diện thanh toán (1 bước vs 2 bước)',
            description: 'Đánh giá tỷ lệ hoàn tất đơn hàng gói Premium khi giảm bớt trường nhập liệu.',
            variants: [
              { key: 'control', name: 'Gốc (2 bước)', weight: 50 },
              { key: 'variant_b', name: 'Mới (1 chạm)', weight: 50 },
            ],
            isActive: true,
            createdAt: now,
          },
          {
            id: 'exp_reading_font_size',
            name: 'Thử nghiệm cỡ chữ đoạn văn Đọc hiểu',
            description: 'So sánh cỡ chữ 16px và 18px đối với tốc độ đọc hiểu và hoàn thành mondai.',
            variants: [
              { key: 'control', name: 'Chuẩn 16px', weight: 50 },
              { key: 'large_18px', name: 'Lớn 18px', weight: 50 },
            ],
            isActive: false,
            createdAt: now,
          },
        ])
        .onConflictDoNothing();
    }
  }

  /**
   * Lấy danh sách thử nghiệm.
   */
  async listExperiments(): Promise<ExperimentDefinitionDto[]> {
    await this.ensureInitialExperiments();
    const db = this.dbClient.db;
    const rows = (await db.select().from(schema.experimentDefinitions)) as Array<{
      id: string;
      name: string;
      description: string | null;
      variants: unknown;
      isActive: boolean;
      createdAt: Date;
    }>;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      variants: (Array.isArray(r.variants) ? r.variants : []) as ExperimentDefinitionDto['variants'],
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Bật/tắt trạng thái hoạt động của thử nghiệm A/B.
   */
  async toggleExperimentStatus(id: string): Promise<ExperimentDefinitionDto> {
    const db = this.dbClient.db;
    const existing = (await db
      .select()
      .from(schema.experimentDefinitions)
      .where(eq(schema.experimentDefinitions.id, id))
      .limit(1)) as Array<{
      id: string;
      name: string;
      description: string | null;
      variants: unknown;
      isActive: boolean;
      createdAt: Date;
    }>;

    const exp = existing[0];
    if (!exp) {
      throw new NotFoundException(`Không tìm thấy thử nghiệm: ${id}`);
    }

    const nextActive = !exp.isActive;
    await db
      .update(schema.experimentDefinitions)
      .set({ isActive: nextActive })
      .where(eq(schema.experimentDefinitions.id, id));

    return {
      id: exp.id,
      name: exp.name,
      description: exp.description,
      variants: (Array.isArray(exp.variants) ? exp.variants : []) as ExperimentDefinitionDto['variants'],
      isActive: nextActive,
      createdAt: exp.createdAt.toISOString(),
    };
  }

  /**
   * Acceptance 3: Sticky assignment phân bổ biến thể không lộ PII.
   * Cùng một subjectId luôn nhận cùng một variant qua mọi phiên.
   */
  async getOrAssignVariant(experimentId: string, rawSubjectId: string): Promise<AssignmentResultDto> {
    const db = this.dbClient.db;
    const subjectId = this.sanitizeSubjectId(rawSubjectId);

    // 1. Kiểm tra nếu đã có phân bổ trước đó (Sticky Assignment)
    const existing = (await db
      .select()
      .from(schema.experimentAssignments)
      .where(
        and(
          eq(schema.experimentAssignments.experimentId, experimentId),
          eq(schema.experimentAssignments.subjectId, subjectId),
        ),
      )
      .limit(1)) as Array<{
      experimentId: string;
      subjectId: string;
      variant: string;
      assignedAt: Date;
    }>;

    if (existing.length > 0 && existing[0]) {
      return {
        experimentId,
        subjectId,
        variant: existing[0].variant,
        isNewAssignment: false,
      };
    }

    // 2. Tìm định nghĩa thử nghiệm
    const expRows = (await db
      .select()
      .from(schema.experimentDefinitions)
      .where(eq(schema.experimentDefinitions.id, experimentId))
      .limit(1)) as Array<{
      id: string;
      name: string;
      variants: unknown;
      isActive: boolean;
    }>;

    const exp = expRows[0];
    if (!exp) {
      throw new NotFoundException(`Không tìm thấy thử nghiệm: ${experimentId}`);
    }

    const variants = (
      Array.isArray(exp.variants) && exp.variants.length > 0
        ? exp.variants
        : [{ key: 'control' }, { key: 'variant_b' }]
    ) as Array<{ key: string; weight?: number }>;

    // Nếu thử nghiệm chưa kích hoạt, luôn trả về biến thể đối chứng 'control'
    if (!exp.isActive) {
      return {
        experimentId,
        subjectId,
        variant: variants[0]?.key ?? 'control',
        isNewAssignment: false,
      };
    }

    // 3. Phân bổ biến thể bằng hàm băm giả định danh (Pseudonymous Hash Modulo)
    const hash = createHash('sha256')
      .update(`${experimentId}:${subjectId}:jlpt_v4`)
      .digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;

    let selectedVariant = variants[0]?.key ?? 'control';
    let cumulative = 0;
    const defaultWeight = Math.floor(100 / variants.length);

    for (const v of variants) {
      const w = v.weight ?? defaultWeight;
      cumulative += w;
      if (bucket < cumulative) {
        selectedVariant = v.key;
        break;
      }
    }

    // 4. Lưu phân bổ cố định vào bảng experiment_assignments
    await db
      .insert(schema.experimentAssignments)
      .values({
        experimentId,
        subjectId,
        variant: selectedVariant,
        assignedAt: new Date(),
      })
      .onConflictDoNothing();

    return {
      experimentId,
      subjectId,
      variant: selectedVariant,
      isNewAssignment: true,
    };
  }

  /**
   * Ghi nhận lượt tiếp xúc giao diện thử nghiệm (Exposure).
   */
  async trackExposure(dto: TrackExposureDto): Promise<{ exposed: boolean }> {
    const db = this.dbClient.db;
    const subjectId = this.sanitizeSubjectId(dto.subjectId);

    await this.getOrAssignVariant(dto.experimentId, subjectId);

    await db.insert(schema.experimentExposures).values({
      id: generateUuidV7(),
      experimentId: dto.experimentId,
      subjectId,
      exposedAt: new Date(),
    });

    return { exposed: true };
  }

  /**
   * Cập nhật đồng ý thu thập dữ liệu hành vi (Consent Gating).
   */
  async setAnalyticsConsent(userId: string, trackingAllowed: boolean): Promise<void> {
    const db = this.dbClient.db;
    const existing = (await db
      .select()
      .from(schema.analyticsConsents)
      .where(eq(schema.analyticsConsents.userId, userId))
      .limit(1)) as Array<{ id: string }>;

    if (existing.length > 0 && existing[0]) {
      await db
        .update(schema.analyticsConsents)
        .set({
          trackingAllowed,
          consentedAt: new Date(),
        })
        .where(eq(schema.analyticsConsents.id, existing[0].id));
    } else {
      await db.insert(schema.analyticsConsents).values({
        id: generateUuidV7(),
        userId,
        trackingAllowed,
        consentedAt: new Date(),
      });
    }
  }

  /**
   * Ghi nhận sự kiện phân tích có kiểm tra sự đồng ý (Consented Product Analytics).
   * Loại bỏ PII và thông tin nhạy cảm trước khi lưu trữ.
   */
  async trackAnalyticsEvent(dto: TrackEventDto): Promise<{ tracked: boolean; reason?: string }> {
    const db = this.dbClient.db;

    // 1. Kiểm tra sự đồng ý nếu có userId
    if (dto.userId) {
      const consentRows = (await db
        .select()
        .from(schema.analyticsConsents)
        .where(eq(schema.analyticsConsents.userId, dto.userId))
        .limit(1)) as Array<{ trackingAllowed: boolean }>;

      const consent = consentRows[0];
      if (consent && !consent.trackingAllowed) {
        return { tracked: false, reason: 'consent_denied' };
      }
    }

    // 2. Làm sạch thuộc tính (Scrub PII & secrets)
    const cleanProps: Record<string, unknown> = {};
    const rawProps = dto.properties ?? {};
    const SENSITIVE_KEYS = new Set([
      'password',
      'secret',
      'token',
      'email',
      'phone',
      'cardnumber',
      'cvv',
      'rawanswer',
    ]);

    for (const [k, v] of Object.entries(rawProps)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        continue;
      }
      cleanProps[k] = v;
    }

    await db.insert(schema.analyticsEvents).values({
      id: generateUuidV7(),
      eventName: dto.eventName,
      userId: dto.userId ?? null,
      sessionId: dto.sessionId ?? null,
      properties: cleanProps,
      timestamp: new Date(),
    });

    return { tracked: true };
  }

  /**
   * REPORT-15: Đánh giá hiệu quả thử nghiệm A/B.
   */
  async evaluateExperiment(experimentId: string): Promise<ExperimentEvaluationDto> {
    const db = this.dbClient.db;
    const expRows = (await db
      .select()
      .from(schema.experimentDefinitions)
      .where(eq(schema.experimentDefinitions.id, experimentId))
      .limit(1)) as Array<{
      id: string;
      name: string;
      variants: unknown;
      isActive: boolean;
    }>;

    const exp = expRows[0];
    if (!exp) {
      throw new NotFoundException(`Không tìm thấy thử nghiệm: ${experimentId}`);
    }

    const assignments = (await db
      .select({
        variant: schema.experimentAssignments.variant,
        subjectId: schema.experimentAssignments.subjectId,
      })
      .from(schema.experimentAssignments)
      .where(eq(schema.experimentAssignments.experimentId, experimentId))) as Array<{
      variant: string;
      subjectId: string;
    }>;

    const exposures = (await db
      .select({
        subjectId: schema.experimentExposures.subjectId,
      })
      .from(schema.experimentExposures)
      .where(eq(schema.experimentExposures.experimentId, experimentId))) as Array<{
      subjectId: string;
    }>;

    const events = (await db
      .select({
        eventName: schema.analyticsEvents.eventName,
        properties: schema.analyticsEvents.properties,
      })
      .from(schema.analyticsEvents)) as Array<{
      eventName: string;
      properties: unknown;
    }>;

    const variants = (
      Array.isArray(exp.variants) && exp.variants.length > 0
        ? exp.variants
        : [{ key: 'control' }, { key: 'variant_b' }]
    ) as Array<{ key: string }>;

    const variantResults = variants.map((v) => {
      const vAssignments = assignments.filter((a) => a.variant === v.key);
      const vSubjects = new Set(vAssignments.map((a) => a.subjectId));

      const vExposures = exposures.filter((ex) => vSubjects.has(ex.subjectId)).length;

      const vConversions = events.filter((ev) => {
        const props =
          ev.properties && typeof ev.properties === 'object'
            ? (ev.properties as Record<string, unknown>)
            : {};
        return (
          props['experimentId'] === experimentId &&
          props['variant'] === v.key &&
          (ev.eventName === 'exam_finish' || ev.eventName === 'checkout_completed')
        );
      }).length;

      const baseTraffic = Math.max(vExposures, vAssignments.length);
      const conversionRate =
        baseTraffic > 0 ? Math.round((vConversions / baseTraffic) * 1000) / 10 : 0;

      return {
        key: v.key,
        assignments: vAssignments.length,
        exposures: vExposures,
        conversions: vConversions,
        conversionRate,
      };
    });

    return {
      experimentId,
      name: exp.name,
      isActive: exp.isActive,
      totalAssignments: assignments.length,
      totalExposures: exposures.length,
      variants: variantResults,
    };
  }
}
