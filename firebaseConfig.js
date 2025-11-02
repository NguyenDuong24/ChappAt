import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import * as Notifications from 'expo-notifications';

const firebaseConfig = {
  apiKey: "AIzaSyB6_mW_v1F-KD8CpNOVgb03RIxxxmFsgJM",
  authDomain: "dating-app-1bb49.firebaseapp.com",
  projectId: "dating-app-1bb49",
  storageBucket: "dating-app-1bb49.appspot.com",
  messagingSenderId: "256923005911",
  appId: "1:256923005911:web:2d5db10af299cf70315192"
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

// Initialize Firestore / Functions / Storage once per app instance
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Firestore collection refs
export const userRef = collection(db, 'users');
export const roomRef = collection(db, 'rooms');
export const groupsRef = collection(db, 'groups');

// Exports
export { app, auth };
