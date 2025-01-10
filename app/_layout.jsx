import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useContext } from 'react';
import 'react-native-reanimated';
import { AuthContextProvider, useAuth } from '../context/authContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppState, Text, View, Button } from 'react-native';
import { AppStateProvider } from '../context/AppStateContext';
import { LogoStateProvider } from '../context/LogoStateContext';
import { LocationProvider } from '../context/LocationContext';
import { ThemeProvider } from '../context/ThemeContext'; 
import { StateCommonProvider } from '../context/stateCommon';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { register } from "@videosdk.live/react-native-sdk";
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

register();

const MainLayout = () => {
    const { isAuthenticated, user } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const { theme } = useContext(ThemeContext);
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
    const [incomingCall, setIncomingCall] = useState(null);

    const currentScreen = segments[segments.length - 1];

    const listenCallAccepted = (callerId, onCaller) => {
        const callsQuery = query(
            collection(db, 'calls'),
            where('callerId', '==', callerId),
            where('status', '==', 'accepted')
        );

        const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    onCaller(callData);
                }
            });
        });

        return unsubscribe;
    };

    const listenRequestCall = (callerId, onCaller) => {
        const callsQuery = query(
            collection(db, 'calls'),
            where('callerId', '==', callerId),
            where('status', '==', 'ringing')
        );

        const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    onCaller(callData);
                }
            });
        });

        return unsubscribe;
    };

    const listencCallerCancelCall = (receiverId, onCaller) => {
        
        const callsQuery = query(
            collection(db, 'calls'),
            where('receiverId', '==', receiverId),
            where('status', '==', 'cancel')
        );

        const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    onCaller(callData);
                }
            });
        });

        return unsubscribe;
    };

    // Hàm lắng nghe cuộc gọi đến
    const listenForIncomingCalls = (userId, onCallReceived) => {
        const callsQuery = query(
            collection(db, 'calls'),
            where('receiverId', '==', userId),
            where('status', '==', 'ringing')
        );

        const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    onCallReceived(callData);
                }
            });
        });

        return unsubscribe;
    };

    useEffect(() => {
  
        if(isAuthenticated){
            const userId = user?.uid;
        const unsubscribe = listenForIncomingCalls(userId, (callData) => {
            if (callData?.status === 'ringing') {
                setIncomingCall(callData);
                router.push({
                    pathname: '/IncomingCallScreen',
                    params: { meetingId: callData?.meetingId, callerId: callData?.callerId, receiverId: callData?.receiverId,status: callData?.meetingId },
                });
            }
        });

        const unsubscribe1 = listenCallAccepted(userId, (callData) => {
            if (callData?.status === 'accepted') {
                setIncomingCall(callData);
                router.push({
                    pathname: '/CallScreen',
                    params: { meetingId: callData?.meetingId, callerId: callData?.callerId, receiverId: callData?.receiverId,status: callData?.meetingId },
                });
            }
        });

        const unsubscribe2 = listenRequestCall(userId, (callData) => {
            if (callData?.status === 'ringing') {
                console.log(1234)
                setIncomingCall(callData);
                router.push({
                    pathname: '/ListenCallAcceptedScreen',
                    params: { meetingId: callData?.meetingId, callerId: callData?.callerId, receiverId: callData?.receiverId,status: callData?.meetingId },
                });
            }
        });

        const unsubscribe3 = listencCallerCancelCall(userId, (callData) => {
            if (callData?.status === 'cancel') {
                setIncomingCall(callData);
                console.log(currentScreen)
                if (currentScreen === 'IncomingCallScreen'||currentScreen === 'CallScreen') {
                    router.back();
                }
            }
        });

        return () => {
            unsubscribe();
            unsubscribe1();
            unsubscribe2();
            unsubscribe3();
        }
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (typeof isAuthenticated === 'undefined') return;
        const inApp = segments[0] === '(app)';
        if (isAuthenticated && !inApp) {
            router.replace('/home');
        } else if (isAuthenticated === false) {
            router.replace('signin');
        }
    }, [isAuthenticated]);

    // Thay đổi giao diện dựa trên trạng thái incomingCall

    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen 
                name="UserProfileScreen" 
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: currentThemeColors.backgroundHeader },
                    headerTintColor: currentThemeColors.text,
                    headerTitleStyle: { fontWeight: 'bold' },
                    title: 'Hồ Sơ',
                }} 
            />
            <Stack.Screen name="IncomingCallScreen" options={{ headerShown: false }} />
            <Stack.Screen name="CallScreen" options={{ headerShown: false }} />
            <Stack.Screen name="ListenCallAcceptedScreen" options={{ headerShown: false }} />
        </Stack>
    );
};


export default function RootLayout() {

    const [appState, setAppState] = useState(AppState.currentState);
    useEffect(() => {
        const subscription = AppState.addEventListener("change", nextAppState => {
            setAppState(nextAppState);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return (
        <AuthContextProvider>
            <StateCommonProvider>
            <ThemeProvider>
          <AppStateProvider>
            
            <LogoStateProvider>
            <LocationProvider>
            <PaperProvider>
                <MainLayout />
            </PaperProvider>
            </LocationProvider>
            </LogoStateProvider>
            
          </AppStateProvider>
          </ThemeProvider>
          </StateCommonProvider>
        </AuthContextProvider>
    );
}
