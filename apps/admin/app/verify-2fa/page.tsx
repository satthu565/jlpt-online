'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, Alert } from '@jlpt/ui';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export default function Verify2faChallengePage(): React.JSX.Element {
  const router = useRouter();
  const { user, verify2faChallenge, verifyRecoveryCode, locale, error: authError } = useAdminAuth();

  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      if (useRecovery) {
        const clean = recoveryCode.trim();
        const success = await verifyRecoveryCode(clean);
        if (!success) {
          setIsVerifying(false);
          return;
        }
      } else {
        const clean = totpCode.trim().replace(/\s+/g, '');
        const success = await verify2faChallenge(clean);
        if (!success) {
          setIsVerifying(false);
          return;
        }
      }

      router.push('/');
    } catch (err: unknown) {
      setError((err as Error).message || t('common.error', locale));
      setIsVerifying(false);
    }
  };

  const activeError = error || authError;

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[var(--bg-page,#f8fafc)] dark:bg-[var(--bg-page,#0b1120)] font-sans">
      <Card
        data-testid="verify-2fa-card"
        className="w-full max-w-[440px] bg-[var(--bg-surface,#ffffff)] dark:bg-[var(--bg-surface,#1e293b)] rounded-2xl shadow-xl p-8 border border-[var(--border-default,#cbd5e1)] dark:border-[var(--border-default,#475569)]"
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-2xl font-bold m-0 mb-2 text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]">
            {useRecovery ? t('totp.recoveryCodeTitle', locale) : t('totp.challengeTitle', locale)}
          </h1>
          <p className="text-sm text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)] m-0">
            {useRecovery
              ? t('totp.recoveryCodeInstruction', locale)
              : t('totp.challengeSubtitle', locale)} ({user?.email})
          </p>
        </div>

        {activeError && (
          <Alert
            variant="destructive"
            data-testid="challenge-error-alert"
            className="mb-6 text-sm"
          >
            {activeError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!useRecovery ? (
            <div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                data-testid="challenge-code-input"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder={t('totp.codePlaceholder', locale)}
                className="w-full text-center font-mono text-2xl tracking-[0.3em] py-3 border-2 border-blue-600 dark:border-blue-500 rounded-lg"
              />
            </div>
          ) : (
            <div>
              <Input
                type="text"
                required
                data-testid="recovery-code-input"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder={t('totp.recoveryCodePlaceholder', locale)}
                className="w-full text-center font-mono text-lg tracking-[0.1em] py-3 border-2 border-amber-600 dark:border-amber-500 rounded-lg"
              />
            </div>
          )}

          <Button
            type="submit"
            data-testid="submit-challenge-button"
            disabled={isVerifying}
            loading={isVerifying}
            variant={useRecovery ? 'secondary' : 'primary'}
            className="w-full text-base font-semibold py-3"
          >
            {isVerifying
              ? t('totp.verifying', locale)
              : useRecovery
                ? t('totp.recoveryCodeButton', locale)
                : t('totp.challengeButton', locale)}
          </Button>

          <div className="text-center mt-2">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setError(null);
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {useRecovery ? t('totp.useTotpLink', locale) : t('totp.useRecoveryCodeLink', locale)}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

