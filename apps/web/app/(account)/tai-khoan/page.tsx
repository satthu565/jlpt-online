'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Modal } from '@jlpt/ui/components/modal';
import { PageHeader } from '@jlpt/ui/components/page-header';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { Laptop, Smartphone } from 'lucide-react';
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
    <div className="container py-8 w-full">
      {!user && (
        <Alert variant="warning" className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>{t('account.auth.required')}</span>
            <Link href="/dang-nhap?redirect=/tai-khoan">
              <Button size="sm" variant="primary">{t('account.auth.signIn')}</Button>
            </Link>
          </div>
        </Alert>
      )}

      <PageHeader
        title={t('account.title')}
        description={t('account.subtitle')}
        className="mb-8"
      />

      {feedback && (
        <Alert
          variant={feedback.type}
          onClose={() => setFeedback(null)}
          className="mb-6"
        >
          {feedback.message}
        </Alert>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t('account.tabs.ariaLabel')}
        className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] mb-8"
      >
        <Button
          type="button"
          role="tab"
          variant="ghost"
          aria-selected={activeTab === 'profile'}
          aria-controls="profile-panel"
          id="profile-tab"
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 font-semibold text-sm border-none bg-transparent cursor-pointer min-h-[44px] rounded-none mb-[-1px] ${
            activeTab === 'profile'
              ? 'text-[var(--color-primary)] border-b-2 border-b-[var(--color-primary)]'
              : 'text-[var(--text-muted)] border-b-2 border-b-transparent hover:text-[var(--text-primary)]'
          }`}
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
          className={`px-5 py-3 font-semibold text-sm border-none bg-transparent cursor-pointer min-h-[44px] rounded-none mb-[-1px] ${
            activeTab === 'notifications'
              ? 'text-[var(--color-primary)] border-b-2 border-b-[var(--color-primary)]'
              : 'text-[var(--text-muted)] border-b-2 border-b-transparent hover:text-[var(--text-primary)]'
          }`}
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
          className={`px-5 py-3 font-semibold text-sm border-none bg-transparent cursor-pointer min-h-[44px] rounded-none mb-[-1px] ${
            activeTab === 'billing'
              ? 'text-[var(--color-primary)] border-b-2 border-b-[var(--color-primary)]'
              : 'text-[var(--text-muted)] border-b-2 border-b-transparent hover:text-[var(--text-primary)]'
          }`}
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
          className={`px-5 py-3 font-semibold text-sm border-none bg-transparent cursor-pointer min-h-[44px] rounded-none mb-[-1px] ${
            activeTab === 'sessions'
              ? 'text-[var(--color-primary)] border-b-2 border-b-[var(--color-primary)]'
              : 'text-[var(--text-muted)] border-b-2 border-b-transparent hover:text-[var(--text-primary)]'
          }`}
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
          className={`px-5 py-3 font-semibold text-sm border-none bg-transparent cursor-pointer min-h-[44px] rounded-none mb-[-1px] ${
            activeTab === 'privacy'
              ? 'text-[var(--color-primary)] border-b-2 border-b-[var(--color-primary)]'
              : 'text-[var(--text-muted)] border-b-2 border-b-transparent hover:text-[var(--text-primary)]'
          }`}
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
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                <div>
                  <label
                    htmlFor="user-email"
                    className="block text-sm font-semibold mb-2 text-[var(--text-primary)]"
                  >
                    {t('account.profile.email')}
                  </label>
                  <Input
                    id="user-email"
                    value={user?.email || ''}
                    disabled
                    aria-readonly="true"
                    className="bg-[var(--bg-muted)]"
                  />
                  <span className="text-xs text-[var(--text-muted)] mt-1 block">
                    {t('account.profile.emailNotice')}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="user-name"
                    className="block text-sm font-semibold mb-2 text-[var(--text-primary)]"
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
                    className="block text-sm font-semibold mb-2 text-[var(--text-primary)]"
                  >
                    {t('account.profile.targetLevel')}
                  </label>
                  <Select
                    id="target-level-select"
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value as 'N1' | 'N2' | 'N3' | 'N4' | 'N5')}
                    options={levelOptions}
                  />
                  <span className="text-xs text-[var(--text-muted)] mt-1 block">
                    {t('account.profile.targetLevelDesc')}
                  </span>
                </div>

                {user?.completedExams !== undefined && (
                  <div className="p-4 rounded-lg bg-[var(--bg-muted)] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">
                      {t('account.profile.completedExams')}
                    </span>
                    <Badge variant="primary" className="text-base px-3 py-1">
                      {user.completedExams} {t('account.profile.completedExamsUnit')}
                    </Badge>
                  </div>
                )}

                <div className="flex justify-end mt-4">
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
        <div id="billing-panel" role="tabpanel" aria-labelledby="billing-tab" className="flex flex-col gap-6">
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
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>{t('account.sessions.title')}</CardTitle>
                <p className="mt-1 mb-0 text-sm text-[var(--text-secondary)]">
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
                <EmptyState
                  variant="loading"
                  title={t('common.status.loading')}
                  minHeight="sm"
                />
              ) : sessions.length === 0 ? (
                <EmptyState
                  variant="empty"
                  title={t('account.sessions.empty')}
                  minHeight="sm"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {sessions.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-4 rounded-lg border border-[var(--border-subtle)] ${
                        item.isCurrent ? 'bg-[var(--bg-muted)]' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[var(--text-muted)]">
                          {item.userAgent?.includes('Mobile') ? (
                            <Smartphone className="size-5" />
                          ) : (
                            <Laptop className="size-5" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--text-primary)]">
                              {item.userAgent || t('account.sessions.defaultBrowser')}
                            </span>
                            {item.isCurrent && (
                              <Badge variant="success">
                                {t('account.sessions.currentDevice')}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
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
