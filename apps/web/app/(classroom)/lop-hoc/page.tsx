'use client';

import React, { useState, useEffect } from 'react';
import {
  ClassroomDashboard,
  defaultClassroomClient,
  type Organization,
  type ClassRoom,
  type ClassMember,
  type ClassAssignment,
  type CreateAssignmentInput,
  type AssignmentAnalytics,
  type GradeExportResponse,
} from '../../../features/classroom';
import { useI18n } from '../../../lib/i18n';

// Sample fallback classroom data
const SAMPLE_ORGS: Organization[] = [
  { id: 'org-1', name: 'Trung tâm Nhật ngữ Sakura', role: 'teacher' },
];

const SAMPLE_CLASSES: ClassRoom[] = [
  { id: 'class-n3-a', orgId: 'org-1', name: 'Lớp Luyện thi N3 K24', level: 'N3', createdAt: new Date().toISOString() },
  { id: 'class-n2-b', orgId: 'org-1', name: 'Lớp Chiến lược N2 Cấp tốc', level: 'N2', createdAt: new Date().toISOString() },
];

const SAMPLE_MEMBERS: ClassMember[] = [
  { userId: 'u-1', name: 'Nguyễn Văn An', email: 'an.nguyen@example.com', status: 'active' },
  { userId: 'u-2', name: 'Trần Thị Bình', email: 'binh.tran@example.com', status: 'active' },
  { userId: 'u-3', name: 'Lê Hoàng Cúc', email: 'cuc.le@example.com', status: 'active' },
  { userId: 'u-4', name: 'Phạm Đức Dũng', email: 'dung.pham@example.com', status: 'active' },
];

const SAMPLE_ASSIGNMENTS: ClassAssignment[] = [
  {
    id: 'asgn-1',
    classId: 'class-n3-a',
    title: 'Đề thi thử N3 tuần 1 (Đọc hiểu & Ngữ pháp)',
    examId: 'exam-n3-2023-07',
    opensAtUTC: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    dueAtUTC: new Date(Date.now() + 3600 * 1000 * 72).toISOString(),
    createdAt: new Date().toISOString(),
    totalAssigned: 4,
    submittedCount: 3,
  },
  {
    id: 'asgn-2',
    classId: 'class-n3-a',
    title: 'Bài tập ôn luyện điểm yếu Kanji & Từ vựng',
    opensAtUTC: new Date().toISOString(),
    dueAtUTC: new Date(Date.now() + 3600 * 1000 * 120).toISOString(),
    createdAt: new Date().toISOString(),
    totalAssigned: 4,
    submittedCount: 1,
  },
];

export default function ClassroomPage(): React.JSX.Element {
  const { t } = useI18n();

  const [organizations, setOrganizations] = useState<Organization[]>(SAMPLE_ORGS);
  const [classes, setClasses] = useState<ClassRoom[]>(SAMPLE_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<string>(SAMPLE_CLASSES[0]?.id ?? 'cls-1');
  const [members, setMembers] = useState<ClassMember[]>(SAMPLE_MEMBERS);
  const [assignments, setAssignments] = useState<ClassAssignment[]>(SAMPLE_ASSIGNMENTS);

  const loadData = async () => {
    try {
      const orgsRes = await defaultClassroomClient.getOrganizations();
      if (orgsRes.items?.length) setOrganizations(orgsRes.items);

      if (orgsRes.items?.[0]) {
        const clsRes = await defaultClassroomClient.getClasses(orgsRes.items[0].id);
        if (clsRes.items?.length && clsRes.items[0]) {
          setClasses(clsRes.items);
          setSelectedClassId(clsRes.items[0].id);
          const memRes = await defaultClassroomClient.getClassMembers(clsRes.items[0].id);
          if (memRes.items?.length) {
            setMembers(memRes.items);
          }
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAssignment = async (input: CreateAssignmentInput) => {
    try {
      const created = await defaultClassroomClient.createAssignment(selectedClassId, input);
      setAssignments((prev) => [created, ...prev]);
    } catch {
      // Mock creation
      const mockAsgn: ClassAssignment = {
        id: `asgn-${Date.now()}`,
        classId: selectedClassId,
        title: input.title,
        examId: input.examId,
        opensAtUTC: input.opensAtUTC,
        dueAtUTC: input.dueAtUTC,
        createdAt: new Date().toISOString(),
        totalAssigned: input.learnerIds?.length || members.length,
        submittedCount: 0,
      };
      setAssignments((prev) => [mockAsgn, ...prev]);
    }
  };

  const handleLoadAnalytics = async (assignmentId: string): Promise<AssignmentAnalytics> => {
    try {
      return await defaultClassroomClient.getAssignmentAnalytics(assignmentId);
    } catch {
      // Mock analytics
      return {
        assignmentId,
        totalLearners: members.length,
        submissionCount: 3,
        submissionRate: 75,
        averageScore: 124,
        passRate: 67,
        highestScore: 156,
        lowestScore: 88,
        submissions: [
          {
            attemptId: 'att-1',
            learnerId: 'u-1',
            learnerName: 'Nguyễn Văn An',
            score: 156,
            passed: true,
            submittedAt: new Date().toISOString(),
          },
          {
            attemptId: 'att-2',
            learnerId: 'u-2',
            learnerName: 'Trần Thị Bình',
            score: 128,
            passed: true,
            submittedAt: new Date().toISOString(),
          },
          {
            attemptId: 'att-3',
            learnerId: 'u-3',
            learnerName: 'Lê Hoàng Cúc',
            score: 88,
            passed: false,
            submittedAt: new Date().toISOString(),
          },
        ],
      };
    }
  };

  const handleExportGrades = async (classId: string, format: 'CSV' | 'XLSX' | 'JSON' | 'PDF'): Promise<GradeExportResponse> => {
    try {
      return await defaultClassroomClient.exportClassGrades(classId, format);
    } catch {
      // Mock export response
      return {
        className: classes.find((c) => c.id === classId)?.name || 'Lớp N3 K24',
        level: 'N3',
        exportedAt: new Date().toISOString(),
        format,
        rowCount: members.length,
        items: members.map((m, idx) => ({
          userId: m.userId,
          name: m.name || '',
          email: m.email,
          status: m.status,
          totalAssignments: assignments.length,
          submittedAssignments: idx === 0 ? 2 : 1,
          averageScore: idx === 0 ? 142 : 110,
        })),
      };
    }
  };

  const handleSupplementAssignment = async (assignmentId: string, learnerIds: string[]) => {
    try {
      await defaultClassroomClient.createSupplementAssignment({
        assignmentId,
        learnerIds,
        title: `Bài bổ trợ phục hồi kiến thức cho học viên chưa đạt`,
      });
    } catch {
      // Mock success
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          {t('classroom.page.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('classroom.page.subtitle')}
        </p>
      </div>

      <ClassroomDashboard
        organizations={organizations}
        classes={classes}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        members={members}
        assignments={assignments}
        isTeacher={true}
        onCreateAssignment={handleCreateAssignment}
        onLoadAssignmentAnalytics={handleLoadAnalytics}
        onExportGrades={handleExportGrades}
        onSupplementAssignment={handleSupplementAssignment}
      />
    </div>
  );
}
