'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        background: '#f3f4f6',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        data-testid="verify-2fa-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '2.5rem 2rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔑</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>
            {useRecovery ? t('totp.recoveryCodeTitle', locale) : t('totp.challengeTitle', locale)}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            {useRecovery
              ? t('totp.recoveryCodeInstruction', locale)
              : t('totp.challengeSubtitle', locale)} ({user?.email})
          </p>
        </div>

        {activeError && (
          <div
            role="alert"
            data-testid="challenge-error-alert"
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '0.875rem',
            }}
          >
            {activeError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!useRecovery ? (
            <div>
              <input
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
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #2563eb',
                  borderRadius: '8px',
                  fontSize: '1.5rem',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <div>
              <input
                type="text"
                required
                data-testid="recovery-code-input"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder={t('totp.recoveryCodePlaceholder', locale)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #d97706',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            data-testid="submit-challenge-button"
            disabled={isVerifying}
            style={{
              padding: '0.75rem',
              background: useRecovery ? '#d97706' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              opacity: isVerifying ? 0.7 : 1,
            }}
          >
            {isVerifying
              ? t('totp.verifying', locale)
              : useRecovery
                ? t('totp.recoveryCodeButton', locale)
                : t('totp.challengeButton', locale)}
          </button>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setError(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {useRecovery ? t('totp.useTotpLink', locale) : t('totp.useRecoveryCodeLink', locale)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
