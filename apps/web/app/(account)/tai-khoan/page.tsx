'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Modal } from '@jlpt/ui/components/modal';
import Link from 'next/link';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import type { SessionItem } from '../../../lib/auth-client';
import { NotificationSettings } from '../../../features/account/notification-settings';
import { PrivacySettings } from '../../../features/account/privacy-settings';
import { SubscriptionStatusCard } from '../../../features/billing/components/subscription-status-card';
import { TransactionHistoryCard } from '../../../features/billing/components/transaction-history-card';
import { defaultBillingClient } from '../../../features/billing/services/billing-client';
import type { UserSubscription, TransactionItem } from '../../../features/billing/types';

export default function AccountPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user, client, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'sessions' | 'notifications' | 'billing' | 'privacy'>('profile');
  const [name, setName] = useState('');
  const [targetLevel, setTargetLevel] = useState<'N1' | 'N2' | 'N3' | 'N4' | 'N5'>('N3');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);

  // Billing state
  const [subscription, setSubscription] = useState<UserSubscription>({ status: 'none' });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

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
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadBillingData = async () => {
    try {
      const sub = await defaultBillingClient.getUserSubscription();
      setSubscription(sub);
      const txs = await defaultBillingClient.getUserTransactions();
      setTransactions(txs.items || []);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    } else if (activeTab === 'billing') {
      loadBillingData();
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
      const msg = err instanceof Error ? err.message : t('account.profile.saveError');
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
      const msg = err instanceof Error ? err.message : t('account.sessions.revokeError');
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await client.revokeAllOtherSessions();
      setFeedback({ type: 'success', message: t('account.sessions.revokeAllSuccess') });
      await loadSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('account.sessions.revokeAllError');
      setFeedback({ type: 'error', message: msg });
    }
  };

  const levelOptions = [
    { value: 'N1', label: t('account.profile.levelN1') },
    { value: 'N2', label: t('account.profile.levelN2') },
    { value: 'N3', label: t('account.profile.levelN3') },
    { value: 'N4', label: t('account.profile.levelN4') },
    { value: 'N5', label: t('account.profile.levelN5') },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 w-full">
      {!user && (
        <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{t('account.auth.required')}</span>
            <Link href="/dang-nhap?redirect=/tai-khoan">
              <Button size="sm" variant="primary">{t('account.auth.signIn')}</Button>
            </Link>
          </div>
        </Alert>
      )}
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
        aria-label={t('account.tabs.ariaLabel')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
        }}
      >
        <Button
          type="button"
          role="tab"
          variant="ghost"
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
            borderRadius: 0,
          }}
        >
          {t('account.tabs.profile')}
        </Button>

        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'notifications'}
          aria-controls="notifications-panel"
          id="notifications-tab"
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'notifications' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'notifications' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
            borderRadius: 0,
          }}
        >
          {t('account.tabs.notifications')}
        </Button>

        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'billing'}
          aria-controls="billing-panel"
          id="billing-tab"
          onClick={() => setActiveTab('billing')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'billing' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'billing' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
            borderRadius: 0,
          }}
        >
          {t('account.tabs.billing')}
        </Button>

        <Button
          type="button"
          role="tab"
          variant="ghost"
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
            borderRadius: 0,
          }}
        >
          {t('account.tabs.sessions')}
        </Button>

        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'privacy'}
          aria-controls="privacy-panel"
          id="privacy-tab"
          onClick={() => setActiveTab('privacy')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'privacy' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'privacy' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
            borderRadius: 0,
          }}
        >
          {t('account.tabs.privacy')}
        </Button>
      </div>

      {/* Tab 1: Profile & Target Level */}
      {activeTab === 'profile' && (
        <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
          <Card>
            <CardHeader>
              <CardTitle>{t('account.profile.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label
                    htmlFor="user-email"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t('account.profile.email')}
                  </label>
                  <Input
                    id="user-email"
                    value={user?.email || ''}
                    disabled
                    aria-readonly="true"
                    style={{ backgroundColor: 'var(--bg-muted)' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    {t('account.profile.emailNotice')}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="user-name"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t('account.profile.name')}
                  </label>
                  <Input
                    id="user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('account.profile.namePlaceholder')}
                  />
                </div>

                <div>
                  <label
                    htmlFor="target-level-select"
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t('account.profile.targetLevel')}
                  </label>
                  <Select
                    id="target-level-select"
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value as 'N1' | 'N2' | 'N3' | 'N4' | 'N5')}
                    options={levelOptions}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    {t('account.profile.targetLevelDesc')}
                  </span>
                </div>

                {user?.completedExams !== undefined && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {t('account.profile.completedExams')}
                    </span>
                    <Badge variant="primary" style={{ fontSize: '1rem', padding: '4px 12px' }}>
                      {user.completedExams} {t('account.profile.completedExamsUnit')}
                    </Badge>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={saving}
                  >
                    {saving ? t('account.profile.saving') : t('account.profile.saveButton')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Notifications */}
      {activeTab === 'notifications' && (
        <div id="notifications-panel" role="tabpanel" aria-labelledby="notifications-tab">
          <NotificationSettings
            onSave={async (prefs) => {
              // Connect to /me/notification-preferences
              const url = `${(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '')}/me/notification-preferences`;
              const token = client.getAuthToken();
              await fetch(url, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(prefs),
                credentials: 'include',
              });
            }}
          />
        </div>
      )}

      {/* Tab 3: Billing & Transactions */}
      {activeTab === 'billing' && (
        <div id="billing-panel" role="tabpanel" aria-labelledby="billing-tab" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SubscriptionStatusCard
            subscription={subscription}
            onCancel={async () => {
              await defaultBillingClient.cancelSubscription();
              await loadBillingData();
            }}
            onRenew={async () => {
              await defaultBillingClient.renewSubscription();
              await loadBillingData();
            }}
          />

          <TransactionHistoryCard
            transactions={transactions}
            onRequestRefund={async (input) => {
              return defaultBillingClient.requestRefund(input);
            }}
          />
        </div>
      )}

      {/* Tab 4: Sessions */}
      {activeTab === 'sessions' && (
        <div id="sessions-panel" role="tabpanel" aria-labelledby="sessions-tab">
          <Card>
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <CardTitle>{t('account.sessions.title')}</CardTitle>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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
              {sessionsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  {t('common.status.loading')}
                </div>
              ) : sessions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  {t('account.sessions.empty')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        backgroundColor: item.isCurrent ? 'var(--bg-muted)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>
                          {item.userAgent?.includes('Mobile') ? '📱' : '💻'}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                              {item.userAgent || t('account.sessions.defaultBrowser')}
                            </span>
                            {item.isCurrent && (
                              <Badge variant="success">
                                {t('account.sessions.currentDevice')}
                              </Badge>
                            )}
                          </div>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            IP: {item.ipAddress || '127.0.0.1'} • {t('account.sessions.createdAt')}: {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {!item.isCurrent && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setSessionToRevoke(item.id)}
                          aria-label={t('account.sessions.revokeAriaLabel', { device: item.userAgent || item.id })}
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

      {/* Tab 5: Privacy */}
      {activeTab === 'privacy' && (
        <div id="privacy-panel" role="tabpanel" aria-labelledby="privacy-tab">
          <PrivacySettings
            onExportData={async () => {
              const url = `${(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '')}/me/data-exports`;
              const token = client.getAuthToken();
              const res = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
              });
              return res.json();
            }}
            onRequestDeletion={async () => {
              const url = `${(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '')}/me/deletion-request`;
              const token = client.getAuthToken();
              const res = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
              });
              return res.json();
            }}
          />
        </div>
      )}

      {/* Confirmation Modal for Revoking Session */}
      <Modal
        isOpen={Boolean(sessionToRevoke)}
        onClose={() => setSessionToRevoke(null)}
        title={t('account.sessions.confirmRevokeTitle')}
        closeLabel={t('common.buttons.close')}
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
        <p>{t('account.sessions.confirmRevokeBody')}</p>
      </Modal>
    </div>
  );
}
