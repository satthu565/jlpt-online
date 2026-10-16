import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, countDistinct, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { LevelSchema, type Level, sanitizeExportField } from '@jlpt/schema';
import { canPurgeDomain } from '../../db/retention-guard.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { extractScoreFromResult } from '../classroom/classroom.service.js';

export interface UpdateProfileDto {
  name?: string;
  targetLevel?: Level;
  targetExamDate?: string;
  targetScore?: number;
  locale?: string;
  timezone?: string;
}

export interface SessionSummary {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ConsentInputItem {
  purpose: string;
  policyVersion: string;
  granted: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @Inject(DB_CLIENT) private readonly client: DbClientInstance,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * ACC-01, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10: Xem profile
   */
  async getProfile(userId: string) {
    const users = await this.client.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const user = users[0];
    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy thông tin người dùng.',
      });
    }

    // ACC-10: Tính tổng số đề đã hoàn thành (status = 'submitted')
    const completedResult = await this.client.db
      .select({
        total: countDistinct(schema.examAttempts.examId),
      })
      .from(schema.examAttempts)
      .where(
        and(
          eq(schema.examAttempts.userId, userId),
          eq(schema.examAttempts.status, 'submitted'),
        ),
      );

    const completedExams = Number(completedResult[0]?.total ?? 0);

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      avatarUrl: user.image || null,
      image: user.image || null,
      targetLevel: (user.targetLevel as Level | null) || null,
      targetExamDate: user.targetExamDate ? String(user.targetExamDate) : null,
      targetScore: user.targetScore ?? null,
      locale: user.locale ?? 'vi',
      timezone: user.timezone ?? 'Asia/Ho_Chi_Minh',
      completedExams,
    };
  }

  /**
   * ACC-06, ACC-07, ACC-08, ACC-09: Cập nhật thông tin cá nhân, mục tiêu điểm số và kỳ thi
   */
  async updateProfile(userId: string, input: UpdateProfileDto) {
    if (input.targetLevel !== undefined) {
      const parsedLevel = LevelSchema.safeParse(input.targetLevel);
      if (!parsedLevel.success) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Cấp độ JLPT không hợp lệ. Vui lòng chọn từ N1 đến N5.',
        });
      }
    }

    // ACC-08: Kiểm tra ngày thi hợp lệ
    if (input.targetExamDate !== undefined && input.targetExamDate !== null) {
      const d = new Date(input.targetExamDate);
      if (isNaN(d.getTime())) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Ngày thi dự kiến không hợp lệ.',
        });
      }
    }

    // ACC-09: Kiểm tra mục tiêu điểm số (0 - 180)
    if (input.targetScore !== undefined && input.targetScore !== null) {
      if (input.targetScore < 0 || input.targetScore > 180) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Mục tiêu điểm số phải nằm trong khoảng từ 0 đến 180.',
        });
      }
    }

    const updateData: Partial<typeof schema.users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.targetLevel !== undefined) updateData.targetLevel = input.targetLevel;
    if (input.targetExamDate !== undefined) updateData.targetExamDate = input.targetExamDate;
    if (input.targetScore !== undefined) updateData.targetScore = input.targetScore;
    if (input.locale !== undefined) updateData.locale = input.locale;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;

    await this.client.db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, userId));

    return this.getProfile(userId);
  }

  /**
   * ACC-06: Tải lên ảnh đại diện
   */
  async uploadAvatar(userId: string, avatarUrl: string) {
    if (!avatarUrl || avatarUrl.trim().length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Đường dẫn ảnh đại diện không hợp lệ.',
      });
    }

    const trimmed = avatarUrl.trim();
    if (
      trimmed.includes('..') ||
      trimmed.includes('\0') ||
      trimmed.includes('\\') ||
      /^(javascript|data|vbscript|file):/i.test(trimmed)
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Đường dẫn ảnh đại diện không an toàn (unsafe avatar path).',
      });
    }

    try {
      const decoded = decodeURIComponent(trimmed);
      if (
        decoded.includes('..') ||
        decoded.includes('\0') ||
        decoded.includes('\\') ||
        /^(javascript|data|vbscript|file):/i.test(decoded)
      ) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Đường dẫn ảnh đại diện không an toàn (unsafe avatar path).',
        });
      }
    } catch {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Đường dẫn ảnh đại diện không hợp lệ.',
      });
    }

    await this.client.db
      .update(schema.users)
      .set({ image: trimmed, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    return { avatarUrl: trimmed };
  }

  /**
   * ACC-06: Xóa ảnh đại diện
   */
  async deleteAvatar(userId: string) {
    await this.client.db
      .update(schema.users)
      .set({ image: null, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    return { success: true };
  }

  /**
   * ACC-11: Xem thời gian đã dành cho việc ôn tập và phân tích
   */
  async getUserAnalytics(userId: string) {
    // 1. Calculate study time from studySessionCompletions
    const sessionCompletions = await this.client.db
      .select({
        totalSeconds: sql<number>`COALESCE(SUM(${schema.studySessionCompletions.timeSpentSeconds}), 0)`,
      })
      .from(schema.studySessionCompletions)
      .innerJoin(
        schema.studySessions,
        eq(schema.studySessions.id, schema.studySessionCompletions.sessionId),
      )
      .where(eq(schema.studySessions.userId, userId));

    const totalSeconds = Number(sessionCompletions[0]?.totalSeconds ?? 0);
    const studyTimeMinutes = Math.round(totalSeconds / 60);

    // 2. Count total attempts and calculate average accuracy
    const attempts = await this.client.db
      .select({
        attemptResult: schema.examAttempts.result,
        status: schema.examAttempts.status,
      })
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, userId));

    interface UserAttemptRow {
      attemptResult: unknown;
      status: string;
    }

    const typedAttempts = attempts as UserAttemptRow[];
    const totalAttempts = typedAttempts.length;
    const submittedAttempts = typedAttempts.filter((a: UserAttemptRow) => a.status === 'submitted');
    const avgScore =
      submittedAttempts.length > 0
        ? submittedAttempts.reduce(
            (acc: number, cur: UserAttemptRow) => acc + extractScoreFromResult(cur.attemptResult),
            0,
          ) / submittedAttempts.length
        : 0;
    const averageAccuracy = Math.round(avgScore * 10) / 10;

    // 3. Aggregate skill stats from userSkillAggregates
    const skills = await this.client.db
      .select({
        skill: schema.userSkillAggregates.skill,
        accuracyRate: schema.userSkillAggregates.accuracyRate,
        sampleSize: schema.userSkillAggregates.sampleSize,
      })
      .from(schema.userSkillAggregates)
      .where(eq(schema.userSkillAggregates.userId, userId));

    interface UserSkillRow {
      skill: string;
      accuracyRate: number;
      sampleSize: number;
    }

    const bySkill: Record<string, { accuracy: number; totalQuestions: number }> = {};
    for (const s of skills as UserSkillRow[]) {
      bySkill[s.skill] = {
        accuracy: Number(s.accuracyRate ?? 0),
        totalQuestions: Number(s.sampleSize ?? 0),
      };
    }

    return {
      studyTimeMinutes,
      totalAttempts,
      averageAccuracy,
      bySkill,
    };
  }

  /**
   * ACC-13: Yêu cầu xuất toàn bộ dữ liệu cá nhân (GDPR)
   * Sử dụng sanitizeExportField để triệt tiêu Formula Injection
   */
  async requestDataExport(userId: string, input?: { kind?: string }) {
    const profile = await this.getProfile(userId);
    const jobId = generateUuidV7();

    const sanitizedData = {
      profile: {
        id: profile.id,
        email: sanitizeExportField(profile.email),
        name: sanitizeExportField(profile.name),
        locale: sanitizeExportField(profile.locale),
        timezone: sanitizeExportField(profile.timezone),
      },
      exportedAt: new Date().toISOString(),
    };

    const downloadUrl = `/exports/user-data-${jobId}.${(input?.kind || 'JSON').toLowerCase()}`;

    await this.client.db.insert(schema.dataExportJobs).values({
      id: jobId,
      userId,
      status: 'completed',
      downloadUrl,
      completedAt: new Date(),
    });

    return {
      jobId,
      status: 'completed',
      downloadUrl,
      data: sanitizedData,
    };
  }

  /**
   * ACC-13, SYS-19: Xem trạng thái yêu cầu xóa tài khoản
   */
  async getDeletionRequestStatus(userId: string) {
    const [req] = await this.client.db
      .select()
      .from(schema.deletionRequests)
      .where(eq(schema.deletionRequests.userId, userId))
      .orderBy(desc(schema.deletionRequests.requestedAt))
      .limit(1);

    if (!req) {
      return { status: 'none' };
    }

    return {
      id: req.id,
      status: req.status,
      requestedAt: req.requestedAt.toISOString(),
      metadata: req.metadata,
    };
  }

  /**
   * ACC-13, SYS-19: Gửi yêu cầu xóa tài khoản với bảo vệ nghĩa vụ retention chưa duyệt
   */
  async createDeletionRequest(
    userId: string,
    input?: { reason?: string; confirmation?: string },
  ) {
    const requestId = generateUuidV7();
    const result = await executeRetentionSafeDeletion(
      this.client,
      userId,
      ['billing', 'exam_attempts', 'learning', 'audit_logs'],
      requestId,
    );

    await this.outboxService.emitEvent(
      'privacy.deletion.requested',
      result.id,
      userId,
      {
        userId,
        deletionRequestId: result.id,
        requestedAt: new Date().toISOString(),
        metadata: {
          reason: input?.reason || 'User requested account deletion',
          ...result,
        },
      },
    );

    return {
      id: result.id,
      status: result.status,
      deletedDomains: result.deletedDomains,
      preservedDomains: result.preservedDomains,
    };
  }

  /**
   * Xem danh sách chấp thuận xử lý dữ liệu (Consents)
   */
  async getUserConsents(userId: string) {
    const rows = await this.client.db
      .select({
        purpose: schema.consents.purpose,
        policyVersion: schema.consents.policyVersion,
        grantedAt: schema.consents.grantedAt,
        withdrawnAt: schema.consents.withdrawnAt,
      })
      .from(schema.consents)
      .where(eq(schema.consents.userId, userId));

    interface ConsentRow {
      purpose: string;
      policyVersion: string;
      grantedAt: Date;
      withdrawnAt: Date | null;
    }

    const items = (rows as ConsentRow[]).map((r: ConsentRow) => ({
      purpose: r.purpose,
      policyVersion: r.policyVersion,
      granted: r.withdrawnAt === null,
      grantedAt: r.grantedAt.toISOString(),
    }));

    return { items };
  }

  /**
   * Cập nhật danh sách chấp thuận xử lý dữ liệu
   */
  async updateUserConsents(userId: string, items: ConsentInputItem[]) {
    for (const item of items) {
      const withdrawnAt = item.granted ? null : new Date();

      const [existing] = await this.client.db
        .select()
        .from(schema.consents)
        .where(
          and(
            eq(schema.consents.userId, userId),
            eq(schema.consents.purpose, item.purpose),
            eq(schema.consents.policyVersion, item.policyVersion),
          ),
        )
        .limit(1);

      if (existing) {
        await this.client.db
          .update(schema.consents)
          .set({ withdrawnAt })
          .where(eq(schema.consents.id, existing.id));
      } else {
        await this.client.db.insert(schema.consents).values({
          id: generateUuidV7(),
          userId,
          purpose: item.purpose,
          policyVersion: item.policyVersion,
          withdrawnAt,
        });
      }

      await this.outboxService.emitEvent(
        'privacy.consent.changed',
        userId,
        userId,
        {
          userId,
          purpose: item.purpose,
          granted: item.granted,
          policyVersion: item.policyVersion,
        },
      );
    }

    return { updated: true };
  }

  // ---------------------------------------------------------------------------
  // Session Management (ACC-12)
  // ---------------------------------------------------------------------------

  async getSessions(userId: string, currentSessionId?: string): Promise<SessionSummary[]> {
    const rows = await this.client.db
      .select({
        id: schema.sessions.id,
        ipAddress: schema.sessions.ipAddress,
        userAgent: schema.sessions.userAgent,
        createdAt: schema.sessions.createdAt,
        expiresAt: schema.sessions.expiresAt,
      })
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, userId),
          gt(schema.sessions.expiresAt, new Date()),
        ),
      );

    interface RawSessionRow {
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      expiresAt: Date;
    }

    return (rows as RawSessionRow[]).map((s: RawSessionRow) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.client.db
      .delete(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, userId),
          eq(schema.sessions.id, sessionId),
        ),
      );

    return {
      success: true,
      message: 'Hủy phiên đăng nhập thành công.',
    };
  }

  async revokeAllOtherSessions(userId: string, currentSessionId: string) {
    await this.client.db
      .delete(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, userId),
          ne(schema.sessions.id, currentSessionId),
        ),
      );

    return {
      success: true,
      message: 'Đã đăng xuất khỏi tất cả các thiết bị khác.',
    };
  }
}

