import { AppState as RNAppState } from 'react-native';
import React, { createContext, useContext, useEffect, useState } from 'react';
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
                handleUserActive(user?.uid, user?.showOnlineStatus);
            } else if((nextAppState === "background")) {
                handleUserBackground(user?.uid);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user]);

    // Cập nhật trạng thái người dùng là online
    const handleUserActive = async (uid, showOnlineStatus) => {
        try {
            if (uid) {
                const userRef = doc(db, 'users', uid);
                // Nếu user tắt hiển thị online, luôn ghi false
                const nextOnline = showOnlineStatus === false ? false : true;
                await setDoc(userRef, { isOnline: nextOnline }, { merge: true });
            }
        } catch {}
    };

    const handleUserBackground = async (uid) => {
        try {
            if (uid) {
                const userRef = doc(db, 'users', uid);
                await setDoc(userRef, { isOnline: false }, { merge: true });
            }
        } catch {}
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
