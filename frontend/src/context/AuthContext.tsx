import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { authApi } from '../services/api';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  photo_url: string | null;
  role: string;
  org_id: string;
  firebase_uid?: string;
  provider: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerWithCredentials: (data: { email: string; password: string; full_name: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateProfile: (data: { full_name?: string; role?: string; photo_url?: string }) => Promise<void>;
  changePassword: (data: { current_password: string; new_password: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync Firebase user with backend (PostgreSQL / SQLite)
  const syncUserWithBackend = useCallback(async (user: FirebaseUser) => {
    try {
      const idToken = await user.getIdToken();
      const res = await authApi.syncFirebase(idToken);
      const syncedUser = res.data;
      setAppUser(syncedUser);
      localStorage.setItem('token', idToken);
      localStorage.setItem('user', JSON.stringify(syncedUser));
      localStorage.setItem('auth_provider', 'google.com');
      setError(null);
    } catch (err: any) {
      console.error('[AuthContext] Backend sync failed:', err);
      const fallbackUser: AppUser = {
        id: user.uid,
        email: user.email || '',
        full_name: user.displayName || user.email?.split('@')[0] || 'User',
        display_name: user.displayName || user.email?.split('@')[0] || 'User',
        photo_url: user.photoURL,
        role: 'ciso',
        org_id: 'org-demo',
        firebase_uid: user.uid,
        provider: 'google.com',
      };
      setAppUser(fallbackUser);
      localStorage.setItem('user', JSON.stringify(fallbackUser));
    }
  }, []);

  // Fetch current user from backend using stored JWT
  const refreshJwtUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await authApi.me();
      if (res.data) {
        const u = res.data;
        const normalized: AppUser = {
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.display_name || 'User',
          display_name: u.full_name || u.display_name || 'User',
          photo_url: u.photo_url || null,
          role: u.role || 'ciso',
          org_id: u.org_id || 'org-demo',
          provider: u.provider || 'password',
        };
        setAppUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      }
    } catch (err) {
      console.warn('[AuthContext] Session refresh error:', err);
    }
  }, []);

  // Listen for Firebase auth state & maintain JWT persistence
  useEffect(() => {
    let isMounted = true;

    // Check if we have an active local JWT session first
    const localToken = localStorage.getItem('token');
    const authProvider = localStorage.getItem('auth_provider');

    if (localToken && authProvider !== 'google.com') {
      refreshJwtUser().finally(() => {
        if (isMounted) setLoading(false);
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setFirebaseUser(user);
      if (user) {
        await syncUserWithBackend(user);
        if (isMounted) setLoading(false);
      } else {
        // If not using Google OAuth, retain local JWT session
        const currentProvider = localStorage.getItem('auth_provider');
        if (currentProvider === 'google.com') {
          setAppUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth_provider');
        }
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncUserWithBackend, refreshJwtUser]);

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login({ email, password });
      const { access_token, user } = res.data;
      const normalizedUser: AppUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.display_name || 'User',
        display_name: user.full_name || user.display_name || 'User',
        photo_url: user.photo_url || null,
        role: user.role || 'ciso',
        org_id: user.org_id || 'org-demo',
        provider: user.provider || 'password',
      };
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('auth_provider', 'password');
      setAppUser(normalizedUser);
      setFirebaseUser(null);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const registerWithCredentials = async (data: { email: string; password: string; full_name: string; role?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.register(data);
      const { access_token, user } = res.data;
      const normalizedUser: AppUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        display_name: user.full_name,
        photo_url: user.photo_url || null,
        role: user.role || 'analyst',
        org_id: user.org_id || 'org-demo',
        provider: 'password',
      };
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('auth_provider', 'password');
      setAppUser(normalizedUser);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AuthContext] Google sign-in successful:', result.user.email);
    } catch (err: any) {
      console.error('[AuthContext] Google sign-in error:', err);
      setError(err.message || 'Google sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
      setAppUser(null);
      setFirebaseUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_provider');
      setError(null);
    } catch (err: any) {
      console.error('[AuthContext] Logout error:', err);
      setError(err.message || 'Logout failed');
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (firebaseUser) {
      return firebaseUser.getIdToken();
    }
    return localStorage.getItem('token');
  };

  const updateProfile = async (data: { full_name?: string; role?: string; photo_url?: string }) => {
    try {
      const res = await authApi.updateProfile(data);
      const u = res.data;
      const updatedUser: AppUser = {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        display_name: u.full_name,
        photo_url: u.photo_url || null,
        role: u.role,
        org_id: u.org_id,
        provider: u.provider || 'password',
      };
      setAppUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err: any) {
      console.error('[AuthContext] Update profile error:', err);
      // Local fallback
      setAppUser((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          full_name: data.full_name ?? prev.full_name,
          display_name: data.full_name ?? prev.display_name,
          role: data.role ?? prev.role,
          photo_url: data.photo_url ?? prev.photo_url,
        };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
      throw err;
    }
  };

  const changePassword = async (data: { current_password: string; new_password: string }) => {
    await authApi.changePassword(data);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        error,
        signInWithGoogle,
        loginWithCredentials,
        registerWithCredentials,
        logout,
        getIdToken,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
