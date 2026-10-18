import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { EmailService } from '../email/email.service.js';
import { jlptExamSchedules } from '../exam/jlpt-schedule.schema.js';

export interface QuietHours {
  start: string; // "HH:mm" e.g. "22:00"
  end: string;   // "HH:mm" e.g. "07:00"
}

export interface UserNotificationPreferencesData {
  version: number;
  emailUpdates: boolean;
  examReminders: boolean;
  studyStreakAlerts: boolean;
  typeSettings: Record<string, boolean>;
  quietHours: QuietHours;
  timezone: string;
}

export interface DispatchNotificationParams {
  recipientId: string;
  type: string;
  channel?: 'email' | 'push' | 'in_app';
  payload: Record<string, unknown>;
  isCritical?: boolean;
  dedupeKey?: string;
  now?: Date;
}

export interface DispatchNotificationResult {
  status: 'delivered' | 'deferred_quiet_hours' | 'opted_out' | 'duplicate_suppressed' | 'queued';
  delivered: boolean;
  jobId?: string;
  scheduledFor?: string;
  reason?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly emailService: EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Preferences Management (NOTI-10)
  // ---------------------------------------------------------------------------

  /**
   * Retrieves notification preferences for a user with default fallbacks.
   */
  async getPreferences(userId: string): Promise<UserNotificationPreferencesData> {
    const db = this.dbClient.db;

    // Fetch user for timezone
    const [user] = await db
      .select({
        timezone: schema.users.timezone,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy người dùng.',
      });
    }

