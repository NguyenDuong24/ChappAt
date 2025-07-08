import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
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
import { ThemeProvider } from '../context/ThemeContext';
import { StateCommonProvider } from '../context/stateCommon';
import { NotificationProvider } from '../context/NotificationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { register } from "@videosdk.live/react-native-sdk";
import { onSnapshot, query, collection, collectionGroup, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as Notifications from 'expo-notifications';
import * as TaskManager from "expo-task-manager";

// Video SDK register (nếu cần)
register();

// Thiết lập Notification handler (chỉ hiển thị thông báo, không phát âm thanh hay badge)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data, error, executionInfo }) => {
    console.log("✅ Received a notification in the background!", {
      data,
      error,
      executionInfo,
    });
    // Do something with the notification data
  }
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
const listenCallAccepted = (callerId, onCaller) => {
  const callsQuery = query(
    collection(db, 'calls'),
    where('callerId', '==', callerId),
    where('status', '==', 'accepted')
  );
  const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        onCaller(change.doc.data());
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
        onCaller(change.doc.data());
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
        onCaller(change.doc.data());
      }
    });
  });
  return unsubscribe;
};

const listenForIncomingCalls = (userId, onCallReceived) => {
  const callsQuery = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    where('status', '==', 'ringing')
  );
  const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        onCallReceived(change.doc.data());
      }
    });
  });
  return unsubscribe;
};

const MainLayout = () => {
  const { isAuthenticated, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [incomingCall, setIncomingCall] = useState(null);
  const currentScreen = segments[segments.length - 1];

  useEffect(() => {

    // Lắng nghe thông báo khi nhận (foreground)
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Received notification:', notification);
    });
    // Lắng nghe khi người dùng nhấn vào thông báo
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response?.notification?.request?.content?.data?.screen;
      if (screen) {
        router.push(screen);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      const userId = user.uid;

      // Lắng nghe cuộc gọi đến
      const unsubscribeCall = listenForIncomingCalls(userId, (callData) => {
        if (callData?.status === 'ringing') {
          setIncomingCall(callData);
          router.push({
            pathname: '/IncomingCallScreen',
            params: {
              meetingId: callData.meetingId,
              callerId: callData.callerId,
              receiverId: callData.receiverId,
              status: callData.status,
              type: callData.type,
            },
          });
        }
      });
      const unsubscribeAccepted = listenCallAccepted(userId, (callData) => {
        if (callData?.status === 'accepted') {
          setIncomingCall(callData);
          router.push({
            pathname: '/CallScreen',
            params: {
              meetingId: callData.meetingId,
              callerId: callData.callerId,
              receiverId: callData.receiverId,
              status: callData.status,
              type: callData.type,
            },
          });
        }
      });
      const unsubscribeRequest = listenRequestCall(userId, (callData) => {
        if (callData?.status === 'ringing') {
          setIncomingCall(callData);
          router.push({
            pathname: '/ListenCallAcceptedScreen',
            params: {
              meetingId: callData.meetingId,
              callerId: callData.callerId,
              receiverId: callData.receiverId,
              status: callData.status,
              type: callData.type,
            },
          });
        }
      });
      const unsubscribeCancel = listencCallerCancelCall(userId, (callData) => {
        if (callData?.status === 'cancel') {
          setIncomingCall(callData);
          if (
            currentScreen === 'IncomingCallScreen' ||
            currentScreen === 'CallScreen'
          ) {
            router.back();
          }
        }
      });

      return () => {
        unsubscribeCall();
        unsubscribeAccepted();
        unsubscribeRequest();
        unsubscribeCancel();
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (typeof isAuthenticated === 'undefined') return;
    const inApp = segments[0] === '(app)';
    if (isAuthenticated && !inApp) {
      router.replace('/home');
    } else if (isAuthenticated === false) {
      router.replace('signin');
    }
  }, [isAuthenticated]);

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
      <Stack.Screen name="ChatScreen" options={{ headerShown: false }} />
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
    <NotificationProvider>
      <AuthContextProvider>
        <StateCommonProvider>
          <ThemeProvider>
            <AppStateProvider>
              <LogoStateProvider>
                <LocationProvider>
                  <PaperProvider>
                    <NavigationContainer>
                      <MainLayout />
                    </NavigationContainer>
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
