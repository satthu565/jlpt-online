import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, countDistinct, eq, gt, ne } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { LevelSchema, type Level } from '@jlpt/schema';

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

@Injectable()
export class UserService {
  constructor(@Inject(DB_CLIENT) private readonly client: DbClientInstance) {}

  /**
   * ACC-01, ACC-07, ACC-10: Xem profile kèm số đề đã hoàn thành (completedExams)
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
      targetLevel: (user.targetLevel as Level | null) || null,
      targetExamDate: user.targetExamDate ? String(user.targetExamDate) : null,
      targetScore: user.targetScore ?? null,
      locale: user.locale ?? 'vi',
      timezone: user.timezone ?? 'Asia/Ho_Chi_Minh',
      completedExams,
    };
  }

  /**
   * ACC-07: Chọn cấp độ JLPT đang ôn: N1–N5
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
   * ACC-12: Quản lý thiết bị và phiên đăng nhập - Xem danh sách phiên
   */
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

  /**
   * ACC-12: Hủy 1 phiên đăng nhập cụ thể
   */
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

  /**
   * ACC-12: Hủy tất cả các phiên đăng nhập khác ngoại trừ phiên hiện tại
   */
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
