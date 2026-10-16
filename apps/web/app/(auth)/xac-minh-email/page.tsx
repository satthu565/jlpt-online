'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert } from '@jlpt/ui';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';

export default function VerifyEmailPage(): React.JSX.Element {
  const { t } = useI18n();
  const { client } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (!urlToken) {
      setLoading(false);
      setError(t('auth.verifyEmail.missingToken'));
      return;
    }

    const performVerification = async () => {
      setLoading(true);
      try {
        await client.verifyEmail(urlToken);
        setSuccess(true);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t('auth.verifyEmail.failed'));
        }
      } finally {
        setLoading(false);
      }
    };

    performVerification();
  }, [client, t]);

  return (
    <div className="auth-card-container">
      <Card elevated style={{ textAlign: 'center' }}>
        <CardHeader>
          <CardTitle as="h1">{t('auth.verifyEmail.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div style={{ padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  border: '3px solid var(--border-default)',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  margin: '0 auto 1rem auto',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                {t('auth.verifyEmail.verifying')}
              </p>
            </div>
          )}

          {!loading && success && (
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                ✓
              </div>
              <Alert variant="success" style={{ textAlign: 'left' }}>
                {t('auth.verifyEmail.success')}
              </Alert>
              <div style={{ marginTop: '2rem' }}>
                <a href="/dang-nhap" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="lg" style={{ width: '100%' }}>
                    {t('auth.verifyEmail.loginButton')}
                  </Button>
                </a>
              </div>
            </div>
          )}

          {!loading && !success && (
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-danger)' }}>
                ✕
              </div>
              <Alert variant="error" style={{ textAlign: 'left' }}>
                {error || t('auth.verifyEmail.failed')}
              </Alert>
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a href="/dang-nhap" style={{ textDecoration: 'none' }}>
                  <Button variant="outline" style={{ width: '100%' }}>
                    {t('auth.login.submitButton')}
                  </Button>
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
