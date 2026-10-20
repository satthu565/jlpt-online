import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql, desc, isNull, gte } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { TurnstileService } from '../turnstile/turnstile.service.js';
import {
  signMediaToken,
  generateAttemptTokenExp,
  generateReviewTokenExp,
  buildMediaSnapshotUrl,
} from '@jlpt/media-token';
import {
  evaluateSubmissionTiming,
  validateAnswerSheet,
} from '@jlpt/exam-engine';
import type {
  AttemptInitInput,
  AttemptInitResponse,
  NextSectionInput,
  NextSectionResponse,
  AnswerSheetUpdateInput,
  AnswerSheetAck,
  AttemptSubmitInput,
  AttemptSubmitResponse,
  ResumeAttemptResponse,
  MediaTokenResponse,
  AttemptDetailResponse,
  ReviewAttemptResponse,
  CheckAnswerInput,
  CheckAnswerResponse,
  AttemptStatus,
  AttemptMode,
  Result,
} from '@jlpt/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

type DbTx = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];

@Injectable()
export class AttemptService {
  private readonly logger = new Logger(AttemptService.name);
  private readonly mediaSecret =
    process.env.MEDIA_TOKEN_SECRET ||
    'staging_media_token_secret_for_reproducible_smoke_tests';

  getMediaBaseUrl(): string {
    const envMedia = process.env.MEDIA_BASE_URL;
    if (envMedia && !envMedia.includes('media.jlpt.local')) {
      return envMedia;
    }
    const apiUrl = process.env.API_BASE_URL || process.env.PUBLIC_API_URL;
    if (apiUrl) {
      return apiUrl.replace(/\/+$/, '');
    }
    if (process.env.PUBLIC_HOST) {
      const host = process.env.PUBLIC_HOST.startsWith('http')
        ? process.env.PUBLIC_HOST
        : `http://${process.env.PUBLIC_HOST}`;
      return `${host}/api/v1`;
    }
    return '/api/v1';
  }

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly scoringService: ScoringService,
    private readonly outboxService: OutboxService,
    private readonly turnstileService: TurnstileService,
  ) {}

  /**
   * Helper to check if an exam allows guest trial
   */
  private isExamGuestTrialEligible(exam: typeof schema.exams.$inferSelect, versionScoring?: Record<string, unknown>): boolean {
    if (exam.kind === 'practice' || exam.kind === 'custom') {
      // Check description or slug
    }
    const descLower = (exam.description || '').toLowerCase();
    const slugLower = exam.slug.toLowerCase();
    const titleLower = exam.title.toLowerCase();

    if (
      descLower.includes('guest_trial') ||
      descLower.includes('"guesttrial":true') ||
      descLower.includes('"guesttrial": true') ||
      slugLower.includes('trial') ||
      slugLower.includes('guest') ||
      titleLower.includes('làm thử') ||
      titleLower.includes('thử nghiệm') ||
      titleLower.includes('trial')
    ) {
      return true;
    }

    if (versionScoring && (versionScoring['guestTrial'] === true || versionScoring['guest_trial'] === true)) {
      return true;
    }

    return false;
  }

  /**
   * Creates a new attempt (T1.5.2, Acceptance 5).
   */
  async createAttempt(
    input: AttemptInitInput,
    user?: AuthUserContext,
    guestId?: string,
    turnstileToken?: string,
    clientIp?: string,
  ): Promise<AttemptInitResponse> {
    const db = this.dbClient.db;

    // 1. Fetch exam
    const [exam] = await db
      .select()
      .from(schema.exams)
      .where(and(eq(schema.exams.id, input.examId), isNull(schema.exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Đề thi không tồn tại hoặc đã bị xóa.',
      });
    }

    // 2. Fetch latest published exam version
    const versionNum = exam.publishedVersion ?? 1;
    const [ev] = await db
      .select()
      .from(schema.examVersions)
      .where(and(eq(schema.examVersions.examId, exam.id), eq(schema.examVersions.version, versionNum)))
      .limit(1);

    if (!ev) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Phiên bản xuất bản của đề thi ${exam.id} không tồn tại.`,
      });
    }

    const isGuestTrial = this.isExamGuestTrialEligible(exam, ev.scoring as Record<string, unknown>);

    // 3. User verification and Guest policy check (Acceptance 5)
    let effectiveUserId: string | null = null;
    let effectiveGuestId: string | null = null;

    if (user) {
      // Registered user must have email verified (T1.3.2, T1.5.2)
      if (!user.emailVerified) {
        throw new ForbiddenException({
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Tài khoản chưa xác minh email. Vui lòng xác minh email trước khi thi.',
        });
      }

      // Check unique open attempt: user cannot have more than 1 in_progress attempt per exam
      const [openAttempt] = await db
        .select({ id: schema.examAttempts.id })
        .from(schema.examAttempts)
        .where(
          and(
            eq(schema.examAttempts.userId, user.userId),
            eq(schema.examAttempts.examId, exam.id),
            eq(schema.examAttempts.status, 'in_progress'),
          ),
        )
        .limit(1);

      if (openAttempt) {
        throw new ConflictException({
          code: 'ATTEMPT_ALREADY_OPEN',
          message: 'Bạn đang có một bài thi chưa nộp cho đề thi này.',
          details: { attemptId: openAttempt.id },
        });
      }

      effectiveUserId = user.userId;
    } else {
      // Unauthenticated guest: strictly check guest trial eligibility
      if (!isGuestTrial) {
        throw new UnauthorizedException({
          code: 'UNAUTHENTICATED',
          message: 'Khách chỉ được phép làm thử các đề thi có gắn cờ guest_trial. Vui lòng đăng nhập.',
        });
      }

      // Verify Turnstile for guest trial (T1.5.13)
      if (turnstileToken) {
        const turnstileRes = await this.turnstileService.verifyToken(turnstileToken, clientIp);
        if (!turnstileRes.success) {
          throw new BadRequestException({
            code: 'TURNSTILE_FAILED',
            message: 'Xác thực Turnstile không thành công.',
          });
        }
      }

      effectiveGuestId = guestId || crypto.randomUUID();

      // Check guest daily limit: max 3 attempts per day per guestId (T1.5.13)
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const [guestCountRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.examAttempts)
        .where(
          and(
            eq(schema.examAttempts.guestId, effectiveGuestId),
            gte(schema.examAttempts.startedAt, oneDayAgo),
          ),
        );

      if ((guestCountRes?.count ?? 0) >= 3) {
        throw new ForbiddenException({
          code: 'RATE_LIMITED',
          message: 'Khách làm thử tối đa 3 lượt thi mỗi ngày. Vui lòng đăng ký tài khoản để tiếp tục.',
        });
      }
    }

    // 4. Calculate total exam duration from sections
    const sections = await db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, exam.id))
      .orderBy(schema.examSections.orderIndex);

    const totalDurationSec =
      sections.reduce((acc: number, s: typeof schema.examSections.$inferSelect) => acc + s.durationSec, 0) || 3600;

    // 5. Generate Lease, Media Token, and Snapshot URL
    const attemptId = generateUuidV7();
    const lease = crypto.randomUUID();
    const now = new Date();
    const nowUnixSec = Math.floor(now.getTime() / 1000);

    const mediaTokenExp = generateAttemptTokenExp(totalDurationSec, nowUnixSec);
    const mediaToken = await signMediaToken(
      {
        a: attemptId,
        e: exam.id,
        v: versionNum,
        k: 'attempt',
        exp: mediaTokenExp,
      },
      this.mediaSecret,
    );

    const snapshotUrl = buildMediaSnapshotUrl(this.getMediaBaseUrl(), exam.id, versionNum, mediaToken);

    // Compute month string (YYYY-MM-01)
    const monthPad = String(now.getUTCMonth() + 1).padStart(2, '0');
    const attemptMonth = `${now.getUTCFullYear()}-${monthPad}-01`;

    // 6. Insert attempt and initial answer sheet in a transaction
    await db.transaction(async (tx: DbTx) => {
      await tx.insert(schema.examAttempts).values({
        id: attemptId,
        userId: effectiveUserId,
        guestId: effectiveGuestId,
        examId: exam.id,
        examVersion: versionNum,
        mode: input.mode,
        status: 'in_progress',
        currentSection: null,
        currentDeadline: null,
        sectionTimes: [],
        leaseId: lease,
        resultFlags: [],
        attemptMonth,
        startedAt: now,
        lastActivityAt: now,
      });

      const totalQuestions = ev.totalQuestions || exam.totalQuestions || 0;
      await tx.insert(schema.attemptAnswerSheets).values({
        attemptId,
        answers: Array(totalQuestions).fill(0),
        flags: Array(totalQuestions).fill(0),
        timeSpentMs: Array(totalQuestions).fill(0),
        lastSeq: 0,
        updatedAt: now,
      });
    });

    return {
      attemptId,
      lease,
      serverNow: now.toISOString(),
      snapshotUrl,
      mediaToken,
      mediaTokenExp,
      status: 'in_progress',
      currentSection: null,
    };
  }

  /**
   * Starts first section or transitions to the next section (EXAM-09, T1.5.3).
   */
  async nextSection(
    attemptId: string,
    input: NextSectionInput,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<NextSectionResponse> {
    const db = this.dbClient.db;
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);

    // Validate lease
    if (attempt.leaseId !== input.lease) {
      throw new ConflictException({
        code: 'LEASE_INVALID',
        message: 'Phiên làm bài (lease) không hợp lệ hoặc đã được mở trên một thiết bị khác.',
      });
    }

    if (attempt.status !== 'in_progress') {
      throw new ConflictException({
        code: 'ATTEMPT_CLOSED',
        message: 'Bài thi đã được nộp hoặc đã đóng.',
      });
    }

    // Fetch exam sections
    const sections = await db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, attempt.examId))
      .orderBy(schema.examSections.orderIndex);

    if (sections.length === 0) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Đề thi không có phần thi nào được định nghĩa.',
      });
    }

    const currentSectionIdx = attempt.currentSection;
    let nextIndex = 0;

    if (currentSectionIdx !== null && currentSectionIdx !== undefined) {
      nextIndex = currentSectionIdx + 1;
    }

    if (nextIndex >= sections.length) {
      throw new ConflictException({
        code: 'NO_MORE_SECTIONS',
        message: 'Không còn phần thi tiếp theo. Vui lòng nộp bài.',
      });
    }

    const targetSection = sections[nextIndex]!;
    const now = new Date();
    const durationSec = targetSection.durationSec;
    const deadline = new Date(now.getTime() + durationSec * 1000);

    const existingTimes = (attempt.sectionTimes as Array<Record<string, unknown>>) || [];
    const updatedTimes = [
      ...existingTimes,
      {
        index: nextIndex,
        code: targetSection.code,
        startedAt: now.toISOString(),
        deadline: deadline.toISOString(),
        durationSec,
      },
    ];

    // Transactionally update section and log event
    await db.transaction(async (tx: DbTx) => {
      await tx
        .update(schema.examAttempts)
        .set({
          currentSection: nextIndex,
          currentDeadline: deadline,
          sectionTimes: updatedTimes,
          lastActivityAt: now,
        })
        .where(eq(schema.examAttempts.id, attemptId));

      await tx.insert(schema.attemptEvents).values({
        id: generateUuidV7(),
        attemptMonth: attempt.attemptMonth,
        attemptId,
        seq: null,
        type: 'section_start',
        payload: {
          sectionIndex: nextIndex,
          code: targetSection.code,
          startedAt: now.toISOString(),
          deadline: deadline.toISOString(),
        },
        at: now,
      });
    });

    return {
      sectionIndex: nextIndex,
      startedAt: now.toISOString(),
      deadline: deadline.toISOString(),
      serverNow: now.toISOString(),
    };
  }

  /**
   * Updates answer sheet safely (SYS-03, Acceptance 1 & 2).
   * ACK is only returned after DB commit succeeds!
   */
  async updateSheet(
    attemptId: string,
    input: AnswerSheetUpdateInput,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<AnswerSheetAck> {
    const db = this.dbClient.db;
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);

    // 1. Lease check
    if (attempt.leaseId !== input.lease) {
      throw new ConflictException({
        code: 'LEASE_INVALID',
        message: 'Lease không hợp lệ.',
      });
    }

    // 2. Status check
    if (attempt.status !== 'in_progress') {
      throw new ConflictException({
        code: 'ATTEMPT_CLOSED',
        message: 'Bài thi đã nộp hoặc đã đóng, không thể cập nhật đáp án.',
      });
    }

    // 3. Section started check (HOP_DONG_KY_THUAT.md Bảng A9: SECTION_NOT_STARTED)
    if (attempt.currentSection === null || attempt.currentSection === undefined) {
      throw new ConflictException({
        code: 'SECTION_NOT_STARTED',
        message: 'Chưa bắt đầu phần thi nào.',
      });
    }

    const now = new Date();

    // 3. Timing evaluation in real mode (Acceptance 1)
    if (attempt.mode === 'real' && attempt.currentDeadline) {
      const timing = evaluateSubmissionTiming({
        now,
        deadline: attempt.currentDeadline,
        mode: 'real',
      });

      if (!timing.isAllowed) {
        throw new UnprocessableEntityException({
          code: 'DEADLINE_PASSED',
          message: 'Thời gian làm bài phần này đã kết thúc.',
        });
      }

      if (timing.flags.includes('late_sync') && !attempt.resultFlags.includes('late_sync')) {
        await db
          .update(schema.examAttempts)
          .set({
            resultFlags: sql`array_append(${schema.examAttempts.resultFlags}, 'late_sync')`,
          })
          .where(eq(schema.examAttempts.id, attemptId));
      }
    }

    // 4. Validate answer sheet dimensions
    const [sheet] = await db
      .select()
      .from(schema.attemptAnswerSheets)
      .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));

    if (!sheet) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Phiếu trả lời không tồn tại.',
      });
    }

    const valResult = validateAnswerSheet(input.answers, {
      totalQuestions: sheet.answers.length,
    });
    if (!valResult.valid) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: valResult.errors.join('; '),
      });
    }

    // 5. In DB Transaction:
    // - Insert changes into attempt_events (ON CONFLICT DO NOTHING for idempotent retries)
    // - Update sheet only if input.seq > sheet.lastSeq (out-of-order seq2 before seq1 handled correctly)
    await db.transaction(async (tx: DbTx) => {
      // Record answer event
      await tx
        .insert(schema.attemptEvents)
        .values({
          id: generateUuidV7(),
          attemptMonth: attempt.attemptMonth,
          attemptId,
          seq: input.seq,
          type: 'answers',
          payload: {
            seq: input.seq,
            answers: input.answers,
            flags: input.flags,
            timeSpentMs: input.timeSpentMs,
            changes: input.changes,
          },
          at: now,
        })
        .onConflictDoNothing();

      // Update answer sheet if incoming seq > current lastSeq
      if (input.seq > sheet.lastSeq) {
        await tx
          .update(schema.attemptAnswerSheets)
          .set({
            answers: input.answers,
            flags: input.flags,
            timeSpentMs: input.timeSpentMs ?? sheet.timeSpentMs,
            lastSeq: input.seq,
            updatedAt: now,
          })
          .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
      }

      await tx
        .update(schema.examAttempts)
        .set({ lastActivityAt: now })
        .where(eq(schema.examAttempts.id, attemptId));
    });

    // 6. ACK ONLY returned after DB commit succeeds! (Acceptance 2)
    const effectiveSeq = Math.max(sheet.lastSeq, input.seq);
    return {
      lastSeq: effectiveSeq,
      serverNow: new Date().toISOString(),
    };
  }

  /**
   * Submits an attempt and calculates final score (EXAM-20, SYS-03, Acceptance 1 & 3).
   */
  async submitAttempt(
    attemptId: string,
    input: AttemptSubmitInput,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<AttemptSubmitResponse> {
    const db = this.dbClient.db;
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);

    // Lease verification
    if (attempt.leaseId !== input.lease) {
      throw new ConflictException({
        code: 'LEASE_INVALID',
        message: 'Lease không hợp lệ.',
      });
    }

    // Use atomic lock and score to ensure race condition with auto-submit job yields identical result
    await this.outboxService.lockAndScoreAttempt(
      attemptId,
      user ? 'user' : 'auto_client',
      [],
      {
        seq: input.seq,
        answers: input.answers,
        flags: input.flags,
        timeSpentMs: input.timeSpentMs,
      },
    );

    // Fetch updated attempt result
    const [submitted] = await db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.id, attemptId));

    return {
      result: submitted!.result as Result,
    };
  }

  /**
   * Resumes an attempt: generates new lease, returns snapshot and sheet state (EXAM-18, SYS-05).
   */
  async resumeAttempt(
    attemptId: string,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<ResumeAttemptResponse> {
    const db = this.dbClient.db;
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);

    const now = new Date();
    const newLease = crypto.randomUUID();

    // Fetch sections for total duration
    const sections = await db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, attempt.examId))
      .orderBy(schema.examSections.orderIndex);
    const totalDurationSec =
      sections.reduce((acc: number, s: typeof schema.examSections.$inferSelect) => acc + s.durationSec, 0) || 3600;

    const mediaTokenExp = generateAttemptTokenExp(totalDurationSec, Math.floor(now.getTime() / 1000));
    const mediaToken = await signMediaToken(
      {
        a: attempt.id,
        e: attempt.examId,
        v: attempt.examVersion,
        k: 'attempt',
        exp: mediaTokenExp,
      },
      this.mediaSecret,
    );

    const snapshotUrl = buildMediaSnapshotUrl(
      this.getMediaBaseUrl(),
      attempt.examId,
      attempt.examVersion,
      mediaToken,
    );

    // Update lease and log event
    await db.transaction(async (tx: DbTx) => {
      await tx
        .update(schema.examAttempts)
        .set({
          leaseId: newLease,
          lastActivityAt: now,
        })
        .where(eq(schema.examAttempts.id, attemptId));

      await tx.insert(schema.attemptEvents).values({
        id: generateUuidV7(),
        attemptMonth: attempt.attemptMonth,
        attemptId,
        seq: null,
        type: 'resume',
        payload: { lease: newLease },
        at: now,
      });
    });

    const [sheet] = await db
      .select()
      .from(schema.attemptAnswerSheets)
      .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));

    return {
      lease: newLease,
      lastSeq: sheet?.lastSeq ?? 0,
      answers: sheet?.answers ?? [],
      flags: sheet?.flags ?? [],
      status: attempt.status as AttemptStatus,
      currentSection: attempt.currentSection,
      deadline: attempt.currentDeadline?.toISOString() ?? null,
      serverNow: now.toISOString(),
      snapshotUrl,
      mediaToken,
      mediaTokenExp,
    };
  }

  /**
   * Refreshes media token for an active attempt (A11, SYS-20).
   */
  async getMediaToken(
    attemptId: string,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<MediaTokenResponse> {
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);
    const nowUnixSec = Math.floor(Date.now() / 1000);
    const mediaTokenExp =
      attempt.status === 'submitted'
        ? generateReviewTokenExp(nowUnixSec)
        : generateAttemptTokenExp(7200, nowUnixSec);

    const mediaToken = await signMediaToken(
      {
        a: attempt.id,
        e: attempt.examId,
        v: attempt.examVersion,
        k: attempt.status === 'submitted' ? 'review' : 'attempt',
        exp: mediaTokenExp,
      },
      this.mediaSecret,
    );

    return {
      mediaToken,
      mediaTokenExp,
    };
  }

  /**
   * Reads attempt detail: strictly no answer leaks before submit (Acceptance 3).
   */
  async getAttemptDetail(
    attemptId: string,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<AttemptDetailResponse> {
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);
    const nowIso = new Date().toISOString();

    if (attempt.status === 'in_progress') {
      return {
        status: 'in_progress',
        mode: attempt.mode as AttemptMode,
        currentSection: attempt.currentSection,
        deadline: attempt.currentDeadline?.toISOString() ?? null,
        serverNow: nowIso,
      };
    }

    const db = this.dbClient.db;
    let result = attempt.result as Result | undefined;
    if (attempt.status === 'submitted' && result) {
      const [sheet] = await db
        .select({ timeSpentMs: schema.attemptAnswerSheets.timeSpentMs })
        .from(schema.attemptAnswerSheets)
        .where(eq(schema.attemptAnswerSheets.attemptId, attemptId))
        .limit(1);
      if (sheet?.timeSpentMs) {
        result = { ...result, timeSpentMs: sheet.timeSpentMs } as unknown as Result;
      }
    }

    return {
      status: 'submitted',
      mode: attempt.mode as AttemptMode,
      currentSection: attempt.currentSection,
      deadline: attempt.currentDeadline?.toISOString() ?? null,
      serverNow: nowIso,
      result,
    };
  }

  /**
   * Reviews attempt after submission with correct answers (Acceptance 3).
   */
  async reviewAttempt(
    attemptId: string,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<ReviewAttemptResponse> {
    const db = this.dbClient.db;
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);

    // Only allowed AFTER submission!
    if (attempt.status !== 'submitted') {
      throw new ConflictException({
        code: 'ATTEMPT_NOT_SUBMITTED',
        message: 'Chỉ có thể xem lại bài thi sau khi đã nộp bài.',
      });
    }

    // Acceptance 3: Event chưa kết thúc không lộ answer kể cả early submit/review
    const [eventAttempt] = await db
      .select({
        eventId: schema.eventAttempts.eventId,
        resultReleaseAt: schema.examEvents.resultReleaseAt,
      })
      .from(schema.eventAttempts)
      .innerJoin(schema.examEvents, eq(schema.examEvents.id, schema.eventAttempts.eventId))
      .where(eq(schema.eventAttempts.attemptId, attemptId))
      .limit(1);

    if (eventAttempt && new Date() < eventAttempt.resultReleaseAt) {
      throw new ForbiddenException({
        code: 'RESULTS_EMBARGOED',
        message: 'Kết quả sự kiện thi chưa được công bố. Không thể xem lại đáp án trước thời điểm công bố kết quả.',
      });
    }

    const { answerKey } = await this.scoringService.getExamScoringData(
      attempt.examId,
      attempt.examVersion,
    );

    const [sheet] = await db
      .select()
      .from(schema.attemptAnswerSheets)
      .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));

    const nowUnixSec = Math.floor(Date.now() / 1000);
    const mediaTokenExp = generateReviewTokenExp(nowUnixSec);
    const mediaToken = await signMediaToken(
      {
        a: attempt.id,
        e: attempt.examId,
        v: attempt.examVersion,
        k: 'review',
        exp: mediaTokenExp,
      },
      this.mediaSecret,
    );

    const snapshotUrl = buildMediaSnapshotUrl(
      this.getMediaBaseUrl(),
      attempt.examId,
      attempt.examVersion,
      mediaToken,
    );

    const resultWithPacing = {
      ...(attempt.result as Result),
      timeSpentMs: sheet?.timeSpentMs ?? [],
    } as unknown as Result;

    return {
      snapshotUrl,
      mediaToken,
      answers: sheet?.answers ?? [],
      flags: sheet?.flags ?? [],
      correct: answerKey.keys,
      result: resultWithPacing,
    };
  }

  /**
   * Practice check for answered question (V2).
   */
  async checkAnswer(
    attemptId: string,
    input: CheckAnswerInput,
    user?: AuthUserContext,
    guestId?: string,
  ): Promise<CheckAnswerResponse> {
    const db = this.dbClient.db;
    const attempt = await this.getAttemptAndVerifyOwnership(attemptId, user, guestId);

    if (attempt.leaseId !== input.lease) {
      throw new ConflictException({
        code: 'LEASE_INVALID',
        message: 'Lease không hợp lệ.',
      });
    }

    if (attempt.mode !== 'practice') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Không thể kiểm tra từng câu trong chế độ thi thật.',
      });
    }

    const [sheet] = await db
      .select()
      .from(schema.attemptAnswerSheets)
      .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));

    const userVal = sheet?.answers[input.index] ?? 0;
    if (userVal === 0) {
      throw new UnprocessableEntityException({
        code: 'QUESTION_UNANSWERED',
        message: 'Chưa chọn đáp án cho câu hỏi này.',
      });
    }

    const { answerKey } = await this.scoringService.getExamScoringData(
      attempt.examId,
      attempt.examVersion,
    );

    const correctVal = answerKey.keys[input.index] ?? 0;

    // Check if approved explanation exists for this question
    let explanationText: string | undefined = undefined;
    const [item] = await db
      .select({ questionId: schema.examItems.questionId })
      .from(schema.examItems)
      .where(
        and(
          eq(schema.examItems.examId, attempt.examId),
          eq(schema.examItems.orderIndex, input.index),
        ),
      )
      .limit(1);

    if (item) {
      const [exp] = await db
        .select({ content: schema.explanationVersions.content })
        .from(schema.explanationVersions)
        .where(
          and(
            eq(schema.explanationVersions.questionId, item.questionId),
            eq(schema.explanationVersions.status, 'approved'),
          ),
        )
        .orderBy(desc(schema.explanationVersions.version))
        .limit(1);

      if (exp?.content) {
        const c = exp.content as Record<string, unknown>;
        if (typeof c['correctReason'] === 'string') {
          explanationText = c['correctReason'];
        } else if (Array.isArray(c['correctReason']) && c['correctReason'].length > 0) {
          const first = c['correctReason'][0] as Record<string, unknown>;
          if (typeof first?.['text'] === 'string') {
            explanationText = first['text'];
          }
        } else if (
          c['correctReason'] &&
          typeof (c['correctReason'] as Record<string, unknown>)['text'] === 'string'
        ) {
          explanationText = (c['correctReason'] as Record<string, unknown>)['text'] as string;
        }
      }
    }

    return {
      index: input.index,
      correct: userVal === correctVal,
      ...(explanationText ? { explanation: explanationText } : {}),
    };
  }

  /**
   * Lists attempts for current authenticated user.
   */
  async listUserAttempts(userId: string, cursor?: string, limit = 20) {
    const db = this.dbClient.db;
    const items = await db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, userId))
      .orderBy(desc(schema.examAttempts.startedAt))
      .limit(limit + 1);

    const hasNext = items.length > limit;
    const returnItems = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext && returnItems.length > 0 ? returnItems[returnItems.length - 1]!.id : null;

    const formatted = returnItems.map((a: typeof schema.examAttempts.$inferSelect) => {
      const res = a.result as Record<string, unknown> | null;
      const scoring = res?.['scoring'] as Record<string, unknown> | undefined;
      return {
        id: a.id,
        examId: a.examId,
        examVersion: a.examVersion,
        mode: a.mode as AttemptMode,
        status: a.status as AttemptStatus,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        score: (scoring?.['total'] as number | undefined) ?? null,
        passed: (scoring?.['passEstimate'] as boolean | undefined) ?? null,
        sections: (scoring?.['sections'] as unknown[]) ?? null,
        failedSections: (scoring?.['failedSections'] as string[]) ?? [],
        isEstimated: (scoring?.['isEstimated'] as boolean) ?? true,
        label: (scoring?.['label'] as string) ?? 'ước lượng',
      };
    });

    return {
      items: formatted,
      nextCursor,
    };
  }

  /**
   * Attaches guest trial attempts to registered account (Acceptance 5).
   * Strictly isolates attempts: only attaches WHERE guest_id = :guestId AND user_id IS NULL!
   */
  async attachGuestAttempts(userId: string, targetGuestId: string): Promise<number> {
    if (!targetGuestId || typeof targetGuestId !== 'string') {
      return 0;
    }

    const db = this.dbClient.db;

    // Execute atomic update
    const updated = await db
      .update(schema.examAttempts)
      .set({
        userId,
        guestId: null,
      })
      .where(
        and(
          eq(schema.examAttempts.guestId, targetGuestId),
          isNull(schema.examAttempts.userId),
        ),
      )
      .returning({ id: schema.examAttempts.id });

    return updated.length;
  }

  /**
   * Helper to verify ownership of an attempt.
   */
  private async getAttemptAndVerifyOwnership(
    attemptId: string,
    user?: AuthUserContext,
    guestId?: string,
  ) {
    const db = this.dbClient.db;
    const [attempt] = await db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy lượt thi.',
      });
    }

    // Ownership check
    const isOwner =
      (user && attempt.userId === user.userId) ||
      (guestId && attempt.guestId === guestId);

    if (!isOwner) {
      // In accordance with security: return 404 to avoid leaking existence of attempts to other users
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy lượt thi.',
      });
    }

    return attempt;
  }
}
