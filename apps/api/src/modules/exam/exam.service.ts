import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import type { ExamSummary, ExamDetailPublic, Level, ExamKind, Session } from '@jlpt/schema';

@Injectable()
export class ExamService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  private isExamGuestTrialEligible(exam: typeof schema.exams.$inferSelect, scoring?: Record<string, unknown>): boolean {
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

    if (scoring && (scoring['guestTrial'] === true || scoring['guest_trial'] === true)) {
      return true;
    }

    return false;
  }

  /**
   * Public list of exams with filters and guestTrial indicator (A8).
   */
  async listExams(filters?: {
    level?: Level;
    year?: number;
    session?: Session;
    kind?: ExamKind;
  }): Promise<{ items: ExamSummary[] }> {
    const db = this.dbClient.db;
    const conditions = [isNull(schema.exams.deletedAt)];

    if (filters?.level) {
      conditions.push(eq(schema.exams.level, filters.level));
    }
    if (filters?.year) {
      conditions.push(eq(schema.exams.year, filters.year));
    }
    if (filters?.session) {
      conditions.push(eq(schema.exams.session, filters.session));
    }
    if (filters?.kind) {
      conditions.push(eq(schema.exams.kind, filters.kind));
    }

    const examRows = await db
      .select()
      .from(schema.exams)
      .where(and(...conditions));

    const summaries: ExamSummary[] = [];

    for (const e of examRows) {
      const versionNum = e.publishedVersion ?? 1;

      // Fetch version scoring
      const [ev] = await db
        .select()
        .from(schema.examVersions)
        .where(and(eq(schema.examVersions.examId, e.id), eq(schema.examVersions.version, versionNum)))
        .limit(1);

      // Fetch sections
      const sections = await db
        .select({
          title: schema.examSections.title,
          durationSec: schema.examSections.durationSec,
        })
        .from(schema.examSections)
        .where(eq(schema.examSections.examId, e.id))
        .orderBy(schema.examSections.orderIndex);

      const guestTrial = this.isExamGuestTrialEligible(e, ev?.scoring as Record<string, unknown>);

      summaries.push({
        id: e.id,
        slug: e.slug,
        level: e.level as Level,
        title: e.title,
        kind: e.kind as ExamKind,
        year: e.year,
        session: (e.session as Session) || null,
        totalQuestions: ev?.totalQuestions ?? e.totalQuestions,
        sections,
        sourceLabel: null,
        licenseLabel: null,
        guestTrial,
        publishedVersion: versionNum,
      });
    }

    return { items: summaries };
  }

  /**
   * Public exam detail by slug (A8).
   */
  async getExamBySlug(slug: string): Promise<ExamDetailPublic> {
    const db = this.dbClient.db;

    const [e] = await db
      .select()
      .from(schema.exams)
      .where(and(eq(schema.exams.slug, slug), isNull(schema.exams.deletedAt)))
      .limit(1);

    if (!e) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Không tìm thấy đề thi với slug ${slug}`,
      });
    }

    const versionNum = e.publishedVersion ?? 1;

    const [ev] = await db
      .select()
      .from(schema.examVersions)
      .where(and(eq(schema.examVersions.examId, e.id), eq(schema.examVersions.version, versionNum)))
      .limit(1);

    const sections = await db
      .select({
        title: schema.examSections.title,
        durationSec: schema.examSections.durationSec,
      })
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, e.id))
      .orderBy(schema.examSections.orderIndex);

    const guestTrial = this.isExamGuestTrialEligible(e, ev?.scoring as Record<string, unknown>);

    return {
      id: e.id,
      slug: e.slug,
      level: e.level as Level,
      title: e.title,
      kind: e.kind as ExamKind,
      year: e.year,
      session: (e.session as Session) || null,
      totalQuestions: ev?.totalQuestions ?? e.totalQuestions,
      sections,
      sourceLabel: null,
      licenseLabel: null,
      guestTrial,
      publishedVersion: versionNum,
      description: e.description || '',
    };
  }

  /**
   * User exam status summary (A8).
   */
  async getUserExamStatus(userId: string, level?: Level) {
    const db = this.dbClient.db;

    const conditions = [isNull(schema.exams.deletedAt)];
    if (level) {
      conditions.push(eq(schema.exams.level, level));
    }

    const allExams = await db
      .select({ id: schema.exams.id })
      .from(schema.exams)
      .where(and(...conditions));

    const userAttempts = await db
      .select({
        examId: schema.examAttempts.examId,
        status: schema.examAttempts.status,
      })
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, userId));

    const items = allExams.map((exam: typeof schema.exams.$inferSelect) => {
      const attempts = userAttempts.filter((a: { examId: string; status: string }) => a.examId === exam.id);
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';

      if (attempts.some((a: { status: string }) => a.status === 'submitted')) {
        status = 'completed';
      } else if (attempts.some((a: { status: string }) => a.status === 'in_progress')) {
        status = 'in_progress';
      }

      return {
        examId: exam.id,
        status,
        attempts: attempts.length,
      };
    });

    return { items };
  }
}
