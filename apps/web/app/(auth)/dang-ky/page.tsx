'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Alert } from '@jlpt/ui';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { AuthClientError } from '../../../lib/auth-client';

export default function RegisterPage(): React.JSX.Element {
  const { t } = useI18n();
  const { client } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage(t('auth.register.errors.general'));
      return;
    }
    if (password.length < 8) {
      setErrorMessage(t('auth.register.errors.weakPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t('auth.register.errors.passwordMismatch'));
      return;
    }
    if (!agreeTerms) {
      setErrorMessage(t('auth.register.errors.termsRequired'));
      return;
    }

    setLoading(true);
    try {
      await client.signUpEmail({ email, password, name: name.trim() || undefined });
      setSuccessMessage(t('auth.register.success'));
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAgreeTerms(false);
    } catch (err: unknown) {
      if (err instanceof AuthClientError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS') {
          setErrorMessage(t('auth.register.errors.emailExists'));
        } else if (err.code === 'WEAK_PASSWORD') {
          setErrorMessage(t('auth.register.errors.weakPassword'));
        } else {
          setErrorMessage(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t('auth.register.errors.general'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <Card elevated>
        <CardHeader style={{ textAlign: 'center' }}>
          <CardTitle as="h1">{t('auth.register.title')}</CardTitle>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
            {t('auth.register.subtitle')}
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
              label={t('auth.register.nameLabel')}
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.register.namePlaceholder')}
              autoComplete="name"
            />

            <Input
              label={t('auth.register.emailLabel')}
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.register.emailPlaceholder')}
              required
              autoComplete="email"
            />

            <Input
              label={t('auth.register.passwordLabel')}
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={t('auth.register.passwordHint')}
              required
              autoComplete="new-password"
            />

            <Input
              label={t('auth.register.confirmPasswordLabel')}
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <Input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ width: '1rem', height: '1rem', minHeight: 'auto', marginTop: '0.2rem', cursor: 'pointer' }}
                  required
                />
                <span>{t('auth.register.termsAgree')}</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? t('auth.register.submitting') : t('auth.register.submitButton')}
            </Button>
          </form>

          <div
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>{t('auth.register.haveAccount')} </span>
            <a
              href="/dang-nhap"
              style={{
                color: 'var(--color-primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {t('auth.register.loginNow')}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
