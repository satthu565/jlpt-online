'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Input } from '@jlpt/ui/components/input';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { AuthClientError } from '../../../lib/auth-client';

export default function ResetPasswordPage(): React.JSX.Element {
  const { t } = useI18n();
  const { client } = useAuth();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage(t('auth.resetPassword.errors.invalidToken'));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(t('auth.register.errors.weakPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.resetPassword.errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await client.resetPassword({ token: token.trim(), newPassword });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof AuthClientError) {
        if (err.code === 'INVALID_TOKEN') {
          setErrorMessage(t('auth.resetPassword.errors.invalidToken'));
        } else if (err.code === 'TOKEN_EXPIRED') {
          setErrorMessage(t('auth.resetPassword.errors.tokenExpired'));
        } else {
          setErrorMessage(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t('auth.resetPassword.errors.general'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <Card elevated>
        <CardHeader style={{ textAlign: 'center' }}>
          <CardTitle as="h1">{t('auth.resetPassword.title')}</CardTitle>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
            {t('auth.resetPassword.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="error" onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {isSuccess ? (
            <div>
              <Alert variant="success">
                {t('auth.resetPassword.resetSuccess')}
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
                  {t('auth.resetPassword.backToLogin')} →
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {!token && (
                <Input
                  label={t('auth.resetPassword.tokenLabel')}
                  id="reset-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t('auth.resetPassword.tokenPlaceholder')}
                  required
                />
              )}

              <Input
                label={t('auth.resetPassword.newPasswordLabel')}
                id="reset-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                hint={t('auth.resetPassword.passwordHint')}
                required
                autoComplete="new-password"
              />

              <Input
                label={t('auth.resetPassword.confirmPasswordLabel')}
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submitButton')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