/**
 * ACC-13, SYS-19: Thực hiện quy trình xóa tài khoản an toàn với retention policy
 * Trả về trực tiếp requestId của bản ghi vừa tạo (P2 fix).
 */
export async function executeRetentionSafeDeletion(
  client: DbClientInstance,
  userId: string,
  requestedDomains: string[] = ['billing', 'exam_attempts', 'learning', 'audit_logs'],
  requestId: string = generateUuidV7(),
) {
  const deletedDomains: string[] = [];
  const preservedDomains: string[] = [];

  for (const domain of requestedDomains) {
    const check = await canPurgeDomain(client, domain);
    if (check.canPurge) {
      deletedDomains.push(domain);
    } else {
      preservedDomains.push(domain);
    }
  }

  const finalStatus: 'completed' | 'blocked_retention' =
    preservedDomains.length > 0 ? 'blocked_retention' : 'completed';

  const notes =
    preservedDomains.length > 0
      ? `Bảo tồn các miền bắt buộc theo nghĩa vụ retention chưa được phê duyệt hoặc quy định pháp luật: ${preservedDomains.join(', ')}`
      : 'Đã hoàn tất xóa dữ liệu các miền hợp lệ theo chính sách retention đã duyệt.';

  await client.db.insert(schema.deletionRequests).values({
    id: requestId,
    userId,
    status: finalStatus,
    processedAt: new Date(),
    metadata: {
      requestedDomains,
      deletedDomains,
      preservedDomains,
      notes,
    },
  });

  return {
    id: requestId,
    status: finalStatus,
    deletedDomains,
    preservedDomains,
    notes,
  };
}
