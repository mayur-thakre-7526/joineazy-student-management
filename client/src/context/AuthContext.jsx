import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, groupApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  /**
   * Fetch pending invitations count for student badge
   */
  const refreshPendingCount = useCallback(async (isStudentUser) => {
    if (!isStudentUser) {
      setPendingInvitesCount(0);
      return;
    }
    try {
      const data = await groupApi.getMyPendingInvitations();
      if (data?.invitations) {
        setPendingInvitesCount(data.invitations.length);
      }
    } catch {
      // Non-critical background count
    }
  }, []);

  /**
   * Restore user session on application mount via HTTP-only cookie
   */
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authApi.getMe();
      if (data?.user) {
        setUser(data.user);
        if (data.user.role === 'STUDENT') {
          refreshPendingCount(true);
        }
      } else {
        setUser(null);
        setPendingInvitesCount(0);
      }
    } catch (err) {
      // 401 or network error simply means unauthenticated guest
      setUser(null);
      setPendingInvitesCount(0);
    } finally {
      setLoading(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Student Registration
   */
  const register = async ({ full_name, email, password }) => {
    setError(null);
    try {
      const data = await authApi.register({ full_name, email, password });
      setUser(data.user);
      refreshPendingCount(data.user.role === 'STUDENT');
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * User Login (Student or Admin)
   */
  const login = async ({ email, password }) => {
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      setUser(data.user);
      refreshPendingCount(data.user.role === 'STUDENT');
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * User Logout
   */
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Backend logout error (continuing local state cleanup):', err.message);
    } finally {
      setUser(null);
      setError(null);
      setPendingInvitesCount(0);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isStudent: user?.role === 'STUDENT',
    isAdmin: user?.role === 'ADMIN',
    pendingInvitesCount,
    refreshPendingCount: () => refreshPendingCount(user?.role === 'STUDENT'),
    login,
    register,
    logout,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
