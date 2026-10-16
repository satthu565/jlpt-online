'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import type { Role } from '@jlpt/schema';
import { isStaffRole } from './navigation';
import type { Locale } from './i18n';
import { DEFAULT_LOCALE } from './i18n';

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
  login: (email: string, role?: Role, twoFactorEnabled?: boolean) => Promise<{ success: boolean; nextStep: 'dashboard' | 'setup_2fa' | 'verify_2fa'; error?: string }>;
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
  initialLoading,
}: {
  children: React.ReactNode;
  initialUser?: StaffUser | null;
  initialToken?: string | null;
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
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [, startTransition] = useTransition();

  // Load persisted session from localStorage in browser
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedLocale = localStorage.getItem(STORAGE_KEY_LOCALE) as Locale | null;
        if (savedLocale && ['vi', 'ja', 'en'].includes(savedLocale)) {
          setLocaleState(savedLocale);
        }

        const raw = localStorage.getItem(STORAGE_KEY_AUTH);
        if (raw) {
          const parsed = JSON.parse(raw) as { user: StaffUser; token: string };
          if (parsed.user && isStaffRole(parsed.user.role)) {
            setUserState(parsed.user);
            setToken(parsed.token);
          }
        }
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    }
  };

  const login = async (
    email: string,
    role: Role = 'editor',
    twoFactorEnabled = false,
  ): Promise<{ success: boolean; nextStep: 'dashboard' | 'setup_2fa' | 'verify_2fa'; error?: string }> => {
    setError(null);

    if (!isStaffRole(role)) {
      const err = 'Chỉ tài khoản nhân sự (Admin, Editor, Reviewer) mới được phép đăng nhập.';
      setError(err);
      return { success: false, nextStep: 'dashboard', error: err };
    }

    const mockId = `usr_${Date.now()}`;
    const sessionToken = `admin_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // If 2FA is NOT enabled yet -> Must enroll (AWAITING_2FA_SETUP)
    if (!twoFactorEnabled) {
      const staffUser: StaffUser = {
        id: mockId,
        email,
        name: email.split('@')[0] ?? 'Staff',
        role,
        twoFactorEnabled: false,
        twoFactorStatus: 'setup_required',
      };
      saveToStorage(staffUser, sessionToken);
      return { success: true, nextStep: 'setup_2fa' };
    }

    // If 2FA IS enabled -> Must challenge (AWAITING_2FA_CHALLENGE)
    const staffUser: StaffUser = {
      id: mockId,
      email,
      name: email.split('@')[0] ?? 'Staff',
      role,
      twoFactorEnabled: true,
      twoFactorStatus: 'challenge_required',
    };
    saveToStorage(staffUser, sessionToken);
    return { success: true, nextStep: 'verify_2fa' };
  };

  const confirm2faSetup = async (code: string): Promise<boolean> => {
    if (!user || user.twoFactorStatus !== 'setup_required') {
      return false;
    }

    if (!code || code.trim().length !== 6) {
      return false;
    }

    // In client context, upon successful verification:
    const upgradedUser: StaffUser = {
      ...user,
      twoFactorEnabled: true,
      twoFactorStatus: 'verified',
    };
    saveToStorage(upgradedUser, token);
    setPendingSetupSecret(null);
    setPendingRecoveryCodes(null);
    return true;
  };

  const verify2faChallenge = async (code: string): Promise<boolean> => {
    if (!user || user.twoFactorStatus !== 'challenge_required') {
      return false;
    }

    if (!code || code.trim().length !== 6) {
      return false;
    }

    const upgradedUser: StaffUser = {
      ...user,
      twoFactorStatus: 'verified',
    };
    saveToStorage(upgradedUser, token);
    return true;
  };

  const verifyRecoveryCode = async (code: string): Promise<boolean> => {
    if (!user || user.twoFactorStatus !== 'challenge_required') {
      return false;
    }

    if (!code || code.trim().length < 8) {
      return false;
    }

    const upgradedUser: StaffUser = {
      ...user,
      twoFactorStatus: 'verified',
    };
    saveToStorage(upgradedUser, token);
    return true;
  };

  const logout = async () => {
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
