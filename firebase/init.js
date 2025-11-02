import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB6_mW_v1F-KD8CpNOVgb03RIxxxmFsgJM",
  authDomain: "dating-app-1bb49.firebaseapp.com",
  projectId: "dating-app-1bb49",
  storageBucket: "dating-app-1bb49.appspot.com",
  messagingSenderId: "256923005911",
  appId: "1:256923005911:web:2d5db10af299cf70315192"
};

// Initialize Firebase app synchronously
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} else {
  app = getApp();
  console.log('Using existing Firebase app');
}

// Initialize Auth synchronously with error handling
let auth;

// For React Native, we MUST use initializeAuth first, then getAuth
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('Firebase Auth initialized with persistence for React Native');
} catch (error) {
  // Only if auth is already initialized, then use getAuth
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
    console.log('Auth already initialized, using existing instance');
  } else {
    console.error('Firebase Auth initialization failed:', error);
    // For React Native, we need to force create auth instance
    try {
      // Clear any existing auth and reinitialize
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      console.log('Auth re-initialized successfully');
    } catch (retryError) {
      console.error('Failed to re-initialize auth:', retryError);
      throw retryError;
    }
  }
}

// Initialize Firestore
export const db = getFirestore(app);

// Firestore collections
export const userRef = collection(db, 'users');
export const roomRef = collection(db, 'rooms');

// Export auth and app - they are guaranteed to be initialized
export { auth, app };

// Simple synchronous function to verify auth is ready
export const ensureFirebaseAuthReady = () => {
  if (!app || !auth) {
    throw new Error('Firebase or Auth is not initialized');
  }
  return auth;
};
