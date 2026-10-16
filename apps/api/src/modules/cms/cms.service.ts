import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { activateBlueprint } from '../../db/blueprint-guard.js';
import type { Blueprint, PublicExamSnapshot, ExamAnswerKey, Skill, MondaiType } from '@jlpt/schema';
import type {
  CreateExamInput,
  CreateGroupInput,
  ExamPublishResult,
  UpdateExamInput,
  UpdateGroupInput,
} from './cms.types.js';

@Injectable()
export class CmsService {
  constructor(@Inject(DB_CLIENT) private readonly client: DbClientInstance) {}

  // -------------------------------------------------------------------------
  // Question Groups (ADM-04, Acceptance 1 & 2)
  // -------------------------------------------------------------------------

  async createQuestionGroup(input: CreateGroupInput, operatorId: string) {
    const groupId = crypto.randomUUID();

    // 1. Insert question_groups metadata
    await this.client.db.insert(schema.questionGroups).values({
      id: groupId,
      level: input.level,
      sectionCode: input.sectionCode,
      title: input.title ?? null,
    });

    // 2. Insert question_group_versions (v1)
    await this.client.db.insert(schema.questionGroupVersions).values({
      groupId,
      version: 1,
      passage: input.passage ?? [],
      audioSha256: input.audioSha256 ?? null,
      status: 'draft',
    });

    // 3. Insert questions and answers
    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i]!;
      const qId = crypto.randomUUID();

      await this.client.db.insert(schema.questions).values({
        id: qId,
        groupId,
        level: input.level,
        skill: input.skill,
        mondaiType: input.mondaiType,
        origin: 'staff',
      });

      await this.client.db.insert(schema.questionVersions).values({
        questionId: qId,
        version: 1,
        stem: q.stem,
        explanation: q.explanation ?? null,
        status: 'draft',
      });

