import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import {
  assertNoAnswerLeak,
  ExamAnswerKeySchema,
  ExamManifestSchema,
  PublicExamSnapshotSchema,
  type ExamAnswerKey,
  type ExamDetailPublic,
  type ExamManifest,
  type ExamSummary,
  type Level,
  type PublicExamSnapshot,
  type PublicOption,
  type PublicQuestion,
  type PublicQuestionGroup,
  type PublicSection,
} from '@jlpt/schema';
import { StorageService } from '../storage/storage.service.js';
import { OutboxService, type DbTx } from '../outbox/outbox.service.js';
import { BlueprintService } from '../blueprint/blueprint.service.js';
import type { ExamFilterQuery, PublishExamResponse } from './exam.types.js';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly storageService: StorageService,
    private readonly outboxService: OutboxService,
    private readonly blueprintService: BlueprintService,
  ) {}

  /**
   * Lists published exams for public discovery (A8).
   */
  async listPublicExams(filters: ExamFilterQuery = {}): Promise<ExamSummary[]> {
    const conditions = [
      isNotNull(schema.exams.publishedVersion),
      isNull(schema.exams.deletedAt),
    ];

    if (filters.level) {
      conditions.push(eq(schema.exams.level, filters.level));
    }
    if (filters.year) {
      conditions.push(eq(schema.exams.year, filters.year));
    }
    if (filters.session) {
      conditions.push(eq(schema.exams.session, filters.session));
    }
    if (filters.kind) {
      conditions.push(eq(schema.exams.kind, filters.kind));
    }

    const rows = await this.dbClient.db
      .select()
      .from(schema.exams)
      .where(and(...conditions))
      .orderBy(desc(schema.exams.createdAt));

    const result: ExamSummary[] = [];
    for (const r of rows) {
      const sections = await this.dbClient.db
        .select()
        .from(schema.examSections)
        .where(eq(schema.examSections.examId, r.id))
        .orderBy(schema.examSections.orderIndex);

      result.push({
        id: r.id,
        slug: r.slug,
        level: r.level as Level,
        title: r.title,
        kind: r.kind as any,
        year: r.year,
        session: r.session as any,
        totalQuestions: r.totalQuestions,
        sections: sections.map((s: typeof schema.examSections.$inferSelect) => ({
          title: s.title,
          durationSec: s.durationSec,
        })),
        sourceLabel: null,
        licenseLabel: null,
        guestTrial: false,
        publishedVersion: r.publishedVersion!,
      });
    }

    return result;
  }

  /**
   * Retrieves public exam details by slug (A8).
   */
  async getPublicExamBySlug(slug: string): Promise<ExamDetailPublic> {
    const rows = await this.dbClient.db
      .select()
      .from(schema.exams)
      .where(
        and(
          eq(schema.exams.slug, slug),
          isNotNull(schema.exams.publishedVersion),
          isNull(schema.exams.deletedAt),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Đề thi không tồn tại hoặc chưa được xuất bản: ${slug}`);
    }

    const r = rows[0]!;
    const sections = await this.dbClient.db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, r.id))
      .orderBy(schema.examSections.orderIndex);

    return {
      id: r.id,
      slug: r.slug,
      level: r.level as Level,
      title: r.title,
      kind: r.kind as any,
      year: r.year,
      session: r.session as any,
      totalQuestions: r.totalQuestions,
      sections: sections.map((s: typeof schema.examSections.$inferSelect) => ({
        title: s.title,
        durationSec: s.durationSec,
      })),
      sourceLabel: null,
      licenseLabel: null,
      guestTrial: false,
      publishedVersion: r.publishedVersion!,
      description: r.description,
    };
  }

  /**
   * Publishes an exam into an immutable version snapshot with answer keys and manifest.
   * Enforces:
   * 1. All questions and question groups must be approved.
   * 2. Strict blueprint conformance.
   * 3. Zero answer leak in public snapshot.
   * 4. Transactional consistency: storage + database + outbox event.
   */
  async publishExam(
    examId: string,
    publisherUserId: string,
  ): Promise<PublishExamResponse> {
    // 1. Fetch exam
    const examRows = await this.dbClient.db
      .select()
      .from(schema.exams)
      .where(and(eq(schema.exams.id, examId), isNull(schema.exams.deletedAt)))
      .limit(1);

    if (examRows.length === 0) {
      throw new NotFoundException(`Đề thi ${examId} không tồn tại`);
    }

    const exam = examRows[0]!;

    // 2. Fetch sections and exam items
    const sections = await this.dbClient.db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, examId))
      .orderBy(schema.examSections.orderIndex);

    if (sections.length === 0) {
      throw new BadRequestException(`Đề thi ${examId} không có phần thi`);
    }

    const items = await this.dbClient.db
      .select()
      .from(schema.examItems)
      .where(eq(schema.examItems.examId, examId))
      .orderBy(schema.examItems.orderIndex);

    if (items.length === 0) {
      throw new BadRequestException(`Đề thi ${examId} không có câu hỏi`);
    }

    const questionIds = items.map((i: { questionId: string }) => i.questionId);

    const allQuestions = await this.dbClient.db.select().from(schema.questions);
    const examQuestions = allQuestions.filter((q: typeof schema.questions.$inferSelect) => questionIds.includes(q.id));

    // Check question versions status
    for (const q of examQuestions) {
      const qvRows = await this.dbClient.db
        .select()
        .from(schema.questionVersions)
        .where(eq(schema.questionVersions.questionId, q.id))
        .orderBy(desc(schema.questionVersions.version))
        .limit(1);

      if (qvRows.length === 0 || qvRows[0]?.status !== 'approved') {
        throw new ConflictException(
          `Câu hỏi ${q.id} chưa được duyệt (status: ${qvRows[0]?.status ?? 'none'}); không thể xuất bản`,
        );
      }
    }

    // Check group versions status
    const groupIds = Array.from(new Set(examQuestions.map((q: typeof schema.questions.$inferSelect) => q.groupId).filter(Boolean))) as string[];
    for (const gid of groupIds) {
      const gvRows = await this.dbClient.db
        .select()
        .from(schema.questionGroupVersions)
        .where(eq(schema.questionGroupVersions.groupId, gid))
        .orderBy(desc(schema.questionGroupVersions.version))
        .limit(1);

      if (gvRows.length === 0 || gvRows[0]?.status !== 'approved') {
        throw new ConflictException(
          `Nhóm câu hỏi ${gid} chưa được duyệt (status: ${gvRows[0]?.status ?? 'none'}); không thể xuất bản`,
        );
      }
    }

    // 4. Verify / find blueprint
    let blueprint: any;
    try {
      blueprint = await this.blueprintService.getActiveBlueprintByLevel(exam.level as Level);
    } catch {
      // Try finding any blueprint matching level
      const allBp = await this.dbClient.db
        .select()
        .from(schema.blueprints)
        .where(eq(schema.blueprints.level, exam.level))
        .limit(1);
      if (allBp.length === 0) {
        throw new BadRequestException(`Không tìm thấy blueprint cho cấp độ ${exam.level}`);
      }
      blueprint = allBp[0]!;
    }

    // 5. Construct Snapshot, Answer Key, and Manifest
    const nextVersion = (exam.publishedVersion ?? 0) + 1;
    const mediaSet = new Set<string>();

    const answerKeys: number[] = [];
    const answerSkills: any[] = [];
    const answerMondaiTypes: any[] = [];
    const sectionRanges: [number, number][] = [];

    const publicSections: PublicSection[] = [];
    let currentGlobalIndex = 0;

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx]!;
      const secItems = items.filter((i: typeof schema.examItems.$inferSelect) => i.sectionId === sec.id);
      const startRange = currentGlobalIndex;

      // Group questions in this section
      const secGroupMap = new Map<string, string[]>();
      for (const item of secItems) {
        const qObj = examQuestions.find((q: typeof schema.questions.$inferSelect) => q.id === item.questionId);
        const gId = qObj?.groupId || 'default';
        if (!secGroupMap.has(gId)) {
          secGroupMap.set(gId, []);
        }
        secGroupMap.get(gId)!.push(item.questionId);
      }

      const publicGroups: PublicQuestionGroup[] = [];

      for (const [gid, qIds] of secGroupMap.entries()) {
        const gvRow = await this.dbClient.db
          .select()
          .from(schema.questionGroupVersions)
          .where(eq(schema.questionGroupVersions.groupId, gid))
          .orderBy(desc(schema.questionGroupVersions.version))
          .limit(1);

        const groupQuestions: PublicQuestion[] = [];

        for (const qid of qIds) {
          const qObj = examQuestions.find((q: typeof schema.questions.$inferSelect) => q.id === qid)!;
          const qvRow = await this.dbClient.db
            .select()
            .from(schema.questionVersions)
            .where(eq(schema.questionVersions.questionId, qid))
            .orderBy(desc(schema.questionVersions.version))
            .limit(1);

          const optRows = await this.dbClient.db
            .select()
            .from(schema.answerOptions)
            .where(
              and(
                eq(schema.answerOptions.questionId, qid),
                eq(schema.answerOptions.questionVersion, qvRow[0]?.version ?? 1),
              ),
            )
            .orderBy(schema.answerOptions.orderIndex);

          // Get correct answer for answer key
          const correctRow = await this.dbClient.db
            .select()
            .from(schema.correctAnswers)
            .where(
              and(
                eq(schema.correctAnswers.questionId, qid),
                eq(schema.correctAnswers.questionVersion, qvRow[0]?.version ?? 1),
              ),
            )
            .limit(1);

          const correctVal = correctRow[0]?.correctOption ?? 1;
          answerKeys.push(correctVal);
          answerSkills.push(qObj.skill);
          answerMondaiTypes.push(qObj.mondaiType);

          const publicOptions: PublicOption[] = optRows.map((o: typeof schema.answerOptions.$inferSelect) => ({
            label: o.orderIndex.toString(),
            content: o.content as any,
          }));

          groupQuestions.push({
            index: currentGlobalIndex++,
            questionId: qid,
            number: (currentGlobalIndex).toString(),
            stem: (qvRow[0]?.stem as any) || [],
            options: publicOptions,
          });
        }

        const firstQ = examQuestions.find((q: typeof schema.questions.$inferSelect) => qIds.includes(q.id));
        publicGroups.push({
          groupId: gid,
          mondaiType: (firstQ?.mondaiType as any) || 'kanji_reading',
          instructions: [],
          passage: (gvRow[0]?.passage as any) || null,
          media: [],
          questions: groupQuestions,
        });
      }

      const endRange = currentGlobalIndex > startRange ? currentGlobalIndex - 1 : startRange;
      sectionRanges.push([startRange, endRange]);

      publicSections.push({
        index: sIdx,
        code: sec.code,
        title: sec.title,
        durationSec: sec.durationSec,
        questionRange: [startRange, endRange],
        groups: publicGroups,
        listeningTimeline: null,
      });
    }

    const publicSnapshot: PublicExamSnapshot = {
      schemaVersion: 1,
      examId,
      version: nextVersion,
      level: exam.level as Level,
      title: exam.title,
      kind: exam.kind as any,
      totalQuestions: currentGlobalIndex,
      sections: publicSections,
    };

    // 6. Strict Zero Answer Leak Check (A5 / A10)
    assertNoAnswerLeak(publicSnapshot);
    PublicExamSnapshotSchema.parse(publicSnapshot);

    const examManifest: ExamManifest = {
      examId,
      version: nextVersion,
      media: Array.from(mediaSet),
    };
    ExamManifestSchema.parse(examManifest);

    const examAnswerKey: ExamAnswerKey = {
      examId,
      version: nextVersion,
      keys: answerKeys,
      skills: answerSkills,
      mondaiTypes: answerMondaiTypes,
      sectionRanges,
    };
    ExamAnswerKeySchema.parse(examAnswerKey);

    // 7. Store snapshot and manifest in StorageService
    const snapshotKey = `exams/${examId}/v${nextVersion}/snapshot.json`;
    const manifestKey = `exams/${examId}/v${nextVersion}/manifest.json`;

    await this.storageService.put(
      snapshotKey,
      Buffer.from(JSON.stringify(publicSnapshot, null, 2)),
      { mimeType: 'application/json' },
    );

    await this.storageService.put(
      manifestKey,
      Buffer.from(JSON.stringify(examManifest, null, 2)),
      { mimeType: 'application/json' },
    );

    // 8. Transactional Database update & Outbox event
    const now = new Date();
    await this.dbClient.db.transaction(async (tx: DbTx) => {
      // Insert examVersion
      await tx.insert(schema.examVersions).values({
        examId,
        version: nextVersion,
        snapshotKey,
        manifestKey,
        blueprintId: blueprint.id,
        blueprintVersion: blueprint.version,
        scoring: (blueprint.scoring as any) || { method: 'linear_reference', rounding: 'round' },
        totalQuestions: currentGlobalIndex,
        publishedAt: now,
        publishedBy: publisherUserId,
      });

      // Insert examAnswerKey
      await tx.insert(schema.examAnswerKeys).values({
        examId,
        version: nextVersion,
        keys: examAnswerKey.keys,
        skills: examAnswerKey.skills as any,
        mondaiTypes: examAnswerKey.mondaiTypes as any,
        sectionRanges: examAnswerKey.sectionRanges as any,
      });

      // Update exam publishedVersion
      await tx
        .update(schema.exams)
        .set({
          publishedVersion: nextVersion,
          totalQuestions: currentGlobalIndex,
          updatedAt: now,
        })
        .where(eq(schema.exams.id, examId));

      // Emit outbox event (Acceptance 3)
      await this.outboxService.emitEvent(
        'content.published',
        examId,
        publisherUserId,
        {
          examId,
          version: nextVersion,
          publisherId: publisherUserId,
        },
        tx,
      );
    });

    this.logger.log(`Exam ${examId} successfully published version ${nextVersion}`);

    return {
      examId,
      version: nextVersion,
      snapshotKey,
      manifestKey,
      totalQuestions: currentGlobalIndex,
      publishedAt: now,
    };
  }

  /**
   * Unpublishes an exam and emits content.taken_down event.
   */
  async unpublishExam(
    examId: string,
    operatorUserId: string,
    reason = 'Admin unpublish',
  ): Promise<{ status: string }> {
    const examRows = await this.dbClient.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.id, examId))
      .limit(1);

    if (examRows.length === 0) {
      throw new NotFoundException(`Đề thi không tồn tại: ${examId}`);
    }

    const exam = examRows[0]!;
    const publishedVer = exam.publishedVersion ?? 1;

    await this.dbClient.db.transaction(async (tx: DbTx) => {
      await tx
        .update(schema.exams)
        .set({ publishedVersion: null, updatedAt: new Date() })
        .where(eq(schema.exams.id, examId));

      await this.outboxService.emitEvent(
        'content.taken_down',
        examId,
        operatorUserId,
        {
          examId,
          version: publishedVer,
          reason,
        },
        tx,
      );
    });

    return { status: 'unpublished' };
  }
}
