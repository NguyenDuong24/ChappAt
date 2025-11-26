import '../polyfills';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useContext, useCallback } from 'react';
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

// Import Firebase call services
import { useFirebaseCallListener } from '../hooks/useFirebaseCallListener';
import { useCallNavigation } from '../hooks/useNewCallNavigation';
import { useAuthRouting } from '../hooks/useAuthRouting';
import { CALL_STATUS } from '../services/firebaseCallService';

// Import sound hook for local sound playback
import { useSound } from '../hooks/useSound';

// Import call timeout service
import callTimeoutService from '../services/callTimeoutService.js';

// VideoSDK token - trong production, store trong environment variables
const VIDEOSDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI5OWY1MWM0YS1mNWVjLTRkMzUtOTZjYy0zZWE1NDNmNWNiMGYiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTczNDQ5MjA2NCwiZXhwIjoxODUwNDA0MDY0fQ.1b9RFFR2c5KWV5DFJ2XH1K6CwRTBBuNPBcWqKnGhSag";

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
    const hideSplashScreen = async () => {
      if (fontsLoaded) {
        try {
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
    return null;
  }

  // Call navigation hooks
  const {
    navigateToListenCallScreen,
    navigateToIncomingCallScreen,
    navigateToCallScreen,
    navigateBack,
    currentScreen
  } = useCallNavigation();

  // Xác định user role dựa trên callerId và receiverId
  const getUserRole = useCallback((callData) => {
    if (!user?.uid || !callData) return null;

    if (callData.callerId === user.uid) {
      return 'caller'; // Tôi là người GỌI
    } else if (callData.receiverId === user.uid) {
      return 'receiver'; // Tôi là người NHẬN
    }

    return null;
  }, [user?.uid]);

  // Handle incoming call và call status changes
  const handleCallUpdate = useCallback(async (callData) => {
    if (!fontsLoaded) {
      console.log('Layout not ready, skipping call update');
      return;
    }

    if (!callData || !user?.uid) {
      return;
    }

    const userRole = getUserRole(callData);

    // Xử lý theo role và status, với check currentScreen để tránh navigate loop
    if (userRole === 'receiver') {
      // TÔI LÀ NGƯỜI NHẬN CUỘC GỌI
      switch (callData.status) {
        case CALL_STATUS.RINGING:
          if (currentScreen !== 'incoming') {
            // Có cuộc gọi đến → hiển thị IncomingCallScreen để accept/decline
            navigateToIncomingCallScreen(callData);

            // DỪNG TIMEOUT vì user đã thấy notification và vào màn hình
            callTimeoutService.stopCallTimeout(callData.id);

            // Chỉ phát âm thanh nếu app đang foreground (push notification đã được gửi từ firebaseCallService)
            try {
              await playIncomingCallSound();
              console.log('🔔 Playing incoming call sound');
            } catch (error) {
              console.error('❌ Error playing call sound:', error);
            }
          }
          break;

        case CALL_STATUS.ACCEPTED:
          if (currentScreen !== 'call') {
            // Tôi đã accept call → vào CallScreen
            navigateToCallScreen(callData);
          }
          break;

        case CALL_STATUS.DECLINED:
        case CALL_STATUS.CANCELLED:
        case CALL_STATUS.ENDED:
          if (currentScreen !== 'home') {
            // Call kết thúc → navigate back và dừng âm thanh
            navigateBack();

            // Dừng âm thanh cuộc gọi nếu đang phát
            try {
              await stopCallSounds();
              console.log('🔇 Stopped call sounds for ended call');
            } catch (error) {
              console.error('❌ Error stopping call sounds:', error);
            }
          }
          break;
      }
    } else if (userRole === 'caller') {
      // TÔI LÀ NGƯỜI GỌI
      switch (callData.status) {
        case CALL_STATUS.RINGING:
          if (currentScreen !== 'listen') {
            // Tôi đã gọi và đang chờ → hiển thị ListenCallAcceptedScreen
            navigateToListenCallScreen(callData);

            // DỪNG TIMEOUT vì caller đã thấy trạng thái chờ
            callTimeoutService.stopCallTimeout(callData.id);
          }
          break;

        case CALL_STATUS.ACCEPTED:
          if (currentScreen !== 'call') {
            // Người kia accept → cả 2 vào CallScreen
            navigateToCallScreen(callData);
          }
          break;

        case CALL_STATUS.DECLINED:
        case CALL_STATUS.CANCELLED:
        case CALL_STATUS.ENDED:
          if (currentScreen !== 'home') {
            // Call bị từ chối hoặc kết thúc → navigate back và dừng âm thanh
            navigateBack();

            // Dừng âm thanh cuộc gọi nếu đang phát
            try {
              await stopCallSounds();
              console.log('🔇 Stopped call sounds for ended call (caller)');
            } catch (error) {
              console.error('❌ Error stopping call sounds:', error);
            }
          }
          break;
      }
    } else {
    }
  }, [getUserRole, navigateToIncomingCallScreen, navigateToListenCallScreen, navigateToCallScreen, navigateBack, user?.uid, playIncomingCallSound, stopCallSounds, currentScreen]);

  // Setup Firebase call listener với unified handler
  useFirebaseCallListener(handleCallUpdate, handleCallUpdate);

  // Handle authentication routing with call screen protection
  useAuthRouting(isAuthenticated);

  return (
    <>
      <ThemedStatusBar translucent />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="UserProfileScreen" options={{ headerShown: false }} />
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
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        {/* Đặt AuthContextProvider bên ngoài để NotificationProvider có thể dùng useAuth */}
        <AuthContextProvider>
          <AudioProvider>
            <VideoCallProvider>
              <NotificationProvider>
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
              </NotificationProvider>
            </VideoCallProvider>
          </AudioProvider>
        </AuthContextProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}