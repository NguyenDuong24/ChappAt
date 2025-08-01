import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useContext } from 'react';
import 'react-native-reanimated';
import { AuthContextProvider, useAuth } from '../context/authContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppState } from 'react-native';
import { AppStateProvider } from '../context/AppStateContext';
import { LogoStateProvider } from '../context/LogoStateContext';
import { LocationProvider } from '../context/LocationContext';
import { ThemeProvider, ThemeContext } from '../context/ThemeContext';
import { StateCommonProvider } from '../context/stateCommon';
import { NotificationProvider } from '../context/NotificationContext';
import { UserProvider } from '../context/UserContext'; // Import UserProvider
import { AudioProvider } from '../context/AudioContext'; // Import AudioProvider
import { Colors } from '@/constants/Colors';
import { register } from "@videosdk.live/react-native-sdk";

// Import refactored hooks and services
import { 
  useCallAcceptedListener, 
  useCallRequestListener, 
  useCallCanceledListener, 
  useIncomingCallListener 
} from '../hooks/useCallListeners';
import { useNotificationHandlers, setupNotificationHandler } from '../hooks/useNotificationHandlers';
import { useCallNavigation } from '../hooks/useCallNavigation';
import { useAuthRouting } from '../hooks/useAuthRouting';
import { useSound } from '../hooks/useSound'; // Import useSound hook
import { initializeBackgroundServices } from '../services/backgroundService';
import { ROUTES, CALL_STATUS, SCREEN_NAMES } from '../constants/Navigation';

// Initialize services
register(); // Video SDK register
setupNotificationHandler(); // Setup notification handler
initializeBackgroundServices(); // Initialize background services

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const MainLayout = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [incomingCall, setIncomingCall] = useState(null);

  // Add sound hooks
  const { 
    playIncomingCallSound, 
    playCallAcceptedSound, 
    playCallEndSound,
    stopCallSounds 
  } = useSound();

  // Use refactored hooks
  const { 
    navigateToIncomingCall, 
    navigateToCallScreen, 
    navigateToListenCallAccepted, 
    handleCallCanceled: navigateBackOnCancel,
    currentScreen 
  } = useCallNavigation();
  
  // Setup notification handlers
  useNotificationHandlers();
  
  // Handle authentication routing
  useAuthRouting(isAuthenticated);

  // Call event handlers
  const handleIncomingCall = (callData) => {
    if (callData?.status === CALL_STATUS.RINGING) {
      setIncomingCall(callData);
      playIncomingCallSound(); // Play incoming call sound
      navigateToIncomingCall(callData);
    }
  };

  const handleCallAccepted = (callData) => {
    if (callData?.status === CALL_STATUS.ACCEPTED) {
      setIncomingCall(callData);
      stopCallSounds(); // Stop ring sounds
      playCallAcceptedSound(); // Play accepted sound
      navigateToCallScreen(callData);
    }
  };

  const handleCallRequest = (callData) => {
    if (callData?.status === CALL_STATUS.RINGING) {
      setIncomingCall(callData);
      navigateToListenCallAccepted(callData);
    }
  };

  const handleCallCanceled = (callData) => {
    if (callData?.status === CALL_STATUS.CANCELLED) {
      setIncomingCall(callData);
      stopCallSounds(); // Stop all call sounds
      playCallEndSound(); // Play call end sound
      if (
        currentScreen === SCREEN_NAMES.INCOMING_CALL_SCREEN ||
        currentScreen === SCREEN_NAMES.CALL_SCREEN
      ) {
        navigateBackOnCancel();
      }
    }
  };

  // Setup call listeners
  const userId = user?.uid;
  useIncomingCallListener(userId, handleIncomingCall);
  useCallAcceptedListener(userId, handleCallAccepted);
  useCallRequestListener(userId, handleCallRequest);
  useCallCanceledListener(userId, handleCallCanceled);

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
      <Stack.Screen name="AddFriend" options={{ headerShown: false }} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <NotificationProvider>
      <AuthContextProvider>
        <StateCommonProvider>
          <ThemeProvider>
            <AppStateProvider>
              <LogoStateProvider>
                <LocationProvider>
                  <PaperProvider>
                    <AudioProvider> {/* Add AudioProvider */}
                      <UserProvider> {/* Wrap with UserProvider */}
                        <MainLayout />
                      </UserProvider>
                    </AudioProvider>
                  </PaperProvider>
                </LocationProvider>
              </LogoStateProvider>
            </AppStateProvider>
          </ThemeProvider>
        </StateCommonProvider>
      </AuthContextProvider>
    </NotificationProvider>
  );
}
