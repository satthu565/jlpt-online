'use client';

import React from 'react';
import type { Role } from '@jlpt/schema';
import { useAdminAuth } from './auth-context';
import { canAccessRoute, getRequiredRolesForRoute, isStaffRole } from './navigation';
import { t } from './i18n';

export interface AdminGuardProps {
  children: React.ReactNode;
  pathname?: string;
  requiredRoles?: Role[];
}

export function AdminGuard({
  children,
  pathname = '/',
  requiredRoles,
}: AdminGuardProps): React.JSX.Element {
  const { user, isLoading, locale } = useAdminAuth();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          fontFamily: 'sans-serif',
          color: '#4b5563',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p>{t('common.loading', locale)}</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated or missing user: Must redirect to /login
  if (!user || !user.role) {
    return (
      <div
        role="alert"
        data-testid="guard-unauthenticated"
        style={{
          padding: '2.5rem',
          maxWidth: '520px',
          margin: '4rem auto',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#dc2626', marginBottom: '0.75rem' }}>{t('auth.unauthenticated', locale)}</h2>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          {t('auth.staffOnlyError', locale)}
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {t('auth.signInButton', locale)}
        </a>
      </div>
    );
  }

  // 2. Non-staff role (e.g. student): Strict Deny
  if (!isStaffRole(user.role)) {
    return (
      <div
        role="alert"
        data-testid="guard-non-staff"
        style={{
          padding: '2.5rem',
          maxWidth: '520px',
          margin: '4rem auto',
          background: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fecaca',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#991b1b', marginBottom: '0.75rem' }}>{t('common.accessDenied', locale)}</h2>
        <p style={{ color: '#7f1d1d', marginBottom: '1.25rem' }}>{t('auth.staffOnlyError', locale)}</p>
        <p style={{ fontSize: '0.85rem', color: '#b91c1c' }}>{t('common.securityWarning', locale)}</p>
      </div>
    );
  }

  // 3. TOTP Enrollment required (AWAITING_2FA_SETUP): Force redirect to /setup-2fa
  if (user.twoFactorStatus === 'setup_required' || !user.twoFactorEnabled) {
    return (
      <div
        role="alert"
        data-testid="guard-2fa-setup-required"
        style={{
          padding: '2.5rem',
          maxWidth: '540px',
          margin: '4rem auto',
          background: '#fffbeb',
          borderRadius: '8px',
          border: '1px solid #fef3c7',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
        <h2 style={{ color: '#92400e', marginBottom: '0.75rem' }}>{t('auth.twoFactorRequired', locale)}</h2>
        <p style={{ color: '#78350f', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          {t('totp.setupSubtitle', locale)}
        </p>
        <a
          href="/setup-2fa"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#d97706',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {t('totp.setupTitle', locale)}
        </a>
      </div>
    );
  }

  // 4. TOTP Challenge required (AWAITING_2FA_CHALLENGE): Force redirect to /verify-2fa
  if (user.twoFactorStatus === 'challenge_required') {
    return (
      <div
        role="alert"
        data-testid="guard-2fa-challenge-required"
        style={{
          padding: '2.5rem',
          maxWidth: '540px',
          margin: '4rem auto',
          background: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔑</div>
        <h2 style={{ color: '#1e40af', marginBottom: '0.75rem' }}>{t('totp.challengeTitle', locale)}</h2>
        <p style={{ color: '#1e3a8a', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          {t('totp.challengeSubtitle', locale)}
        </p>
        <a
          href="/verify-2fa"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {t('totp.challengeButton', locale)}
        </a>
      </div>
    );
  }

  // 5. Role-based Route Protection
  const allowed = requiredRoles
    ? requiredRoles.includes(user.role) || user.role === 'admin'
    : canAccessRoute(user.role, pathname);

  if (!allowed) {
    const rolesNeeded = requiredRoles ?? getRequiredRolesForRoute(pathname);
    return (
      <div
        role="alert"
        data-testid="guard-forbidden"
        style={{
          padding: '2.5rem',
          maxWidth: '580px',
          margin: '4rem auto',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚫</div>
        <h2 style={{ color: '#dc2626', marginBottom: '0.75rem' }}>{t('common.accessDenied', locale)}</h2>
        <p style={{ color: '#4b5563', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          {t('common.accessDeniedMessage', locale)}
        </p>

        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #f3f4f6',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: '0.35rem' }}>
            <strong>{t('common.currentRole', locale)}</strong>{' '}
            <span
              style={{
                display: 'inline-block',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                background: '#e0e7ff',
                color: '#3730a3',
                fontWeight: 600,
              }}
            >
              {t(`roles.${user.role}`, locale)}
            </span>
          </div>
          <div>
            <strong>{t('common.requiredRoles', locale)}</strong>{' '}
            <span>{rolesNeeded.map((r) => t(`roles.${r}`, locale)).join(', ')}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
          {t('common.securityWarning', locale)}
        </p>

        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#4b5563',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {t('common.backToHome', locale)}
        </a>
      </div>
    );
  }

  // Guard passed successfully
  return <>{children}</>;
}
