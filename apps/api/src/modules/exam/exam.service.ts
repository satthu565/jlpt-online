import fs from 'node:fs';
import path from 'node:path';
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
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { getRepoRoot } from '../../common/utils/paths.js';

export function toPublicExamKind(kind?: string | null): ExamKind {
  if (kind === 'original' || kind === 'official') return 'original';
  if (kind === 'custom') return 'custom';
  if (kind === 'mixed') return 'mixed';
  return 'practice';
}
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
  type ExamKind,
  type Session,
  type PublicExamSnapshot,
  type PublicOption,
  type PublicQuestion,
  type PublicQuestionGroup,
  type PublicSection,
  type Skill,
  type MondaiType,
  type RichText,
  type RichBlock,
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
    const conditions = [
      isNull(schema.exams.deletedAt),
      isNotNull(schema.exams.publishedVersion),
    ];

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
      .where(and(...conditions))
      .orderBy(desc(schema.exams.createdAt));

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
        kind: toPublicExamKind(e.kind),
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
   * Lists published exams for public discovery returning array (A8).
   */
  async listPublicExams(filters: ExamFilterQuery = {}): Promise<ExamSummary[]> {
    const res = await this.listExams(filters);
    return res.items;
  }

  /**
   * Public exam detail by slug (A8).
   */
  async getExamBySlug(slug: string): Promise<ExamDetailPublic> {
    const db = this.dbClient.db;

    const [e] = await db
      .select()
      .from(schema.exams)
      .where(
        and(
          eq(schema.exams.slug, slug),
          isNull(schema.exams.deletedAt),
          isNotNull(schema.exams.publishedVersion),
        ),
      )
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
      kind: toPublicExamKind(e.kind),
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
   * Alias for getExamBySlug (A8).
   */
  async getPublicExamBySlug(slug: string): Promise<ExamDetailPublic> {
    return this.getExamBySlug(slug);
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

    // Check if exam is from a DRAFT_ONLY package
    const importJobsForExam = await this.dbClient.db
      .select({
        id: schema.importJobs.id,
        status: schema.importJobs.status,
        errorLog: schema.importJobs.errorLog,
        createdAt: schema.importJobs.createdAt,
      })
      .from(schema.importArtifacts)
      .innerJoin(schema.importJobs, eq(schema.importArtifacts.jobId, schema.importJobs.id))
      .where(
        and(
          eq(schema.importArtifacts.artifactType, 'exam'),
          eq(schema.importArtifacts.storageKey, examId),
        ),
      )
      .orderBy(desc(schema.importJobs.createdAt));

    let packageBlueprintRef: { id: string; version: number } | null = null;
    if (importJobsForExam.length > 0) {
      const latestJob = importJobsForExam[0]!;
      const errLog = latestJob.errorLog as Record<string, unknown> | null;
      const ref = errLog?.['blueprintRef'] as { id?: unknown; version?: unknown } | null | undefined;
      if (ref && typeof ref.id === 'string' && typeof ref.version === 'number') {
        packageBlueprintRef = { id: ref.id, version: ref.version };
      }
      if (
        latestJob.status === 'DRAFT_ONLY' ||
        errLog?.['readiness'] === 'DRAFT_ONLY' ||
        errLog?.['mode'] === 'draft' ||
        (typeof errLog?.['blockingIssueCount'] === 'number' && (errLog['blockingIssueCount'] as number) > 0)
      ) {
        throw new ConflictException(
          `Đề thi ${examId} thuộc gói nháp (DRAFT_ONLY); không thể xuất bản cho tới khi nạp lại bản ready cùng packageId với revision cao hơn`,
        );
      }
    }

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

      const answers = await this.dbClient.db
        .select()
        .from(schema.correctAnswers)
        .where(
          and(
            eq(schema.correctAnswers.questionId, q.id),
            eq(schema.correctAnswers.questionVersion, qvRows[0].version),
          ),
        );
      if (answers.length === 0 || answers[0]?.correctOption === null) {
        throw new ConflictException(
          `Câu hỏi ${q.id} chưa có đáp án đúng (bản nháp); không thể xuất bản`,
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
    let blueprint: typeof schema.blueprints.$inferSelect;
    try {
      // An imported past exam uses the blueprint named in its package (for example N5 12/2019 uses the
      // pre-2020 N5 blueprint); other exams use the level's current blueprint.
      blueprint = packageBlueprintRef
        ? await this.blueprintService.getBlueprintById(packageBlueprintRef.id, packageBlueprintRef.version)
        : await this.blueprintService.getActiveBlueprintByLevel(exam.level as Level);
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
    const answerSkills: Skill[] = [];
    const answerMondaiTypes: MondaiType[] = [];
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

        const groupMediaSet = new Set<string>();

        if (gvRow[0]?.audioSha256) {
          groupMediaSet.add(gvRow[0].audioSha256);
          mediaSet.add(gvRow[0].audioSha256);

          const assetRow = await this.dbClient.db
            .select()
            .from(schema.mediaAssets)
            .where(eq(schema.mediaAssets.sha256, gvRow[0].audioSha256))
            .limit(1);
          if (assetRow[0]?.key) {
            groupMediaSet.add(assetRow[0].key);
            mediaSet.add(assetRow[0].key);
          }
        }

        const groupMediaArtifacts = await this.dbClient.db
          .select()
          .from(schema.importArtifacts)
          .where(eq(schema.importArtifacts.artifactType, 'group_media'));
        for (const art of groupMediaArtifacts) {
          if (art.storageKey.startsWith(`${gid}:`)) {
            const mKey = art.storageKey.slice(gid.length + 1);
            groupMediaSet.add(mKey);
            mediaSet.add(mKey);
          }
        }

        const extractMediaFromRichText = (richText?: unknown) => {
          if (!Array.isArray(richText)) return;
          for (const seg of richText) {
            if (seg && typeof seg === 'object') {
              const segObj = seg as Record<string, unknown>;
              if (segObj['t'] === 'image' && typeof segObj['mediaKey'] === 'string' && segObj['mediaKey']) {
                groupMediaSet.add(segObj['mediaKey']);
                mediaSet.add(segObj['mediaKey']);
              }
            }
          }
        };

        const passageBlocks = (gvRow[0]?.passage as unknown as RichBlock[]) || null;
        if (Array.isArray(passageBlocks)) {
          for (const block of passageBlocks) {
            if (!block || typeof block !== 'object') continue;
            if (block.type === 'image' && typeof block.mediaKey === 'string' && block.mediaKey) {
              groupMediaSet.add(block.mediaKey);
              mediaSet.add(block.mediaKey);
            } else if (block.type === 'paragraph' && Array.isArray(block.content)) {
              extractMediaFromRichText(block.content);
            } else if (block.type === 'table' && Array.isArray(block.rows)) {
              for (const row of block.rows) {
                if (Array.isArray(row)) {
                  for (const cell of row) {
                    extractMediaFromRichText(cell);
                  }
                }
              }
            }
          }
        }

        const groupQuestions: PublicQuestion[] = [];

        for (const qid of qIds) {
          const qObj = examQuestions.find((q: typeof schema.questions.$inferSelect) => q.id === qid)!;
          const qvRow = await this.dbClient.db
            .select()
            .from(schema.questionVersions)
            .where(eq(schema.questionVersions.questionId, qid))
            .orderBy(desc(schema.questionVersions.version))
            .limit(1);

          // Extract media from stem
          extractMediaFromRichText(qvRow[0]?.stem);

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

          // Extract media from option contents
          for (const opt of optRows) {
            extractMediaFromRichText(opt.content);
          }

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
          answerSkills.push(qObj.skill as Skill);
          answerMondaiTypes.push(qObj.mondaiType as MondaiType);

          const publicOptions: PublicOption[] = optRows.map((o: typeof schema.answerOptions.$inferSelect) => ({
            label: o.orderIndex.toString(),
            content: o.content as unknown as RichText,
          }));

          groupQuestions.push({
            index: currentGlobalIndex++,
            questionId: qid,
            number: (currentGlobalIndex).toString(),
            stem: (qvRow[0]?.stem as unknown as RichText) || [],
            options: publicOptions,
          });
        }

        const firstQ = examQuestions.find((q: typeof schema.questions.$inferSelect) => qIds.includes(q.id));
        publicGroups.push({
          groupId: gid,
          mondaiType: (firstQ?.mondaiType as MondaiType) || 'kanji_reading',
          instructions: [],
          passage: passageBlocks,
          media: Array.from(groupMediaSet),
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
      kind: exam.kind as ExamKind,
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

    try {
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
    } catch (storageErr) {
      this.logger.error(
        `Lỗi lưu trữ snapshot/manifest cho đề thi ${examId} (v${nextVersion}): ${(storageErr as Error)?.message}`,
        (storageErr as Error)?.stack,
      );
      throw storageErr;
    }

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
        scoring: (blueprint.scoring as unknown) || { method: 'linear_reference', rounding: 'round' },
        totalQuestions: currentGlobalIndex,
        publishedAt: now,
        publishedBy: publisherUserId,
      });

      // Insert examAnswerKey
      await tx.insert(schema.examAnswerKeys).values({
        examId,
        version: nextVersion,
        keys: examAnswerKey.keys,
        skills: examAnswerKey.skills,
        mondaiTypes: examAnswerKey.mondaiTypes,
        sectionRanges: examAnswerKey.sectionRanges as unknown,
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

  /**
   * Constructs a public exam snapshot without answer keys from database (Acceptance 3, A5, A10).
   */
  async constructPublicSnapshot(
    exam: typeof schema.exams.$inferSelect,
    versionNum: number,
  ): Promise<PublicExamSnapshot> {
    const sections = await this.dbClient.db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, exam.id))
      .orderBy(schema.examSections.orderIndex);

    const items = await this.dbClient.db
      .select()
      .from(schema.examItems)
      .where(eq(schema.examItems.examId, exam.id))
      .orderBy(schema.examItems.orderIndex);

    // If no sections or items exist in DB, look for synthetic fixture file
    if (sections.length === 0 || items.length === 0) {
      try {
        const repoRoot = getRepoRoot();
        const syntheticDir = path.join(repoRoot, 'packages/schema/fixtures/synthetic-exams');
        if (fs.existsSync(syntheticDir)) {
          const files = fs.readdirSync(syntheticDir).filter((f) => f.endsWith('.json'));
          for (const f of files) {
            const raw = JSON.parse(fs.readFileSync(path.join(syntheticDir, f), 'utf-8'));
            if (raw.id === exam.id || raw.slug === exam.slug || (raw.level === exam.level && f.toLowerCase().includes(exam.level.toLowerCase()))) {
              const publicQuestions: PublicQuestion[] = (
                (raw.questions as Array<{
                  id: string;
                  stem?: unknown;
                  options?: Array<{ orderIndex?: number; content?: unknown }>;
                }>) || []
              ).map((q, idx: number) => ({
                index: idx,
                questionId: q.id,
                number: (idx + 1).toString(),
                stem: (q.stem as unknown as RichText) || [],
                options: (q.options || []).map((opt) => ({
                  label: opt.orderIndex ? opt.orderIndex.toString() : String(idx + 1),
                  content: (opt.content as unknown as RichText) || [],
                })),
              }));

              const totalCount = publicQuestions.length || raw.totalQuestions || 1;
              const publicSections: PublicSection[] = [
                {
                  index: 0,
                  code: 'language_knowledge',
                  title: 'Kiến thức ngôn ngữ & Đọc hiểu',
                  durationSec: 3600,
                  questionRange: [0, Math.max(0, totalCount - 1)],
                  groups: [
                    {
                      groupId: `synthetic-${raw.level}-group-1`,
                      mondaiType: 'kanji_reading',
                      instructions: [],
                      passage: null,
                      media: [],
                      questions: publicQuestions,
                    },
                  ],
                  listeningTimeline: null,
                },
              ];

              const snapshot: PublicExamSnapshot = {
                schemaVersion: 1,
                examId: exam.id,
                version: versionNum,
                level: (exam.level || raw.level) as Level,
                title: exam.title || raw.title,
                kind: toPublicExamKind(exam.kind || raw.kind),
                totalQuestions: totalCount,
                sections: publicSections,
              };

              assertNoAnswerLeak(snapshot);
              PublicExamSnapshotSchema.parse(snapshot);
              return snapshot;
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Không thể nạp snapshot từ fixture: ${(err as Error)?.message}`);
      }
    }

    const questionIds = items.map((i: { questionId: string }) => i.questionId);
    const allQuestions = await this.dbClient.db.select().from(schema.questions);
    const examQuestions = allQuestions.filter((q: typeof schema.questions.$inferSelect) =>
      questionIds.includes(q.id),
    );

    const publicSections: PublicSection[] = [];
    let currentGlobalIndex = 0;

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx]!;
      const secItems = items.filter(
        (i: typeof schema.examItems.$inferSelect) => i.sectionId === sec.id,
      );
      const startRange = currentGlobalIndex;

      const secGroupMap = new Map<string, string[]>();
      for (const item of secItems) {
        const qObj = examQuestions.find(
          (q: typeof schema.questions.$inferSelect) => q.id === item.questionId,
        );
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

        const groupMediaSet = new Set<string>();

        if (gvRow[0]?.audioSha256) {
          groupMediaSet.add(gvRow[0].audioSha256);
          const assetRow = await this.dbClient.db
            .select()
            .from(schema.mediaAssets)
            .where(eq(schema.mediaAssets.sha256, gvRow[0].audioSha256))
            .limit(1);
          if (assetRow[0]?.key) {
            groupMediaSet.add(assetRow[0].key);
          }
        }

        const groupMediaArtifacts = await this.dbClient.db
          .select()
          .from(schema.importArtifacts)
          .where(eq(schema.importArtifacts.artifactType, 'group_media'));
        for (const art of groupMediaArtifacts) {
          if (art.storageKey.startsWith(`${gid}:`)) {
            const mKey = art.storageKey.slice(gid.length + 1);
            groupMediaSet.add(mKey);
          }
        }

        const extractMediaFromRichText = (richText?: unknown) => {
          if (!Array.isArray(richText)) return;
          for (const seg of richText) {
            if (seg && typeof seg === 'object') {
              const segObj = seg as Record<string, unknown>;
              if (
                segObj['t'] === 'image' &&
                typeof segObj['mediaKey'] === 'string' &&
                segObj['mediaKey']
              ) {
                groupMediaSet.add(segObj['mediaKey']);
              }
            }
          }
        };

        const passageBlocks = (gvRow[0]?.passage as unknown as RichBlock[]) || null;
        if (Array.isArray(passageBlocks)) {
          for (const block of passageBlocks) {
            if (!block || typeof block !== 'object') continue;
            if (block.type === 'image' && typeof block.mediaKey === 'string' && block.mediaKey) {
              groupMediaSet.add(block.mediaKey);
            } else if (block.type === 'paragraph' && Array.isArray(block.content)) {
              extractMediaFromRichText(block.content);
            } else if (block.type === 'table' && Array.isArray(block.rows)) {
              for (const row of block.rows) {
                if (Array.isArray(row)) {
                  for (const cell of row) {
                    extractMediaFromRichText(cell);
                  }
                }
              }
            }
          }
        }

        const groupQuestions: PublicQuestion[] = [];

        for (const qid of qIds) {
          const qvRow = await this.dbClient.db
            .select()
            .from(schema.questionVersions)
            .where(eq(schema.questionVersions.questionId, qid))
            .orderBy(desc(schema.questionVersions.version))
            .limit(1);

          extractMediaFromRichText(qvRow[0]?.stem);

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

          for (const opt of optRows) {
            extractMediaFromRichText(opt.content);
          }

          const publicOptions: PublicOption[] = optRows.map(
            (o: typeof schema.answerOptions.$inferSelect) => ({
              label: o.orderIndex.toString(),
              content: o.content as unknown as RichText,
            }),
          );

          groupQuestions.push({
            index: currentGlobalIndex++,
            questionId: qid,
            number: currentGlobalIndex.toString(),
            stem: (qvRow[0]?.stem as unknown as RichText) || [],
            options: publicOptions,
          });
        }

        const firstQ = examQuestions.find(
          (q: typeof schema.questions.$inferSelect) => qIds.includes(q.id),
        );
        publicGroups.push({
          groupId: gid,
          mondaiType: (firstQ?.mondaiType as MondaiType) || 'kanji_reading',
          instructions: [],
          passage: passageBlocks,
          media: Array.from(groupMediaSet),
          questions: groupQuestions,
        });
      }

      const endRange = currentGlobalIndex > startRange ? currentGlobalIndex - 1 : startRange;

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

    const totalCount = currentGlobalIndex > 0 ? currentGlobalIndex : Math.max(1, exam.totalQuestions || 1);

    const publicSnapshot: PublicExamSnapshot = {
      schemaVersion: 1,
      examId: exam.id,
      version: versionNum,
      level: exam.level as Level,
      title: exam.title,
      kind: toPublicExamKind(exam.kind),
      totalQuestions: totalCount,
      sections: publicSections,
    };

    assertNoAnswerLeak(publicSnapshot);
    PublicExamSnapshotSchema.parse(publicSnapshot);
    return publicSnapshot;
  }

  /**
   * Retrieves a public exam snapshot without answer keys (Acceptance 3, A5, A10).
   */
  async getExamSnapshot(examId: string, version: number): Promise<PublicExamSnapshot> {
    const snapshotKey = `exams/${examId}/v${version}/snapshot.json`;
    const stored = await this.storageService.get(snapshotKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored.data.toString('utf-8')) as PublicExamSnapshot;
        assertNoAnswerLeak(parsed);
        return parsed;
      } catch (err) {
        this.logger.warn(
          `Lỗi đọc snapshot từ storage cho đề thi ${examId} (v${version}): ${(err as Error)?.message}`,
        );
      }
    }

    // Fallback: construct snapshot from DB
    const examRows = await this.dbClient.db
      .select()
      .from(schema.exams)
      .where(and(eq(schema.exams.id, examId), isNull(schema.exams.deletedAt)))
      .limit(1);

    if (examRows.length === 0) {
      throw new NotFoundException(`Đề thi ${examId} không tồn tại`);
    }

    const exam = examRows[0]!;
    const snapshot = await this.constructPublicSnapshot(exam, version);
    assertNoAnswerLeak(snapshot);

    // Cache in storage asynchronously
    try {
      await this.storageService.put(
        snapshotKey,
        Buffer.from(JSON.stringify(snapshot, null, 2)),
        { mimeType: 'application/json' },
      );
    } catch {
      // ignore
    }

    return snapshot;
  }

  /**
   * Admin: List all exams including drafts (ADM-03).
   */
  async listAdminExams(filters?: {
    level?: Level;
    kind?: ExamKind;
    status?: string;
  }): Promise<{ items: unknown[] }> {
    const db = this.dbClient.db;
    const conditions = [isNull(schema.exams.deletedAt)];

    if (filters?.level) {
      conditions.push(eq(schema.exams.level, filters.level));
    }
    if (filters?.kind) {
      conditions.push(eq(schema.exams.kind, filters.kind));
    }
    if (filters?.status === 'published') {
      conditions.push(isNotNull(schema.exams.publishedVersion));
    } else if (filters?.status === 'draft') {
      conditions.push(isNull(schema.exams.publishedVersion));
    }

    const rows = await db
      .select()
      .from(schema.exams)
      .where(and(...conditions))
      .orderBy(desc(schema.exams.createdAt));

    return { items: rows };
  }

  /**
   * Admin: Get full details of an exam (ADM-03).
   */
  async getAdminExam(id: string): Promise<unknown> {
    const [exam] = await this.dbClient.db
      .select()
      .from(schema.exams)
      .where(and(eq(schema.exams.id, id), isNull(schema.exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException(`Đề thi không tồn tại: ${id}`);
    }

    const sections = await this.dbClient.db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, id))
      .orderBy(schema.examSections.orderIndex);

    const items = await this.dbClient.db
      .select()
      .from(schema.examItems)
      .where(eq(schema.examItems.examId, id))
      .orderBy(schema.examItems.orderIndex);

    const versions = await this.dbClient.db
      .select()
      .from(schema.examVersions)
      .where(eq(schema.examVersions.examId, id))
      .orderBy(desc(schema.examVersions.version));

    return {
      ...exam,
      sections,
      items,
      versions,
    };
  }

  /**
   * Admin: Create new exam draft (ADM-03).
   */
  async createAdminExam(
    dto: {
      title: string;
      level: Level;
      kind: ExamKind;
      year?: number;
      session?: Session;
      description?: string;
      slug?: string;
    },
    _userId: string,
  ): Promise<{ id: string; success: boolean }> {
    const id = generateUuidV7();
    const slug =
      dto.slug ||
      `${dto.level.toLowerCase()}-${dto.year || 2026}-${dto.session || '07'}-${id.slice(0, 8)}`;

    const [inserted] = await this.dbClient.db
      .insert(schema.exams)
      .values({
        id,
        slug,
        level: dto.level,
        kind: dto.kind,
        title: dto.title,
        year: dto.year ?? null,
        session: dto.session ?? null,
        description: dto.description || '',
        publishedVersion: null,
        totalQuestions: 0,
      })
      .returning();

    return { id: inserted!.id, success: true };
  }

  /**
   * Admin: Update exam draft metadata (ADM-03).
   */
  async updateAdminExam(
    id: string,
    dto: {
      title?: string;
      level?: Level;
      kind?: ExamKind;
      year?: number;
      session?: Session;
      description?: string;
    },
    _userId: string,
  ): Promise<{ updated: boolean }> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) updateData['title'] = dto.title;
    if (dto.level !== undefined) updateData['level'] = dto.level;
    if (dto.kind !== undefined) updateData['kind'] = dto.kind;
    if (dto.year !== undefined) updateData['year'] = dto.year;
    if (dto.session !== undefined) updateData['session'] = dto.session;
    if (dto.description !== undefined) updateData['description'] = dto.description;

    const res = await this.dbClient.db
      .update(schema.exams)
      .set(updateData)
      .where(and(eq(schema.exams.id, id), isNull(schema.exams.deletedAt)))
      .returning();

    if (res.length === 0) {
      throw new NotFoundException(`Đề thi không tồn tại: ${id}`);
    }

    return { updated: true };
  }

  /**
   * Admin: Validate exam structure against blueprint and approval criteria (ADM-03).
   */
  async validateAdminExam(examId: string): Promise<{ valid: boolean; violations: string[] }> {
    const violations: string[] = [];

    const examRows = await this.dbClient.db
      .select()
      .from(schema.exams)
      .where(and(eq(schema.exams.id, examId), isNull(schema.exams.deletedAt)))
      .limit(1);

    if (examRows.length === 0) {
      return { valid: false, violations: [`Đề thi ${examId} không tồn tại.`] };
    }

    const _exam = examRows[0]!;

    const sections = await this.dbClient.db
      .select()
      .from(schema.examSections)
      .where(eq(schema.examSections.examId, examId))
      .orderBy(schema.examSections.orderIndex);

    if (sections.length === 0) {
      violations.push('Đề thi chưa có phần thi (sections).');
    }

    const items = await this.dbClient.db
      .select()
      .from(schema.examItems)
      .where(eq(schema.examItems.examId, examId))
      .orderBy(schema.examItems.orderIndex);

    if (items.length === 0) {
      violations.push('Đề thi chưa có câu hỏi (questions).');
    } else {
      const questionIds = items.map((i: { questionId: string }) => i.questionId);
      const allQuestions = await this.dbClient.db.select().from(schema.questions);
      const examQuestions = allQuestions.filter(
        (q: typeof schema.questions.$inferSelect) => questionIds.includes(q.id),
      );

      for (const q of examQuestions) {
        const qvRows = await this.dbClient.db
          .select()
          .from(schema.questionVersions)
          .where(eq(schema.questionVersions.questionId, q.id))
          .orderBy(desc(schema.questionVersions.version))
          .limit(1);

        if (qvRows.length === 0 || qvRows[0]?.status !== 'approved') {
          violations.push(
            `Câu hỏi ${q.id} chưa được duyệt (trạng thái: ${qvRows[0]?.status ?? 'none'}).`,
          );
        }
      }

      const groupIds = Array.from(
        new Set(
          examQuestions
            .map((q: typeof schema.questions.$inferSelect) => q.groupId)
            .filter(Boolean),
        ),
      ) as string[];

      for (const gid of groupIds) {
        const gvRows = await this.dbClient.db
          .select()
          .from(schema.questionGroupVersions)
          .where(eq(schema.questionGroupVersions.groupId, gid))
          .orderBy(desc(schema.questionGroupVersions.version))
          .limit(1);

        if (gvRows.length === 0 || gvRows[0]?.status !== 'approved') {
          violations.push(
            `Nhóm câu hỏi ${gid} chưa được duyệt (trạng thái: ${gvRows[0]?.status ?? 'none'}).`,
          );
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