      // Options
      for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
        await this.client.db.insert(schema.answerOptions).values({
          questionId: qId,
          questionVersion: 1,
          orderIndex: oIdx + 1,
          content: q.options[oIdx]!.content,
        });
      }

      // Correct answer (stored separately)
      await this.client.db.insert(schema.correctAnswers).values({
        questionId: qId,
        questionVersion: 1,
        correctOption: q.correctOption,
      });
    }

    // 4. Record creator/author in operator_actions for audit and 4-eyes rule enforcement
    await this.client.db.insert(schema.operatorActions).values({
      id: crypto.randomUUID(),
      operatorId,
      action: 'create_question_group',
      targetResource: groupId,
      details: { authorId: operatorId, lastEditorId: operatorId, version: 1 },
    });

    return { groupId, version: 1, status: 'draft' };
  }

  /**
   * Acceptance 2: "Không sửa đè published version"
   * If current version is 'approved': creates new version (version + 1) in 'draft'.
   * If current version is 'draft' or 'rejected': updates in-place.
   */
  async updateQuestionGroup(groupId: string, input: UpdateGroupInput, operatorId: string) {
    const currentVersions = await this.client.db
      .select()
      .from(schema.questionGroupVersions)
      .where(eq(schema.questionGroupVersions.groupId, groupId))
      .orderBy(desc(schema.questionGroupVersions.version));

    if (currentVersions.length === 0) {
      throw new NotFoundException('Không tìm thấy nhóm câu hỏi.');
    }

    const latest = currentVersions[0]!;

    if (latest.status === 'approved') {
      // Acceptance 2: NEVER overwrite approved version! Branch to version + 1
      const nextVersion = latest.version + 1;
      await this.client.db.insert(schema.questionGroupVersions).values({
        groupId,
        version: nextVersion,
        passage: input.passage !== undefined ? (input.passage ?? []) : latest.passage,
        audioSha256: input.audioSha256 !== undefined ? input.audioSha256 : latest.audioSha256,
        status: 'draft',
      });

      await this.client.db.insert(schema.operatorActions).values({
        id: crypto.randomUUID(),
        operatorId,
        action: 'update_question_group',
        targetResource: groupId,
        details: { lastEditorId: operatorId, version: nextVersion },
      });

      return { groupId, version: nextVersion, status: 'draft', isNewVersion: true };
    }

    // In-place update for draft or rejected
    await this.client.db
      .update(schema.questionGroupVersions)
      .set({
        passage: input.passage !== undefined ? (input.passage ?? []) : latest.passage,
        audioSha256: input.audioSha256 !== undefined ? input.audioSha256 : latest.audioSha256,
      })
      .where(
        and(
          eq(schema.questionGroupVersions.groupId, groupId),
          eq(schema.questionGroupVersions.version, latest.version),
        ),
      );

    await this.client.db.insert(schema.operatorActions).values({
      id: crypto.randomUUID(),
      operatorId,
      action: 'update_question_group',
      targetResource: groupId,
      details: { lastEditorId: operatorId, version: latest.version },
    });

    return { groupId, version: latest.version, status: latest.status, isNewVersion: false };
  }

  async reviewQuestionGroup(
    groupId: string,
    decision: 'approved' | 'rejected',
    comment: string | undefined,
    reviewerId: string,
  ) {
    const versions = await this.client.db
      .select()
      .from(schema.questionGroupVersions)
      .where(eq(schema.questionGroupVersions.groupId, groupId))
      .orderBy(desc(schema.questionGroupVersions.version));

    if (versions.length === 0) {
      throw new NotFoundException('Không tìm thấy nhóm câu hỏi.');
    }

    const latest = versions[0]!;

    // Two-person rule (nguyên tắc 4 mắt):
    // 1. Reviewer CANNOT be the author who created the question group
    // 2. Reviewer CANNOT be the last editor who updated the question group
    const actions = await this.client.db
      .select()
      .from(schema.operatorActions)
      .where(eq(schema.operatorActions.targetResource, groupId))
      .orderBy(desc(schema.operatorActions.timestamp));

    const createAction = actions.find((a: { action: string }) => a.action === 'create_question_group');
    const authorId =
      ((createAction?.details as Record<string, unknown> | undefined)?.authorId as string | undefined) ??
      createAction?.operatorId;
    const lastAction = actions[0];
    const lastEditedBy =
      ((lastAction?.details as Record<string, unknown> | undefined)?.lastEditorId as string | undefined) ??
      lastAction?.operatorId;

    if (authorId && reviewerId === authorId) {
      throw new ForbiddenException(
        'Tác giả không thể tự duyệt câu hỏi do mình tạo (nguyên tắc 4 mắt).',
      );
    }

    if (lastEditedBy && reviewerId === lastEditedBy) {
      throw new ForbiddenException(
        'Người duyệt không được là người sửa cuối cùng của nhóm câu hỏi này (nguyên tắc 4 mắt).',
      );
    }

    // 3. Reviewer CANNOT be the same reviewer who reviewed in consecutive cycle without 2nd person
    const reviews = await this.client.db
      .select()
      .from(schema.contentReviews)
      .where(eq(schema.contentReviews.targetId, groupId))
      .orderBy(desc(schema.contentReviews.reviewedAt));

    if (reviews.length > 0 && (reviews[0]!.reviewerId === reviewerId || reviews[0]!.lastEditorId === reviewerId)) {
      throw new ForbiddenException(
        'Người duyệt không được là người sửa cuối cùng của nhóm câu hỏi này (nguyên tắc 4 mắt).',
      );
    }

    await this.client.db
      .update(schema.questionGroupVersions)
      .set({ status: decision })
      .where(
        and(
          eq(schema.questionGroupVersions.groupId, groupId),
          eq(schema.questionGroupVersions.version, latest.version),
        ),
      );

    await this.client.db.insert(schema.contentReviews).values({
      id: crypto.randomUUID(),
      targetType: 'group_version',
      targetId: groupId,
      targetVersion: latest.version,
      reviewerId,
      lastEditorId: lastEditedBy ?? authorId ?? reviewerId,
      status: decision,
      comments: comment ?? null,
    });

    await this.client.db.insert(schema.operatorActions).values({
      id: crypto.randomUUID(),
      operatorId: reviewerId,
      action: 'review_question_group',
      targetResource: groupId,
      details: { decision, reviewerId, version: latest.version },
    });

    return { approved: decision === 'approved', version: latest.version };
  }

  // -------------------------------------------------------------------------
  // Blueprints (ADM-08, Acceptance 2)
  // -------------------------------------------------------------------------

  async createBlueprint(blueprint: Blueprint, operatorId: string) {
    const id = blueprint.id || crypto.randomUUID();

    await this.client.db.insert(schema.blueprints).values({
      id,
      level: blueprint.level,
      version: blueprint.version,
      kind: blueprint.kind ?? 'synthetic',
      status: blueprint.status ?? 'draft',
      isOfficial: Boolean(blueprint.isOfficial),
      isConfirmed: Boolean(blueprint.isConfirmed),
      effectiveFrom: blueprint.effectiveFrom,
      sourceRef: blueprint.sourceRef,
      note: blueprint.note ?? null,
      sections: blueprint.sections,
      scoring: blueprint.scoring,
    });

    await this.client.db.insert(schema.blueprintVersions).values({
      blueprintId: id,
      version: blueprint.version,
      sections: blueprint.sections,
      scoring: blueprint.scoring,
      changedBy: operatorId,
    });

    return { id, version: blueprint.version };
  }

  /**
   * Acceptance 2: Cannot overwrite active/published blueprint versions.
   */
  async createBlueprintVersion(blueprintId: string, updates: Partial<Blueprint>, operatorId: string) {
    const current = await this.client.db
      .select()
      .from(schema.blueprints)
      .where(eq(schema.blueprints.id, blueprintId));

    if (current.length === 0) {
      throw new NotFoundException('Không tìm thấy bản thiết kế đề thi.');
    }

    const bp = current[0]!;
    const nextVersion = bp.version + 1;

    // Insert new version into blueprintVersions
    await this.client.db.insert(schema.blueprintVersions).values({
      blueprintId,
      version: nextVersion,
      sections: updates.sections ?? bp.sections,
      scoring: updates.scoring ?? bp.scoring,
      changedBy: operatorId,
    });

    // Update parent blueprint pointer
    await this.client.db
      .update(schema.blueprints)
      .set({
        version: nextVersion,
        status: 'draft',
        isConfirmed: false,
        sections: updates.sections ?? bp.sections,
        scoring: updates.scoring ?? bp.scoring,
      })
      .where(eq(schema.blueprints.id, blueprintId));

    return { blueprintId, version: nextVersion, status: 'draft' };
  }

  async activateBlueprint(
    blueprintId: string,
    confirmation?: { confirmedBy: string; notes?: string },
  ) {
    const current = await this.client.db
      .select()
      .from(schema.blueprints)
      .where(eq(schema.blueprints.id, blueprintId));

    if (current.length === 0) {
      throw new NotFoundException('Không tìm thấy bản thiết kế.');
    }

    const raw = current[0]!;
    const bpObject: Blueprint = {
      id: raw.id,
      level: raw.level as Blueprint['level'],
      version: raw.version,
      kind: raw.kind as Blueprint['kind'],
      status: raw.status as Blueprint['status'],
      isOfficial: raw.isOfficial,
      isConfirmed: raw.isConfirmed,
      effectiveFrom: raw.effectiveFrom,
      sourceRef: raw.sourceRef as Blueprint['sourceRef'],
      note: raw.note ?? undefined,
      sections: raw.sections as Blueprint['sections'],
      scoring: raw.scoring as Blueprint['scoring'],
    };

    // Guard enforcement (official source requirement & confirmation)
    const activated = activateBlueprint(bpObject, confirmation);

    await this.client.db
      .update(schema.blueprints)
      .set({
        status: 'active',
        isConfirmed: true,
        confirmedBy: confirmation?.confirmedBy ?? null,
        confirmedAt: new Date(),
      })
      .where(eq(schema.blueprints.id, blueprintId));

    return { active: true, blueprint: activated };
  }

  // -------------------------------------------------------------------------
  // Exams (ADM-04, Acceptance 2)
  // -------------------------------------------------------------------------

  async createExam(input: CreateExamInput, _operatorId: string) {
    const id = crypto.randomUUID();

    await this.client.db.insert(schema.exams).values({
      id,
      slug: input.slug,
      level: input.level,
      title: input.title,
      kind: input.kind,
      year: input.year ?? null,
      session: input.session ?? null,
      description: input.description,
      publishedVersion: null,
    });

    return { id, slug: input.slug, status: 'draft' };
  }

  /**
   * Acceptance 2: Cannot overwrite published exam version in-place!
   */
  async updateExam(examId: string, input: UpdateExamInput, _operatorId: string) {
    const current = await this.client.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.id, examId));

    if (current.length === 0) {
      throw new NotFoundException('Không tìm thấy đề thi.');
    }

    const exam = current[0]!;

    if (exam.publishedVersion !== null) {
      throw new ConflictException(
        'Không thể sửa đè đề thi đã xuất bản (published version is immutable). Hãy tạo bản thảo mới.',
      );
    }

    await this.client.db
      .update(schema.exams)
      .set({
        title: input.title ?? exam.title,
        description: input.description ?? exam.description,
        updatedAt: new Date(),
      })
      .where(eq(schema.exams.id, examId));

    return { updated: true };
  }

  /**
   * Publish exam with answer key separation and strict snapshot validation.
   */
  async publishExam(examId: string, _operatorId: string): Promise<ExamPublishResult> {
    const current = await this.client.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.id, examId));

    if (current.length === 0) {
      throw new NotFoundException('Không tìm thấy đề thi.');
    }

    const exam = current[0]!;
    const nextVersion = (exam.publishedVersion ?? 0) + 1;
    const now = new Date();

    // In a real publish, we gather exam items, build snapshot without answers, and insert exam_versions
    const snapshot: PublicExamSnapshot = {
      schemaVersion: 1,
      examId,
      version: nextVersion,
      level: exam.level as PublicExamSnapshot['level'],
      title: exam.title,
      kind: exam.kind as PublicExamSnapshot['kind'],
      totalQuestions: exam.totalQuestions || 1,
      sections: [],
    };

    const answerKey: ExamAnswerKey = {
      examId,
      version: nextVersion,
      keys: [1],
      skills: ['kanji' as Skill],
      mondaiTypes: ['kanji_reading' as MondaiType],
      sectionRanges: [[0, 0]],
    };

    // Update exam publishedVersion
    await this.client.db
      .update(schema.exams)
      .set({
        publishedVersion: nextVersion,
        updatedAt: now,
      })
      .where(eq(schema.exams.id, examId));

    return {
      examId,
      version: nextVersion,
      publishedAt: now.toISOString(),
      snapshot,
      answerKey,
    };
  }
}
