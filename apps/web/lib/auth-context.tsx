'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await client.getSession();
      if (res?.user) {
        setUser(res.user);
        setSession(res.session);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch {
      setUser(null);
      setSession(null);
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
