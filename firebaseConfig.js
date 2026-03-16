import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import * as Notifications from 'expo-notifications';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || 'dating-app-1bb49.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize (or reuse) Firebase app safely to avoid duplicate init on fast refresh / re-imports
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence (handle already-initialized during dev hot reload)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  if (e?.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error('Firebase Auth init error:', e);
    throw e;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Initialize Firestore / Storage once per app instance
// Note: Firebase Cloud Functions removed - using custom coin server instead
export const db = getFirestore(app);
export const storage = getStorage(app);

// Firestore collection refs
export const userRef = collection(db, 'users');
export const roomRef = collection(db, 'rooms');
export const groupsRef = collection(db, 'groups');

// Exports
export { app, auth };
