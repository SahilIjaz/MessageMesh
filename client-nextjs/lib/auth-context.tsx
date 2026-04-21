'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User, AuthResponse } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      loadProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const loadProfile = async (authToken: string) => {
    try {
      const profile = await api.getProfile(authToken);
      setUser(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
      localStorage.removeItem('access_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    const response = await api.register(email, password);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    setToken(response.access_token);
    setUser(response.user as User);
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    setToken(response.access_token);
    setUser(response.user as User);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
