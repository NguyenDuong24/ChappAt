import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from "firebase/firestore";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(undefined);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthenticated(true);
                setUser(user);
                updateUserData(user.uid);
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        });
        return () => unsub(); // Correctly unsubscribe
    }, []);


    const updateUserData = async (userId) =>{
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if(docSnap.exists())
        {
            let data = docSnap.data();
            setUser({
                ...user, username: data.username, profileUrl: data.profileUrl, userId: data.userId
            })
        }
    }

    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            let msg = error.message;
            if (msg.includes('(auth/invalid-email)')) msg = 'Invalid email';
            if (msg.includes('(auth/wrong-password)')) msg = 'Wrong password';
            if (msg.includes('(auth/user-not-found)')) msg = 'User not found';
            return { success: false, msg };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const register = async (email, password, username, profileUrl) => {
        try {
            const response = await createUserWithEmailAndPassword(auth, email, password);
            const user = response.user;

            await setDoc(doc(db, "users", user.uid), {
                username,
                profileUrl,
                userId: user.uid
            });

            return { success: true, data: user };
        } catch (error) {
            let msg = error.message;
            if (msg.includes('(auth/invalid-email)')) msg = 'Invalid email';
            if (msg.includes('(auth/email-already-in-use)')) msg = 'This email is already in use';
            if (msg.includes('(auth/invalid-credential)')) msg = 'Wrong credential';
            if (msg.includes('(auth/weak-password)')) msg = 'Weak password';
            return { success: false, msg };
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const value = useContext(AuthContext);

    if (!value) {
        throw new Error('useAuth must be wrapped inside AuthContext');
    }
    return value;
};
