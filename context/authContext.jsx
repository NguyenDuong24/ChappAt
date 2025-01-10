import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import {convertToAge} from '../utils/common'
export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(undefined);
    const [gender, setGender] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [email, setEmail] = useState('');
    const [icon, setIcon] = useState('');
    const [password, setPassword] = useState(''); 
    const [bio, setBio] = useState(''); 
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthenticated(true);
                console.log(12345, user)
                setUser(user);
                updateUserData(user.uid);
                updateIsOnline(user.uid, true); 
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const refreshUser = async () => {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUser((prevUser) => ({
                ...prevUser,
                username: data.username,
                profileUrl: data.profileUrl,
                age: data.age,
                gender: data.gender,
                isOnline: data.isOnline,
                bio: data.bio,
            }));
            setName(data.username);
            setEmail(data.email);
            setAge(data.age);
            setGender(data.gender);
            setIcon(data.profileUrl);
            setBio(data.bio);
        }
    };

    const updateUserData = async (uid) => {
        console.log(`Fetching user data for UID: ${uid}`);
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log(1234567899, data)
                await setUser((prevUser) => ({
                    ...prevUser,
                    username: data.username,
                    profileUrl: data.profileUrl,
                    age: data.age,
                    gender: data.gender,
                    isOnline: data.isOnline,
                    bio: data.bio,
                }));
            } else {
                console.warn(`No document found for UID: ${uid}`);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };
    
    const updateIsOnline = async (uid, status) => {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await updateDoc(docRef, { isOnline: status });
        } else {
            console.warn(`Document for user ${uid} does not exist.`);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            const loggedInUser = response.user;

            await updateIsOnline(loggedInUser.uid, true);

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
            if (user) {
                await updateIsOnline(user.uid, false); 
            }
            await signOut(auth);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const register = async () => {
        try {
            if (!email || !password || !name || !age || !gender || !icon) {
                return { success: false, msg: 'Please fill in all fields.' };
            }

            const response = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = response.user;
            await setDoc(doc(db, "users", newUser.uid), {
                username: name,
                profileUrl: icon, 
                isOnline: true,
                age: convertToAge(age),
                gender,
            });

            return { success: true, data: newUser };
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
        <AuthContext.Provider value={{
            user, isAuthenticated, login, register, logout,
            gender, setGender,
            name, setName,
            age, setAge,
            email, setEmail,
            icon, setIcon,
            password, setPassword ,
            bio, setBio,
            refreshUser
        }}>
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
