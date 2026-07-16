'use client';

import * as React from 'react';

import {
  bootstrapSession,
  changeUserPassword,
  loginUser,
  logoutUser,
  registerUser,
  updateUserName,
} from './store';
import type { AuthUser } from './types';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  updateName: (name: string) => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    void bootstrapSession()
      .then((session) => {
        if (!cancelled) {
          setUser(session);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (input: { email: string; password: string }) => {
    const session = await loginUser(input);
    setUser(session);
  }, []);

  const register = React.useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const session = await registerUser(input);
      setUser(session);
    },
    []
  );

  const logout = React.useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  const updateName = React.useCallback(async (name: string) => {
    if (!user) {
      throw new Error('请先登录。');
    }

    const session = await updateUserName(name);
    setUser(session);
  }, [user]);

  const changePassword = React.useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      if (!user) {
        throw new Error('请先登录。');
      }

      await changeUserPassword(input);
    },
    [user]
  );

  const value = React.useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      updateName,
      changePassword,
    }),
    [changePassword, isLoading, login, logout, register, updateName, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
