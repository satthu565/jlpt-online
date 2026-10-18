'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import type { Role } from '@jlpt/schema';
import { isStaffRole } from './navigation';
import type { Locale } from './i18n';
import { DEFAULT_LOCALE, t } from './i18n';

export type TwoFactorStatus = 'verified' | 'setup_required' | 'challenge_required';

export interface StaffUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  twoFactorEnabled: boolean;
  twoFactorStatus: TwoFactorStatus;
}

export interface AdminAuthState {
  user: StaffUser | null;
  token: string | null;
  pendingSetupSecret: string | null;
  pendingRecoveryCodes: string[] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  locale: Locale;
}

export interface AdminAuthContextValue extends AdminAuthState {
  login: (
    email: string,
    password?: string,
    role?: Role,
    twoFactorEnabled?: boolean,
  ) => Promise<{ success: boolean; nextStep: 'dashboard' | 'setup_2fa' | 'verify_2fa'; error?: string }>;
  logout: () => Promise<void>;
  setPendingSetup: (secret: string, recoveryCodes: string[]) => void;
  confirm2faSetup: (code: string) => Promise<boolean>;
  verify2faChallenge: (code: string) => Promise<boolean>;
  verifyRecoveryCode: (code: string) => Promise<boolean>;
  setLocale: (locale: Locale) => void;
  setUser: (user: StaffUser | null, token: string | null) => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const STORAGE_KEY_AUTH = 'jlpt_admin_auth_state_v1';
const STORAGE_KEY_LOCALE = 'jlpt_admin_locale_v1';

export function AdminAuthProvider({
  children,
  initialUser = null,
  initialToken = null,
  initialLocale,
  initialLoading,
}: {
  children: React.ReactNode;
  initialUser?: StaffUser | null;
  initialToken?: string | null;
  initialLocale?: Locale;
  initialLoading?: boolean;
}): React.JSX.Element {
  const [user, setUserState] = useState<StaffUser | null>(initialUser);
  const [token, setToken] = useState<string | null>(initialToken);
  const [pendingSetupSecret, setPendingSetupSecret] = useState<string | null>(null);
  const [pendingRecoveryCodes, setPendingRecoveryCodes] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    initialLoading !== undefined ? initialLoading : !initialUser,
  );
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);
  const [, startTransition] = useTransition();

  // Load persisted session from localStorage in browser and verify with server
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const savedLocale = (localStorage.getItem(STORAGE_KEY_LOCALE) ||
        localStorage.getItem('admin_locale')) as Locale | null;
      if (savedLocale && ['vi', 'ja', 'en'].includes(savedLocale)) {
        setLocaleState(savedLocale);
      }

      const raw = localStorage.getItem(STORAGE_KEY_AUTH);
      if (raw && !initialUser) {
        const parsed = JSON.parse(raw) as { user: StaffUser; token: string };
        if (parsed.user && isStaffRole(parsed.user.role) && parsed.token) {
          setUserState(parsed.user);
          setToken(parsed.token);

          // Verify session validity against server
          fetch('/api/v1/auth/session', {
            headers: { Authorization: `Bearer ${parsed.token}` },
          })
            .then(async (res) => {
              if (res.ok) {
                const data = (await res.json()) as {
                  user: { id: string; email: string; name?: string | null; role: Role; twoFactorEnabled?: boolean } | null;
                  session: { id: string; twoFactorVerified?: boolean } | null;
                };
                if (data.user && isStaffRole(data.user.role)) {
                  const is2faVerified = data.session?.twoFactorVerified === true;
                  const is2faEnabled = data.user.twoFactorEnabled === true;
                  const twoFactorStatus: TwoFactorStatus = is2faEnabled
                    ? is2faVerified
                      ? 'verified'
                      : 'challenge_required'
                    : 'setup_required';

                  const refreshedUser: StaffUser = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name ?? data.user.email.split('@')[0] ?? 'Staff',
                    role: data.user.role,
                    twoFactorEnabled: is2faEnabled,
                    twoFactorStatus,
                  };
                  setUserState(refreshedUser);
                  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify({ user: refreshedUser, token: parsed.token }));
                } else {
                  saveToStorage(null, null);
                }
              } else if (res.status === 401) {
                saveToStorage(null, null);
              }
            })
            .catch(() => {
              // Ignore network failure on startup
            });
        }
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setIsLoading(false);
    }
  }, [initialUser]);

  const saveToStorage = (u: StaffUser | null, tok: string | null) => {
    setUserState(u);
    setToken(tok);
    if (typeof window !== 'undefined') {
      if (u && tok) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify({ user: u, token: tok }));
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH);
      }
    }
  };

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LOCALE, l);
      localStorage.setItem('admin_locale', l);
      document.cookie = `admin_locale=${l}; path=/; SameSite=Lax`;
    }
  };

  const login = async (
    email: string,
    password?: string,
    _role?: Role,
    _twoFactorEnabled?: boolean,
  ): Promise<{ success: boolean; nextStep: 'dashboard' | 'setup_2fa' | 'verify_2fa'; error?: string }> => {
    setError(null);

    if (!password || !password.trim()) {
      const err = t('auth.invalidCredentials', locale);
      setError(err);
      return { success: false, nextStep: 'dashboard', error: err };
    }

    try {
      const res = await fetch('/api/v1/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let err = t('auth.invalidCredentials', locale);
        try {
          const errJson = (await res.json()) as { message?: string; error?: { message?: string } };
          err = errJson.message || errJson.error?.message || err;
        } catch {
          // Fallback message
        }
        setError(err);
        return { success: false, nextStep: 'dashboard', error: err };
      }

      const data = (await res.json()) as {
        user: { id: string; email: string; name?: string | null; role: Role; emailVerified: boolean; twoFactorEnabled?: boolean };
        session: { id: string; token: string; twoFactorVerified?: boolean };
      };

      if (!isStaffRole(data.user.role)) {
        const err = t('auth.staffOnlyError', locale);
        setError(err);
        return { success: false, nextStep: 'dashboard', error: err };
      }

      const is2faEnabled = Boolean(data.user.twoFactorEnabled);
      let twoFactorStatus: TwoFactorStatus = 'challenge_required';
      let nextStep: 'dashboard' | 'setup_2fa' | 'verify_2fa' = 'verify_2fa';

      if (!is2faEnabled) {
        twoFactorStatus = 'setup_required';
        nextStep = 'setup_2fa';
      } else if (data.session?.twoFactorVerified) {
        twoFactorStatus = 'verified';
        nextStep = 'dashboard';
      } else {
        twoFactorStatus = 'challenge_required';
        nextStep = 'verify_2fa';
      }

      const staffUser: StaffUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name ?? data.user.email.split('@')[0] ?? 'Staff',
        role: data.user.role,
        twoFactorEnabled: is2faEnabled,
        twoFactorStatus,
      };

      saveToStorage(staffUser, data.session.token);
      return { success: true, nextStep };
    } catch (err: unknown) {
      const message = (err as Error).message || t('auth.invalidCredentials', locale);
      setError(message);
      return { success: false, nextStep: 'dashboard', error: message };
    }
  };

  const confirm2faSetup = async (code: string): Promise<boolean> => {
    if (!user || user.twoFactorStatus !== 'setup_required') {
      return false;
    }

    if (!code || code.trim().length !== 6) {
      setError(t('totp.invalidCode', locale));
      return false;
    }

    try {
      const res = await fetch('/api/v1/auth/totp/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        let err = t('totp.invalidCode', locale);
        try {
          const errJson = (await res.json()) as { message?: string; error?: { message?: string } };
          err = errJson.message || errJson.error?.message || err;
        } catch {
          // Fallback
        }
        setError(err);
        return false;
      }

      const upgradedUser: StaffUser = {
        ...user,
        twoFactorEnabled: true,
        twoFactorStatus: 'verified',
      };
      saveToStorage(upgradedUser, token);
      setPendingSetupSecret(null);
      setPendingRecoveryCodes(null);
      setError(null);
      return true;
    } catch (err: unknown) {
      const msg = (err as Error).message || t('common.error', locale);
      setError(msg);
      return false;
    }
  };

  const verify2faChallenge = async (code: string): Promise<boolean> => {
    if (!user || user.twoFactorStatus !== 'challenge_required') {
      return false;
    }

    if (!code || code.trim().length !== 6) {
      setError(t('totp.invalidCode', locale));
      return false;
    }

    try {
      const res = await fetch('/api/v1/auth/totp/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-totp-code': code.trim(),
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        let err = t('totp.invalidCode', locale);
        try {
          const errJson = (await res.json()) as { message?: string; error?: { message?: string } };
          err = errJson.message || errJson.error?.message || err;
        } catch {
          // Fallback
        }
        setError(err);
        return false;
      }

      const upgradedUser: StaffUser = {
        ...user,
        twoFactorStatus: 'verified',
      };
      saveToStorage(upgradedUser, token);
      setError(null);
      return true;
    } catch (err: unknown) {
      const msg = (err as Error).message || t('common.error', locale);
      setError(msg);
      return false;
    }
  };

  const verifyRecoveryCode = async (code: string): Promise<boolean> => {
    if (!user || user.twoFactorStatus !== 'challenge_required') {
      return false;
    }

    if (!code || code.trim().length < 8) {
      setError(t('totp.invalidRecoveryCode', locale));
      return false;
    }

    try {
      const res = await fetch('/api/v1/auth/totp/recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        let err = t('totp.invalidRecoveryCode', locale);
        try {
          const errJson = (await res.json()) as { message?: string; error?: { message?: string } };
          err = errJson.message || errJson.error?.message || err;
        } catch {
          // Fallback
        }
        setError(err);
        return false;
      }

      const upgradedUser: StaffUser = {
        ...user,
        twoFactorStatus: 'verified',
      };
      saveToStorage(upgradedUser, token);
      setError(null);
      return true;
    } catch (err: unknown) {
      const msg = (err as Error).message || t('common.error', locale);
      setError(msg);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token && typeof window !== 'undefined') {
        await fetch('/api/v1/auth/sign-out', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Ignore network errors during sign-out
    }

    startTransition(() => {
      saveToStorage(null, null);
      setPendingSetupSecret(null);
      setPendingRecoveryCodes(null);
      setError(null);
    });
  };

  const setPendingSetup = (secret: string, recoveryCodes: string[]) => {
    setPendingSetupSecret(secret);
    setPendingRecoveryCodes(recoveryCodes);
  };

  const setUser = (newUser: StaffUser | null, newToken: string | null) => {
    saveToStorage(newUser, newToken);
  };

  const isAuthenticated = Boolean(user && user.twoFactorStatus === 'verified' && token);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        pendingSetupSecret,
        pendingRecoveryCodes,
        isAuthenticated,
        isLoading,
        error,
        locale,
        login,
        logout,
        setPendingSetup,
        confirm2faSetup,
        verify2faChallenge,
        verifyRecoveryCode,
        setLocale,
        setUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
}

export function useOptionalAdminAuth(): AdminAuthContextValue | null {
  return useContext(AdminAuthContext) ?? null;
}
