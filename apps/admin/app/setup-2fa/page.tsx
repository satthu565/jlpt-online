'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      link.download = `jlpt-admin-recovery-codes-${user?.email || 'staff'}.txt`;
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
    <div
      style={{
        maxWidth: '680px',
        margin: '2.5rem auto',
        padding: '2rem',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#111827' }}>
          {t('totp.setupTitle', locale)}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          {t('totp.setupSubtitle', locale)} ({user?.email})
        </p>
      </div>

      {error && (
        <div
          role="alert"
          data-testid="totp-setup-error"
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
          {error}
        </div>
      )}

      {/* Step 1: QR Code & Secret */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.75rem' }}>
          {t('totp.scanQrInstruction', locale)}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            data-testid="qr-code-container"
            style={{
              width: '180px',
              height: '180px',
              padding: '0.5rem',
              background: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
            }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <div style={{ width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
              {t('totp.manualEntryInstruction', locale)}
            </span>
            <div
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <code
                data-testid="totp-secret-key"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  background: '#f3f4f6',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  color: '#1f2937',
                }}
              >
                {formattedSecret || '.... .... .... ....'}
              </code>
              <button
                type="button"
                data-testid="copy-secret-button"
                onClick={handleCopySecret}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: copiedKey ? '#ecfdf5' : '#ffffff',
                  color: copiedKey ? '#059669' : '#374151',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {copiedKey ? t('totp.secretCopied', locale) : t('totp.copySecret', locale)}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Recovery Codes */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.25rem',
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#92400e', margin: '0 0 0.5rem' }}>
          {t('totp.recoveryCodesTitle', locale)}
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 1rem' }}>
          {t('totp.recoveryCodesWarning', locale)}
        </p>

        <div
          data-testid="recovery-codes-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          {recoveryCodes.map((c, i) => (
            <code
              key={i}
              style={{
                display: 'block',
                background: '#ffffff',
                border: '1px solid #fde68a',
                borderRadius: '4px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                textAlign: 'center',
                fontWeight: 600,
                color: '#92400e',
              }}
            >
              {c}
            </code>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="copy-recovery-codes-button"
            onClick={handleCopyRecoveryCodes}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.8rem',
              border: '1px solid #d97706',
              borderRadius: '4px',
              background: copiedCodes ? '#dcfce7' : '#ffffff',
              color: copiedCodes ? '#15803d' : '#92400e',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {copiedCodes ? t('totp.codesCopied', locale) : t('totp.copyRecoveryCodes', locale)}
          </button>
          <button
            type="button"
            data-testid="download-recovery-codes-button"
            onClick={handleDownloadRecoveryCodes}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.8rem',
              border: '1px solid #d97706',
              borderRadius: '4px',
              background: '#ffffff',
              color: '#92400e',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {t('totp.downloadRecoveryCodes', locale)}
          </button>
        </div>
      </section>

      {/* Step 3: Verification Code Form */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.75rem' }}>
          {t('totp.verifyCodeInstruction', locale)}
        </h2>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input
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
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '2px solid #2563eb',
                borderRadius: '8px',
                fontSize: '1.5rem',
                letterSpacing: '0.3em',
                textAlign: 'center',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            data-testid="submit-verify-totp-button"
            disabled={isVerifying || totpCode.trim().length !== 6}
            style={{
              padding: '0.75rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isVerifying || totpCode.trim().length !== 6 ? 'not-allowed' : 'pointer',
              opacity: isVerifying || totpCode.trim().length !== 6 ? 0.6 : 1,
            }}
          >
            {isVerifying ? t('totp.activating', locale) : t('totp.activateButton', locale)}
          </button>
        </form>
      </section>
    </div>
  );
}
