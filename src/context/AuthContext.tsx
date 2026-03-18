import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => void;
  login: (token: string, user: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: () => {},
  login: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (token: string, userData: any) => {
    localStorage.setItem("token", token);
    setUser(userData);
    setProfile(userData as any);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          setProfile(userData as any);
        } catch (error) {
          console.error("Auth check failed", error);
          logout();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'francismugebe@gmail.com').toLowerCase();
  const isAdmin = profile?.role === 'admin' || user?.email?.toLowerCase() === adminEmail;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
