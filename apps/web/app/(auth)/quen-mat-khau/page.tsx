'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Alert } from '@jlpt/ui';
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
        <CardHeader style={{ textAlign: 'center' }}>
          <CardTitle as="h1">{t('auth.forgotPassword.title')}</CardTitle>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
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
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <a
                  href="/dang-nhap"
                  style={{
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
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

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submitButton')}
              </Button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <a
                  href="/dang-nhap"
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
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