    // Fetch user profile metadata for quietHours
    const [profile] = await db
      .select({ metadata: schema.userProfiles.metadata })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId))
      .limit(1);

    const profileMeta = (profile?.metadata || {}) as Record<string, unknown>;
    const quietHours: QuietHours = (profileMeta['quietHours'] as QuietHours) || {
      start: '22:00',
      end: '07:00',
    };

    // Fetch channel & type preferences
    const prefs = await db
      .select()
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.userId, userId));

    const typeSettings: Record<string, boolean> = {
      practice_reminder: true,
      new_exam: true,
      srs_due: true,
      weekly_stats: true,
      target_exam_reminder: true,
      exam_result_released: true,
      payment_status: true,
      jlpt_registration_reminder: true,
      jlpt_exam_reminder: true,
    };

    let emailUpdates = true;
    let examReminders = true;
    let studyStreakAlerts = true;

    for (const p of prefs) {
      if (p.channel === 'email' && p.notificationType === 'general_updates') {
        emailUpdates = p.enabled;
      }
      if (
        p.notificationType === 'exam_reminders' ||
        p.notificationType === 'target_exam_reminder' ||
        p.notificationType === 'jlpt_registration_reminder' ||
        p.notificationType === 'jlpt_exam_reminder'
      ) {
        if (!p.enabled) {
          examReminders = false;
        }
      }
      if (p.notificationType === 'study_streak' || p.notificationType === 'srs_due') {
        studyStreakAlerts = p.enabled;
      }
      typeSettings[p.notificationType] = p.enabled;
    }

    return {
      version: 1,
      emailUpdates,
      examReminders,
      studyStreakAlerts,
      typeSettings,
      quietHours,
      timezone: user.timezone || 'Asia/Ho_Chi_Minh',
    };
  }

  /**
   * Updates notification preferences. Idempotent upsert.
   */
  async updatePreferences(
    userId: string,
    update: Partial<UserNotificationPreferencesData>,
  ): Promise<UserNotificationPreferencesData> {
    const db = this.dbClient.db;

    // 1. Update timezone if provided
    if (update.timezone) {
      await db
        .update(schema.users)
        .set({ timezone: update.timezone })
        .where(eq(schema.users.id, userId));
    }

    // 2. Update quietHours in user_profiles
    if (update.quietHours) {
      const [existingProfile] = await db
        .select({ metadata: schema.userProfiles.metadata })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);

      const currentMeta = (existingProfile?.metadata || {}) as Record<string, unknown>;
      const newMeta = { ...currentMeta, quietHours: update.quietHours };

      await db
        .insert(schema.userProfiles)
        .values({
          userId,
          metadata: newMeta,
        })
        .onConflictDoUpdate({
          target: [schema.userProfiles.userId],
          set: { metadata: newMeta },
        });
    }

    // 3. Upsert specific channel/type settings
    const upsertSetting = async (channel: string, notificationType: string, enabled: boolean) => {
      await db
        .insert(schema.notificationPreferences)
        .values({
          userId,
          channel,
          notificationType,
          enabled,
        })
        .onConflictDoUpdate({
          target: [
            schema.notificationPreferences.userId,
            schema.notificationPreferences.channel,
            schema.notificationPreferences.notificationType,
          ],
          set: { enabled },
        });
    };

    if (update.emailUpdates !== undefined) {
      await upsertSetting('email', 'general_updates', update.emailUpdates);
    }
    if (update.examReminders !== undefined) {
      await upsertSetting('email', 'target_exam_reminder', update.examReminders);
      await upsertSetting('email', 'new_exam', update.examReminders);
      await upsertSetting('email', 'jlpt_registration_reminder', update.examReminders);
      await upsertSetting('email', 'jlpt_exam_reminder', update.examReminders);
      await upsertSetting('in_app', 'target_exam_reminder', update.examReminders);
      await upsertSetting('in_app', 'jlpt_registration_reminder', update.examReminders);
      await upsertSetting('in_app', 'jlpt_exam_reminder', update.examReminders);
    }
    if (update.studyStreakAlerts !== undefined) {
      await upsertSetting('email', 'srs_due', update.studyStreakAlerts);
      await upsertSetting('in_app', 'srs_due', update.studyStreakAlerts);
    }

    if (update.typeSettings) {
      for (const [type, enabled] of Object.entries(update.typeSettings)) {
        await upsertSetting('email', type, enabled);
        await upsertSetting('in_app', type, enabled);
      }
    }

    return this.getPreferences(userId);
  }

  // ---------------------------------------------------------------------------
  // Quiet Hours Calculation (Acceptance 3)
  // ---------------------------------------------------------------------------

  /**
   * Determines if a given date/time falls within user's quiet hours for their timezone.
   */
  isInQuietHours(now: Date, quietHours: QuietHours, timezone: string): boolean {
    // Format hour and minute in user's timezone, with fallback for invalid timezone
    let formatter: Intl.DateTimeFormat;
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
    } catch {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
    }

    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
    const minutePart = parts.find((p) => p.type === 'minute')?.value ?? '0';

    const currentMinuteOfDay = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

    const [startH, startM] = quietHours.start.split(':').map((s) => parseInt(s, 10));
    const [endH, endM] = quietHours.end.split(':').map((s) => parseInt(s, 10));

    const startMinuteOfDay = (startH ?? 22) * 60 + (startM ?? 0);
    const endMinuteOfDay = (endH ?? 7) * 60 + (endM ?? 0);

    if (startMinuteOfDay < endMinuteOfDay) {
      // Quiet hours do NOT span midnight (e.g. 01:00 to 06:00)
      return currentMinuteOfDay >= startMinuteOfDay && currentMinuteOfDay < endMinuteOfDay;
    } else {
      // Quiet hours SPAN midnight (e.g. 22:00 to 07:00)
      return currentMinuteOfDay >= startMinuteOfDay || currentMinuteOfDay < endMinuteOfDay;
    }
  }

  /**
   * Computes the Date timestamp when current quiet hours end in user's timezone.
   */
  getNextQuietHoursEnd(now: Date, quietHours: QuietHours, timezone: string): Date {
    // Advance hour-by-hour until out of quiet hours
    let testDate = new Date(now.getTime() + 15 * 60 * 1000);
    for (let i = 0; i < 48; i++) {
      if (!this.isInQuietHours(testDate, quietHours, timezone)) {
        return testDate;
      }
      testDate = new Date(testDate.getTime() + 30 * 60 * 1000);
    }
    return new Date(now.getTime() + 8 * 3600 * 1000);
  }

  // ---------------------------------------------------------------------------
  // Notification Dispatch & Delivery (NOTI-03..NOTI-10)
  // Acceptance 3: Thông báo opt-out quiet hours idempotent
  // ---------------------------------------------------------------------------

  /**
   * Dispatches a notification respecting opt-out preferences, quiet hours, and idempotency.
   */
  async dispatchNotification(params: DispatchNotificationParams): Promise<DispatchNotificationResult> {
    const db = this.dbClient.db;
    const now = params.now ?? new Date();
    const channel = params.channel || 'email';

    // 1. Check Opt-Out
    const prefs = await this.getPreferences(params.recipientId);
    if (params.type in prefs.typeSettings && prefs.typeSettings[params.type] === false) {
      return {
        status: 'opted_out',
        delivered: false,
        reason: `Người dùng đã tắt nhận thông báo loại ${params.type}`,
      };
    }
    if (channel === 'email' && !prefs.emailUpdates && !params.isCritical) {
      return {
        status: 'opted_out',
        delivered: false,
        reason: 'Người dùng đã tắt nhận thông báo qua email.',
      };
    }

    // 2. Check Idempotency (Deduplication)
    if (params.dedupeKey) {
      const existingJobs = await db
        .select()
        .from(schema.notificationJobs)
        .where(
          and(
            eq(schema.notificationJobs.recipientId, params.recipientId),
            eq(schema.notificationJobs.type, params.type),
          ),
        )
        .orderBy(desc(schema.notificationJobs.scheduledFor))
        .limit(10);

      const isDuplicate = existingJobs.some((j: typeof schema.notificationJobs.$inferSelect) => {
        const payload = j.payload as Record<string, unknown>;
        return payload?.['dedupeKey'] === params.dedupeKey;
      });

      if (isDuplicate) {
        return {
          status: 'duplicate_suppressed',
          delivered: false,
          reason: 'Thông báo đã được lập lịch hoặc gửi trước đó với cùng dedupeKey.',
        };
      }
    }

    // 3. Check Quiet Hours (unless critical)
    if (!params.isCritical && this.isInQuietHours(now, prefs.quietHours, prefs.timezone)) {
      const nextEnd = this.getNextQuietHoursEnd(now, prefs.quietHours, prefs.timezone);
      const jobId = generateUuidV7();

      await db.insert(schema.notificationJobs).values({
        id: jobId,
        recipientId: params.recipientId,
        type: params.type,
        channel,
        payload: { ...params.payload, dedupeKey: params.dedupeKey },
        status: 'queued',
        scheduledFor: nextEnd,
      });

      return {
        status: 'deferred_quiet_hours',
        delivered: false,
        jobId,
        scheduledFor: nextEnd.toISOString(),
        reason: 'Đang trong khung giờ yên tĩnh của người dùng; đã hoãn lịch gửi.',
      };
    }

    // 4. Immediate Delivery
    const jobId = generateUuidV7();
    await db.insert(schema.notificationJobs).values({
      id: jobId,
      recipientId: params.recipientId,
      type: params.type,
      channel,
      payload: { ...params.payload, dedupeKey: params.dedupeKey },
      status: 'queued',
      scheduledFor: now,
    });

    // Execute delivery
    try {
      if (channel === 'email') {
        const [recipient] = await db
          .select({ email: schema.users.email, name: schema.users.name })
          .from(schema.users)
          .where(eq(schema.users.id, params.recipientId))
          .limit(1);

        if (recipient) {
          const subject = (params.payload['subject'] as string) || `[JLPT Online] Thông báo ${params.type}`;
          const message = (params.payload['message'] as string) || '';
          await this.emailService.sendEmail({
            to: recipient.email,
            subject,
            text: message,
            html: `<p>${message}</p>`,
          });
        }
      }

      // Mark delivered in DB
      await db.insert(schema.notificationDeliveries).values({
        id: generateUuidV7(),
        jobId,
        status: 'delivered',
        providerResponse: 'OK',
        attemptedAt: now,
      });

      await db
        .update(schema.notificationJobs)
        .set({ status: 'delivered' })
        .where(eq(schema.notificationJobs.id, jobId));

      return {
        status: 'delivered',
        delivered: true,
        jobId,
      };
    } catch (err: unknown) {
      await db.insert(schema.notificationDeliveries).values({
        id: generateUuidV7(),
        jobId,
        status: 'failed',
        providerResponse: err instanceof Error ? err.message : String(err),
        attemptedAt: now,
      });

      return {
        status: 'queued',
        delivered: false,
        jobId,
        reason: 'Lỗi gửi qua nhà cung cấp, giữ trạng thái queued để thử lại.',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Concrete Notification Senders (NOTI-03..NOTI-09)
  // ---------------------------------------------------------------------------

  /**
   * NOTI-03: Nhắc tiếp tục bài luyện dang dở.
   */
  async sendPracticeReminder(userId: string, attemptId: string) {
    return this.dispatchNotification({
      recipientId: userId,
      type: 'practice_reminder',
      payload: {
        attemptId,
        subject: 'Bạn có bài luyện tập JLPT đang làm dở',
        message: 'Hãy tiếp tục hoàn thành bài luyện tập để củng cố kiến thức nhé!',
      },
      dedupeKey: `practice_${attemptId}`,
    });
  }

  /**
   * NOTI-04: Thông báo có đề mới.
   */
  async sendNewExamNotification(userId: string, examId: string, examTitle: string) {
    return this.dispatchNotification({
      recipientId: userId,
      type: 'new_exam',
      payload: {
        examId,
        examTitle,
        subject: `Có đề thi mới: ${examTitle}`,
        message: `Hệ thống vừa cập nhật đề thi mới: ${examTitle}. Hãy vào thử sức ngay!`,
      },
      dedupeKey: `new_exam_${examId}_${userId}`,
    });
  }

  /**
   * NOTI-05: Nhắc ôn các từ đến hạn SRS.
   */
  async sendSrsDueNotification(userId: string, dueCount: number) {
    const today = new Date().toISOString().slice(0, 10);
    return this.dispatchNotification({
      recipientId: userId,
      type: 'srs_due',
      payload: {
        dueCount,
        subject: `Bạn có ${dueCount} thẻ từ vựng cần ôn hôm nay`,
        message: `Hôm nay bạn có ${dueCount} thẻ từ vựng/ngữ pháp đến hạn ôn tập SRS.`,
      },
      dedupeKey: `srs_due_${userId}_${today}`,
    });
  }

  /**
   * NOTI-06: Thống kê kết quả tuần.
   */
  async sendWeeklyStatsNotification(userId: string, stats: Record<string, unknown>) {
    const week = new Date().toISOString().slice(0, 10);
    return this.dispatchNotification({
      recipientId: userId,
      type: 'weekly_stats',
      payload: {
        stats,
        subject: 'Báo cáo tiến độ học tập tuần qua của bạn',
        message: 'Cùng xem lại thành tích luyện thi JLPT trong tuần vừa rồi nhé!',
      },
      dedupeKey: `weekly_stats_${userId}_${week}`,
    });
  }

  /**
   * NOTI-07: Nhắc lịch thi mục tiêu.
   */
  async sendTargetExamReminder(userId: string, daysLeft: number) {
    const today = new Date().toISOString().slice(0, 10);
    return this.dispatchNotification({
      recipientId: userId,
      type: 'target_exam_reminder',
      payload: {
        daysLeft,
        subject: `Chỉ còn ${daysLeft} ngày đến kỳ thi JLPT!`,
        message: `Thời gian đếm ngược: còn ${daysLeft} ngày đến ngày thi mục tiêu của bạn. Hãy giữ vững phong độ!`,
      },
      dedupeKey: `target_reminder_${userId}_${today}`,
    });
  }

  /**
   * NOTI-08: Thông báo kết quả thi thử đồng loạt.
   */
  async sendExamResultReleasedNotification(userId: string, eventId: string) {
    return this.dispatchNotification({
      recipientId: userId,
      type: 'exam_result_released',
      payload: {
        eventId,
        subject: 'Kết quả thi thử đồng loạt đã được công bố',
        message: 'Điểm số và xếp hạng của đợt thi thử đồng loạt đã chính thức mở. Hãy vào xem chi tiết bài thi!',
      },
      dedupeKey: `result_released_${eventId}_${userId}`,
    });
  }

  /**
   * NOTI-09: Thông báo tình trạng thanh toán (giao dịch khẩn cấp, bypass quiet hours).
   */
  async sendPaymentStatusNotification(userId: string, orderId: string, status: string) {
    return this.dispatchNotification({
      recipientId: userId,
      type: 'payment_status',
      isCritical: true, // Critical transactional notification
      payload: {
        orderId,
        paymentStatus: status,
        subject: `Thông báo trạng thái đơn hàng #${orderId}`,
        message: `Trạng thái thanh toán cho đơn hàng #${orderId}: ${status}.`,
      },
      dedupeKey: `payment_${orderId}_${status}`,
    });
  }

  /**
   * P03: Nhắc hạn đăng ký kỳ thi JLPT tại Việt Nam.
   * Gửi qua outbox đúng một lần cho từng mốc nhắc (ví dụ: 1d, 7d, 14d),
   * chỉ gửi khi hạn đăng ký còn hiệu lực trong tương lai (diffMs > 0),
   * và tôn trọng cài đặt tắt nhắc của người dùng (truy vấn batch preferences, không N+1).
   */
  async processJlptRegistrationReminders(options?: { scheduleId?: string; now?: Date }): Promise<{
    sent: number;
    skippedOptOut: number;
    skippedDuplicate: number;
    eventIds: string[];
  }> {
    const db = this.dbClient.db;
    const now = options?.now ?? new Date();

    // 1. Fetch published schedules
    const schedules = await db
      .select()
      .from(jlptExamSchedules)
      .where(eq(jlptExamSchedules.status, 'published'));

    const filteredSchedules = options?.scheduleId
      ? schedules.filter((s: typeof jlptExamSchedules.$inferSelect) => s.id === options.scheduleId)
      : schedules;

    if (filteredSchedules.length === 0) {
      return { sent: 0, skippedOptOut: 0, skippedDuplicate: 0, eventIds: [] };
    }

    // 2. Fetch all active users
    const allUsers = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
      .from(schema.users)
      .where(isNull(schema.users.blockedAt));

    // Batch fetch disabled preferences for all users (solves N+1 query issue)
    const disabledPrefs = await db
      .select({
        userId: schema.notificationPreferences.userId,
        notificationType: schema.notificationPreferences.notificationType,
      })
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.enabled, false));

    const userDisabledTypes = new Map<string, Set<string>>();
    for (const row of disabledPrefs) {
      let set = userDisabledTypes.get(row.userId);
      if (!set) {
        set = new Set();
        userDisabledTypes.set(row.userId, set);
      }
      set.add(row.notificationType);
    }

    // 3. Pre-fetch existing outbox rows with registration reminder topic to deduplicate in-memory
    const existingOutboxRows = await db
      .select()
      .from(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_registration_reminder'));

    const existingDedupeKeys = new Set<string>();
    for (const row of existingOutboxRows) {
      const payload = row.payload as Record<string, unknown>;
      if (payload?.['dedupeKey']) {
        existingDedupeKeys.add(String(payload['dedupeKey']));
      }
    }

    let sent = 0;
    let skippedOptOut = 0;
    let skippedDuplicate = 0;
    const eventIds: string[] = [];

    for (const schedule of filteredSchedules) {
      const deadline = new Date(schedule.registrationDeadline);
      const diffMs = deadline.getTime() - now.getTime();
      // Chỉ gửi khi hạn chót còn hiệu lực trong tương lai (diffMs > 0)
      if (diffMs <= 0) {
        continue;
      }

      const daysLeft = Math.ceil(diffMs / (24 * 3600 * 1000));
      // Nằm trong cửa sổ nhắc quy định (tối đa 14 ngày)
      if (daysLeft > 14) {
        continue;
      }

      // Mốc thời gian nhắc (windowKey): '1d', '7d', '14d'
      let windowKey = '14d';
      if (daysLeft <= 1) {
        windowKey = '1d';
      } else if (daysLeft <= 7) {
        windowKey = '7d';
      }

      for (const user of allUsers) {
        // a. Check opt-out từ batch preferences: tôn trọng cài đặt tắt nhắc
        const disabled = userDisabledTypes.get(user.id);
        const isOptedOut = !!(
          disabled &&
          (disabled.has('exam_reminders') ||
            disabled.has('target_exam_reminder') ||
            disabled.has('jlpt_registration_reminder'))
        );

        if (isOptedOut) {
          skippedOptOut++;
          continue;
        }

        // b. Deduplication check với windowKey: đúng một lần cho mỗi mốc nhắc
        const dedupeKey = `jlpt_reg_reminder_${schedule.id}_${user.id}_${windowKey}`;
        if (existingDedupeKeys.has(dedupeKey)) {
          skippedDuplicate++;
          continue;
        }

        // c. Emit outbox event
        const eventId = generateUuidV7();
        const payload = {
          dedupeKey,
          windowKey,
          recipientId: user.id,
          recipientEmail: user.email,
          scheduleId: schedule.id,
          title: schedule.title,
          examDate: schedule.examDate,
          registrationDeadline: deadline.toISOString(),
          daysLeft,
          officialUrl: schedule.officialUrl,
          subject: `[Nhắc hạn đăng ký] Kỳ thi JLPT: ${schedule.title}`,
          message: `Kỳ thi JLPT ${schedule.title} sắp hết hạn đăng ký! Còn ${daysLeft} ngày (hạn chót: ${deadline.toISOString()}). Đăng ký tại: ${schedule.officialUrl}`,
        };

        await db.insert(schema.outbox).values({
          id: eventId,
          topic: 'notification.jlpt_registration_reminder',
          payload,
          createdAt: now,
        });

        // Also record in notificationJobs
        await db.insert(schema.notificationJobs).values({
          id: generateUuidV7(),
          recipientId: user.id,
          type: 'jlpt_registration_reminder',
          channel: 'email',
          payload,
          status: 'delivered',
          scheduledFor: now,
        });

        existingDedupeKeys.add(dedupeKey);
        eventIds.push(eventId);
        sent++;
      }
    }

    return { sent, skippedOptOut, skippedDuplicate, eventIds };
  }

  /**
   * P03: Nhắc ngày thi JLPT tại Việt Nam.
   * Gửi qua outbox đúng một lần cho từng mốc nhắc (ví dụ: 1d, 3d, 7d, 30d, 60d, 90d),
   * chỉ gửi khi ngày thi còn hiệu lực trong tương lai (diffMs > 0),
   * và tôn trọng cài đặt tắt nhắc của người dùng (truy vấn batch preferences, không N+1).
   */
  async processJlptExamDateReminders(options?: { scheduleId?: string; now?: Date }): Promise<{
    sent: number;
    skippedOptOut: number;
    skippedDuplicate: number;
    eventIds: string[];
  }> {
    const db = this.dbClient.db;
    const now = options?.now ?? new Date();

    const schedules = await db
      .select()
      .from(jlptExamSchedules)
      .where(eq(jlptExamSchedules.status, 'published'));

    const filteredSchedules = options?.scheduleId
      ? schedules.filter((s: typeof jlptExamSchedules.$inferSelect) => s.id === options.scheduleId)
      : schedules;

    if (filteredSchedules.length === 0) {
      return { sent: 0, skippedOptOut: 0, skippedDuplicate: 0, eventIds: [] };
    }

    const allUsers = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
      .from(schema.users)
      .where(isNull(schema.users.blockedAt));

    // Batch fetch disabled preferences for all users (solves N+1 query issue)
    const disabledPrefs = await db
      .select({
        userId: schema.notificationPreferences.userId,
        notificationType: schema.notificationPreferences.notificationType,
      })
      .from(schema.notificationPreferences)
      .where(eq(schema.notificationPreferences.enabled, false));

    const userDisabledTypes = new Map<string, Set<string>>();
    for (const row of disabledPrefs) {
      let set = userDisabledTypes.get(row.userId);
      if (!set) {
        set = new Set();
        userDisabledTypes.set(row.userId, set);
      }
      set.add(row.notificationType);
    }

    const existingOutboxRows = await db
      .select()
      .from(schema.outbox)
      .where(eq(schema.outbox.topic, 'notification.jlpt_exam_reminder'));

    const existingDedupeKeys = new Set<string>();
    for (const row of existingOutboxRows) {
      const payload = row.payload as Record<string, unknown>;
      if (payload?.['dedupeKey']) {
        existingDedupeKeys.add(String(payload['dedupeKey']));
      }
    }

    let sent = 0;
    let skippedOptOut = 0;
    let skippedDuplicate = 0;
    const eventIds: string[] = [];

    for (const schedule of filteredSchedules) {
      const examDate = new Date(`${schedule.examDate}T00:00:00Z`);
      const diffMs = examDate.getTime() - now.getTime();
      // Chỉ gửi khi ngày thi còn trong tương lai (diffMs > 0)
      if (diffMs <= 0) {
        continue;
      }

      const daysLeft = Math.ceil(diffMs / (24 * 3600 * 1000));
      // Nằm trong cửa sổ nhắc ngày thi (tối đa 90 ngày)
      if (daysLeft > 90) {
        continue;
      }

      let windowKey = '90d';
      if (daysLeft <= 1) {
        windowKey = '1d';
      } else if (daysLeft <= 3) {
        windowKey = '3d';
      } else if (daysLeft <= 7) {
        windowKey = '7d';
      } else if (daysLeft <= 30) {
        windowKey = '30d';
      } else if (daysLeft <= 60) {
        windowKey = '60d';
      }

      for (const user of allUsers) {
        const disabled = userDisabledTypes.get(user.id);
        const isOptedOut = !!(
          disabled &&
          (disabled.has('exam_reminders') ||
            disabled.has('target_exam_reminder') ||
            disabled.has('jlpt_exam_reminder'))
        );

        if (isOptedOut) {
          skippedOptOut++;
          continue;
        }

        const dedupeKey = `jlpt_exam_date_reminder_${schedule.id}_${user.id}_${windowKey}`;
        if (existingDedupeKeys.has(dedupeKey)) {
          skippedDuplicate++;
          continue;
        }

        const eventId = generateUuidV7();
        const payload = {
          dedupeKey,
          windowKey,
          recipientId: user.id,
          recipientEmail: user.email,
          scheduleId: schedule.id,
          title: schedule.title,
          examDate: schedule.examDate,
          daysLeft,
          officialUrl: schedule.officialUrl,
          subject: `[Nhắc ngày thi] Kỳ thi JLPT: ${schedule.title}`,
          message: `Kỳ thi JLPT ${schedule.title} sẽ diễn ra vào ngày ${schedule.examDate} (còn ${daysLeft} ngày). Chúc bạn ôn tập tốt!`,
        };

        await db.insert(schema.outbox).values({
          id: eventId,
          topic: 'notification.jlpt_exam_reminder',
          payload,
          createdAt: now,
        });

        await db.insert(schema.notificationJobs).values({
          id: generateUuidV7(),
          recipientId: user.id,
          type: 'jlpt_exam_reminder',
          channel: 'email',
          payload,
          status: 'delivered',
          scheduledFor: now,
        });

        existingDedupeKeys.add(dedupeKey);
        eventIds.push(eventId);
        sent++;
      }
    }

    return { sent, skippedOptOut, skippedDuplicate, eventIds };
  }
}

