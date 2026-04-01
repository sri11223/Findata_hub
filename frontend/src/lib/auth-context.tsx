import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from './api';
import { User, AuthTokens, LoginInput, RegisterInput } from './types';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveAuth = useCallback((userData: User, tokenData: AuthTokens) => {
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tokens', JSON.stringify(tokenData));
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.data.user;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  // Load auth state on mount
  useEffect(() => {
    const loadAuth = async () => {
      const storedTokens = localStorage.getItem('tokens');
      if (storedTokens) {
        try {
          const parsed = JSON.parse(storedTokens);
          setTokens(parsed);
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
        } catch {
          clearAuth();
        }
      }
      setIsLoading(false);
    };
    loadAuth();
  }, [clearAuth]);

  const login = useCallback(async (input: LoginInput) => {
    const res = await api.post('/auth/login', input);
    const { user: userData, tokens: tokenData } = res.data.data;
    saveAuth(userData, tokenData);
  }, [saveAuth]);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.post('/auth/register', input);
    const { user: userData, tokens: tokenData } = res.data.data;
    saveAuth(userData, tokenData);
  }, [saveAuth]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
