'use client';

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

// Runs before paint on the client and is skipped on the server.
const useClientLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import {
  AuthClient,
  defaultAuthClient,
  type User,
  type Session,
} from './auth-client';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  client: AuthClient;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  client = defaultAuthClient,
}: {
  children: React.ReactNode;
  client?: AuthClient;
}): React.JSX.Element {
  // Starts as the server rendered it (signed out); the cached user is applied before the first paint,
  // so hydration matches and the header does not flash (React #418 otherwise).
  const [user, setUser] = useState<User | null>(null);
  useClientLayoutEffect(() => {
    try {
      const cached = localStorage.getItem('jlpt_cached_user');
      if (cached) setUser((current) => current ?? (JSON.parse(cached) as User));
    } catch {
      // Ignore storage access error
    }
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await client.getSession();
      if (res?.user) {
        setUser(res.user);
        setSession(res.session);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('jlpt_cached_user', JSON.stringify(res.user));
          } catch {
            // Ignore storage access error
          }
        }
      } else {
        setUser(null);
        setSession(null);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('jlpt_cached_user');
          } catch {
            // Ignore storage access error
          }
        }
      }
    } catch {
      setUser(null);
      setSession(null);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('jlpt_cached_user');
        } catch {
          // Ignore storage access error
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [client]);

  const signOut = async () => {
    try {
      await client.signOut();
    } finally {
      setUser(null);
      setSession(null);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('jlpt_cached_user');
        } catch {
          // Ignore storage access error
        }
      }
    }
  };

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    client,
    refreshUser,
    setUser,
    signOut,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      isLoading: false,
      client: defaultAuthClient,
      refreshUser: async () => {},
      setUser: () => {},
      signOut: async () => {},
    };
  }
  return context;
}
