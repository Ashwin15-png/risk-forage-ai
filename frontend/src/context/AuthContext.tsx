import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import axios from 'axios';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  photo_url: string | null;
  role: string;
  org_id: string;
  firebase_uid: string;
  provider: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync Firebase user with backend (Neon PostgreSQL)
  const syncUserWithBackend = useCallback(async (user: FirebaseUser) => {
    try {
      const idToken = await user.getIdToken();
      const res = await axios.post(
        '/api/v1/auth/sync',
        {},
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const syncedUser = res.data;
      setAppUser(syncedUser);
      // Store token for API interceptor compatibility
      localStorage.setItem('token', idToken);
      localStorage.setItem('user', JSON.stringify(syncedUser));
      setError(null);
    } catch (err: any) {
      console.error('[AuthContext] Backend sync failed:', err);
      // Still allow frontend to work with Firebase user data even if backend sync fails
      setAppUser({
        id: user.uid,
        email: user.email || '',
        full_name: user.displayName || '',
        display_name: user.displayName || '',
        photo_url: user.photoURL,
        role: 'ciso',
        org_id: '',
        firebase_uid: user.uid,
        provider: 'google.com',
      });
      setError('Backend sync failed — using Firebase data');
    }
  }, []);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncUserWithBackend(user);
      } else {
        setAppUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [syncUserWithBackend]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the rest
      console.log('[AuthContext] Google sign-in successful:', result.user.email);
    } catch (err: any) {
      console.error('[AuthContext] Google sign-in error:', err);
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAppUser(null);
      setFirebaseUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        error,
        signInWithGoogle,
        logout,
        getIdToken,
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
