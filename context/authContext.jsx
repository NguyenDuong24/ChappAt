import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { convertToAge } from '../utils/common';
import { signInWithGoogle, signInWithFacebook, signOutFromSocial, configureGoogleSignIn } from '../services/socialAuth';
import { useRouter } from 'expo-router';
import { vibeService } from '../services/vibeService';
import { PREDEFINED_VIBES } from '../types/vibe';
import { walletService } from '../services/walletService';
import ExpoPushNotificationService from '../services/expoPushNotificationService';

// PERFORMANCE: Enable/disable debug mode
const DEBUG_MODE = false;
const log = DEBUG_MODE ? console.log : () => { };
const logError = console.error; // Always log errors

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
    const [educationLevel, setEducationLevel] = useState('');
    const [university, setUniversity] = useState('');
    const [job, setJob] = useState('');
    const [loading, setLoading] = useState(true);
    // New: track whether user is in onboarding (profile incomplete)
    const [isOnboarding, setIsOnboarding] = useState(false);
    // Track signup type: 'email' | 'google' | null
    const [signupType, setSignupType] = useState(null);
    // Avoid first snapshot overriding local state if user already changed it
    const didUserEditSignup = useRef({ name: false, gender: false, age: false, icon: false });
    const router = useRouter();

    // Vibe states
    const [currentVibe, setCurrentVibe] = useState(null);
    const [settingVibe, setSettingVibe] = useState(false);
    const [vibeError, setVibeError] = useState(null);
    const vibeUnsubscribe = useRef(null);

    // Listener refs for cleanup on logout
    const userProfileUnsubscribe = useRef(null);
    const walletUnsubscribe = useRef(null);

    // Wallet state
    const [coins, setCoins] = useState(0);
    const [banhMi, setBanhMi] = useState(0);

    // Expo Push Notification state
    const [notificationToken, setNotificationToken] = useState(null);
    const [notificationInitialized, setNotificationInitialized] = useState(false);
    const [activeFrame, setActiveFrame] = useState(null);

    // Configure Google Sign-In when the app starts
    useEffect(() => {
        configureGoogleSignIn();

        // Debug: Check auth state on app start
        const checkAuthState = async () => {
            try {
                console.log('🔐 Initial auth check - currentUser:', auth.currentUser);
                console.log('🔐 Initial auth check - user ID:', auth.currentUser?.uid);
                console.log('🔐 Initial auth check - user email:', auth.currentUser?.email);
            } catch (error) {
                console.error('❌ Auth check error:', error);
            }
        };
        checkAuthState();
    }, []);

    // Mark edits from signup screens
    useEffect(() => { if (name) didUserEditSignup.current.name = true; }, [name]);
    useEffect(() => { if (gender) didUserEditSignup.current.gender = true; }, [gender]);
    useEffect(() => { if (age) didUserEditSignup.current.age = true; }, [age]);
    useEffect(() => { if (icon) didUserEditSignup.current.icon = true; }, [icon]);

    const clearSignupState = () => {
        try {
            setGender('');
            setName('');
            setAge('');
            setEmail('');
            setIcon('');
            setPassword('');
            setBio('');
            setEducationLevel('');
            setUniversity('');
            setJob('');
            setIsOnboarding(false);
            setSignupType(null);
            didUserEditSignup.current = { name: false, gender: false, age: false, icon: false };
            // Clear vibe state
            setCurrentVibe(null);
            setSettingVibe(false);
            setVibeError(null);
            if (vibeUnsubscribe.current) {
                vibeUnsubscribe.current();
                vibeUnsubscribe.current = null;
            }
            // Reset wallet state
            setCoins(0);
            setBanhMi(0);
        } catch (_e) { }
    };

    const updateUserPassword = async (currentPassword, newPassword) => {
        if (!user) {
            return { success: false, msg: 'Bạn chưa đăng nhập' };
        }

        try {
            // Reauthenticate user với mật khẩu hiện tại
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // Cập nhật mật khẩu mới
            await updatePassword(auth.currentUser, newPassword);

            return { success: true };
        } catch (error) {
            let msg = error.message;
            if (msg.includes('(auth/wrong-password)')) msg = 'Mật khẩu hiện tại không đúng';
            if (msg.includes('(auth/weak-password)')) msg = 'Mật khẩu mới quá yếu (ít nhất 6 ký tự)';
            if (msg.includes('(auth/requires-recent-login)')) msg = 'Vui lòng đăng nhập lại để thay đổi mật khẩu';
            if (msg.includes('(auth/user-mismatch)')) msg = 'Thông tin xác thực không khớp';
            return { success: false, msg };
        }
    };

    const refreshUser = async () => {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log("321")
            const data = docSnap.data();
            setUser((prevUser) => ({
                ...(prevUser || {}),
                ...data,
                // ensure critical fields remain
                uid: prevUser?.uid || data?.uid || auth.currentUser?.uid,
                email: prevUser?.email || data?.email || auth.currentUser?.email,
            }));
            // Update coins
            setCoins(Number(data?.coins || 0));
            setBanhMi(Number(data?.banhMi || 0));
            // Guard: do not override local signup inputs while onboarding
            if (!isOnboarding) {
                setName(data.username);
                setEmail(data.email);
                setAge(data.age);
                setGender(data.gender);
                setIcon(data.profileUrl);
                setBio(data.bio);
            } else {
                // While onboarding, only backfill fields that user hasn't edited locally yet
                if (!didUserEditSignup.current.name) setName(data.username || '');
                setEmail(data.email || '');
                if (!didUserEditSignup.current.age) setAge(data.age || '');
                if (!didUserEditSignup.current.gender) setGender(data.gender || '');
                if (!didUserEditSignup.current.icon) setIcon(data.profileUrl || data.photoURL || '');
                if (!bio) setBio(data.bio || '');
            }
        }
    };

    // Helper: determine if profile is considered completed
    const isProfileCompletedData = (data) => {
        if (!data) return false;
        const hasAllRequired = !!(data.username && data.gender && data.age && (data.profileUrl || data.photoURL));
        return data.profileCompleted === true || hasAllRequired;
    };

    // Initialize Expo Push Notifications
    const initializeNotifications = async (userId) => {
        try {
            console.log('🚀 Initializing Expo Push Notifications for user:', userId);
            await ExpoPushNotificationService.initializeWithRealtimeListeners(userId);
            const token = ExpoPushNotificationService.getExpoPushToken();
            setNotificationToken(token);
            setNotificationInitialized(true);
            console.log('✅ Expo Push Notifications initialized successfully');
            console.log('📱 Push Token:', token);
        } catch (error) {
            console.error('❌ Failed to initialize Expo Push Notifications:', error);
            setNotificationInitialized(false);
        }
    };

    // Cleanup Expo Push Notifications
    const cleanupNotifications = () => {
        try {
            ExpoPushNotificationService.cleanup();
            console.log('🧹 Expo Push Notifications cleaned up');
        } catch (error) {
            console.error('❌ Error cleaning up notifications:', error);
        }
    };

    useEffect(() => {
        // Listen to user profile changes to update isAuthenticated when onboarding completes
        if (!user?.uid) return;
        const userRef = doc(db, 'users', user.uid);
        const unsub = onSnapshot(userRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            const completed = isProfileCompletedData(data);

            // Wallet coins are now synced via separate listener

            // update cached fields cautiously
            if (completed) {
                setIsOnboarding(prev => prev !== false ? false : prev);
                setName(prev => prev !== (data.username || '') ? (data.username || '') : prev);
                setEmail(prev => prev !== (data.email || '') ? (data.email || '') : prev);
                setAge(prev => prev !== (data.age || '') ? (data.age || '') : prev);
                setGender(prev => prev !== (data.gender || '') ? (data.gender || '') : prev);
                setIcon(prev => {
                    const newIcon = data.profileUrl || data.photoURL || '';
                    return prev !== newIcon ? newIcon : prev;
                });
                setBio(prev => prev !== (data.bio || '') ? (data.bio || '') : prev);
                setActiveFrame(prev => prev !== (data.activeFrame || null) ? (data.activeFrame || null) : prev);
            } else {
                setIsOnboarding(prev => prev !== true ? true : prev);
                // While onboarding, avoid overwriting user-entered signup fields
                // Only backfill fields if not edited locally yet
                if (!didUserEditSignup.current.name) setName(prev => prev !== (data.username || '') ? (data.username || '') : prev);
                setEmail(prev => prev !== (data.email || '') ? (data.email || '') : prev);
                if (!didUserEditSignup.current.age) setAge(prev => prev !== (data.age || '') ? (data.age || '') : prev);
                if (!didUserEditSignup.current.gender) setGender(prev => prev !== (data.gender || '') ? (data.gender || '') : prev);
                if (!didUserEditSignup.current.icon) {
                    const newIcon = data.profileUrl || data.photoURL || '';
                    setIcon(prev => prev !== newIcon ? newIcon : prev);
                }
                setBio(prev => prev !== (data.bio || '') ? (data.bio || '') : prev);
                setActiveFrame(prev => prev !== (data.activeFrame || null) ? (data.activeFrame || null) : prev);
            }

            // if profile now completed, flip auth state to true
            if (completed) {
                setIsAuthenticated(prev => prev !== true ? true : prev);
                // normalize: ensure profileCompleted flag set in DB once requirements met
                if (data.profileCompleted !== true) {
                    // Only update if not already true to avoid loops
                    updateDoc(userRef, { profileCompleted: true }).catch(e => {
                        // Silently handle permission errors during logout
                        const errorStr = String(e?.message || e?.code || e);
                        if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                            console.error("Error updating profileCompleted:", e);
                        }
                    });
                }
            } else if (isAuthenticated !== false) {
                // only set pendingProfile if not logged out
                setIsAuthenticated(prev => prev !== 'pendingProfile' ? 'pendingProfile' : prev);
            }
            // Sync pinnedChatIds and other critical user data
            setUser(prev => {
                if (!prev) return prev;
                // Check if pinnedChatIds changed
                const prevPins = prev.pinnedChatIds || [];
                const newPins = data.pinnedChatIds || [];

                const isDifferent = prevPins.length !== newPins.length ||
                    !prevPins.every((val, index) => val === newPins[index]);

                if (isDifferent) {
                    console.log('📌 AuthContext: Syncing pinnedChatIds:', newPins);
                    return { ...prev, pinnedChatIds: newPins };
                }
                return prev;
            });

        }, (error) => {
            // Silently handle permission errors during logout
            const errorStr = String(error?.message || error?.code || error);
            if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                console.error('User profile listener error:', error);
            }
        });

        userProfileUnsubscribe.current = () => {
            unsub();
        };

        return () => {
            try {
                unsub();
            } catch (_e) { }
            userProfileUnsubscribe.current = null;
        };
    }, [user?.uid]);

    // Listen to wallet balance changes
    useEffect(() => {
        if (!user?.uid) return;
        const balanceRef = doc(db, 'users', user.uid, 'wallet', 'balance');
        const unsub = onSnapshot(balanceRef, (snap) => {
            if (!snap.exists()) {
                // If no balance document exists, set to 0
                setCoins(0);
                return;
            }
            const data = snap.data();
            setCoins(Number(data?.coins || 0));
            setBanhMi(Number(data?.banhMi || 0));
        }, (error) => {
            // Silently handle permission errors during logout
            const errorStr = String(error?.message || error?.code || error);
            if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                console.error('Wallet listener error:', error);
            }
        });
        walletUnsubscribe.current = unsub;
        return () => {
            try { unsub(); } catch (_e) { }
            walletUnsubscribe.current = null;
        };
    }, [user?.uid]);

    // Helper to stop all listeners before logout
    const stopAllListeners = () => {
        if (userProfileUnsubscribe.current) {
            try { userProfileUnsubscribe.current(); } catch (_e) { }
            userProfileUnsubscribe.current = null;
        }
        if (walletUnsubscribe.current) {
            try { walletUnsubscribe.current(); } catch (_e) { }
            walletUnsubscribe.current = null;
        }
        stopVibeSubscription();
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (userFB) => {
            try {
                console.log('🔥 onAuthStateChanged triggered');
                console.log('👤 Firebase user:', userFB);
                console.log('🆔 User ID:', userFB?.uid);
                console.log('📧 User email:', userFB?.email);

                if (userFB) {
                    await updateIsOnline(userFB.uid, true);
                    // Fetch user data from Firestore first
                    try {
                        const docRef = doc(db, 'users', userFB.uid);
                        const snap = await getDoc(docRef);
                        const data = snap.exists() ? snap.data() : {};

                        // Check and initialize wallet balance
                        const balanceRef = doc(db, 'users', userFB.uid, 'wallet', 'balance');
                        const balanceSnap = await getDoc(balanceRef);
                        if (!balanceSnap.exists()) {
                            // Initialize wallet with 1000 coins if it doesn't exist
                            try {
                                await setDoc(balanceRef, { coins: 1000 });
                                setCoins(1000);
                            } catch (_e) {
                                setCoins(0);
                            }
                        } else {
                            const balanceData = balanceSnap.data();
                            setCoins(Number(balanceData?.coins || 0));
                            setBanhMi(Number(balanceData?.banhMi || 0));
                        }

                        // If user has no coins field in main doc, grant initial 1000 Bánh mì once (legacy)
                        if (data.coins === undefined) {
                            try {
                                await updateDoc(docRef, { coins: 1000 });
                            } catch (_e) { }
                        }

                        // Set user with merged Firebase auth + Firestore data
                        setUser({
                            ...userFB,
                            ...data,
                        });

                        const requiredFilled = !!(data.username && data.gender && data.age && (data.profileUrl || data.photoURL));
                        const completedFlag = data.profileCompleted === true;
                        if (completedFlag || requiredFilled) {
                            if (!completedFlag && requiredFilled) {
                                try { await updateDoc(docRef, { profileCompleted: true }); } catch (_e) { }
                            }
                            setIsAuthenticated(true);
                            setIsOnboarding(false);

                            // Start vibe subscription for authenticated users
                            startVibeSubscription(userFB.uid);

                            // Initialize Expo Push Notifications
                            initializeNotifications(userFB.uid);
                        } else {
                            setIsAuthenticated('pendingProfile');
                            setIsOnboarding(true);
                        }

                        // Load current vibe from Firestore user document if available
                        if (data.currentVibe) {
                            // Check for expiration before setting
                            const exp = data.currentVibe.expiresAt;
                            let isExpired = false;
                            if (exp) {
                                const now = new Date();
                                const expiry = exp.toDate ? exp.toDate() : new Date(exp);
                                isExpired = expiry.getTime() <= now.getTime();
                            }

                            if (!isExpired) {
                                setCurrentVibe(data.currentVibe);
                            } else {
                                console.log('🗑️ AuthContext: Found expired vibe in user profile, cleaning up...');
                                setCurrentVibe(null);
                                // Clean up expired vibe from DB
                                if (data.currentVibe.id) {
                                    vibeService.removeUserVibe(userFB.uid, data.currentVibe.id)
                                        .then(() => console.log('✅ AuthContext: Expired vibe removed from DB'))
                                        .catch(err => console.error("❌ AuthContext: Failed to cleanup expired vibe", err));
                                }
                            }
                        } else {
                            // Fallback: try to load from vibeService
                            loadUserVibe(userFB.uid);
                        }

                        // Now update cached fields carefully based on onboarding state
                        if (!isOnboarding) {
                            await updateUserData(userFB.uid);
                        } else {
                            // Backfill only if empty
                            setEmail(data.email || '');
                            if (!didUserEditSignup.current.name) setName(data.username || '');
                            if (!didUserEditSignup.current.age) setAge(data.age || '');
                            if (!didUserEditSignup.current.gender) setGender(data.gender || '');
                            if (!didUserEditSignup.current.icon) setIcon(data.profileUrl || data.photoURL || '');
                            if (!bio) setBio(data.bio || '');
                        }
                    } catch (e) {
                        console.log('Profile completion check failed', e);
                        setIsAuthenticated(true); // fallback
                        setIsOnboarding(false);
                        await updateUserData(userFB.uid);
                        // Still try to start vibe subscription
                        startVibeSubscription(userFB.uid);
                    }
                } else {
                    // Clear all user-related state safely
                    stopVibeSubscription();
                    cleanupNotifications(); // Cleanup notifications
                    setUser(null);
                    setName('');
                    setEmail('');
                    setAge('');
                    setGender('');
                    setIcon('');
                    setBio('');
                    setIsAuthenticated(false);
                    setIsOnboarding(false);
                    didUserEditSignup.current = { name: false, gender: false, age: false, icon: false };
                    // Clear vibe state
                    setCurrentVibe(null);
                    setSettingVibe(false);
                    setVibeError(null);
                    // Reset coins
                    setCoins(0);
                    setBanhMi(0);
                    // Clear notification state
                    setNotificationToken(null);
                    setNotificationInitialized(false);
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                setIsAuthenticated(false);
                stopVibeSubscription();
                cleanupNotifications(); // Cleanup on error
                setCurrentVibe(null);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            try {
                unsub();
            } catch (error) {
                console.error('Error unsubscribing from auth:', error);
            }
        };
    }, []);

    const updateUserData = async (uid) => {
        if (!uid) {
            console.warn('updateUserData called without uid');
            return;
        }

        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("User data updated:", uid, data);

                // Update user state safely - merge with existing Firebase auth + Firestore data
                setUser((prevUser) => {
                    if (!prevUser) return prevUser;
                    return {
                        ...prevUser,
                        ...data,
                        // Ensure critical fields are preserved
                        uid: prevUser.uid,
                        email: prevUser.email || data.email,
                    };
                });

                // Update individual fields
                if (!isOnboarding) {
                    setName(data.username || '');
                    setEmail(data.email || '');
                    setAge(data.age || '');
                    setGender(data.gender || '');
                    setIcon(data.profileUrl || data.photoURL || '');
                    setBio(data.bio || '');
                } else {
                    // While onboarding, only backfill if not edited
                    if (!didUserEditSignup.current.name) setName(data.username || '');
                    setEmail(data.email || '');
                    if (!didUserEditSignup.current.age) setAge(data.age || '');
                    if (!didUserEditSignup.current.gender) setGender(data.gender || '');
                    if (!didUserEditSignup.current.icon) setIcon(data.profileUrl || data.photoURL || '');
                    if (!bio) setBio(data.bio || '');
                }
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
            const data = docSnap.data();
            const show = data?.showOnlineStatus;
            const finalStatus = show === false ? false : status;
            await updateDoc(docRef, { isOnline: finalStatus });
        } else {
            console.warn(`Document for user ${uid} does not exist.`);
        }
    };

    // Vibe Management Functions
    const setUserVibe = async (vibeId, customMessage = '', location = null) => {
        if (!user?.uid) {
            throw new Error('User not authenticated');
        }

        console.log('🚀 AuthContext: Setting vibe:', { vibeId, customMessage, userId: user.uid });
        setSettingVibe(true);
        setVibeError(null);

        try {
            const result = await vibeService.setUserVibe(user.uid, vibeId, customMessage, location);
            console.log('✅ AuthContext: Vibe set successfully, ID:', result);

            // Update local state immediately
            const selectedVibe = PREDEFINED_VIBES.find(v => v.id === vibeId);
            if (selectedVibe) {
                const newVibe = {
                    id: result,
                    userId: user.uid,
                    vibeId,
                    vibe: selectedVibe,
                    customMessage: customMessage || '',
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    location: location || undefined,
                    isActive: true,
                };
                setCurrentVibe(newVibe);

                // Also update user document with current vibe
                try {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        currentVibe: {
                            id: result,
                            vibeId,
                            vibe: selectedVibe,
                            customMessage: customMessage || '',
                            createdAt: new Date(),
                        }
                    });
                } catch (updateError) {
                    console.warn('Could not update user currentVibe field:', updateError);
                }
            }

            return result;
        } catch (error) {
            console.error('❌ AuthContext: Error setting vibe:', error);
            const errorMessage = error.message || 'Không thể lưu vibe. Vui lòng thử lại!';
            setVibeError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setSettingVibe(false);
        }
    };

    const removeUserVibe = async () => {
        if (!user?.uid || !currentVibe) {
            return;
        }

        setSettingVibe(true);
        setVibeError(null);

        try {
            await vibeService.removeUserVibe(user.uid, currentVibe.id);
            setCurrentVibe(null);

            // Also clear from user document
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    currentVibe: null
                });
            } catch (updateError) {
                console.warn('Could not clear user currentVibe field:', updateError);
            }

            console.log('✅ AuthContext: Vibe removed successfully');
        } catch (error) {
            console.error('❌ AuthContext: Error removing vibe:', error);
            setVibeError(error.message || 'Failed to remove vibe');
            throw error;
        } finally {
            setSettingVibe(false);
        }
    };

    const loadUserVibe = async (uid = null) => {
        const userId = uid || user?.uid;
        if (!userId) return;

        try {
            console.log('🔍 AuthContext: Loading vibe for user:', userId);
            const vibe = await vibeService.getUserCurrentVibe(userId);
            console.log('🔍 AuthContext: Loaded vibe result:', vibe);
            setCurrentVibe(vibe);
            setVibeError(null);
        } catch (error) {
            console.warn('Could not load user vibe:', error);
            setVibeError('Unable to load vibe data');
        }
    };

    const debugVibeData = async () => {
        if (!user?.uid) {
            console.log('❌ Debug: No user logged in');
            return;
        }

        console.log('🔍 Debug: Starting vibe data check for user:', user.uid);

        try {
            // Check vibeService
            const testConnection = await vibeService.testConnection();
            console.log('🔍 Debug: VibeService connection:', testConnection);

            // Try to load current vibe
            const currentVibeData = await vibeService.getUserCurrentVibe(user.uid);
            console.log('🔍 Debug: Current vibe from service:', currentVibeData);

            // Check user document
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log('🔍 Debug: User document currentVibe:', userData.currentVibe);
            }

            // Check userVibes collection
            const userVibesQuery = query(
                collection(db, 'userVibes'),
                where('userId', '==', user.uid),
                limit(5)
            );
            const userVibesSnap = await getDocs(userVibesQuery);
            console.log('🔍 Debug: UserVibes collection count:', userVibesSnap.size);
            userVibesSnap.forEach(doc => {
                console.log('🔍 Debug: UserVibe doc:', doc.id, doc.data());
            });

        } catch (error) {
            console.error('❌ Debug: Error checking vibe data:', error);
        }
    };

    const startVibeSubscription = (uid) => {
        if (!uid || vibeUnsubscribe.current) return;

        console.log('🔄 AuthContext: Starting vibe subscription for user:', uid);

        try {
            const unsubscribe = vibeService.subscribeToUserVibe(uid, (vibe) => {
                console.log('🔔 AuthContext: Vibe subscription update:', vibe);
                setCurrentVibe(vibe);
                setVibeError(null);
            });

            vibeUnsubscribe.current = unsubscribe;
            console.log('✅ AuthContext: Vibe subscription started');
        } catch (error) {
            console.warn('Failed to start vibe subscription:', error);
            setVibeError('Unable to sync vibes in real-time');
            // Fallback to manual loading
            loadUserVibe(uid);
        }
    };

    const stopVibeSubscription = () => {
        if (vibeUnsubscribe.current) {
            vibeUnsubscribe.current();
            vibeUnsubscribe.current = null;
            console.log('🔄 AuthContext: Vibe subscription stopped');
        }
    };

    const login = async (email, password) => {
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            const loggedInUser = response.user;

            await updateIsOnline(loggedInUser.uid, true);
            await updateUserData(loggedInUser.uid);

            return { success: true };
        } catch (error) {
            let msg = error.message;
            if (msg.includes('(auth/invalid-email)')) msg = 'Invalid email';
            if (msg.includes('(auth/wrong-password)')) msg = 'Wrong password';
            if (msg.includes('(auth/user-not-found)')) msg = 'User not found';
            return { success: false, msg };
        }
    };

    // Social login methods
    const loginWithGoogle = async (options = {}) => {
        const { forceChooseAccount = false } = options;
        try {
            const result = await signInWithGoogle(async () => { }, { forceAccountSelection: forceChooseAccount });
            if (result.success) {
                try {
                    const docRef = doc(db, 'users', result.user.uid);
                    const snap = await getDoc(docRef);
                    const data = snap.exists() ? snap.data() : {};
                    const requiredFilled = !!(data.username && data.gender && data.age && (data.profileUrl || data.photoURL));
                    if (data.profileCompleted || requiredFilled) {
                        if (!data.profileCompleted && requiredFilled) {
                            try { await updateDoc(docRef, { profileCompleted: true }); } catch (_e) { }
                        }
                        // Go straight home
                        router.replace('/(tabs)/home');
                    } else {
                        console.log('➡️ Incomplete profile -> onboarding');
                        setSignupType('google');
                        router.replace('/signup/GenderSelectionScreen');
                    }
                } catch (e) { console.log('Profile check error', e); }
            } else if (result.cancelled) {
                console.log('⚠️ User cancelled Google picker');
            }
            return result;
        } catch (error) {
            console.error('Google login error in context:', error);
            return { success: false, message: 'Lỗi khi đăng nhập với Google' };
        }
    };

    // Helper: always force account chooser (use cái này cho nút "Đổi tài khoản Google")
    const loginWithGoogleForceChoose = () => loginWithGoogle({ forceChooseAccount: true });

    const loginWithFacebook = async () => {
        try {
            const result = await signInWithFacebook(async () => { }, { forceAccountSelection: false });
            if (result.success) {
                try {
                    const docRef = doc(db, 'users', result.user.uid);
                    const snap = await getDoc(docRef);
                    const data = snap.exists() ? snap.data() : {};
                    const requiredFilled = !!(data.username && data.gender && data.age && (data.profileUrl || data.photoURL));
                    if (data.profileCompleted || requiredFilled) {
                        if (!data.profileCompleted && requiredFilled) {
                            try { await updateDoc(docRef, { profileCompleted: true }); } catch (_e) { }
                        }
                        router.replace('/(tabs)/home');
                    } else {
                        console.log('➡️ Incomplete profile (FB) -> onboarding');
                        setSignupType('google');
                        router.replace('/signup/GenderSelectionScreen');
                    }
                } catch (e) { console.log('Profile check error', e); }
            }
            return result;
        } catch (error) {
            console.error('Facebook login error in context:', error);
            return { success: false, message: 'Lỗi khi đăng nhập với Facebook' };
        }
    };

    const logout = async (options = {}) => {
        const { forceFullSocial = true } = options; // default: clear Google/Facebook sessions
        try {
            // IMPORTANT: Stop all Firestore listeners FIRST to prevent permission errors
            stopAllListeners();
            cleanupNotifications();

            if (user?.uid) {
                try {
                    await updateIsOnline(user.uid, false);
                } catch (_e) {
                    // Ignore errors if already logged out
                }
            }

            // Clear local state early
            setUser(null);
            setName('');
            setEmail('');
            setAge('');
            setGender('');
            setIcon('');
            setBio('');
            setIsAuthenticated(false);
            setIsOnboarding(false);
            didUserEditSignup.current = { name: false, gender: false, age: false, icon: false };

            // Clear vibe state
            setCurrentVibe(null);
            setSettingVibe(false);
            setVibeError(null);

            if (forceFullSocial) {
                // Uses revokeAccess for Google inside socialAuth
                await signOutFromSocial();
            } else {
                await signOut(auth); // basic firebase only
            }
        } catch (error) {
            console.error('Error logging out:', error);
            setUser(null);
            setIsAuthenticated(false);
            setIsOnboarding(false);
            stopVibeSubscription();
            setCurrentVibe(null);
        }
    };

    // Convenience: logout then guarantee next Google login shows chooser
    const logoutAndForceNextGoogleChooser = async () => {
        await logout({ forceFullSocial: true });
        // Optionally, immediately prompt chooser on next login action by using:
        // loginWithGoogle({ forceChooseAccount: true });
    };

    const cancelRegistration = async (options = {}) => {
        const { deleteAccount = true, navigateTo = '/signin' } = options;
        try {
            const current = auth.currentUser;
            const uid = current?.uid;
            if (!uid) {
                // Nothing on server yet, just clear local and navigate
                clearSignupState();
                setIsAuthenticated(false);
                setIsOnboarding(false);
                try { router.replace(navigateTo); } catch (_e) { }
                return { success: true };
            }

            // Check Firestore profileCompleted flag
            let isTempUser = true;
            try {
                const userRef = doc(db, 'users', uid);
                const snap = await getDoc(userRef);
                const data = snap.exists() ? snap.data() : null;
                isTempUser = !(data && data.profileCompleted === true);
                if (isTempUser && deleteAccount) {
                    try { await deleteDoc(userRef); } catch (_e) { console.log('deleteDoc failed (ok):', _e?.message); }
                }
            } catch (_e) { }

            // Delete auth user if temporary and allowed
            if (isTempUser && deleteAccount && auth.currentUser) {
                try {
                    await deleteUser(auth.currentUser);
                } catch (e) {
                    console.log('deleteUser failed, will fallback to signOut:', e?.message);
                }
            }

            // Always sign out social sessions to reset chooser
            try { await signOutFromSocial(); } catch (_e) { }

            clearSignupState();
            setUser(null);
            setIsAuthenticated(false);
            setIsOnboarding(false);
            try { router.replace(navigateTo); } catch (_e) { }
            return { success: true };
        } catch (error) {
            console.error('cancelRegistration error:', error);
            clearSignupState();
            setUser(null);
            setIsAuthenticated(false);
            setIsOnboarding(false);
            try { router.replace('/signin'); } catch (_e) { }
            return { success: false, error };
        }
    };

    const register = async (emailArg, passwordArg, usernameArg, profileUrlArg, bioArg, ageArg, genderArg, educationLevelArg, universityArg, jobArg) => {
        try {
            // Prefer explicit args, fallback to values gathered during onboarding
            const em = (emailArg || email || '').trim();
            const pw = (passwordArg || password || '').trim();
            if (!em || !pw) {
                return { success: false, msg: 'Missing email or password' };
            }

            // We may not have all fields yet at password step — use what we have
            const usernameFinal = (usernameArg || name || '').trim();
            const profileUrlFinal = (profileUrlArg || icon || '').trim();
            const bioFinal = (bioArg ?? bio ?? '').toString();
            const ageFinal = convertToAge(ageArg ?? age);
            const genderFinal = (genderArg || gender || '').toString();
            const educationLevelFinal = (educationLevelArg || educationLevel || '').toString();
            const universityFinal = (universityArg || university || '').toString();
            const jobFinal = (jobArg || job || '').toString();

            const response = await createUserWithEmailAndPassword(auth, em, pw);
            const uid = response?.user?.uid;
            console.log('got results: ', response?.user);

            await setDoc(doc(db, "users", uid), {
                username: usernameFinal || null,
                profileUrl: profileUrlFinal || null,
                email: em,
                uid,
                bio: bioFinal,
                age: ageFinal || null,
                gender: genderFinal || null,
                educationLevel: educationLevelFinal || null,
                university: universityFinal || null,
                job: jobFinal || null,
                coins: 1000, // initial coin balance set to 1000 Bánh mì
                profileCompleted: Boolean(usernameFinal && genderFinal && ageFinal && profileUrlFinal) || false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Keep Firebase Auth profile in sync so UI using displayName/photoURL sees chosen values
            try {
                if (usernameFinal || profileUrlFinal) {
                    await updateProfile(response.user, {
                        displayName: usernameFinal || response.user.displayName || undefined,
                        photoURL: profileUrlFinal || response.user.photoURL || undefined,
                    });
                }
            } catch (e) {
                console.warn('updateProfile failed (non-fatal):', e?.message);
            }

            return { success: true, data: response?.user };
        } catch (error) {
            let msg = error.message;
            if (msg.includes('(auth/invalid-email)')) msg = 'Invalid email';
            if (msg.includes('(auth/email-already-in-use)')) msg = 'This email is already in use';
            if (msg.includes('(auth/invalid-credential)')) msg = 'Wrong credential';
            if (msg.includes('(auth/weak-password)')) msg = 'Weak password';
            return { success: false, msg };
        }
    };

    const signUpWithEmail = async (email, password) => {
        try {
            const response = await createUserWithEmailAndPassword(auth, email, password);
            const user = response.user;

            // Send verification email
            await sendEmailVerification(user);

            // Create initial user document
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                uid: user.uid,
                profileCompleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                coins: 1000, // Grant initial coins
            });

            return { success: true, user };
        } catch (error) {
            let msg = error.message;
            if (msg.includes('(auth/email-already-in-use)')) msg = 'Email này đã được sử dụng';
            if (msg.includes('(auth/invalid-email)')) msg = 'Email không hợp lệ';
            if (msg.includes('(auth/weak-password)')) msg = 'Mật khẩu quá yếu';
            return { success: false, msg };
        }
    };

    // Wallet helpers
    const getWalletBalance = async () => {
        if (!user?.uid) return 0;
        try {
            const balance = await walletService.getBalance(user.uid);
            setCoins(Number(balance || 0));
            return Number(balance || 0);
        } catch (e) {
            console.warn('getWalletBalance error', e);
            return coins;
        }
    };

    const topupCoins = async (amount, metadata = {}) => {
        if (!user?.uid) throw new Error('Not logged in');
        await walletService.topup(user.uid, Number(amount), metadata);
        // Refresh balance
        const b = await walletService.getBalance(user.uid);
        setCoins(Number(b || 0));
        return b;
    };

    const spendCoins = async (amount, metadata = {}) => {
        if (!user?.uid) throw new Error('Not logged in');
        await walletService.spend(user.uid, Number(amount), metadata);
        const b = await walletService.getBalance(user.uid);
        setCoins(Number(b || 0));
        return b;
    };

    const purchaseWithCoins = async (itemId) => {
        if (!user?.uid) throw new Error('Not logged in');
        await walletService.purchaseItem(user.uid, itemId);
        const b = await walletService.getBalance(user.uid);
        setCoins(Number(b || 0));
        return b;
    };

    // Update user profile (for social login completion)

    const updateUserProfile = async (profileData) => {
        try {
            if (!user?.uid) {
                return { success: false, msg: 'Chưa đăng nhập' };
            }

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                ...profileData,
                updatedAt: new Date(),
            });

            // Update local state
            if (profileData.username) setName(profileData.username);
            if (profileData.gender) setGender(profileData.gender);
            if (profileData.age) setAge(profileData.age);
            if (profileData.profileUrl) setIcon(profileData.profileUrl);
            if (profileData.bio) setBio(profileData.bio);
            if (profileData.educationLevel) setEducationLevel(profileData.educationLevel);
            if (profileData.university) setUniversity(profileData.university);
            if (profileData.job) setJob(profileData.job);

            // If profile is now complete, update auth state
            if (profileData.profileCompleted) {
                setIsAuthenticated(true);
                setIsOnboarding(false);
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating user profile:', error);
            return { success: false, msg: error.message };
        }
    };

    return (

        <AuthContext.Provider value={{
            user, isAuthenticated, login, register, logout, logoutAndForceNextGoogleChooser,
            loginWithGoogle, loginWithGoogleForceChoose, loginWithFacebook,
            gender, setGender,
            name, setName,
            age, setAge,
            email, setEmail,
            icon, setIcon,
            password, setPassword,
            bio, setBio,
            educationLevel, setEducationLevel,
            university, setUniversity,
            job, setJob,
            refreshUser,
            cancelRegistration,
            isOnboarding,
            signupType, setSignupType,
            clearSignupState,
            updateUserProfile,
            // Wallet
            coins,
            banhMi,
            refreshBalance: getWalletBalance,
            getWalletBalance,
            topupCoins,
            spendCoins,
            purchaseWithCoins,
            // Vibe functions
            currentVibe,
            setUserVibe,
            removeUserVibe,
            loadUserVibe,
            settingVibe,
            vibeError,
            debugVibeData,
            // Expo Push Notifications
            notificationToken,
            notificationInitialized,
            // Thêm hàm mới
            updateUserPassword,
            signUpWithEmail,
            activeFrame,
            setActiveFrame,
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
