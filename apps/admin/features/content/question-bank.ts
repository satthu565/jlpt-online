import type { Level, MondaiType, Skill } from '@jlpt/schema';
import type { StaffUser } from '../../lib/auth-context';
import type { AdminQuestionGroup, ContentStatus } from './types';
import { richTextToPlainText } from './types';

export class QuestionBankError extends Error {
  constructor(message: string, public readonly code: 'FORBIDDEN' | 'IMMUTABLE_VERSION' | 'INVALID_DATA' | 'NOT_FOUND') {
    super(message);
    this.name = 'QuestionBankError';
  }
}

export interface QuestionFilterCriteria {
  level?: Level;
  skill?: Skill;
  mondaiType?: MondaiType;
  status?: ContentStatus;
  keyword?: string;
}

/**
 * In-memory repository & business logic manager for Question Bank.
 * Implements strict version immutability and role-based review workflow.
 */
export class QuestionBankManager {
  private groups: Map<string, AdminQuestionGroup[]> = new Map(); // id -> all versions

  constructor(initialGroups: AdminQuestionGroup[] = []) {
    for (const g of initialGroups) {
      const versions = this.groups.get(g.id) ?? [];
      versions.push(g);
      this.groups.set(g.id, versions);
    }
  }

  /**
   * List question groups with optional filters.
   * Returns latest version of each group matching criteria.
   */
  public listGroups(criteria: QuestionFilterCriteria = {}): AdminQuestionGroup[] {
    const results: AdminQuestionGroup[] = [];

    for (const versions of this.groups.values()) {
      if (versions.length === 0) continue;
      // Get highest version
      const latest = [...versions].sort((a, b) => b.version - a.version)[0]!;

      // Filter by level
      if (criteria.level && latest.level !== criteria.level) continue;

      // Filter by skill
      if (criteria.skill && latest.skill !== criteria.skill) continue;

      // Filter by mondaiType
      if (criteria.mondaiType && latest.mondaiType !== criteria.mondaiType) continue;

      // Filter by status
      if (criteria.status && latest.status !== criteria.status) continue;

      // Filter by keyword (case-insensitive substring in instructions, stem, or options)
      if (criteria.keyword) {
        const kw = criteria.keyword.toLowerCase().trim();
        const instructionsText = richTextToPlainText(latest.instructions).toLowerCase();
        const titleText = (latest.title || '').toLowerCase();
        const questionsText = latest.questions
          .map((q) => `${richTextToPlainText(q.stem)} ${q.options.map((o) => richTextToPlainText(o.content)).join(' ')}`)
          .join(' ')
          .toLowerCase();

        const match = instructionsText.includes(kw) || titleText.includes(kw) || questionsText.includes(kw);
        if (!match) continue;
      }

      results.push(latest);
    }

    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Get specific version or latest version of a question group.
   */
  public getGroup(id: string, version?: number): AdminQuestionGroup | null {
    const versions = this.groups.get(id);
    if (!versions || versions.length === 0) return null;

    if (version !== undefined) {
      return versions.find((v) => v.version === version) ?? null;
    }

    return [...versions].sort((a, b) => b.version - a.version)[0] ?? null;
  }

  /**
   * Get all version history of a question group.
   */
  public getVersionHistory(id: string): AdminQuestionGroup[] {
    const versions = this.groups.get(id) ?? [];
    return [...versions].sort((a, b) => b.version - a.version);
  }

  /**
   * Create a new Question Group draft (v1).
   */
  public createGroup(
    data: Omit<AdminQuestionGroup, 'id' | 'version' | 'status' | 'createdAt' | 'updatedAt' | 'lastEditedBy' | 'authorId'>,
    operator: StaffUser,
  ): AdminQuestionGroup {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new QuestionBankError('Chỉ biên tập viên hoặc admin mới có quyền tạo câu hỏi.', 'FORBIDDEN');
    }

    const id = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newGroup: AdminQuestionGroup = {
      ...data,
      id,
      version: 1,
      status: 'draft',
      authorId: operator.id,
      lastEditedBy: operator.id,
      createdAt: now,
      updatedAt: now,
    };

    this.groups.set(id, [newGroup]);
    return newGroup;
  }

