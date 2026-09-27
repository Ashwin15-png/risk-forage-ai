import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_FIREBASE_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ashwin-java-app-2026.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ashwin-java-app-2026',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ashwin-java-app-2026.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '264819491168',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:264819491168:web:fde06abaad2e74f0055e05',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Request additional scopes for profile info
googleProvider.addScope('profile');
googleProvider.addScope('email');

export default app;
