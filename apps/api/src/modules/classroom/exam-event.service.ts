import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { AttemptService } from '../attempt/attempt.service.js';
import { extractScoreFromResult } from './classroom.service.js';
import type { CreateExamEventDto } from './classroom.types.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

interface ExamEventRow {
  id: string;
  title: string;
  level: string;
  opensAt: Date;
  startsAt: Date;
  endsAt: Date;
  resultReleaseAt: Date;
  capacity: number;
  registeredCount: number;
}

@Injectable()
export class ExamEventService {
  constructor(
    @Inject(DB_CLIENT) private readonly client: DbClientInstance,
    private readonly outboxService: OutboxService,
    private readonly attemptService: AttemptService,
  ) {}

  /**
   * GAME-06: Danh sách các sự kiện thi đồng loạt công khai
   */
  async listExamEvents() {
    const items = await this.client.db
      .select({
        id: schema.examEvents.id,
        title: schema.examEvents.title,
        level: schema.examEvents.level,
        opensAt: schema.examEvents.opensAt,
        startsAt: schema.examEvents.startsAt,
        endsAt: schema.examEvents.endsAt,
        resultReleaseAt: schema.examEvents.resultReleaseAt,
        capacity: schema.examEvents.capacity,
        registeredCount: schema.examEvents.registeredCount,
      })
      .from(schema.examEvents)
      .orderBy(desc(schema.examEvents.startsAt));

    const formatted = (items as ExamEventRow[]).map((e: ExamEventRow) => ({
      ...e,
      opensAt: e.opensAt.toISOString(),
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      resultReleaseAt: e.resultReleaseAt.toISOString(),
    }));

    return { items: formatted };
  }