  /**
   * Acceptance 2: "Không sửa đè published version"
   * Update question group:
   * - If status is 'draft' or 'rejected': updates directly in-place.
   * - If status is 'approved': CANNOT overwrite approved version! Automatically branches a new draft version (v+1).
   */
  public updateGroup(
    id: string,
    updates: Partial<Omit<AdminQuestionGroup, 'id' | 'version' | 'authorId' | 'createdAt'>>,
    operator: StaffUser,
  ): { group: AdminQuestionGroup; isNewVersion: boolean } {
    if (operator.role !== 'editor' && operator.role !== 'admin') {
      throw new QuestionBankError('Chỉ biên tập viên hoặc admin mới có quyền sửa câu hỏi.', 'FORBIDDEN');
    }

    const current = this.getGroup(id);
    if (!current) {
      throw new QuestionBankError('Không tìm thấy nhóm câu hỏi.', 'NOT_FOUND');
    }

    const now = new Date().toISOString();

    // If current group is already APPROVED: NEVER overwrite! Create next version in draft status
    if (current.status === 'approved') {
      const nextVersion = current.version + 1;
      const branchedGroup: AdminQuestionGroup = {
        ...current,
        ...updates,
        id: current.id,
        version: nextVersion,
        status: 'draft',
        lastEditedBy: operator.id,
        reviewerId: null,
        reviewComment: null,
        createdAt: current.createdAt,
        updatedAt: now,
      };

      const allVersions = this.groups.get(id) ?? [];
      allVersions.push(branchedGroup);
      this.groups.set(id, allVersions);

      return { group: branchedGroup, isNewVersion: true };
    }

    // In-place update for draft or rejected
    const updatedGroup: AdminQuestionGroup = {
      ...current,
      ...updates,
      version: current.version,
      lastEditedBy: operator.id,
      updatedAt: now,
    };

    const allVersions = this.groups.get(id) ?? [];
    const index = allVersions.findIndex((v) => v.version === current.version);
    if (index >= 0) {
      allVersions[index] = updatedGroup;
    } else {
      allVersions.push(updatedGroup);
    }
    this.groups.set(id, allVersions);

    return { group: updatedGroup, isNewVersion: false };
  }

  /**
   * Submit group for review (draft -> in_review).
   */
  public submitForReview(id: string, operator: StaffUser): AdminQuestionGroup {
    const current = this.getGroup(id);
    if (!current) throw new QuestionBankError('Không tìm thấy nhóm câu hỏi.', 'NOT_FOUND');

    if (current.status !== 'draft' && current.status !== 'rejected') {
      throw new QuestionBankError('Chỉ nhóm câu hỏi ở trạng thái bản thảo hoặc bị từ chối mới có thể gửi duyệt.', 'INVALID_DATA');
    }

    const res = this.updateGroup(id, { status: 'in_review' }, operator);
    return res.group;
  }

  /**
   * Review question group:
   * Two-person rule (nguyên tắc 4 mắt):
   * Reviewer cannot be the author or last editor of the question group!
   */
  public reviewGroup(
    id: string,
    decision: 'approved' | 'rejected',
    comment: string | undefined,
    reviewer: StaffUser,
  ): AdminQuestionGroup {
    if (reviewer.role !== 'reviewer' && reviewer.role !== 'admin') {
      throw new QuestionBankError('Chỉ người duyệt (Reviewer) hoặc Admin mới có quyền phê duyệt nội dung.', 'FORBIDDEN');
    }

    const current = this.getGroup(id);
    if (!current) throw new QuestionBankError('Không tìm thấy nhóm câu hỏi.', 'NOT_FOUND');

    // Acceptance / Spec: Reviewer MUST NOT be the last editor or author
    if (current.lastEditedBy === reviewer.id || current.authorId === reviewer.id) {
      throw new QuestionBankError(
        'Người duyệt không được là người soạn thảo hoặc người sửa cuối cùng của nhóm câu hỏi này (nguyên tắc 4 mắt).',
        'FORBIDDEN',
      );
    }

    const now = new Date().toISOString();
    const updated: AdminQuestionGroup = {
      ...current,
      status: decision,
      reviewerId: reviewer.id,
      reviewComment: comment ?? null,
      updatedAt: now,
    };

    const allVersions = this.groups.get(id) ?? [];
    const idx = allVersions.findIndex((v) => v.version === current.version);
    if (idx >= 0) {
      allVersions[idx] = updated;
    }
    this.groups.set(id, allVersions);

    return updated;
  }
}
