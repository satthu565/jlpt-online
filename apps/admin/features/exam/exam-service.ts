import crypto from 'node:crypto';
import type {
  Blueprint,
  Level,
  PublicExamSnapshot,
  ExamAnswerKey,
  Skill,
  MondaiType,
} from '@jlpt/schema';
import { assertNoAnswerLeak } from '@jlpt/schema';
import type { AdminExam, AdminExamSection } from '../content/types';
import {
  type PublishedVersionRecord,
  type PrePublishValidationResult,
  type StaffOperator,
  ExamActionForbiddenError,
  ExamValidationError,
  ExamImmutableVersionError,
} from './types';

const FORBIDDEN_ANSWER_FIELDS = [
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

export function toValidUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id.toLowerCase();
  const hash = crypto.createHash('sha256').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export class ExamService {
  private exams: Map<string, AdminExam> = new Map();
  private versionHistory: Map<string, PublishedVersionRecord[]> = new Map();

  constructor(initialExams: AdminExam[] = []) {
    for (const ex of initialExams) {
      this.exams.set(ex.id, ex);
    }
  }

  public listExams(filter?: { level?: Level; status?: string }): AdminExam[] {
    const all = Array.from(this.exams.values());
    return all
      .filter((ex) => {
        if (filter?.level && ex.level !== filter.level) return false;
        if (filter?.status && ex.status !== filter.status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getExam(id: string): AdminExam | null {
    return this.exams.get(id) ?? null;
  }

  public createDraftExam(
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
    operator: StaffOperator,
  ): AdminExam {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new ExamActionForbiddenError('Chỉ Editor hoặc Admin mới có quyền tạo đề thi.');
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

    this.exams.set(id, newExam);
    return newExam;
  }

  /**
   * PDF-29: Quản lý phiên bản khi sửa nội dung đề
   * Cannot overwrite published version in-place!
   */
  public updateDraftExam(
    id: string,
    updates: Partial<Omit<AdminExam, 'id' | 'createdAt' | 'publishedVersion' | 'publishedAt' | 'publishedBy'>>,
    operator: StaffOperator,
  ): AdminExam {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new ExamActionForbiddenError('Chỉ Editor hoặc Admin mới có quyền cập nhật đề thi.');
    }

    const current = this.getExam(id);
    if (!current) {
      throw new Error(`Không tìm thấy đề thi với ID: ${id}`);
    }

    if (current.status === 'published') {
      throw new ExamImmutableVersionError();
    }

    const now = new Date().toISOString();
    const updated: AdminExam = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    this.exams.set(id, updated);
    return updated;
  }

  /**
   * PDF-29: Tạo bản thảo mới từ đề thi đã xuất bản
   */
  public branchNewDraft(id: string, operator: StaffOperator): AdminExam {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new ExamActionForbiddenError('Chỉ Editor hoặc Admin mới có quyền tạo bản thảo mới.');
    }

    const current = this.getExam(id);
    if (!current) throw new Error(`Không tìm thấy đề thi với ID: ${id}`);

    const now = new Date().toISOString();
    const updated: AdminExam = {
      ...current,
      status: 'draft',
      updatedAt: now,
    };

    this.exams.set(id, updated);
    return updated;
  }

  /**
   * Pre-publish validation check
   */
  public validatePrePublish(exam: AdminExam, blueprint?: Blueprint): PrePublishValidationResult {
    const violations: string[] = [];

    // 1. Ensure all question groups are in 'approved' status
    for (const sec of exam.sections) {
      for (const item of sec.items) {
        if (item.group && item.group.status !== 'approved') {
          violations.push(
            `Nhóm câu hỏi "${item.group.title || item.group.id}" (phần ${sec.code}) chưa được duyệt (trạng thái: ${item.group.status}).`,
          );
        }
      }
    }

    // 2. Blueprint checks if provided
    if (blueprint) {
      const examSecCodes = exam.sections.map((s) => s.code);
      for (const bpSec of blueprint.sections) {
        if (!examSecCodes.includes(bpSec.code)) {
          violations.push(`Đề thi thiếu phần thi '${bpSec.title}' (${bpSec.code}) theo blueprint.`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Acceptance 3 & ADM-07: "Publish version mới, takedown giữ version cũ"
   * Publishes new immutable version.
   */
  public publishExam(
    id: string,
    operator: StaffOperator,
    blueprint?: Blueprint,
  ): {
    exam: AdminExam;
    snapshot: PublicExamSnapshot;
    answerKey: ExamAnswerKey;
    versionRecord: PublishedVersionRecord;
  } {
    if (operator.role !== 'admin') {
      throw new ExamActionForbiddenError('Chỉ Quản trị viên (Admin) mới có quyền xuất bản đề thi.');
    }

    const exam = this.getExam(id);
    if (!exam) throw new Error(`Không tìm thấy đề thi với ID: ${id}`);

    // Pre-publish validation
    const validation = this.validatePrePublish(exam, blueprint);
    if (!validation.valid) {
      throw new ExamValidationError(
        `Đề thi chưa đáp ứng điều kiện xuất bản: ${validation.violations.join('; ')}`,
        validation.violations,
      );
    }

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
          throw new ExamValidationError(`Mục ${item.id} thiếu dữ liệu nhóm câu hỏi.`);
        }

        const questions = grp.questions.map((q, qIdx) => {
          totalQuestions++;
          keys.push(q.correctOption);
          skills.push(grp.skill);
          mondaiTypes.push(grp.mondaiType);

          const qIndex = currentQuestionIndex++;
          const publicOptions = q.options.map((opt) => ({
            label: opt.label,
            content: opt.content,
          }));

          return {
            index: qIndex,
            questionId: toValidUuid(q.questionId || `q_${grp.id}_${qIdx}`),
            number: q.number || String(qIndex + 1),
            stem: q.stem,
            options: publicOptions,
          };
        });

        return {
          groupId: toValidUuid(grp.id),
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

    const history = this.versionHistory.get(exam.id) ?? [];
    const latestVersionInHistory = history.length > 0 ? history[history.length - 1]!.version : 0;
    const nextVersion = Math.max(latestVersionInHistory, exam.publishedVersion ?? 0) + 1;
    const now = new Date().toISOString();

    const snapshot: PublicExamSnapshot = {
      schemaVersion: 1,
      examId: toValidUuid(exam.id),
      version: nextVersion,
      level: exam.level,
      title: exam.title,
      kind: exam.kind,
      totalQuestions,
      sections: snapshotSections,
    };

    // Zero answer leak enforcement
    assertNoAnswerLeak(snapshot);
    const rawSnapshotStr = JSON.stringify(snapshot);
    for (const forbidden of FORBIDDEN_ANSWER_FIELDS) {
      if (rawSnapshotStr.includes(`"${forbidden}":`)) {
        throw new ExamValidationError(`Snapshot chứa trường thông tin bị cấm: ${forbidden}`);
      }
    }

    const answerKey: ExamAnswerKey = {
      examId: exam.id,
      version: nextVersion,
      keys,
      skills,
      mondaiTypes,
      sectionRanges,
    };

    const versionRecord: PublishedVersionRecord = {
      version: nextVersion,
      publishedAt: now,
      publishedBy: operator.id,
      snapshot,
      answerKey,
      takedownAt: null,
      takedownBy: null,
      takedownReason: null,
    };

    history.push(versionRecord);
    this.versionHistory.set(exam.id, history);

    const publishedExam: AdminExam = {
      ...exam,
      status: 'published',
      publishedVersion: nextVersion,
      publishedAt: now,
      publishedBy: operator.id,
      totalQuestions,
      updatedAt: now,
    };

    this.exams.set(id, publishedExam);

    return {
      exam: publishedExam,
      snapshot,
      answerKey,
      versionRecord,
    };
  }

  /**
   * Acceptance 3 & ADM-07: "Takedown giữ version cũ"
   * Sets exam status to takedown, marks record with takedown reason, BUT KEEPS version history intact!
   */
  public takedownExam(
    id: string,
    reason: string,
    operator: StaffOperator,
  ): { exam: AdminExam; takedownRecord: PublishedVersionRecord } {
    if (operator.role !== 'admin') {
      throw new ExamActionForbiddenError('Chỉ Quản trị viên (Admin) mới có quyền gỡ đề thi.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('Cần cung cấp lý do khi thực hiện gỡ đề thi (takedown).');
    }

    const exam = this.getExam(id);
    if (!exam) throw new Error(`Không tìm thấy đề thi với ID: ${id}`);

    const history = this.versionHistory.get(exam.id) ?? [];
    if (history.length === 0) {
      throw new Error('Đề thi chưa từng được xuất bản.');
    }

    const now = new Date().toISOString();
    // Update latest published version record
    const latestVersionRecord = history[history.length - 1]!;
    latestVersionRecord.takedownAt = now;
    latestVersionRecord.takedownBy = operator.id;
    latestVersionRecord.takedownReason = reason;

    // Exam status becomes 'takedown' / unpublish, but old versions remain in history!
    const takedownExamState: AdminExam = {
      ...exam,
      status: 'draft', // or draft status ready for new revisions
      publishedVersion: null,
      updatedAt: now,
    };

    this.exams.set(id, takedownExamState);

    return {
      exam: takedownExamState,
      takedownRecord: latestVersionRecord,
    };
  }

  /**
   * PDF-29: Lấy toàn bộ lịch sử các phiên bản đã xuất bản và takedown
   * Proves: "Takedown giữ version cũ"
   */
  public getVersionHistory(id: string): PublishedVersionRecord[] {
    return this.versionHistory.get(id) ?? [];
  }

  /**
   * PDF-24: Xem trước đề trên giao diện làm bài (Learner-facing preview)
   * Strictly without answer leakage!
   */
  public getExamPreview(id: string, version?: number): PublicExamSnapshot {
    const history = this.versionHistory.get(id) ?? [];
    if (version !== undefined) {
      const match = history.find((h) => h.version === version);
      if (match) return match.snapshot;
    }

    if (history.length > 0) {
      return history[history.length - 1]!.snapshot;
    }

    // If never published, build draft preview snapshot on the fly
    const exam = this.getExam(id);
    if (!exam) throw new Error(`Không tìm thấy đề thi: ${id}`);

    let totalQuestions = 0;
    let currentQuestionIndex = 0;

    const snapshotSections = exam.sections.map((sec, secIdx) => {
      const sectionStart = currentQuestionIndex;
      const groups = sec.items.map((item) => {
        const grp = item.group;
        const questions = (grp?.questions ?? []).map((q, qIdx) => {
          totalQuestions++;
          const qIndex = currentQuestionIndex++;
          return {
            index: qIndex,
            questionId: toValidUuid(q.questionId || `q_${grp?.id}_${qIdx}`),
            number: q.number || String(qIndex + 1),
            stem: q.stem,
            options: q.options.map((opt) => ({
              label: opt.label,
              content: opt.content,
            })),
          };
        });

        return {
          groupId: toValidUuid(grp?.id || item.groupId),
          mondaiType: grp?.mondaiType || ('kanji_reading' as MondaiType),
          instructions: grp?.instructions || [],
          passage: grp?.passage ?? null,
          media: grp?.mediaIds ?? [],
          questions,
        };
      });

      const sectionEnd = currentQuestionIndex - 1;
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

    const previewSnapshot: PublicExamSnapshot = {
      schemaVersion: 1,
      examId: toValidUuid(exam.id),
      version: exam.publishedVersion ?? 1,
      level: exam.level,
      title: exam.title,
      kind: exam.kind,
      totalQuestions,
      sections: snapshotSections,
    };

    assertNoAnswerLeak(previewSnapshot);
    return previewSnapshot;
  }
}
