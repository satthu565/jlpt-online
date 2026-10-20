'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Alert } from '@jlpt/ui/components/alert';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export default function Setup2faPage(): React.JSX.Element {
  const router = useRouter();
  const { user, token, confirm2faSetup, setPendingSetup, locale } = useAdminAuth();

  const [secret, setSecret] = useState('');
  const [formattedSecret, setFormattedSecret] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [qrSvg, setQrSvg] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.twoFactorStatus === 'verified' && user.twoFactorEnabled) {
      router.push('/');
      return;
    }

    // Call I08 official API endpoint for TOTP setup
    let isMounted = true;
    fetch('/api/v1/auth/totp/setup', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Không thể khởi tạo đăng ký 2FA từ máy chủ.');
        }
        return res.json() as Promise<{
          secret: string;
          formattedSecret: string;
          uri: string;
          qrCodeSvg: string;
          recoveryCodes: string[];
        }>;
      })
      .then((data) => {
        if (!isMounted) return;
        setSecret(data.secret);
        setFormattedSecret(data.formattedSecret || data.secret);
        setRecoveryCodes(data.recoveryCodes || []);
        setQrSvg(data.qrCodeSvg);
        setPendingSetup(data.secret, data.recoveryCodes || []);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError((err as Error).message || t('common.error', locale));
      });

    return () => {
      isMounted = false;
    };
  }, [user, token, router, setPendingSetup, locale]);

  const handleCopySecret = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(secret);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyRecoveryCodes = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleDownloadRecoveryCodes = () => {
    try {
      const content = `JLPT ADMIN PORTAL - RECOVERY CODES\nAccount: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\nWarning: Keep these codes secret and safe. Each code is single-use only.\n\n${recoveryCodes.join('\n')}\n`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jlpt-recovery-codes-${user?.email || 'admin'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    const cleanCode = totpCode.trim().replace(/\s+/g, '');
    const confirmed = await confirm2faSetup(cleanCode);
    if (!confirmed) {
      setIsVerifying(false);
      return;
    }

    // Success -> redirect to admin dashboard
    router.push('/');
  };

  return (
    <div className="max-w-[680px] mx-auto my-10 p-6 md:p-8 bg-[var(--bg-surface,#ffffff)] dark:bg-[var(--bg-surface,#1e293b)] rounded-2xl border border-[var(--border-default,#cbd5e1)] dark:border-[var(--border-default,#475569)] shadow-lg font-sans">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🛡️</div>
        <h1 className="text-2xl font-bold m-0 mb-2 text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)]">
          {t('totp.setupTitle', locale)}
        </h1>
        <p className="text-sm text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)] m-0">
          {t('totp.setupSubtitle', locale)} ({user?.email})
        </p>
      </div>

      {error && (
        <Alert
          variant="destructive"
          data-testid="totp-setup-error"
          className="mb-6 text-sm"
        >
          {error}
        </Alert>
      )}

      {/* Step 1: QR Code & Secret */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)] mb-3">
          {t('totp.scanQrInstruction', locale)}
        </h2>

        <div className="flex flex-col items-center gap-4">
          <div
            data-testid="qr-code-container"
            className="w-[180px] h-[180px] p-2 bg-white rounded-lg border border-gray-300 shadow-xs flex items-center justify-center overflow-hidden"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <div className="w-full text-center">
            <span className="text-xs text-[var(--text-muted,#64748b)] dark:text-[var(--text-muted,#94a3b8)]">
              {t('totp.manualEntryInstruction', locale)}
            </span>
            <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
              <code
                data-testid="totp-secret-key"
                className="font-mono text-sm md:text-base font-bold tracking-widest bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 rounded"
              >
                {formattedSecret || '.... .... .... ....'}
              </code>
              <Button
                type="button"
                data-testid="copy-secret-button"
                onClick={handleCopySecret}
                variant={copiedKey ? 'success' : 'outline'}
                size="sm"
                className="text-xs py-1 px-3 min-h-[32px] h-auto"
              >
                {copiedKey ? t('totp.secretCopied', locale) : t('totp.copySecret', locale)}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Recovery Codes */}
      <section className="mb-8 p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl">
        <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200 m-0 mb-2">
          {t('totp.recoveryCodesTitle', locale)}
        </h2>
        <p className="text-xs text-amber-800 dark:text-amber-300 m-0 mb-4">
          {t('totp.recoveryCodesWarning', locale)}
        </p>

        <div
          data-testid="recovery-codes-grid"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"
        >
          {recoveryCodes.map((c, i) => (
            <code
              key={i}
              className="block bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded px-2 py-1.5 text-xs font-mono text-center font-semibold text-amber-900 dark:text-amber-200"
            >
              {c}
            </code>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            data-testid="copy-recovery-codes-button"
            onClick={handleCopyRecoveryCodes}
            variant={copiedCodes ? 'success' : 'outline'}
            size="sm"
            className="text-xs py-1.5 px-3 min-h-[32px] h-auto border-amber-600 text-amber-800 dark:text-amber-200"
          >
            {copiedCodes ? t('totp.codesCopied', locale) : t('totp.copyRecoveryCodes', locale)}
          </Button>
          <Button
            type="button"
            data-testid="download-recovery-codes-button"
            onClick={handleDownloadRecoveryCodes}
            variant="outline"
            size="sm"
            className="text-xs py-1.5 px-3 min-h-[32px] h-auto border-amber-600 text-amber-800 dark:text-amber-200"
          >
            {t('totp.downloadRecoveryCodes', locale)}
          </Button>
        </div>
      </section>

      {/* Step 3: Verification Code Form */}
      <section>
        <h2 className="text-base font-semibold text-[var(--text-primary,#0f172a)] dark:text-[var(--text-primary,#f8fafc)] mb-3">
          {t('totp.verifyCodeInstruction', locale)}
        </h2>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              required
              data-testid="totp-code-input"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder={t('totp.codePlaceholder', locale)}
              className="w-full text-center font-mono text-2xl tracking-[0.3em] py-3 border-2 border-blue-600 dark:border-blue-500 rounded-lg"
            />
          </div>

          <Button
            type="submit"
            data-testid="submit-verify-totp-button"
            disabled={isVerifying || totpCode.trim().length !== 6}
            loading={isVerifying}
            variant="primary"
            className="w-full text-base font-semibold py-3"
          >
            {isVerifying ? t('totp.activating', locale) : t('totp.activateButton', locale)}
          </Button>
        </form>
      </section>
    </div>
  );
}

