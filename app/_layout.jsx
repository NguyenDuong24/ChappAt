import '../polyfills';
import '../src/localization/i18n';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthContextProvider, useAuth } from '../context/authContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppState } from 'react-native';
import { AppStateProvider } from '../context/AppStateContext';
import { LogoStateProvider } from '../context/LogoStateContext';
import { LocationProvider } from '../context/LocationContext';
import { ThemeProvider, ThemeContext } from '../context/ThemeContext';
import { StateCommonProvider } from '../context/stateCommon';
import { NotificationProvider } from '../context/NotificationProvider';
import { UserProvider } from '../context/UserContext';
import { AudioProvider } from '../context/AudioContext';
import contentModerationService from '@/services/contentModerationService';
import Constants from 'expo-constants';
import { VideoCallProvider } from '../context/VideoCallContext';
import { Colors } from '../constants/Colors';
import { register } from "@videosdk.live/react-native-sdk";
import ThemedStatusBar from '@/components/common/ThemedStatusBar';
import InterstitialAdManager from '@/components/ads/InterstitialAdManager';

// Import call timeout service
import callTimeoutService from '../services/callTimeoutService.js';
import CallLogicHandler from '../components/call/CallLogicHandler';

// Import server warmup service
import serverWarmupService from '../services/serverWarmupService';

// Import auth routing hook
import { useAuthRouting } from '../hooks/useAuthRouting';
import { useSound } from '../hooks/useSound';

// VideoSDK token - trong production, store trong environment variables
const VIDEOSDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI5OWY1MWM0YS1mNWVjLTRkMzUtOTZjYy0zZWE1NDNmNWNiMG YiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTczNDQ5MjA2NCwiZXhwIjoxODUwNDA0MDY0fQ.1b9RFFR2c5KWV5DF2XH1K6CwRTBBuNPBcWqKnGhSag";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const MainLayout = () => {
    const { isAuthenticated, user } = useAuth();
    const themeCtx = useContext(ThemeContext);
    const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
    const { playIncomingCallSound, stopCallSounds } = useSound();

    // Add font loading state
    const [fontsLoaded] = useFonts({
        // Add any custom fonts here if needed
    });

    // Handle splash screen hiding
    useEffect(() => {
        console.log('📊 MainLayout: fontsLoaded =', fontsLoaded);
        const hideSplashScreen = async () => {
            if (fontsLoaded) {
                try {
                    console.log('🚀 Hiding splash screen...');
                    await SplashScreen.hideAsync();
                } catch (error) {
                    console.warn('SplashScreen hide error:', error);
                }
            }
        };

        hideSplashScreen();
    }, [fontsLoaded]);

    // Don't render anything until fonts are loaded
    if (!fontsLoaded) {
        console.log('⌛ Waiting for fonts to load...');
        return null;
    }

    // Handle authentication routing with call screen protection
    useAuthRouting(isAuthenticated);

    return (
        <>
            <ThemedStatusBar translucent />
            <InterstitialAdManager />
            <CallLogicHandler />
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: 200,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                    freezeOnBlur: true,
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="(screens)/user/UserProfileScreen" />
                <Stack.Screen name="(screens)/user/ProfileEditScreen" />
                <Stack.Screen name="(screens)/user/PrivacySettingsScreen" />
                <Stack.Screen name="(screens)/user/ChangePasswordScreen" />
                <Stack.Screen name="(screens)/call/CallScreen" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="(screens)/call/IncomingCallScreen" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="(screens)/call/ListenCallAcceptedScreen" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="(screens)/social/PostDetailScreen" />
                <Stack.Screen name="(screens)/social/HashtagScreen" />
                <Stack.Screen name="(screens)/social/NotificationsScreen" />
                <Stack.Screen name="(screens)/social/CrossingPathsScreen" />
                <Stack.Screen name="(screens)/wallet/CoinWalletScreen" />
                <Stack.Screen name="(screens)/hotspots/HotSpotsScreen" />
                <Stack.Screen name="(screens)/hotspots/HotSpotDetailScreen" />
                <Stack.Screen name="(screens)/hotspots/HotSpotChatScreen" />
                <Stack.Screen name="(screens)/groups/GroupManagementScreen" />
                <Stack.Screen name="(screens)/groups/GroupVoiceRoom" />
                <Stack.Screen name="(screens)/store/StoreScreen" />
                <Stack.Screen name="(screens)/user/VibeScreen" />
            </Stack>
        </>
    );
};

export default function RootLayout() {
    // Initialize VideoSDK
    const initVideoSDK = () => {
        try {
            register();
        } catch (error) {
            console.error('❌ VideoSDK registration failed:', error);
        }
    };

    // Initialize call timeout service
    const initCallTimeoutService = () => {
        try {
            // Guard against undefined import
            if (callTimeoutService && typeof callTimeoutService.initialize === 'function') {
                console.log('⏰ callTimeoutService is available, initializing...');
                callTimeoutService.initialize();
            } else {
                console.error('❌ callTimeoutService is undefined or missing initialize():', callTimeoutService);
            }
        } catch (error) {
            console.error('❌ Call timeout service initialization failed:', error);
        }
    };

    // Call init functions on component mount
    React.useEffect(() => {
        initVideoSDK();
        initCallTimeoutService();

        // Initialize server warmup to prevent cold starts
        console.log('🔥 Initializing server warmup service...');
        serverWarmupService.initialize();

        // Cleanup on unmount
        return () => {
            serverWarmupService.cleanup();
        };
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StateCommonProvider>
                <UserProvider>
                    {/* Đặt AuthContextProvider bên ngoài để NotificationProvider có thể dùng useAuth */}
                    <AuthContextProvider>
                        <AudioProvider>
                            <VideoCallProvider>
                                <NotificationProvider>
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
                                </NotificationProvider>
                            </VideoCallProvider>
                        </AudioProvider>
                    </AuthContextProvider>
                </UserProvider>
            </StateCommonProvider>
        </GestureHandlerRootView>
    );
}