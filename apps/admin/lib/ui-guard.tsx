'use client';

import { Ban, KeyRound, ShieldCheck } from 'lucide-react';
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
        className="flex items-center justify-center min-h-[60vh] font-sans text-gray-600 dark:text-gray-400"
      >
        <div className="text-center">
          <div className="w-9 h-9 border-[3px] border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500 rounded-full mx-auto mb-3 animate-spin" />
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
        className="p-8 max-w-[520px] mx-auto my-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md font-sans text-center"
      >
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-3">{t('auth.unauthenticated', locale)}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
          {t('auth.staffOnlyError', locale)}
        </p>
        <a
          href="/login"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg no-underline font-medium text-sm transition-colors"
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
        className="p-8 max-w-[520px] mx-auto my-16 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 font-sans text-center"
      >
        <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-3">{t('common.accessDenied', locale)}</h2>
        <p className="text-red-700 dark:text-red-200 mb-5 text-sm">{t('auth.staffOnlyError', locale)}</p>
        <p className="text-xs text-red-600 dark:text-red-400">{t('common.securityWarning', locale)}</p>
      </div>
    );
  }

  // 3. TOTP Enrollment required (AWAITING_2FA_SETUP): Force redirect to /setup-2fa
  if (user.twoFactorStatus === 'setup_required' || !user.twoFactorEnabled) {
    return (
      <div
        role="alert"
        data-testid="guard-2fa-setup-required"
        className="p-8 max-w-[540px] mx-auto my-16 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 shadow-md font-sans text-center"
      >
        <ShieldCheck className="mx-auto mb-2 size-10" aria-hidden="true" />
        <h2 className="text-xl font-bold text-amber-800 dark:text-amber-300 mb-3">{t('auth.twoFactorRequired', locale)}</h2>
        <p className="text-amber-700 dark:text-amber-200 mb-6 text-sm">
          {t('totp.setupSubtitle', locale)}
        </p>
        <a
          href="/setup-2fa"
          className="inline-block px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg no-underline font-medium text-sm transition-colors"
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
        className="p-8 max-w-[540px] mx-auto my-16 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 shadow-md font-sans text-center"
      >
        <KeyRound className="mx-auto mb-2 size-10" aria-hidden="true" />
        <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-3">{t('totp.challengeTitle', locale)}</h2>
        <p className="text-blue-700 dark:text-blue-200 mb-6 text-sm">
          {t('totp.challengeSubtitle', locale)}
        </p>
        <a
          href="/verify-2fa"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg no-underline font-medium text-sm transition-colors"
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
        className="p-8 max-w-[580px] mx-auto my-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md font-sans text-center"
      >
        <Ban className="mx-auto mb-2 size-10" aria-hidden="true" />
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-3">{t('common.accessDenied', locale)}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-5 text-sm leading-relaxed">
          {t('common.accessDeniedMessage', locale)}
        </p>

        <div className="bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5 mb-6 text-sm text-left">
          <div className="mb-1.5">
            <strong>{t('common.currentRole', locale)}</strong>{' '}
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-semibold">
              {t(`roles.${user.role}`, locale)}
            </span>
          </div>
          <div>
            <strong>{t('common.requiredRoles', locale)}</strong>{' '}
            <span className="text-gray-600 dark:text-gray-400">{rolesNeeded.map((r) => t(`roles.${r}`, locale)).join(', ')}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          {t('common.securityWarning', locale)}
        </p>

        <a
          href="/"
          className="inline-block px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg no-underline font-medium text-sm transition-colors"
        >
          {t('common.backToHome', locale)}
        </a>
      </div>
    );
  }

  // Guard passed successfully
  return <>{children}</>;

}
