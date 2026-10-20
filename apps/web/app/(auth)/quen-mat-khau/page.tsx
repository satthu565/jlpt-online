'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';

export default function ForgotPasswordPage(): React.JSX.Element {
  const { t } = useI18n();
  const { client } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage(t('auth.forgotPassword.emailLabel'));
      return;
    }

    setLoading(true);
    try {
      await client.forgotPassword(email.trim());
      setIsSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t('auth.forgotPassword.errors.general'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <Card elevated>
        <CardHeader className="text-center">
          <CardTitle as="h1">{t('auth.forgotPassword.title')}</CardTitle>
          <p className="mt-1 mx-0 mb-0 text-[var(--text-secondary)]">
            {t('auth.forgotPassword.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="error" onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {isSent ? (
            <div>
              <Alert variant="success">
                {t('auth.forgotPassword.sentSuccess')}
              </Alert>
              <div className="mt-6 text-center">
                <a className="text-[var(--color-primary)] font-semibold no-underline"
                  href="/dang-nhap"
                >
                  ← {t('auth.forgotPassword.backToLogin')}
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <Input
                label={t('auth.forgotPassword.emailLabel')}
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.login.emailPlaceholder')}
                required
                autoComplete="email"
              />

              <Button className="w-full mb-4"
                type="submit"
                variant="primary"
                loading={loading}
              >
                {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submitButton')}
              </Button>

              <div className="text-center mt-5">
                <a className="text-[var(--text-secondary)] text-sm no-underline"
                  href="/dang-nhap"
                >
                  ← {t('auth.forgotPassword.backToLogin')}
                </a>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
