'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, Alert } from '@jlpt/ui';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export default function StaffLoginPage(): React.JSX.Element {
  const router = useRouter();
  const { login, locale, error: authError } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setLocalError(res.error || t('auth.invalidCredentials', locale));
        setIsSubmitting(false);
        return;
      }

      if (res.nextStep === 'setup_2fa') {
        router.push('/setup-2fa');
      } else if (res.nextStep === 'verify_2fa') {
        router.push('/verify-2fa');
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      setLocalError((err as Error).message || t('common.error', locale));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[var(--bg-page,#f8fafc)] dark:bg-[var(--bg-page,#0b1120)]">
      <Card
        data-testid="login-card"
        className="w-full max-w-[440px] bg-[var(--bg-surface,#ffffff)] dark:bg-[var(--bg-surface,#1e293b)] rounded-2xl shadow-xl p-8 border border-[var(--border-default,#cbd5e1)] dark:border-[var(--border-default,#475569)]"
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⛩️</div>
          <h1 className="text-2xl font-bold m-0 mb-2 text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]">
            {t('auth.loginTitle', locale)}
          </h1>
          <p className="text-sm text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)] m-0">
            {t('auth.loginSubtitle', locale)}
          </p>
        </div>

        {(localError || authError) && (
          <Alert
            variant="destructive"
            data-testid="login-error-alert"
            className="mb-6 text-sm"
          >
            {localError || authError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email-input"
            name="email"
            data-testid="email-input"
            type="email"
            label={t('auth.emailLabel', locale)}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder', locale)}
            className="w-full"
          />

          <Input
            id="password-input"
            name="password"
            data-testid="password-input"
            type="password"
            label={t('auth.passwordLabel', locale)}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder', locale)}
            className="w-full"
          />

          <Button
            type="submit"
            data-testid="submit-login-button"
            disabled={isSubmitting}
            loading={isSubmitting}
            variant="primary"
            className="w-full mt-2"
          >
            {isSubmitting ? t('auth.signingIn', locale) : t('auth.signInButton', locale)}
          </Button>
        </form>
      </Card>
    </div>
  );
}

