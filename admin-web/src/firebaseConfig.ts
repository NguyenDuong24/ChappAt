import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config từ app chính
const firebaseConfig = {
    apiKey: "AIzaSyB6_mW_v1F-KD8CpNOVgb03RIxxxmFsgJM",
    authDomain: "dating-app-1bb49.firebaseapp.com",
    projectId: "dating-app-1bb49",
    storageBucket: "dating-app-1bb49.appspot.com",
    messagingSenderId: "256923005911",
    appId: "1:256923005911:web:2d5db10af299cf70315192"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
