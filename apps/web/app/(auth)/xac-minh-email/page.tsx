'use client';

import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
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
      <Card className="text-center" elevated>
        <CardHeader>
          <CardTitle as="h1">{t('auth.verifyEmail.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="py-8 px-4">
              <Loader2 className="mx-auto mb-4 size-10 animate-spin text-[var(--color-primary)]" aria-hidden="true" />
              <p className="text-[var(--text-secondary)] m-0">
                {t('auth.verifyEmail.verifying')}
              </p>
            </div>
          )}

          {!loading && success && (
            <div>
              <CircleCheck className="mx-auto mb-4 size-12 text-[var(--color-primary)]" aria-hidden="true" />
              <Alert className="text-left" variant="success">
                {t('auth.verifyEmail.success')}
              </Alert>
              <div className="mt-8">
                <a className="no-underline" href="/dang-nhap">
                  <Button className="w-full" variant="primary" size="lg">
                    {t('auth.verifyEmail.loginButton')}
                  </Button>
                </a>
              </div>
            </div>
          )}

          {!loading && !success && (
            <div>
              <CircleX className="mx-auto mb-4 size-12 text-[var(--color-danger)]" aria-hidden="true" />
              <Alert className="text-left" variant="error">
                {error || t('auth.verifyEmail.failed')}
              </Alert>
              <div className="mt-8 flex flex-col gap-3">
                <a className="no-underline" href="/dang-nhap">
                  <Button className="w-full" variant="outline">
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
