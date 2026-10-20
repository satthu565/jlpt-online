'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { AuthClientError } from '../../../lib/auth-client';

export default function LoginPage(): React.JSX.Element {
  const { t } = useI18n();
  const { client } = useAuth();

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
      const res = await client.signInEmail({ email, password });
      if (typeof window !== 'undefined' && res?.user) {
        try {
          localStorage.setItem('jlpt_cached_user', JSON.stringify(res.user));
        } catch {
          // Ignore storage access error
        }
      }
      setSuccessMessage(t('auth.login.success'));
      // Immediate redirect to user profile on successful login
      window.location.href = '/tai-khoan';
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
        <CardHeader className="text-center">
          <CardTitle as="h1">{t('auth.login.title')}</CardTitle>
          <p className="mt-1 mb-0 text-[var(--text-secondary)]">
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

            <div className="mb-5 flex items-center justify-between text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[var(--text-secondary)]">
                <Input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="!min-h-0 size-4 cursor-pointer"
                />
                <span>{t('auth.login.rememberMe')}</span>
              </label>

              <a href="/quen-mat-khau" className="font-medium text-[var(--color-primary)] no-underline hover:underline">
                {t('auth.login.forgotPasswordLink')}
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mb-4 w-full"
            >
              {loading ? t('auth.login.submitting') : t('auth.login.submitButton')}
            </Button>
          </form>

          {/* Social login divider */}
          <div className="my-6 flex items-center text-[0.8125rem] text-[var(--text-muted)]">
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            <span className="px-3">{t('auth.login.orContinueWith')}</span>
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <a href="/api/v1/auth/google" className="block no-underline">
            <Button type="button" variant="secondary" className="w-full" leftIcon={<Globe className="size-4" aria-hidden="true" />}>
              {t('auth.login.googleSignIn')}
            </Button>
          </a>

          <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            <span>{t('auth.login.noAccount')} </span>
            <a href="/dang-ky" className="font-semibold text-[var(--color-primary)] no-underline hover:underline">
              {t('auth.login.registerNow')}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
