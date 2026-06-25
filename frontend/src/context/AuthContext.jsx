import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and check current user
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data);
        } catch (err) {
          console.error('Failed to authenticate token on load:', err);
          // Token might be expired, interceptor will try to refresh.
          // If it fails completely, it will clear storage and trigger logout.
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen to token refresh failures (which trigger auth-logout)
    const handleForceLogout = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    };

    window.addEventListener('auth-logout', handleForceLogout);
    return () => window.removeEventListener('auth-logout', handleForceLogout);
  }, []);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user: userData, tokens } = res.data.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      setUser(userData);
      
      return userData;
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Login failed. Please check credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // Register handler
  const register = async (userData) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', userData);
      const { user: newUser, tokens } = res.data.data;

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      setUser(newUser);

      return newUser;
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    setError,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
