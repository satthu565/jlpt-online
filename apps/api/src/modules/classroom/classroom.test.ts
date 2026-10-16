import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ClassroomService } from './classroom.service.js';
import { ClassroomController } from './classroom.controller.js';
import { OutboxService } from '../outbox/outbox.service.js';

function makeUser(id: string, role: 'student' | 'teacher' | 'admin' = 'teacher', tenantId = 'org-a'): AuthUserContext {
  return {
    userId: id,
    email: `${id}@test.jlpt.local`,
    name: `User ${id}`,
    role: role as any,
    sessionId: `session-${id}`,
    sessionToken: `token-${id}`,
    emailVerified: true,
    tenantId,
  };
}

describe('A02: Classroom & Teacher Module Tests (TEA-01..13, Acceptance 1 & 2)', () => {
  let dbClient: DbClientInstance;
  let outboxService: OutboxService;
  let classroomService: ClassroomService;
  let classroomController: ClassroomController;

  const teacherA = makeUser('teacher-a', 'teacher', 'org-a');
  const teacherB = makeUser('teacher-b', 'teacher', 'org-b');
  const student1 = makeUser('student-1', 'student', 'org-a');
  const student2 = makeUser('student-2', 'student', 'org-b');
  const adminUser = makeUser('admin-user', 'admin', 'system');

  let orgAId: string;
  let orgBId: string;
  let classAId: string;
  let classBId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    outboxService = new OutboxService(dbClient);
    classroomService = new ClassroomService(dbClient, outboxService);
    classroomController = new ClassroomController(classroomService);

    // Seed users
    for (const u of [teacherA, teacherB, student1, student2, adminUser]) {
      await dbClient.db.insert(schema.users).values({
        id: u.userId,
        email: u.email,
        name: u.name,
        role: u.role,
      });
    }

    // Seed Org A and Org B
    orgAId = generateUuidV7();
    orgBId = generateUuidV7();

    await dbClient.db.insert(schema.organizations).values([
      { id: orgAId, name: 'Trung tâm JLPT Alpha', slug: 'jlpt-alpha' },
      { id: orgBId, name: 'Học viện Beta', slug: 'beta-academy' },
    ]);

    // Teacher A in Org A (owner), Teacher B in Org B (owner)
    await dbClient.db.insert(schema.orgMemberships).values([
      { id: generateUuidV7(), orgId: orgAId, userId: teacherA.userId, role: 'owner' },
      { id: generateUuidV7(), orgId: orgBId, userId: teacherB.userId, role: 'owner' },
    ]);

    // Seed Class A (in Org A) and Class B (in Org B)
    classAId = generateUuidV7();
    classBId = generateUuidV7();

    await dbClient.db.insert(schema.classes).values([
      { id: classAId, orgId: orgAId, teacherId: teacherA.userId, name: 'Lớp N2 Cấp Tốc A', level: 'N2' },
      { id: classBId, orgId: orgBId, teacherId: teacherB.userId, name: 'Lớp N1 VIP B', level: 'N1' },
    ]);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // Acceptance 1: Teacher A không đọc học viên org B (Tenant Isolation & RBAC)
  // ---------------------------------------------------------------------------
  describe('Acceptance 1: Teacher A không đọc học viên org B (TEA-13, Cross-Tenant Protection)', () => {
    beforeEach(async () => {
      // Add student1 to Class A and student2 to Class B
      await dbClient.db.insert(schema.classMemberships).values([
        { id: generateUuidV7(), classId: classAId, studentId: student1.userId, status: 'active' },
        { id: generateUuidV7(), classId: classBId, studentId: student2.userId, status: 'active' },
      ]);
    });

    it('Teacher A can view members of Class A, but is blocked from reading members of Class B (Org B)', async () => {
      // Teacher A reads own class
      const ownMembers = await classroomController.listClassMembers(classAId, teacherA);
      expect(ownMembers.items).toHaveLength(1);
      expect(ownMembers.items[0]?.userId).toBe(student1.userId);

      // Teacher A tries to read Class B members -> 403 Forbidden with TENANT_FORBIDDEN
      await expect(
        classroomController.listClassMembers(classBId, teacherA),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });
    });

    it('Teacher A cannot view organization details or classes of Org B', async () => {
      // Teacher A accesses Org A -> OK
      const orgA = await classroomController.getOrganization(orgAId, teacherA);
      expect(orgA.name).toBe('Trung tâm JLPT Alpha');

      // Teacher A tries to access Org B -> 403 Forbidden
      await expect(
        classroomController.getOrganization(orgBId, teacherA),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });

      // Teacher A tries to list classes of Org B -> 403 Forbidden
      await expect(
        classroomController.listOrganizationClasses(orgBId, teacherA),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });
    });

    it('Teacher A cannot view or export assignments/submissions/grades of Org B', async () => {
      // Create assignment in Class B (Org B)
      const assignmentB = await classroomController.createClassAssignment(classBId, teacherB, {
        title: 'Bài tập Org B',
        opensAtUTC: new Date().toISOString(),
        dueAtUTC: new Date(Date.now() + 86400000).toISOString(),
      });

      // Teacher A cannot view assignment B detail
      await expect(
        classroomController.getAssignment(assignmentB.assignmentId, teacherA),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });

      // Teacher A cannot view submissions of assignment B
      await expect(
        classroomController.listAssignmentSubmissions(assignmentB.assignmentId, teacherA),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });

      // Teacher A cannot view analytics of assignment B
      await expect(
        classroomController.getAssignmentAnalytics(assignmentB.assignmentId, teacherA),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });

      // Teacher A cannot export grades of Class B
      await expect(
        classroomController.exportClassGrades(classBId, teacherA, { kind: 'CSV' }),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });

      // Teacher A cannot remove students from Class B
      await expect(
        classroomController.removeClassMember(classBId, student2.userId, teacherA),
      ).rejects.toMatchObject({
        response: {
          code: 'TENANT_FORBIDDEN',
        },
      });
    });

    it('System Admin has cross-tenant access to inspect both orgs', async () => {
      const orgA = await classroomController.getOrganization(orgAId, adminUser);
      expect(orgA.name).toBe('Trung tâm JLPT Alpha');

      const orgB = await classroomController.getOrganization(orgBId, adminUser);
      expect(orgB.name).toBe('Học viện Beta');

      const classBMembers = await classroomController.listClassMembers(classBId, adminUser);
      expect(classBMembers.items).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Acceptance 2: Invite expired/revoked/single-use đúng policy (TEA-03)
  // ---------------------------------------------------------------------------
  describe('Acceptance 2: Invite expired/revoked/single-use đúng policy (TEA-03)', () => {
    it('Single-use invitation allows exactly 1 user to join, rejects second user, and is idempotent for same user', async () => {
      // 1. Teacher creates single-use invitation (maxUses: 1)
      const { invitationToken } = await classroomController.createClassInvitation(classAId, teacherA, {
        maxUses: 1,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(invitationToken).toBeDefined();

      // 2. Student 1 joins -> Success
      const join1 = await classroomController.joinClassByInvitation(invitationToken, student1);
      expect(join1.success).toBe(true);
      expect(join1.classId).toBe(classAId);

      // Verify student1 is in class
      const members = await classroomController.listClassMembers(classAId, teacherA);
      expect(members.items.map((m) => m.userId)).toContain(student1.userId);

      // 3. Student 1 calls join again with same token -> Idempotent success without error
      const join1Again = await classroomController.joinClassByInvitation(invitationToken, student1);
      expect(join1Again.success).toBe(true);

      // 4. Student 2 tries to use the single-use token -> Rejected with 400 VALIDATION_ERROR
      await expect(
        classroomController.joinClassByInvitation(invitationToken, student2),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('hết số lượt sử dụng'),
        },
      });
    });

    it('Expired invitation is rejected according to policy', async () => {
      // Create invitation expired 1 hour ago
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const { invitationToken } = await classroomController.createClassInvitation(classAId, teacherA, {
        maxUses: 10,
        expiresAt: pastDate,
      });

      await expect(
        classroomController.joinClassByInvitation(invitationToken, student1),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('đã hết hạn'),
        },
      });
    });

    it('Non-existent or revoked invitation token returns 404', async () => {
      await expect(
        classroomController.joinClassByInvitation('non_existent_token_123', student1),
      ).rejects.toMatchObject({
        response: {
          code: 'NOT_FOUND',
        },
      });
    });

    it('Multi-use invitation correctly enforces maxUses quota', async () => {
      const student3 = makeUser('student-3', 'student');
      await dbClient.db.insert(schema.users).values({
        id: student3.userId,
        email: student3.email,
        name: student3.name,
        role: student3.role,
      });

      // Invitation for max 2 uses
      const { invitationToken } = await classroomController.createClassInvitation(classAId, teacherA, {
        maxUses: 2,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      // Use 1
      await classroomController.joinClassByInvitation(invitationToken, student1);
      // Use 2
      await classroomController.joinClassByInvitation(invitationToken, student2);

      // Use 3 -> Should fail
      await expect(
        classroomController.joinClassByInvitation(invitationToken, student3),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('hết số lượt sử dụng'),
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Teacher Onboarding & Classes Management (TEA-01, TEA-02, TEA-12)
  // ---------------------------------------------------------------------------
  describe('Teacher Onboarding & Multi-Org Management (TEA-01, TEA-02, TEA-12)', () => {
    it('TEA-01: Student can submit teacher application and get upgraded', async () => {
      const result = await classroomController.submitTeacherApplication(student1, {
        intro: '5 năm kinh nghiệm giảng dạy tiếng Nhật N2/N1',
        organizationName: 'Alpha Academy',
      });

      expect(result.applicationId).toBeDefined();
      expect(result.status).toBe('approved');

      // Verify user role upgraded
      const [u] = await dbClient.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, student1.userId));
      expect(u?.role).toBe('teacher');
    });

    it('TEA-02, TEA-12: Teacher can create classes in organizations they belong to', async () => {
      const newClass = await classroomController.createClass(orgAId, teacherA, {
        name: 'Lớp Luyện Nghe N3',
        level: 'N3',
      });
      expect(newClass.classId).toBeDefined();

      const list = await classroomController.listOrganizationClasses(orgAId, teacherA);
      expect(list.items.some((c) => c.name === 'Lớp Luyện Nghe N3')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Assignments, Analytics & Supplements (TEA-04, TEA-05, TEA-06, TEA-07, TEA-08, TEA-09, TEA-10, TEA-11)
  // ---------------------------------------------------------------------------
  describe('Assignments, Analytics & Grade Exports (TEA-04..11)', () => {
    beforeEach(async () => {
      await dbClient.db.insert(schema.classMemberships).values([
        { id: generateUuidV7(), classId: classAId, studentId: student1.userId, status: 'active' },
      ]);
    });

    it('TEA-04, TEA-06: Create assignment with due date and emits outbox event', async () => {
      const opensAt = new Date().toISOString();
      const dueAt = new Date(Date.now() + 7 * 86400000).toISOString();

      const assignment = await classroomController.createClassAssignment(classAId, teacherA, {
        title: 'Đề kiểm tra số 1',
        opensAtUTC: opensAt,
        dueAtUTC: dueAt,
      });

      expect(assignment.assignmentId).toBeDefined();
      expect(assignment.dueAt).toBe(dueAt);

      // Verify outbox event emitted
      const outboxEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'assignment.created'));
      expect(outboxEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('TEA-06: Validates that opensAt is before or equal to dueAt', async () => {
      const opensAt = new Date(Date.now() + 86400000).toISOString();
      const dueAt = new Date(Date.now()).toISOString(); // dueAt before opensAt

      await expect(
        classroomController.createClassAssignment(classAId, teacherA, {
          title: 'Invalid Assignment',
          opensAtUTC: opensAt,
          dueAtUTC: dueAt,
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('TEA-07, TEA-08, TEA-09: Tracks submissions, computes completion rate and average scores', async () => {
      const assignment = await classroomController.createClassAssignment(classAId, teacherA, {
        title: 'Đề thi kiểm tra định kỳ',
        opensAtUTC: new Date().toISOString(),
        dueAtUTC: new Date(Date.now() + 86400000).toISOString(),
      });

      // Initially assigned, not submitted
      const sub1 = await classroomController.listAssignmentSubmissions(assignment.assignmentId, teacherA);
      expect(sub1.items).toHaveLength(1);
      expect(sub1.items[0]?.status).toBe('assigned');
      expect(sub1.items[0]?.score).toBeNull();

      // Seed student attempt
      const examId = generateUuidV7();
      await dbClient.db.insert(schema.exams).values({
        id: examId,
        slug: `exam-${examId}`,
        title: 'Exam A',
        level: 'N2',
        kind: 'practice',
        scoringMethod: 'scaled',
      });
      await dbClient.db.insert(schema.examVersions).values({
        id: generateUuidV7(),
        examId,
        version: 1,
        schemaVersion: '1.0.0',
        contentHash: 'hash-test',
        totalItems: 10,
        publishedAt: new Date(),
        scoring: {},
      });

      const attemptId = generateUuidV7();
      await dbClient.db.insert(schema.examAttempts).values({
        id: attemptId,
        userId: student1.userId,
        examId,
        examVersion: 1,
        mode: 'practice',
        status: 'submitted',
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        submittedAt: new Date(),
        result: {
          scoring: { total: 145 },
          totals: { correct: 29, total: 30 },
        },
      });

      // Link attempt to assignment
      await dbClient.db.insert(schema.assignmentAttempts).values({
        id: generateUuidV7(),
        assignmentId: assignment.assignmentId,
        learnerId: student1.userId,
        attemptId,
        submittedAt: new Date(),
      });

      // Now submissions show submitted with score 145
      const sub2 = await classroomController.listAssignmentSubmissions(assignment.assignmentId, teacherA);
      expect(sub2.items[0]?.status).toBe('submitted');
      expect(sub2.items[0]?.score).toBe(145);

      // Analytics show 100% completion rate and avg score 145
      const analytics = await classroomController.getAssignmentAnalytics(assignment.assignmentId, teacherA);
      expect(analytics.totalAssigned).toBe(1);
      expect(analytics.totalSubmitted).toBe(1);
      expect(analytics.completionRate).toBe(100);
      expect(analytics.averageScore).toBe(145);
    });

    it('TEA-10: Supplement assignment targets specific weak learners', async () => {
      const assignment = await classroomController.createClassAssignment(classAId, teacherA, {
        title: 'Bài tập 1',
        opensAtUTC: new Date().toISOString(),
        dueAtUTC: new Date(Date.now() + 86400000).toISOString(),
      });

      const supplement = await classroomController.createSupplementAssignment(
        assignment.assignmentId,
        teacherA,
        {
          learnerIds: [student1.userId],
          title: 'Bài bổ trợ ngữ pháp',
        },
      );

      expect(supplement.supplementId).toBeDefined();

      const detail = await classroomController.getAssignment(supplement.supplementId, teacherA);
      expect(detail.title).toBe('Bài bổ trợ ngữ pháp');
    });

    it('TEA-11: Grade export sanitizes formula injection characters', async () => {
      // Seed user with formula injection payload
      const evilUser = makeUser('student-evil', 'student');
      await dbClient.db.insert(schema.users).values({
        id: evilUser.userId,
        email: '=cmd|"/C calc"!A0@evil.com',
        name: '+SUM(1+1)',
        role: evilUser.role,
      });

      await dbClient.db.insert(schema.classMemberships).values({
        id: generateUuidV7(),
        classId: classAId,
        studentId: evilUser.userId,
        status: 'active',
      });

      const exportResult = await classroomController.exportClassGrades(classAId, teacherA, {
        kind: 'CSV',
      });

      expect(exportResult.rowCount).toBeGreaterThanOrEqual(1);
      const evilRow = exportResult.items.find((r) => r.userId === evilUser.userId);
      expect(evilRow).toBeDefined();
      // Verifies prefix quote added by sanitizeExportField
      expect(evilRow?.name.startsWith("'")).toBe(true);
      expect(evilRow?.email.startsWith("'")).toBe(true);
    });
  });
});
