'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        background: '#f3f4f6',
      }}
    >
      <div
        data-testid="login-card"
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
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⛩️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>
            {t('auth.loginTitle', locale)}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            {t('auth.loginSubtitle', locale)}
          </p>
        </div>

        {(localError || authError) && (
          <div
            role="alert"
            data-testid="login-error-alert"
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
            {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label
              htmlFor="email-input"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}
            >
              {t('auth.emailLabel', locale)}
            </label>
            <input
              id="email-input"
              name="email"
              data-testid="email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder', locale)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password-input"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}
            >
              {t('auth.passwordLabel', locale)}
            </label>
            <input
              id="password-input"
              name="password"
              data-testid="password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder', locale)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            data-testid="submit-login-button"
            disabled={isSubmitting}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'background 0.15s',
            }}
          >
            {isSubmitting ? t('auth.signingIn', locale) : t('auth.signInButton', locale)}
          </button>
        </form>
      </div>
    </div>
  );
}
