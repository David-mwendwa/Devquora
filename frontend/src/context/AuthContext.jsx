import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../api/apiClient';
import * as usersApi from '../api/users';

const AuthContext = createContext();

// Every localStorage read here is wrapped, because this provider renders in
// two places without a browser around it: Node, when the public pages are
// prerendered at build time, and a browser with site data blocked, where the
// property exists but throws on access.
const readStored = (key) => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

const getCachedUser = () => {
  try {
    const cached = readStored('user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCachedUser);
  // Only block on the session check when there is nothing cached to show. A
  // returning reader already has their user in localStorage, so the app can
  // render signed-in immediately and let /auth/me confirm it underneath —
  // which matters here because that request can take twenty seconds while the
  // free-tier API wakes, and every guarded route renders null until `loading`
  // clears. The old unconditional `true` meant a cold start showed a blank
  // page to someone whose session was perfectly valid.
  const [loading, setLoading] = useState(() => Boolean(readStored('token')) && !getCachedUser());

  useEffect(() => {
    const token = readStored('token');
    if (!token) {
      setLoading(false);
      return;
    }

    apiClient
      .get('/auth/me')
      .then((res) => {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
      })
      .catch((err) => {
        // A 401 is the server saying the token is no longer good, which is the
        // only answer that should end a session. A timeout, an offline laptop
        // or a cold-starting API say nothing about the token's validity, and
        // treating them as a sign-out logged people out for being on a train.
        if (err.response?.status !== 401) return;
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
