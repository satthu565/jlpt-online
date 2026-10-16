import type { Blueprint, Level, PublicExamSnapshot, ExamAnswerKey, Skill, MondaiType } from '@jlpt/schema';
import type { StaffUser } from '../../lib/auth-context';

export const FORBIDDEN_ANSWER_FIELDS = [
  'correct',
  'correctOption',
  'isCorrect',
  'answer',
  'answerKey',
  'answers',
  'keys',
  'explanation',
  'explanations',
] as const;
import type { AdminExam, AdminExamSection, BlueprintValidationResult } from './types';

export class ExamManagerError extends Error {
  constructor(
    message: string,
    public readonly code: 'FORBIDDEN' | 'VALIDATION_FAILED' | 'IMMUTABLE_VERSION' | 'NOT_FOUND' | 'UNAPPROVED_CONTENT',
    public readonly violations: string[] = [],
  ) {
    super(message);
    this.name = 'ExamManagerError';
  }
}

/**
 * Validates exam sections and question items against the assigned blueprint.
 */
export function validateExamBlueprint(exam: AdminExam, blueprint: Blueprint): BlueprintValidationResult {
  const violations: string[] = [];

  // Check section codes
  const examSectionCodes = exam.sections.map((s) => s.code);
  for (const bpSec of blueprint.sections) {
    if (!examSectionCodes.includes(bpSec.code)) {
      violations.push(`Đề thi thiếu phần thi '${bpSec.title}' (${bpSec.code}) theo blueprint.`);
    }
  }

  // Check each section duration and question counts
  for (const bpSec of blueprint.sections) {
    const examSec = exam.sections.find((s) => s.code === bpSec.code);
    if (!examSec) continue;

    if (examSec.durationSec !== bpSec.durationSec) {
      violations.push(
        `Thời gian phần thi ${bpSec.code} (${examSec.durationSec}s) không khớp với blueprint (${bpSec.durationSec}s).`,
      );
    }

    // Count questions per mondai
    for (const m of bpSec.mondai) {
      let count = 0;
      for (const item of examSec.items) {
        if (item.group && item.group.mondaiType === m.type) {
          count += item.group.questions.length;
        }
      }

      if (count < m.questionCount) {
        violations.push(
          `Dạng bài ${m.type} trong phần ${bpSec.code} mới có ${count}/${m.questionCount} câu hỏi (thiếu ${m.questionCount - count} câu).`,
        );
      }
    }
  }

  // Check that all question groups are APPROVED
  for (const sec of exam.sections) {
    for (const item of sec.items) {
      if (item.group && item.group.status !== 'approved') {
        violations.push(
          `Nhóm câu hỏi '${item.group.title || item.group.id}' ở trạng thái '${item.group.status}', chưa được duyệt (approved).`,
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Exam Manager (ADM-04, Acceptance 2)
 * Manages exam authoring, blueprint validation, publishing, and version immutability.
 */
export class ExamManager {
  private exams: Map<string, AdminExam[]> = new Map(); // id -> all versions

  constructor(initialExams: AdminExam[] = []) {
    for (const ex of initialExams) {
      const versions = this.exams.get(ex.id) ?? [];
      versions.push(ex);
      this.exams.set(ex.id, versions);
    }
  }

  public listExams(filter?: { level?: Level; status?: string }): AdminExam[] {
    const list: AdminExam[] = [];
    for (const versions of this.exams.values()) {
      if (versions.length === 0) continue;
      const latest = [...versions].sort((a, b) => (b.publishedVersion ?? 0) - (a.publishedVersion ?? 0))[0]!;

      if (filter?.level && latest.level !== filter.level) continue;
      if (filter?.status && latest.status !== filter.status) continue;

      list.push(latest);
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getExam(id: string, version?: number): AdminExam | null {
    const versions = this.exams.get(id);
    if (!versions || versions.length === 0) return null;

    if (version !== undefined) {
      return versions.find((v) => v.publishedVersion === version) ?? null;
    }

    return versions[versions.length - 1] ?? null;
  }

  /**
   * Create an exam draft (v1).
   */
  public createExam(
    data: {
      slug: string;
      level: Level;
      title: string;
      kind: 'original' | 'practice' | 'mixed' | 'custom';
      description: string;
      blueprintId: string;
      blueprintVersion: number;
      sourceRefs: string[];
      sections?: AdminExamSection[];
    },
    operator: StaffUser,
  ): AdminExam {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new ExamManagerError('Chỉ Editor hoặc Admin mới có quyền tạo đề thi.', 'FORBIDDEN');
    }

    const id = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newExam: AdminExam = {
      id,
      slug: data.slug,
      level: data.level,
      title: data.title,
      kind: data.kind,
      description: data.description,
      blueprintId: data.blueprintId,
      blueprintVersion: data.blueprintVersion,
      sourceRefs: data.sourceRefs,
      sections: data.sections ?? [],
      totalQuestions: 0,
      status: 'draft',
      publishedVersion: null,
      createdAt: now,
      updatedAt: now,
    };

    this.exams.set(id, [newExam]);
    return newExam;
  }

  /**
   * Acceptance 2: "Không sửa đè published version"
   * Update exam draft metadata or items.
   * If exam is ALREADY PUBLISHED: Throws IMMUTABLE_VERSION error!
   * Must branch to a new draft version.
   */
  public updateExam(
    id: string,
    updates: Partial<Omit<AdminExam, 'id' | 'createdAt' | 'publishedVersion' | 'publishedAt' | 'publishedBy'>>,
    operator: StaffUser,
  ): AdminExam {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new ExamManagerError('Chỉ Editor hoặc Admin mới có quyền cập nhật đề thi.', 'FORBIDDEN');
    }

    const current = this.getExam(id);
    if (!current) {
      throw new ExamManagerError('Không tìm thấy đề thi.', 'NOT_FOUND');
    }

    // Strict Acceptance 2 check: If exam has been published, NEVER edit in-place!
    if (current.status === 'published' || current.publishedVersion !== null) {
      throw new ExamManagerError(
        'Không thể sửa đè đề thi đã xuất bản (published version is immutable). Hãy tạo phiên bản mới.',
        'IMMUTABLE_VERSION',
      );
    }

    const now = new Date().toISOString();
    const updated: AdminExam = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    const allVersions = this.exams.get(id) ?? [];
    const idx = allVersions.findIndex((v) => v.id === current.id && v.publishedVersion === current.publishedVersion);
    if (idx >= 0) {
      allVersions[idx] = updated;
    }
    this.exams.set(id, allVersions);

    return updated;
  }

  /**
   * Branch a new draft version from an existing published exam.
   */
  public branchNewDraft(id: string, operator: StaffUser): AdminExam {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new ExamManagerError('Chỉ Editor hoặc Admin mới có quyền tạo bản thảo mới từ đề thi.', 'FORBIDDEN');
    }

    const current = this.getExam(id);
    if (!current) throw new ExamManagerError('Không tìm thấy đề thi.', 'NOT_FOUND');

    const now = new Date().toISOString();
    const newDraft: AdminExam = {
      ...current,
      status: 'draft',
      publishedVersion: null,
      publishedAt: null,
      publishedBy: null,
      updatedAt: now,
    };

    const all = this.exams.get(id) ?? [];
    all.push(newDraft);
    this.exams.set(id, all);

    return newDraft;
  }

  /**
   * Publish an exam:
   * 1. Validate blueprint (must have 0 violations for real exams).
   * 2. Ensure all question groups are approved.
   * 3. Generate public snapshot (WITHOUT correct answers / explanations).
   * 4. Generate secure answer key.
   * 5. Record immutable published version.
   */
  public publishExam(
    id: string,
    blueprint: Blueprint,
    operator: StaffUser,
  ): {
    exam: AdminExam;
    snapshot: PublicExamSnapshot;
    answerKey: ExamAnswerKey;
  } {
    if (operator.role !== 'admin') {
      throw new ExamManagerError('Chỉ Quản trị viên (Admin) mới có quyền xuất bản đề thi.', 'FORBIDDEN');
    }

    const exam = this.getExam(id);
    if (!exam) throw new ExamManagerError('Không tìm thấy đề thi.', 'NOT_FOUND');

    // 1. Validate blueprint
    const validation = validateExamBlueprint(exam, blueprint);
    if (!validation.valid && exam.kind === 'original') {
      throw new ExamManagerError(
        `Đề thi chưa đáp ứng đúng tiêu chuẩn blueprint: ${validation.violations.join('; ')}`,
        'VALIDATION_FAILED',
        validation.violations,
      );
    }

    // 2. Count total questions and build answer keys
    let totalQuestions = 0;
    const keys: number[] = [];
    const skills: Skill[] = [];
    const mondaiTypes: MondaiType[] = [];
    const sectionRanges: [number, number][] = [];

    let currentQuestionIndex = 0;

    const snapshotSections = exam.sections.map((sec, secIdx) => {
      const sectionStart = currentQuestionIndex;
      const groups = sec.items.map((item) => {
        const grp = item.group;
        if (!grp) {
          throw new ExamManagerError(`Mục đề thi ${item.id} thiếu nhóm câu hỏi.`, 'VALIDATION_FAILED');
        }

        const questions = grp.questions.map((q, qIdx) => {
          totalQuestions++;
          keys.push(q.correctOption);
          skills.push(grp.skill);
          mondaiTypes.push(grp.mondaiType);

          const qIndex = currentQuestionIndex++;

          // Public question options: only label and content, STRICTLY NO isCorrect
          const publicOptions = q.options.map((opt) => ({
            label: opt.label,
            content: opt.content,
          }));

          return {
            index: qIndex,
            questionId: q.questionId || `q_${grp.id}_${qIdx}`,
            number: q.number || String(qIndex + 1),
            stem: q.stem,
            options: publicOptions,
          };
        });

        return {
          groupId: grp.id,
          mondaiType: grp.mondaiType,
          instructions: grp.instructions,
          passage: grp.passage ?? null,
          media: grp.mediaIds,
          questions,
        };
      });

      const sectionEnd = currentQuestionIndex - 1;
      sectionRanges.push([sectionStart, sectionEnd >= sectionStart ? sectionEnd : sectionStart]);

      return {
        index: secIdx,
        code: sec.code,
        title: sec.title,
        durationSec: sec.durationSec,
        questionRange: [sectionStart, sectionEnd >= sectionStart ? sectionEnd : sectionStart] as [number, number],
        groups,
        listeningTimeline: null,
      };
    });

    const nextPublishedVersion = (exam.publishedVersion ?? 0) + 1;
    const now = new Date().toISOString();

    // 3. Public snapshot: STRICTLY NO answer fields!
    const snapshot: PublicExamSnapshot = {
      schemaVersion: 1,
      examId: exam.id,
      version: nextPublishedVersion,
      level: exam.level,
      title: exam.title,
      kind: exam.kind,
      totalQuestions,
      sections: snapshotSections,
    };

    // Verify snapshot does not contain forbidden answer fields
    const rawSnapshotStr = JSON.stringify(snapshot);
    for (const forbidden of FORBIDDEN_ANSWER_FIELDS) {
      if (rawSnapshotStr.includes(`"${forbidden}":`)) {
        throw new ExamManagerError(`Snapshot chứa trường thông tin bị cấm: ${forbidden}`, 'VALIDATION_FAILED');
      }
    }

    // 4. Secure Answer Key
    const answerKey: ExamAnswerKey = {
      examId: exam.id,
      version: nextPublishedVersion,
      keys,
      skills,
      mondaiTypes,
      sectionRanges,
    };

    // 5. Update exam status
    const publishedExam: AdminExam = {
      ...exam,
      status: 'published',
      publishedVersion: nextPublishedVersion,
      publishedAt: now,
      publishedBy: operator.id,
      totalQuestions,
      updatedAt: now,
    };

    const all = this.exams.get(id) ?? [];
    all.push(publishedExam);
    this.exams.set(id, all);

    return {
      exam: publishedExam,
      snapshot,
      answerKey,
    };
  }
}