  /**
   * GAME-06: Tạo kỳ thi thử đồng loạt mới
   */
  async createExamEvent(user: AuthUserContext, input: CreateExamEventDto) {
    const opensAt = new Date(input.opensAt);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const resultReleaseAt = new Date(input.resultReleaseAt);

    if (
      isNaN(opensAt.getTime()) ||
      isNaN(startsAt.getTime()) ||
      isNaN(endsAt.getTime()) ||
      isNaN(resultReleaseAt.getTime())
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Thời gian sự kiện không hợp lệ.',
      });
    }

    // Constraint: opens_at <= starts_at AND starts_at < ends_at AND ends_at <= result_release_at
    if (opensAt > startsAt || startsAt >= endsAt || endsAt > resultReleaseAt) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'Khung giờ thi không hợp lệ: cần opensAt <= startsAt < endsAt <= resultReleaseAt.',
      });
    }

    if (input.capacity < 1) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Sức chứa sự kiện tối thiểu là 1.',
      });
    }

    const eventId = generateUuidV7();
    const title = input.title || `Kỳ thi thử trực tuyến ${startsAt.toLocaleDateString('vi-VN')}`;
    const level = input.level || 'N2';

    await this.client.db.insert(schema.examEvents).values({
      id: eventId,
      title,
      level,
      opensAt,
      startsAt,
      endsAt,
      resultReleaseAt,
      capacity: input.capacity,
      registeredCount: 0,
    });

    return {
      eventId,
      startsAt: startsAt.toISOString(),
    };
  }

  /**
   * GAME-06: Chi tiết sự kiện thi đồng loạt
   */
  async getExamEvent(eventId: string) {
    const [event] = await this.client.db
      .select()
      .from(schema.examEvents)
      .where(eq(schema.examEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy sự kiện thi.',
      });
    }

    return {
      id: event.id,
      title: event.title,
      level: event.level,
      opensAt: event.opensAt.toISOString(),
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      resultReleaseAt: event.resultReleaseAt.toISOString(),
      capacity: event.capacity,
      registeredCount: event.registeredCount,
    };
  }

  /**
   * GAME-06: Đăng ký tham gia kỳ thi đồng loạt (nguyên tử kiểm tra sức chứa)
   */
  async registerExamEvent(eventId: string, user: AuthUserContext) {
    const [event] = await this.client.db
      .select()
      .from(schema.examEvents)
      .where(eq(schema.examEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy sự kiện thi.',
      });
    }

    // Idempotent: check if already registered
    const [existing] = await this.client.db
      .select()
      .from(schema.eventRegistrations)
      .where(
        and(
          eq(schema.eventRegistrations.eventId, eventId),
          eq(schema.eventRegistrations.userId, user.userId),
        ),
      )
      .limit(1);

    if (existing) {
      return { registered: true };
    }

    // Check capacity
    if (event.registeredCount >= event.capacity) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Sự kiện thi đã đủ số lượng người đăng ký.',
      });
    }

    // Atomic update capacity
    const updateResult = await this.client.db
      .update(schema.examEvents)
      .set({
        registeredCount: sql`${schema.examEvents.registeredCount} + 1`,
      })
      .where(
        and(
          eq(schema.examEvents.id, eventId),
          sql`${schema.examEvents.registeredCount} < ${schema.examEvents.capacity}`,
        ),
      );

    if (updateResult.rowCount === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Sự kiện thi đã hết chỗ.',
      });
    }

    await this.client.db.insert(schema.eventRegistrations).values({
      id: generateUuidV7(),
      eventId,
      userId: user.userId,
    });

    return { registered: true };
  }

  /**
   * GAME-06: Phòng chờ thi đồng loạt (đồng bộ giờ server, chưa lộ đề thi trước giờ)
   */
  async getExamEventLobby(eventId: string, _user: AuthUserContext) {
    const [event] = await this.client.db
      .select()
      .from(schema.examEvents)
      .where(eq(schema.examEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy sự kiện thi.',
      });
    }

    const serverNow = new Date();
    const canEnter = serverNow >= event.startsAt && serverNow < event.endsAt;

    return {
      serverNow: serverNow.toISOString(),
      startsAt: event.startsAt.toISOString(),
      canEnter,
    };
  }

  /**
   * GAME-06: Bắt đầu làm bài thi sự kiện trong khung giờ quy định
   */
  async startExamEventAttempt(eventId: string, user: AuthUserContext) {
    const [event] = await this.client.db
      .select()
      .from(schema.examEvents)
      .where(eq(schema.examEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy sự kiện thi.',
      });
    }

    // Verify registration
    const [reg] = await this.client.db
      .select()
      .from(schema.eventRegistrations)
      .where(
        and(
          eq(schema.eventRegistrations.eventId, eventId),
          eq(schema.eventRegistrations.userId, user.userId),
        ),
      )
      .limit(1);

    if (!reg) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Bạn chưa đăng ký tham gia sự kiện thi này.',
      });
    }

    const serverNow = new Date();
    if (serverNow < event.startsAt) {
      throw new BadRequestException({
        code: 'EVENT_NOT_STARTED',
        message: 'Kỳ thi sự kiện chưa bắt đầu.',
      });
    }

    if (serverNow > event.endsAt) {
      throw new BadRequestException({
        code: 'DEADLINE_PASSED',
        message: 'Kỳ thi sự kiện đã kết thúc.',
      });
    }

    // Check if user already started an attempt for this event
    const [existingEventAttempt] = await this.client.db
      .select()
      .from(schema.eventAttempts)
      .where(
        and(
          eq(schema.eventAttempts.eventId, eventId),
          eq(schema.eventAttempts.userId, user.userId),
        ),
      )
      .limit(1);

    if (existingEventAttempt) {
      const [attempt] = await this.client.db
        .select()
        .from(schema.examAttempts)
        .where(eq(schema.examAttempts.id, existingEventAttempt.attemptId))
        .limit(1);

      if (attempt) {
        if (attempt.status === 'submitted') {
          throw new ConflictException({
            code: 'ATTEMPT_CLOSED',
            message: 'Bạn đã hoàn thành bài thi sự kiện này.',
          });
        }
        if (attempt.status === 'in_progress') {
          const resumed = await this.attemptService.resumeAttempt(existingEventAttempt.attemptId, user);
          return {
            attemptId: existingEventAttempt.attemptId,
            ...resumed,
          };
        }
      }

      throw new ConflictException({
        code: 'ATTEMPT_ALREADY_EXISTS',
        message: 'Bạn đã có một lượt thi cho sự kiện này.',
      });
    }

    // Find exam associated with matching level
    const [exam] = await this.client.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.level, event.level))
      .limit(1);

    if (!exam) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Chưa có đề thi được gán cho sự kiện này.',
      });
    }

    // Create attempt via AttemptService
    const attemptInit = await this.attemptService.createAttempt(
      {
        examId: exam.id,
        mode: 'real',
      },
      user,
    );

    // Link attempt to eventAttempts
    await this.client.db.insert(schema.eventAttempts).values({
      id: generateUuidV7(),
      eventId,
      attemptId: attemptInit.attemptId,
      userId: user.userId,
    });

    return attemptInit;
  }

  /**
   * GAME-06: Bảng xếp hạng và kết quả sự kiện thi
   * Acceptance 3: Event chưa kết thúc không lộ answer kể cả early submit/review
   */
  async getExamEventResults(eventId: string) {
    const [event] = await this.client.db
      .select()
      .from(schema.examEvents)
      .where(eq(schema.examEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy sự kiện thi.',
      });
    }

    const serverNow = new Date();

    // Acceptance 3: Chỉ trả về sau thời điểm công bố resultReleaseAt!
    if (serverNow < event.resultReleaseAt) {
      throw new ForbiddenException({
        code: 'RESULTS_EMBARGOED',
        message:
          'Kết quả sự kiện thi chưa được công bố. Vui lòng quay lại sau thời điểm công bố kết quả.',
      });
    }

    // If not already published, record publication and emit event
    const [pub] = await this.client.db
      .select()
      .from(schema.eventResultPublications)
      .where(eq(schema.eventResultPublications.eventId, eventId))
      .limit(1);

    if (!pub) {
      const [firstParticipant] = await this.client.db
        .select({ userId: schema.eventAttempts.userId })
        .from(schema.eventAttempts)
        .where(eq(schema.eventAttempts.eventId, eventId))
        .limit(1);

      const releasedBy = firstParticipant?.userId || event.id;

      await this.client.db
        .insert(schema.eventResultPublications)
        .values({
          id: generateUuidV7(),
          eventId,
          releasedAt: serverNow,
          releasedBy,
        })
        .onConflictDoNothing();

      const participants = await this.client.db
        .select({ id: schema.eventAttempts.id })
        .from(schema.eventAttempts)
        .where(eq(schema.eventAttempts.eventId, eventId));

      await this.outboxService.emitEvent(
        'exam_event.results_released',
        eventId,
        releasedBy,
        {
          eventId,
          examId: eventId,
          participantsCount: participants.length,
          releasedAt: serverNow.toISOString(),
        },
      );
    }

    const rows = await this.client.db
      .select({
        userId: schema.eventAttempts.userId,
        name: schema.users.name,
        attemptResult: schema.examAttempts.result,
        status: schema.examAttempts.status,
        submittedAt: schema.examAttempts.submittedAt,
      })
      .from(schema.eventAttempts)
      .innerJoin(
        schema.examAttempts,
        eq(schema.examAttempts.id, schema.eventAttempts.attemptId),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.eventAttempts.userId))
      .where(eq(schema.eventAttempts.eventId, eventId));

    interface EventParticipantRow {
      userId: string;
      name: string | null;
      attemptResult: unknown;
      status: string;
      submittedAt: Date | null;
    }

    const sorted = (rows as EventParticipantRow[])
      .filter((r: EventParticipantRow) => r.status === 'submitted')
      .map((r: EventParticipantRow) => ({
        userId: r.userId,
        name: r.name,
        score: extractScoreFromResult(r.attemptResult),
        submittedAt: r.submittedAt,
      }))
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    interface RankedItem {
      userId: string;
      name: string | null;
      score: number;
      submittedAt: Date | null;
    }

    const items = sorted.map((r: RankedItem, index: number) => ({
      rank: index + 1,
      userId: r.userId,
      name: r.name ? `${r.name[0]}***` : 'Thí sinh',
      score: r.score,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    }));

    return { items };
  }
}
