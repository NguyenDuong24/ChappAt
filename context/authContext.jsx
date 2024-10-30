import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(undefined);
    
    // State variables for multi-step sign-up
    const [gender, setGender] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [email, setEmail] = useState('');
    const [icon, setIcon] = useState('');
    const [password, setPassword] = useState(''); // New state for password

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthenticated(true);
                setUser(user);
                updateUserData(user.uid);
                updateIsOnline(user.uid, true); // Set isOnline to true on login
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        });
        return () => unsub(); // Unsubscribe correctly
    }, []);

    const updateUserData = async (uid) => {
        const docRef = doc(db, 'users', uid);
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
        }
    };

    const updateIsOnline = async (uid, status) => {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, { isOnline: status });
    };

    const login = async (email, password) => {
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            const loggedInUser = response.user;

            await updateIsOnline(loggedInUser.uid, true); // Update isOnline to true

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
                await updateIsOnline(user.uid, false); // Update isOnline to false on logout
            }
            await signOut(auth);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const register = async () => {
        try {
            // Ensure all required data is present before registering
            if (!email || !password || !name || !age || !gender || !icon) {
                return { success: false, msg: 'Please fill in all fields.' };
            }

            const response = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = response.user;

            await setDoc(doc(db, "users", newUser.uid), {
                username: name,
                profileUrl: icon, 
                isOnline: true,
                age,
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
            password, setPassword // Provide password state and setter
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
