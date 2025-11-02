import '../polyfills';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
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
import { NotificationProvider } from '../services/core';
import { UserProvider } from '../context/UserContext';
import { AudioProvider } from '../context/AudioContext';
import contentModerationService from '@/services/contentModerationService';
import Constants from 'expo-constants';
import { VideoCallProvider } from '../context/VideoCallContext';
import { Colors } from '../constants/Colors';
import { register, VideoSDKProvider } from "@videosdk.live/react-native-sdk";

// Import Firebase call services
import { useFirebaseCallListener } from '../hooks/useFirebaseCallListener';
import { useCallNavigation } from '../hooks/useNewCallNavigation';
import { useAuthRouting } from '../hooks/useAuthRouting';
import { CALL_STATUS } from '../services/firebaseCallService';

// VideoSDK token - trong production, store trong environment variables
const VIDEOSDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI5OWY1MWM0YS1mNWVjLTRkMzUtOTZjYy0zZWE1NDNmNWNiMGYiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTczNDQ5MjA2NCwiZXhwIjoxODUwNDA0MDY0fQ.1b9RFFR2c5KWV5DFJ2XH1K6CwRTBBuNPBcWqKnGhSag";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const MainLayout = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
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
  const handleCallUpdate = useCallback((callData) => {
    if (!callData || !user?.uid) {
      return;
    }

    const userRole = getUserRole(callData);

    // Xử lý theo role và status
    if (userRole === 'receiver') {
      // TÔI LÀ NGƯỜI NHẬN CUỘC GỌI
      switch (callData.status) {
        case CALL_STATUS.RINGING:
          // Có cuộc gọi đến → hiển thị IncomingCallScreen để accept/decline
          navigateToIncomingCallScreen(callData);
          break;
          
        case CALL_STATUS.ACCEPTED:
          // Tôi đã accept call → vào CallScreen
          navigateToCallScreen(callData);
          break;
          
        case CALL_STATUS.DECLINED:
        case CALL_STATUS.CANCELLED:
        case CALL_STATUS.ENDED:
          // Call kết thúc → navigate back
          navigateBack();
          break;
      }
    } else if (userRole === 'caller') {
      // TÔI LÀ NGƯỜI GỌI
      switch (callData.status) {
        case CALL_STATUS.RINGING:
          // Tôi đã gọi và đang chờ → hiển thị ListenCallAcceptedScreen
          navigateToListenCallScreen(callData);
          break;
          
        case CALL_STATUS.ACCEPTED:
          // Người kia accept → cả 2 vào CallScreen
          navigateToCallScreen(callData);
          break;
          
        case CALL_STATUS.DECLINED:
        case CALL_STATUS.CANCELLED:
        case CALL_STATUS.ENDED:
          // Call bị từ chối hoặc kết thúc → navigate back
          navigateBack();
          break;
      }
    } else {
    }
  }, [getUserRole, navigateToIncomingCallScreen, navigateToListenCallScreen, navigateToCallScreen, navigateBack, user?.uid]);

  // Setup Firebase call listener với unified handler
  useFirebaseCallListener(handleCallUpdate, handleCallUpdate);

  // Handle authentication routing with call screen protection
  useAuthRouting(isAuthenticated);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="TestScreen" options={{ headerShown: false }} />
      <Stack.Screen name="signin" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="groups/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="explore/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="ButtonToChat" options={{ headerShown: false }} />
      <Stack.Screen name="IncomingCallScreen" options={{ headerShown: false }} />
      <Stack.Screen name="ListenCallAcceptedScreen" options={{ headerShown: false }} />
      <Stack.Screen name="CallScreen" options={{ headerShown: false }} />
      <Stack.Screen name="NavigationTestScreen" options={{ headerShown: false }} />
      <Stack.Screen name="NotificationsScreen" options={{ headerShown: false }} />
      <Stack.Screen name="NotificationDebugScreen" options={{ headerShown: false }} />
      <Stack.Screen name="QuickNotificationTest" options={{ headerShown: false }} />
      <Stack.Screen name="TokenTestScreen" options={{ headerShown: false }} />
      <Stack.Screen name="NotificationNavigationTest" options={{ headerShown: false }} />
      <Stack.Screen name="UserDebugScreen" options={{ headerShown: false }} />
      <Stack.Screen name="HotSpotsScreen" options={{ headerShown: false }} />
      <Stack.Screen name="HashtagScreen" options={{ headerShown: false }} />
      <Stack.Screen name="AdminHashtagScreen" options={{ headerShown: false }} />
      <Stack.Screen name="HashtagPostsScreen" options={{ headerShown: false }} />
      <Stack.Screen name="DeviceScan" options={{ headerShown: false }} />
      <Stack.Screen name="AddFriend" options={{ headerShown: false }} />
      <Stack.Screen name="GroupManagementScreen" options={{ headerShown: false }} />
      <Stack.Screen name="SearchMessageScreen" options={{ headerShown: false }} />
      <Stack.Screen name="PostDetailScreen" options={{ }} />
      <Stack.Screen name="HotSpotDetailScreen" options={{ headerShown: false }} />
      <Stack.Screen name="HotSpotChatScreen" options={{ headerShown: false }} />
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
    </Stack>
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

  // Call initVideoSDK on component mount
  React.useEffect(() => {
    initVideoSDK();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Đặt AuthContextProvider bên ngoài để NotificationProvider có thể dùng useAuth */}
      <AuthContextProvider>
        <NotificationProvider>
          <StateCommonProvider>
            <ThemeProvider>
              <AppStateProvider>
                <LogoStateProvider>
                  <LocationProvider>
                    <PaperProvider>
                      <AudioProvider>
                        <VideoCallProvider>
                          <UserProvider>
                            <MainLayout />
                          </UserProvider>
                        </VideoCallProvider>
                      </AudioProvider>
                    </PaperProvider>
                  </LocationProvider>
                </LogoStateProvider>
              </AppStateProvider>
            </ThemeProvider>
          </StateCommonProvider>
        </NotificationProvider>
      </AuthContextProvider>
    </GestureHandlerRootView>
  );
}