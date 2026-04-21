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
      console.log('👤 Loading user profile...');
      const profile = await api.getProfile(authToken);
      console.log('✅ Profile loaded:', profile);
      setUser(profile);
    } catch (error) {
      console.error('❌ Failed to load profile:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      console.log('📝 Starting registration for:', email);
      const response = await api.register(email, password);
      console.log('✅ Registration response received:', response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      console.log('💾 Tokens saved to localStorage');
      setToken(response.access_token);
      setUser(response.user as User);
      console.log('🎉 Registration complete for:', email);
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔓 Starting login for:', email);
      const response = await api.login(email, password);
      console.log('✅ Login response received:', response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      console.log('💾 Tokens saved to localStorage');
      setToken(response.access_token);
      setUser(response.user as User);
      console.log('🎉 Login complete for:', email);
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('👋 Logging out...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    console.log('✅ Logout complete');
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
