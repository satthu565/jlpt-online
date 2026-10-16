import {
  BadRequestException,
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
import { sanitizeExportField } from '@jlpt/schema';
import { OutboxService } from '../outbox/outbox.service.js';
import type {
  CreateClassAssignmentDto,
  CreateClassDto,
  CreateClassInvitationDto,
  CreateOrganizationDto,
  CreateSupplementDto,
  ExportClassGradesDto,
  TeacherApplicationDto,
  UpdateOrganizationDto,
} from './classroom.types.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

export function extractScoreFromResult(result: unknown): number {
  if (!result || typeof result !== 'object') return 0;
  const res = result as Record<string, unknown>;
  if (res.scoring && typeof (res.scoring as Record<string, unknown>).total === 'number') {
    return (res.scoring as Record<string, unknown>).total as number;
  }
  if (res.totals && typeof (res.totals as Record<string, unknown>).correct === 'number') {
    return (res.totals as Record<string, unknown>).correct as number;
  }
  return 0;
}

@Injectable()
export class ClassroomService {
  constructor(
    @Inject(DB_CLIENT) private readonly client: DbClientInstance,
    private readonly outboxService: OutboxService,
  ) {}

  // ---------------------------------------------------------------------------
  // Teacher Onboarding & Organizations (TEA-01, TEA-12, TEA-13)
  // ---------------------------------------------------------------------------

  /**
   * TEA-01: Học viên nộp đơn đăng ký làm giáo viên
   */
  async submitTeacherApplication(userId: string, input: TeacherApplicationDto) {
    const applicationId = generateUuidV7();

    await this.client.db.insert(schema.teacherApplications).values({
      id: applicationId,
      userId,
      status: 'approved',
      qualifications: {
        intro: input.intro,
        organizationName: input.organizationName || null,
      },
    });

    // Update user role to teacher if currently student/user
    await this.client.db
      .update(schema.users)
      .set({ role: 'teacher', updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    return {
      applicationId,
      status: 'approved',
    };
  }

  /**
   * TEA-12: Danh sách tổ chức giáo dục mà người dùng tham gia
   */
  async listOrganizations(user: AuthUserContext) {
    if (user.role === 'admin') {
      const items = await this.client.db
        .select({
          id: schema.organizations.id,
          name: schema.organizations.name,
          slug: schema.organizations.slug,
          createdAt: schema.organizations.createdAt,
        })
        .from(schema.organizations)
        .orderBy(desc(schema.organizations.createdAt));
      return { items };
    }

    const items = await this.client.db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        slug: schema.organizations.slug,
        role: schema.orgMemberships.role,
        createdAt: schema.organizations.createdAt,
      })
      .from(schema.orgMemberships)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.orgMemberships.orgId),
      )
      .where(eq(schema.orgMemberships.userId, user.userId))
      .orderBy(desc(schema.organizations.createdAt));

    return { items };
  }

  /**
   * TEA-12: Tạo tổ chức trung tâm mới
   */
  async createOrganization(userId: string, input: CreateOrganizationDto) {
    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Tên tổ chức không được để trống.',
      });
    }

    const orgId = generateUuidV7();
    const slug = `${input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    await this.client.db.insert(schema.organizations).values({
      id: orgId,
      name: input.name.trim(),
      slug,
    });

    // Creator becomes owner of organization
    await this.client.db.insert(schema.orgMemberships).values({
      id: generateUuidV7(),
      orgId,
      userId,
      role: 'owner',
    });

    return {
      id: orgId,
      name: input.name.trim(),
      slug,
    };
  }

  /**
   * TEA-12, TEA-13: Chi tiết tổ chức (Teacher A không đọc học viên org B)
   */
  async getOrganization(orgId: string, user: AuthUserContext) {
    await this.assertOrgMembership(orgId, user);

    const [org] = await this.client.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy tổ chức.',
      });
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt.toISOString(),
    };
  }

  /**
   * TEA-12: Cập nhật thông tin tổ chức
   */
  async updateOrganization(
    orgId: string,
    user: AuthUserContext,
    input: UpdateOrganizationDto,
  ) {
    await this.assertOrgRole(orgId, user, ['owner', 'admin']);

    if (input.name !== undefined) {
      await this.client.db
        .update(schema.organizations)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(schema.organizations.id, orgId));
    }

    return { updated: true };
  }

  // ---------------------------------------------------------------------------
  // Classes & Memberships (TEA-02, TEA-03, TEA-07, TEA-13)
  // ---------------------------------------------------------------------------

  /**
   * TEA-02, TEA-12: Danh sách lớp học trong tổ chức
   */
  async listOrganizationClasses(orgId: string, user: AuthUserContext) {
    await this.assertOrgMembership(orgId, user);

    const items = await this.client.db
      .select({
        id: schema.classes.id,
        name: schema.classes.name,
        level: schema.classes.level,
        teacherId: schema.classes.teacherId,
        createdAt: schema.classes.createdAt,
      })
      .from(schema.classes)
      .where(eq(schema.classes.orgId, orgId))
      .orderBy(desc(schema.classes.createdAt));

    return { items };
  }

  /**
   * TEA-02: Tạo lớp học mới trong tổ chức
   */
  async createClass(
    orgId: string,
    user: AuthUserContext,
    input: CreateClassDto,
  ) {
    await this.assertOrgRole(orgId, user, ['owner', 'admin', 'teacher']);

    if (!input.name || !input.level) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Tên lớp và cấp độ là bắt buộc.',
      });
    }

    const classId = generateUuidV7();

    await this.client.db.insert(schema.classes).values({
      id: classId,
      orgId,
      teacherId: user.userId,
      name: input.name.trim(),
      level: input.level,
    });

    return { classId };
  }

  /**
   * TEA-03: Tạo mã mời học viên tham gia lớp
   */
  async createClassInvitation(
    classId: string,
    user: AuthUserContext,
    input: CreateClassInvitationDto,
  ) {
    await this.assertClassTeacherOrAdmin(classId, user);

    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default
    const maxUses = input.maxUses ?? 1;

    if (maxUses < 1) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Số lượt sử dụng tối đa phải lớn hơn 0.',
      });
    }

    const invitationToken = generateUuidV7().replace(/-/g, '');

    await this.client.db.insert(schema.classInvitations).values({
      id: generateUuidV7(),
      classId,
      inviteHash: invitationToken,
      maxUses,
      usedCount: 0,
      expiresAt,
    });

    return { invitationToken };
  }

  /**
   * TEA-03: Học viên tham gia lớp học qua mã mời (idempotent, chính sách hết hạn/hết lượt)
   * Acceptance 2: Invite expired/revoked/single-use đúng policy
   */
  async joinClassByInvitation(token: string, user: AuthUserContext) {
    const [invitation] = await this.client.db
      .select()
      .from(schema.classInvitations)
      .where(eq(schema.classInvitations.inviteHash, token))
      .limit(1);

    if (!invitation) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Mã mời lớp học không tồn tại.',
      });
    }

    // 1. Kiểm tra hết hạn (Expired)
    if (new Date() > new Date(invitation.expiresAt)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã mời lớp học đã hết hạn.',
      });
    }

    // 2. Kiểm tra nếu học viên đã là thành viên lớp (Idempotent: thành công không tăng usedCount)
    const [existingMember] = await this.client.db
      .select()
      .from(schema.classMemberships)
      .where(
        and(
          eq(schema.classMemberships.classId, invitation.classId),
          eq(schema.classMemberships.studentId, user.userId),
        ),
      )
      .limit(1);

    if (existingMember) {
      return {
        success: true,
        classId: invitation.classId,
      };
    }

    // 3. Kiểm tra hết số lượt sử dụng (Single-use / max uses)
    if (invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã mời lớp học đã hết số lượt sử dụng.',
      });
    }

    // 4. Nguyên tử tăng usedCount và thêm thành viên
    const updateResult = await this.client.db
      .update(schema.classInvitations)
      .set({
        usedCount: sql`${schema.classInvitations.usedCount} + 1`,
      })
      .where(
        and(
          eq(schema.classInvitations.id, invitation.id),
          sql`${schema.classInvitations.usedCount} < ${invitation.maxUses}`,
        ),
      );

    if (updateResult.rowCount === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã mời lớp học đã hết số lượt sử dụng.',
      });
    }

    await this.client.db.insert(schema.classMemberships).values({
      id: generateUuidV7(),
      classId: invitation.classId,
      studentId: user.userId,
      status: 'active',
    });

    return {
      success: true,
      classId: invitation.classId,
    };
  }

  /**
   * TEA-07, TEA-13: Danh sách thành viên trong lớp học (Teacher A không đọc học viên org B)
   */
  async listClassMembers(classId: string, user: AuthUserContext) {
    await this.assertClassAccess(classId, user);

    const members = await this.client.db
      .select({
        studentId: schema.classMemberships.studentId,
        status: schema.classMemberships.status,
        joinedAt: schema.classMemberships.joinedAt,
        name: schema.users.name,
        email: schema.users.email,
      })
      .from(schema.classMemberships)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.classMemberships.studentId),
      )
      .where(eq(schema.classMemberships.classId, classId))
      .orderBy(desc(schema.classMemberships.joinedAt));

    interface MemberRow {
      studentId: string;
      status: string;
      joinedAt: Date;
      name: string | null;
      email: string;
    }

    const items = (members as MemberRow[]).map((m: MemberRow) => ({
      userId: m.studentId,
      name: m.name || '',
      email: m.email,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
    }));

    return { items };
  }

  /**
   * TEA-13: Rời lớp hoặc giáo viên xóa học viên khỏi lớp
   */
  async removeClassMember(
    classId: string,
    targetUserId: string,
    user: AuthUserContext,
  ) {
    if (user.userId !== targetUserId) {
      await this.assertClassTeacherOrAdmin(classId, user);
    }

    await this.client.db
      .delete(schema.classMemberships)
      .where(
        and(
          eq(schema.classMemberships.classId, classId),
          eq(schema.classMemberships.studentId, targetUserId),
        ),
      );

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Assignments (TEA-04, TEA-05, TEA-06, TEA-07, TEA-08, TEA-09, TEA-10, TEA-11)
  // ---------------------------------------------------------------------------

  /**
   * TEA-04, TEA-05, TEA-06: Giao bài tập hoặc bài kiểm tra cho lớp
   */
  async createClassAssignment(
    classId: string,
    user: AuthUserContext,
    input: CreateClassAssignmentDto,
  ) {
    await this.assertClassTeacherOrAdmin(classId, user);

    const opensAt = new Date(input.opensAtUTC);
    const dueAt = new Date(input.dueAtUTC);

    if (isNaN(opensAt.getTime()) || isNaN(dueAt.getTime())) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Thời gian bắt đầu và kết thúc không hợp lệ.',
      });
    }

    if (opensAt > dueAt) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Thời gian mở bài phải trước hoặc bằng thời hạn nộp bài.',
      });
    }

    const assignmentId = generateUuidV7();
    const title = input.title || `Bài tập lớp ${new Date().toLocaleDateString('vi-VN')}`;

    await this.client.db.insert(schema.assignments).values({
      id: assignmentId,
      classId,
      examId: input.examId || null,
      title,
      opensAt,
      dueAt,
    });

    let targetLearnerIds = input.learnerIds;
    if (!targetLearnerIds || targetLearnerIds.length === 0) {
      const activeMembers = await this.client.db
        .select({ studentId: schema.classMemberships.studentId })
        .from(schema.classMemberships)
        .where(
          and(
            eq(schema.classMemberships.classId, classId),
            eq(schema.classMemberships.status, 'active'),
          ),
        );
      targetLearnerIds = (activeMembers as Array<{ studentId: string }>).map((m) => m.studentId);
    }

    for (const learnerId of targetLearnerIds) {
      await this.client.db.insert(schema.assignmentLearners).values({
        id: generateUuidV7(),
        assignmentId,
        learnerId,
        status: 'assigned',
      });
    }

    await this.outboxService.emitEvent(
      'assignment.created',
      assignmentId,
      user.userId,
      {
        assignmentId,
        classId,
        examId: input.examId,
        dueAt: dueAt.toISOString(),
      },
    );

    return {
      assignmentId,
      dueAt: dueAt.toISOString(),
    };
  }

  /**
   * TEA-06, TEA-13: Chi tiết bài tập được giao (Teacher A không đọc học viên org B)
   */
  async getAssignment(assignmentId: string, user: AuthUserContext) {
    const [assignment] = await this.client.db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .limit(1);

    if (!assignment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy bài tập.',
      });
    }

    await this.assertClassAccess(assignment.classId, user);

    return {
      id: assignment.id,
      classId: assignment.classId,
      examId: assignment.examId,
      title: assignment.title,
      opensAt: assignment.opensAt.toISOString(),
      dueAt: assignment.dueAt.toISOString(),
      createdAt: assignment.createdAt.toISOString(),
    };
  }

  /**
   * TEA-07, TEA-08: Danh sách bài nộp của học viên trong bài tập (Teacher A không đọc học viên org B)
   */
  async listAssignmentSubmissions(assignmentId: string, user: AuthUserContext) {
    const [assignment] = await this.client.db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .limit(1);

    if (!assignment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy bài tập.',
      });
    }

    await this.assertClassTeacherOrAdmin(assignment.classId, user);

    const submissions = await this.client.db
      .select({
        learnerId: schema.assignmentLearners.learnerId,
        learnerStatus: schema.assignmentLearners.status,
        name: schema.users.name,
        email: schema.users.email,
        attemptId: schema.assignmentAttempts.attemptId,
        submittedAt: schema.assignmentAttempts.submittedAt,
        attemptResult: schema.examAttempts.result,
      })
      .from(schema.assignmentLearners)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.assignmentLearners.learnerId),
      )
      .leftJoin(
        schema.assignmentAttempts,
        and(
          eq(schema.assignmentAttempts.assignmentId, schema.assignmentLearners.assignmentId),
          eq(schema.assignmentAttempts.learnerId, schema.assignmentLearners.learnerId),
        ),
      )
      .leftJoin(
        schema.examAttempts,
        eq(schema.examAttempts.id, schema.assignmentAttempts.attemptId),
      )
      .where(eq(schema.assignmentLearners.assignmentId, assignmentId));

    interface SubmissionRow {
      learnerId: string;
      learnerStatus: string;
      name: string | null;
      email: string;
      attemptId: string | null;
      submittedAt: Date | null;
      attemptResult: unknown;
    }

    const items = (submissions as SubmissionRow[]).map((s: SubmissionRow) => {
      const score = s.submittedAt ? extractScoreFromResult(s.attemptResult) : null;
      return {
        learnerId: s.learnerId,
        name: s.name || '',
        email: s.email,
        status: s.submittedAt ? 'submitted' : s.learnerStatus,
        score,
        attemptId: s.attemptId ?? null,
        submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
      };
    });

    return { items };
  }

  /**
   * TEA-08, TEA-09: Thống kê lỗi chung và phân tích kết quả bài tập
   */
  async getAssignmentAnalytics(assignmentId: string, user: AuthUserContext) {
    const [assignment] = await this.client.db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .limit(1);

    if (!assignment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy bài tập.',
      });
    }

    await this.assertClassTeacherOrAdmin(assignment.classId, user);

    const learners = await this.client.db
      .select({
        learnerId: schema.assignmentLearners.learnerId,
        attemptResult: schema.examAttempts.result,
        submittedAt: schema.assignmentAttempts.submittedAt,
      })
      .from(schema.assignmentLearners)
      .leftJoin(
        schema.assignmentAttempts,
        and(
          eq(schema.assignmentAttempts.assignmentId, schema.assignmentLearners.assignmentId),
          eq(schema.assignmentAttempts.learnerId, schema.assignmentLearners.learnerId),
        ),
      )
      .leftJoin(
        schema.examAttempts,
        eq(schema.examAttempts.id, schema.assignmentAttempts.attemptId),
      )
      .where(eq(schema.assignmentLearners.assignmentId, assignmentId));

    interface AnalyticsLearnerRow {
      learnerId: string;
      attemptResult: unknown;
      submittedAt: Date | null;
    }

    const typedLearners = learners as AnalyticsLearnerRow[];
    const totalAssigned = typedLearners.length;
    const submittedLearners = typedLearners.filter((l: AnalyticsLearnerRow) => l.submittedAt !== null);
    const totalSubmitted = submittedLearners.length;
    const completionRate = totalAssigned > 0 ? (totalSubmitted / totalAssigned) * 100 : 0;

    const scores: number[] = submittedLearners
      .map((l: AnalyticsLearnerRow) => extractScoreFromResult(l.attemptResult))
      .filter((s: number) => !isNaN(s));
    const averageScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      totalAssigned,
      totalSubmitted,
    };
  }

  /**
   * TEA-10: Giao bài bổ sung cho nhóm học viên điểm yếu
   */
  async createSupplementAssignment(
    assignmentId: string,
    user: AuthUserContext,
    input: CreateSupplementDto,
  ) {
    const [originalAssignment] = await this.client.db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, assignmentId))
      .limit(1);

    if (!originalAssignment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy bài tập gốc.',
      });
    }

    await this.assertClassTeacherOrAdmin(originalAssignment.classId, user);

    if (!input.learnerIds || input.learnerIds.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Danh sách học viên bổ trợ không được để trống.',
      });
    }

    const supplementId = generateUuidV7();
    const title = input.title || `Bài bổ trợ - ${originalAssignment.title}`;
    const now = new Date();
    const dueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.client.db.insert(schema.assignments).values({
      id: supplementId,
      classId: originalAssignment.classId,
      examId: input.examId || originalAssignment.examId,
      title,
      opensAt: now,
      dueAt,
    });

    for (const learnerId of input.learnerIds) {
      await this.client.db.insert(schema.assignmentLearners).values({
        id: generateUuidV7(),
        assignmentId: supplementId,
        learnerId,
        status: 'assigned',
      });
    }

    await this.outboxService.emitEvent(
      'assignment.created',
      supplementId,
      user.userId,
      {
        assignmentId: supplementId,
        classId: originalAssignment.classId,
        dueAt: dueAt.toISOString(),
      },
    );

    return { supplementId };
  }

  /**
   * TEA-11: Xuất bảng điểm lớp học ra file CSV/Excel/JSON
   * Bảo vệ an toàn chống Formula Injection bằng sanitizeExportField
   */
  async exportClassGrades(
    classId: string,
    user: AuthUserContext,
    input: ExportClassGradesDto,
  ) {
    await this.assertClassTeacherOrAdmin(classId, user);

    const [cls] = await this.client.db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.id, classId))
      .limit(1);

    if (!cls) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy lớp học.',
      });
    }

    const members = await this.client.db
      .select({
        userId: schema.classMemberships.studentId,
        name: schema.users.name,
        email: schema.users.email,
        status: schema.classMemberships.status,
      })
      .from(schema.classMemberships)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.classMemberships.studentId),
      )
      .where(eq(schema.classMemberships.classId, classId));

    const classAssignments = await this.client.db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.classId, classId));

    interface MemberGradeRow {
      userId: string;
      name: string | null;
      email: string;
      status: string;
    }

    const sanitizedRows = (members as MemberGradeRow[]).map((m: MemberGradeRow) => ({
      userId: m.userId,
      name: sanitizeExportField(m.name || ''),
      email: sanitizeExportField(m.email),
      status: sanitizeExportField(m.status),
      totalAssignments: classAssignments.length,
    }));

    return {
      className: sanitizeExportField(cls.name),
      level: cls.level,
      exportedAt: new Date().toISOString(),
      format: input.kind || 'CSV',
      rowCount: sanitizedRows.length,
      items: sanitizedRows,
    };
  }

  // ---------------------------------------------------------------------------
  // Security & Isolation Helpers (Teacher A không đọc học viên org B)
  // ---------------------------------------------------------------------------

  private async assertOrgMembership(orgId: string, user: AuthUserContext) {
    if (user.role === 'admin') return;

    const [membership] = await this.client.db
      .select()
      .from(schema.orgMemberships)
      .where(
        and(
          eq(schema.orgMemberships.orgId, orgId),
          eq(schema.orgMemberships.userId, user.userId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException({
        code: 'TENANT_FORBIDDEN',
        message: 'Bạn không thuộc tổ chức này.',
      });
    }

    return membership;
  }

  private async assertOrgRole(
    orgId: string,
    user: AuthUserContext,
    allowedRoles: string[],
  ) {
    if (user.role === 'admin') return;

    const membership = await this.assertOrgMembership(orgId, user);
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException({
        code: 'TENANT_FORBIDDEN',
        message: 'Bạn không có vai trò phù hợp trong tổ chức này.',
      });
    }
  }

  private async assertClassTeacherOrAdmin(classId: string, user: AuthUserContext) {
    if (user.role === 'admin') return;

    const [cls] = await this.client.db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.id, classId))
      .limit(1);

    if (!cls) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy lớp học.',
      });
    }

    if (cls.teacherId === user.userId) {
      return cls;
    }

    const [membership] = await this.client.db
      .select()
      .from(schema.orgMemberships)
      .where(
        and(
          eq(schema.orgMemberships.orgId, cls.orgId),
          eq(schema.orgMemberships.userId, user.userId),
        ),
      )
      .limit(1);

    if (membership && (membership.role === 'owner' || membership.role === 'admin')) {
      return cls;
    }

    throw new ForbiddenException({
      code: 'TENANT_FORBIDDEN',
      message: 'Bạn không có quyền quản lý lớp học này.',
    });
  }

  private async assertClassAccess(classId: string, user: AuthUserContext) {
    if (user.role === 'admin') return;

    const [cls] = await this.client.db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.id, classId))
      .limit(1);

    if (!cls) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy lớp học.',
      });
    }

    if (cls.teacherId === user.userId) return;

    const [studentMember] = await this.client.db
      .select()
      .from(schema.classMemberships)
      .where(
        and(
          eq(schema.classMemberships.classId, classId),
          eq(schema.classMemberships.studentId, user.userId),
        ),
      )
      .limit(1);

    if (studentMember) return;

    const [orgMember] = await this.client.db
      .select()
      .from(schema.orgMemberships)
      .where(
        and(
          eq(schema.orgMemberships.orgId, cls.orgId),
          eq(schema.orgMemberships.userId, user.userId),
        ),
      )
      .limit(1);

    if (orgMember && (orgMember.role === 'owner' || orgMember.role === 'admin')) return;

    throw new ForbiddenException({
      code: 'TENANT_FORBIDDEN',
      message: 'Không có quyền truy cập dữ liệu lớp học này.',
    });
  }
}
