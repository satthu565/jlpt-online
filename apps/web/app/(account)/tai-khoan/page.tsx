'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Alert,
  Modal,
} from '@jlpt/ui';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import type { SessionItem } from '../../../lib/auth-client';

export default function AccountPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user, client, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'sessions'>('profile');
  const [name, setName] = useState('');
  const [targetLevel, setTargetLevel] = useState<'N1' | 'N2' | 'N3' | 'N4' | 'N5'>('N3');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      if (user.targetLevel) {
        setTargetLevel(user.targetLevel);
      }
    }
  }, [user]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await client.getSessions();
      setSessions(res.items || []);
    } catch {
      // Offline fallback
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);

    try {
      await client.updateProfile({
        name: name.trim() || undefined,
        targetLevel,
      });
      await refreshUser();
      setFeedback({ type: 'success', message: t('account.profile.saveSuccess') });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật hồ sơ.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await client.revokeSession(sessionId);
      setSessionToRevoke(null);
      setFeedback({ type: 'success', message: t('account.sessions.revokeSuccess') });
      await loadSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy phiên.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await client.revokeAllOtherSessions();
      setFeedback({ type: 'success', message: t('account.sessions.revokeAllSuccess') });
      await loadSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đăng xuất các thiết bị khác.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const levelOptions = [
    { value: 'N1', label: 'JLPT N1 (Cao cấp)' },
    { value: 'N2', label: 'JLPT N2 (Trung cao cấp)' },
    { value: 'N3', label: 'JLPT N3 (Trung cấp)' },
    { value: 'N4', label: 'JLPT N4 (Sơ cấp 2)' },
    { value: 'N5', label: 'JLPT N5 (Sơ cấp 1)' },
  ];

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          {t('account.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('account.subtitle')}
        </p>
      </div>

      {feedback && (
        <Alert
          variant={feedback.type}
          onClose={() => setFeedback(null)}
          style={{ marginBottom: '1.5rem' }}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Account Settings Tabs"
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'profile'}
          aria-controls="profile-panel"
          id="profile-tab"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'profile' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'profile' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          {t('account.tabs.profile')}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sessions'}
          aria-controls="sessions-panel"
          id="sessions-tab"
          onClick={() => setActiveTab('sessions')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'sessions' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'sessions' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          {t('account.tabs.sessions')}
        </button>
      </div>

      {/* Tab 1: Profile & Target Level */}
      {activeTab === 'profile' && (
        <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
          <Card elevated>
            <CardHeader>
              <CardTitle as="h2">{t('account.tabs.profile')}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Profile summary info */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-muted)',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t('account.profile.email')}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user?.email || 'user@example.com'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t('account.profile.role')}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '2px' }}>
                    <Badge variant="neutral">{user?.role || 'student'}</Badge>
                    {user?.emailVerified ? (
                      <Badge variant="success">{t('account.profile.emailVerified')}</Badge>
                    ) : (
                      <Badge variant="warning">{t('account.profile.emailUnverified')}</Badge>
                    )}
                  </div>
                </div>

                {/* ACC-10: Completed Exams */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t('account.profile.completedExams')}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {user?.completedExams ?? 0} {t('account.profile.completedExamsUnit')}
                  </div>
                </div>
              </div>

              {/* Edit Profile Form */}
              <form onSubmit={handleUpdateProfile}>
                <Input
                  label={t('account.profile.name')}
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />

                {/* ACC-07: JLPT Target Level N1-N5 */}
                <Select
                  label={t('account.profile.targetLevel')}
                  id="target-level-select"
                  options={levelOptions}
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value as 'N1' | 'N2' | 'N3' | 'N4' | 'N5')}
                  hint={t('account.profile.targetLevelHint')}
                />

                <div style={{ marginTop: '1.5rem' }}>
                  <Button type="submit" variant="primary" loading={saving}>
                    {saving ? t('account.profile.saving') : t('account.profile.saveButton')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Sessions Management (ACC-12) */}
      {activeTab === 'sessions' && (
        <div id="sessions-panel" role="tabpanel" aria-labelledby="sessions-tab">
          <Card elevated>
            <CardHeader style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <CardTitle as="h2">{t('account.sessions.title')}</CardTitle>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                  {t('account.sessions.description')}
                </p>
              </div>
              {sessions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeAllOtherSessions}
                >
                  {t('account.sessions.revokeAllOtherButton')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {sessionsLoading && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {t('common.status.loading')}
                </div>
              )}

              {!sessionsLoading && sessions.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {t('account.sessions.empty')}
                </div>
              )}

              {!sessionsLoading && sessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sessions.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: item.isCurrent ? 'var(--color-primary-light)' : 'var(--bg-muted)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.userAgent || 'Trình duyệt Web'}
                          </span>
                          {item.isCurrent && (
                            <Badge variant="success" size="sm">
                              {t('account.sessions.currentDevice')}
                            </Badge>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          IP: {item.ipAddress || '127.0.0.1'} • {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {!item.isCurrent && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setSessionToRevoke(item.id)}
                          aria-label={`Hủy phiên đăng nhập ${item.userAgent || item.id}`}
                        >
                          {t('account.sessions.revokeButton')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Modal for Revoking Session */}
      <Modal
        isOpen={Boolean(sessionToRevoke)}
        onClose={() => setSessionToRevoke(null)}
        title="Xác nhận hủy phiên"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSessionToRevoke(null)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => sessionToRevoke && handleRevokeSession(sessionToRevoke)}
            >
              {t('account.sessions.revokeButton')}
            </Button>
          </>
        }
      >
        <p>Bạn có chắc muốn đăng xuất khỏi thiết bị này? Thiết bị sẽ phải đăng nhập lại để tiếp tục sử dụng.</p>
      </Modal>
    </div>
  );
}
