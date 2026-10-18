import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import { AuditService } from '../audit/audit.service.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import {
  jlptExamSchedules,
  type CreateJlptScheduleInput,
  type UpdateJlptScheduleInput,
  type JlptScheduleResponse,
  type JlptLocation,
} from './jlpt-schedule.schema.js';

@Injectable()
export class JlptScheduleService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Formats a database row to JlptScheduleResponse.
   */
  private formatRow(row: typeof jlptExamSchedules.$inferSelect): JlptScheduleResponse {
    return {
      id: row.id,
      title: row.title,
      examDate: row.examDate,
      registrationDeadline: row.registrationDeadline.toISOString(),
      registrationOpensAt: row.registrationOpensAt ? row.registrationOpensAt.toISOString() : null,
      locations: (row.locations as JlptLocation[]) || [],
      officialUrl: row.officialUrl,
      levels: row.levels || [],
      status: row.status as 'draft' | 'published' | 'archived',
      notes: row.notes || '',
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Public: List only published JLPT schedules in Vietnam.
   * "trang công khai chỉ thấy bản đã xuất bản. Không seed ngày thi giả: thiếu dữ liệu thì API trả rỗng."
   */
  async listPublicSchedules(params?: { level?: string }): Promise<JlptScheduleResponse[]> {
    const db = this.dbClient.db;

    const rows = await db
      .select()
      .from(jlptExamSchedules)
      .where(eq(jlptExamSchedules.status, 'published'))
      .orderBy(asc(jlptExamSchedules.examDate));

    let result = rows.map((r: typeof jlptExamSchedules.$inferSelect) => this.formatRow(r));

    if (params?.level) {
      const lvl = params.level.toUpperCase();
      result = result.filter((s: JlptScheduleResponse) => s.levels.includes(lvl));
    }

    return result;
  }

  /**
   * Public: Get published schedule by ID.
   */
  async getPublicScheduleById(id: string): Promise<JlptScheduleResponse> {
    const db = this.dbClient.db;

    const [row] = await db
      .select()
      .from(jlptExamSchedules)
      .where(and(eq(jlptExamSchedules.id, id), eq(jlptExamSchedules.status, 'published')))
      .limit(1);

    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy thông tin lịch thi JLPT đã xuất bản.',
      });
    }

    return this.formatRow(row);
  }

  /**
   * Admin: List all schedules (including draft and archived).
   */
  async listAdminSchedules(status?: string): Promise<JlptScheduleResponse[]> {
    const db = this.dbClient.db;

    const query = db.select().from(jlptExamSchedules);
    const rows = status
      ? await query.where(eq(jlptExamSchedules.status, status)).orderBy(asc(jlptExamSchedules.examDate))
      : await query.orderBy(asc(jlptExamSchedules.examDate));

    return rows.map((r: typeof jlptExamSchedules.$inferSelect) => this.formatRow(r));
  }

  /**
   * Admin: Get any schedule by ID.
   */
  async getAdminScheduleById(id: string): Promise<JlptScheduleResponse> {
    const db = this.dbClient.db;

    const [row] = await db
      .select()
      .from(jlptExamSchedules)
      .where(eq(jlptExamSchedules.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Không tìm thấy lịch thi ID: ${id}`,
      });
    }

    return this.formatRow(row);
  }

  /**
   * Admin: Create a new JLPT exam schedule (status defaults to draft).
   * Records audit log.
   */
  async createSchedule(
    input: CreateJlptScheduleInput,
    operatorId: string,
  ): Promise<JlptScheduleResponse> {
    const db = this.dbClient.db;
    const id = generateUuidV7();
    const now = new Date();

    const [inserted] = await db
      .insert(jlptExamSchedules)
      .values({
        id,
        title: input.title,
        examDate: input.examDate,
        registrationDeadline: new Date(input.registrationDeadline),
        registrationOpensAt: input.registrationOpensAt ? new Date(input.registrationOpensAt) : null,
        locations: input.locations,
        officialUrl: input.officialUrl,
        levels: input.levels || ['N1', 'N2', 'N3', 'N4', 'N5'],
        status: 'draft',
        notes: input.notes || '',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Audit action
    await this.auditService.recordAction({
      operatorId,
      action: 'create_jlpt_schedule',
      targetResource: `jlpt_schedule:${id}`,
      details: {
        title: input.title,
        examDate: input.examDate,
        registrationDeadline: input.registrationDeadline,
        locationsCount: input.locations.length,
      },
    });

    return this.formatRow(inserted);
  }

  /**
   * Admin: Update an existing JLPT exam schedule.
   * Records audit log.
   */
  async updateSchedule(
    id: string,
    input: UpdateJlptScheduleInput,
    operatorId: string,
  ): Promise<JlptScheduleResponse> {
    const db = this.dbClient.db;

    // Verify exists
    await this.getAdminScheduleById(id);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.examDate !== undefined) updateData['examDate'] = input.examDate;
    if (input.registrationDeadline !== undefined) {
      updateData['registrationDeadline'] = new Date(input.registrationDeadline);
    }
    if (input.registrationOpensAt !== undefined) {
      updateData['registrationOpensAt'] = input.registrationOpensAt
        ? new Date(input.registrationOpensAt)
        : null;
    }
    if (input.locations !== undefined) updateData['locations'] = input.locations;
    if (input.officialUrl !== undefined) updateData['officialUrl'] = input.officialUrl;
    if (input.levels !== undefined) updateData['levels'] = input.levels;
    if (input.notes !== undefined) updateData['notes'] = input.notes;

    const [updated] = await db
      .update(jlptExamSchedules)
      .set(updateData)
      .where(eq(jlptExamSchedules.id, id))
      .returning();

    // Audit action
    await this.auditService.recordAction({
      operatorId,
      action: 'update_jlpt_schedule',
      targetResource: `jlpt_schedule:${id}`,
      details: input as Record<string, unknown>,
    });

    return this.formatRow(updated);
  }

  /**
   * Admin: Publish schedule (publicly visible).
   * Records audit log.
   */
  async publishSchedule(id: string, operatorId: string): Promise<JlptScheduleResponse> {
    const db = this.dbClient.db;
    const now = new Date();

    await this.getAdminScheduleById(id);

    const [updated] = await db
      .update(jlptExamSchedules)
      .set({
        status: 'published',
        publishedAt: now,
        publishedBy: operatorId,
        updatedAt: now,
      })
      .where(eq(jlptExamSchedules.id, id))
      .returning();

    // Audit action
    await this.auditService.recordAction({
      operatorId,
      action: 'publish_jlpt_schedule',
      targetResource: `jlpt_schedule:${id}`,
      details: { title: updated.title, publishedAt: now.toISOString() },
    });

    return this.formatRow(updated);
  }

  /**
   * Admin: Unpublish schedule (reverts to draft).
   * Records audit log.
   */
  async unpublishSchedule(id: string, operatorId: string): Promise<JlptScheduleResponse> {
    const db = this.dbClient.db;
    const now = new Date();

    await this.getAdminScheduleById(id);

    const [updated] = await db
      .update(jlptExamSchedules)
      .set({
        status: 'draft',
        updatedAt: now,
      })
      .where(eq(jlptExamSchedules.id, id))
      .returning();

    // Audit action
    await this.auditService.recordAction({
      operatorId,
      action: 'unpublish_jlpt_schedule',
      targetResource: `jlpt_schedule:${id}`,
      details: { title: updated.title },
    });

    return this.formatRow(updated);
  }

  /**
   * Admin: Delete schedule.
   * Records audit log.
   */
  async deleteSchedule(id: string, operatorId: string): Promise<{ success: boolean }> {
    const db = this.dbClient.db;

    const existing = await this.getAdminScheduleById(id);

    await db.delete(jlptExamSchedules).where(eq(jlptExamSchedules.id, id));

    // Audit action
    await this.auditService.recordAction({
      operatorId,
      action: 'delete_jlpt_schedule',
      targetResource: `jlpt_schedule:${id}`,
      details: { title: existing.title, examDate: existing.examDate },
    });

    return { success: true };
  }
}
