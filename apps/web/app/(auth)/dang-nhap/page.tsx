'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Alert } from '@jlpt/ui';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { AuthClientError } from '../../../lib/auth-client';

export default function LoginPage(): React.JSX.Element {
  const { t } = useI18n();
  const { client, refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage(t('auth.login.errors.invalidCredentials'));
      return;
    }
    if (!password) {
      setErrorMessage(t('auth.login.errors.invalidCredentials'));
      return;
    }

    setLoading(true);
    try {
      await client.signInEmail({ email, password });
      setSuccessMessage(t('auth.login.success'));
      await refreshUser();
      // Client-side redirect after successful login
      setTimeout(() => {
        window.location.href = '/tai-khoan';
      }, 500);
    } catch (err: unknown) {
      if (err instanceof AuthClientError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setErrorMessage(t('auth.login.errors.invalidCredentials'));
        } else if (err.code === 'EMAIL_NOT_VERIFIED') {
          setErrorMessage(t('auth.login.errors.unverifiedEmail'));
        } else if (err.code === 'ACCOUNT_BLOCKED') {
          setErrorMessage(t('auth.login.errors.blocked'));
        } else {
          setErrorMessage(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t('auth.login.errors.general'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <Card elevated>
        <CardHeader style={{ textAlign: 'center' }}>
          <CardTitle as="h1">{t('auth.login.title')}</CardTitle>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
            {t('auth.login.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="error" onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}
          {successMessage && (
            <Alert variant="success" onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              label={t('auth.login.emailLabel')}
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.login.emailPlaceholder')}
              required
              autoComplete="email"
            />

            <Input
              label={t('auth.login.passwordLabel')}
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.login.passwordPlaceholder')}
              required
              autoComplete="current-password"
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <Input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '1rem', height: '1rem', minHeight: 'auto', cursor: 'pointer' }}
                />
                <span>{t('auth.login.rememberMe')}</span>
              </label>

              <a
                href="/quen-mat-khau"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {t('auth.login.forgotPasswordLink')}
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? t('auth.login.submitting') : t('auth.login.submitButton')}
            </Button>
          </form>

          {/* Social login divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.5rem 0',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
            <span style={{ padding: '0 0.75rem' }}>{t('auth.login.orContinueWith')}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          </div>

          <a href="/api/v1/auth/google" style={{ textDecoration: 'none', display: 'block' }}>
            <Button
              type="button"
              variant="secondary"
              style={{ width: '100%' }}
              leftIcon={<span aria-hidden="true">🌐</span>}
            >
              {t('auth.login.googleSignIn')}
            </Button>
          </a>

          <div
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>{t('auth.login.noAccount')} </span>
            <a
              href="/dang-ky"
              style={{
                color: 'var(--color-primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {t('auth.login.registerNow')}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
