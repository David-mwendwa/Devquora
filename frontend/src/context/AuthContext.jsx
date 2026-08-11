import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../api/apiClient';
import * as usersApi from '../api/users';

const AuthContext = createContext();

const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCachedUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiClient
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signup = useCallback(async (payload) => {
    const res = await apiClient.post('/auth/signup', payload);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const login = useCallback(async (payload) => {
    const res = await apiClient.post('/auth/login', payload);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Account edits go through here rather than straight from the page, so there
  // stays exactly one signed-in user in the app. A page that held its own copy
  // would let the header and the profile disagree about your own name the
  // moment you saved.
  const updateProfile = useCallback(async (payload) => {
    const updated = await usersApi.updateMyProfile(payload);
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
    return updated;
  }, []);

  const updatePassword = useCallback(async (payload) => {
    const { token, user: updated } = await usersApi.updateMyPassword(payload);
    // The API re-issues the JWT on a password change; keeping the old one would
    // sign the user out as soon as the server starts rejecting stale tokens.
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signup,
        login,
        logout,
        updateProfile,
        updatePassword,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
