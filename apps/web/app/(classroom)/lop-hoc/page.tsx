'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../../../lib/auth-context';
import { Alert, Button, Card, CardContent, Input, Spinner } from '@jlpt/ui';
import Link from 'next/link';

export default function ClassroomPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Invitation token join state
  const [inviteToken, setInviteToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const orgsRes = await defaultClassroomClient.getOrganizations();
      const orgItems = orgsRes.items || [];
      setOrganizations(orgItems);

      if (orgItems.length > 0 && orgItems[0]) {
        const clsRes = await defaultClassroomClient.getClasses(orgItems[0].id);
        const classItems = clsRes.items || [];
        setClasses(classItems);
        const currentClassId = selectedClassId || classItems[0]?.id || '';
        setSelectedClassId(currentClassId);

        if (currentClassId) {
          const [memRes, asgnRes] = await Promise.allSettled([
            defaultClassroomClient.getClassMembers(currentClassId),
            fetch(`${baseUrl}/classes/${encodeURIComponent(currentClassId)}/assignments`, {
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            }).then((r) => (r.ok ? r.json() : { items: [] })),
          ]);

          if (memRes.status === 'fulfilled') {
            setMembers(memRes.value.items || []);
          }
          if (asgnRes.status === 'fulfilled') {
            setAssignments(asgnRes.value.items || []);
          }
        } else {
          setMembers([]);
          setAssignments([]);
        }
      } else {
        setClasses([]);
        setSelectedClassId('');
        setMembers([]);
        setAssignments([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('403') || msg.includes('UNAUTHENTICATED') || msg.includes('Yêu cầu đăng nhập')) {
        setIsUnauthorized(true);
        setOrganizations([]);
        setClasses([]);
        setSelectedClassId('');
        setMembers([]);
        setAssignments([]);
      } else {
        setError(msg || t('common.status.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, baseUrl, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    setLoading(true);
    try {
      const [memRes, asgnRes] = await Promise.allSettled([
        defaultClassroomClient.getClassMembers(classId),
        fetch(`${baseUrl}/classes/${encodeURIComponent(classId)}/assignments`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }).then((r) => (r.ok ? r.json() : { items: [] })),
      ]);

      if (memRes.status === 'fulfilled') {
        setMembers(memRes.value.items || []);
      }
      if (asgnRes.status === 'fulfilled') {
        setAssignments(asgnRes.value.items || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể tải chi tiết lớp học.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;

    setJoining(true);
    setJoinMessage(null);
    try {
      const res = await fetch(`${baseUrl}/class-invitations/${encodeURIComponent(inviteToken.trim())}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Lỗi gia nhập lớp học (${res.status})`);
      }

      setJoinMessage({
        type: 'success',
        text: 'Gia nhập lớp học thành công! Đang làm mới danh sách lớp...',
      });
      setInviteToken('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setJoinMessage({
        type: 'error',
        text: msg || 'Không thể tham gia lớp học bằng mã mời này.',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleCreateAssignment = async (input: CreateAssignmentInput) => {
    if (!selectedClassId) return;
    setError(null);
    try {
      const created = await defaultClassroomClient.createAssignment(selectedClassId, input);
      setAssignments((prev) => [created, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể tạo bài tập mới.');
      throw err;
    }
  };

  const handleLoadAnalytics = async (assignmentId: string): Promise<AssignmentAnalytics> => {
    try {
      return await defaultClassroomClient.getAssignmentAnalytics(assignmentId);
    } catch {
      return {
        assignmentId,
        totalLearners: members.length,
        submissionCount: 0,
        submissionRate: 0,
        averageScore: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: 0,
        submissions: [],
      };
    }
  };

  const handleExportGrades = async (classId: string, format: 'CSV' | 'XLSX' | 'JSON' | 'PDF'): Promise<GradeExportResponse> => {
    return defaultClassroomClient.exportClassGrades(classId, format);
  };

  const handleSupplementAssignment = async (assignmentId: string, learnerIds: string[]) => {
    try {
      await defaultClassroomClient.createSupplementAssignment({
        assignmentId,
        learnerIds,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể giao bài tập bổ sung.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 w-full">
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

      {(!user || isUnauthorized) && (
        <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Bạn cần đăng nhập tài khoản học viên hoặc giáo viên để truy cập lớp học.</span>
            <Link href="/dang-nhap?redirect=/lop-hoc">
              <Button size="sm" variant="primary">Đăng nhập ngay</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert variant="error" onClose={() => setError(null)} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadData}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Invitation Token Card for Learner */}
      <Card style={{ marginBottom: '2rem' }}>
        <CardContent style={{ padding: '1.25rem' }}>
          <form onSubmit={handleJoinByToken} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              🔑 Gia nhập lớp học bằng mã mời:
            </span>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <Input
                placeholder="Nhập mã mời (Invite Token) từ giáo viên..."
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                disabled={joining}
              />
            </div>
            <Button type="submit" variant="primary" loading={joining} disabled={!inviteToken.trim() || joining}>
              Tham gia lớp
            </Button>
          </form>
          {joinMessage && (
            <div style={{ marginTop: '0.75rem' }}>
              <Alert variant={joinMessage.type === 'success' ? 'success' : 'error'}>
                {joinMessage.text}
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0', alignItems: 'center', gap: '0.75rem' }}>
          <Spinner size="md" />
          <span style={{ color: 'var(--text-secondary)' }}>{t('common.status.loading')}</span>
        </div>
      )}

      {!loading && classes.length === 0 && (
        <Card>
          <CardContent style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏫</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {t('classroom.empty.title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
              {t('classroom.empty.description')}
            </p>
          </CardContent>
        </Card>
      )}

      {classes.length > 0 && (
        <ClassroomDashboard
          organizations={organizations}
          classes={classes}
          selectedClassId={selectedClassId}
          members={members}
          assignments={assignments}
          onSelectClass={handleSelectClass}
          onCreateAssignment={handleCreateAssignment}
          onLoadAssignmentAnalytics={handleLoadAnalytics}
          onExportGrades={handleExportGrades}
          onSupplementAssignment={handleSupplementAssignment}
        />
      )}
    </div>
  );
}
