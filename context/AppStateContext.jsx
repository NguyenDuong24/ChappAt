import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/authContext';

const AppStateContext = createContext();

export const AppStateProvider = ( { children }) => {
    const [appState, setAppState] = useState(RNAppState.currentState);
    const { user } = useAuth();
    useEffect(() => {
        const subscription = RNAppState.addEventListener("change", nextAppState => {
            setAppState(nextAppState);
            if (nextAppState === "active") {
                handleUserActive(user?.uid); 
            } else if((nextAppState === "background")) {
                handleUserBackground(user?.uid); 
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user]);

    // Cập nhật trạng thái người dùng là online
    const handleUserActive = async (uid) => {
        
        console.log('active', uid)
        if (uid) {
            console.log('active', uid)
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, { isOnline: true }, { merge: true });
            console.log(`User ${uid} is now online.`);
        }
    };

    const handleUserBackground = async (uid) => {
        
        console.log('bg', uid)
        if (uid) {
            
            console.log('bg', uid)
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, { isOnline: false }, { merge: true });
            console.log(`User ${uid} is now offline.`);
        }
    };

    return (
        <AppStateContext.Provider value={appState}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => {
    return useContext(AppStateContext);
};
