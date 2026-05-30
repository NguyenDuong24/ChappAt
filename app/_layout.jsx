import "../polyfills";

import "../src/localization/i18n";

import { DarkTheme, DefaultTheme } from "@react-navigation/native";

import { useFonts } from "expo-font";

import { Slot, useRouter, useSegments, Stack } from "expo-router";

import * as SplashScreen from "expo-splash-screen";

import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from "react";

import "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthContextProvider, useAuth } from "../context/authContext";

import { Provider as PaperProvider } from "react-native-paper";

import { InteractionManager } from "react-native";

import { AppStateProvider } from "../context/AppStateContext";

import { LogoStateProvider } from "../context/LogoStateContext";

import { LocationProvider } from "../context/LocationContext";

import { ThemeProvider, ThemeContext } from "../context/ThemeContext";

import { StateCommonProvider } from "../context/stateCommon";

import { NotificationProvider } from "../context/NotificationProvider";

import { UserProvider } from "../context/UserContext";

import { AudioProvider } from "../context/AudioContext";

import { VideoCallProvider } from "../context/VideoCallContext";

import { Colors } from "../constants/Colors";

import ThemedStatusBar from "@/components/common/ThemedStatusBar";

import InterstitialAdManager from "@/components/ads/InterstitialAdManager";

import {
  LiquidGlassBackground,
  getLiquidPaperTheme,
} from "@/components/liquid";

import {
  setupNearbyNotificationChannel,
  configureNearbyNotifications,
} from "@/services/nearbyNotifications";

// Import call timeout service

import CallLogicHandler from "../components/call/CallLogicHandler";

// Import server warmup service

import serverWarmupService from "../services/serverWarmupService";

// Import auth routing hook

import { useAuthRouting } from "../hooks/useAuthRouting";

import { useSound } from "../hooks/useSound";

import AnimatedSplashScreen from "../components/common/AnimatedSplashScreen";

import { GlobalErrorBoundary } from "../components/common/GlobalErrorBoundary";

// Prevent the splash screen from auto-hiding before asset loading is complete.

SplashScreen.preventAutoHideAsync();

const MainLayout = () => {
  const { isAuthenticated, user } = useAuth();

  const themeCtx = useContext(ThemeContext);

  const theme =
    themeCtx && typeof themeCtx === "object" && "theme" in themeCtx
      ? themeCtx.theme
      : "light";

  const currentThemeColors = Colors[theme] || Colors.light;

  const { playIncomingCallSound, stopCallSounds } = useSound();

  // Add font loading state

  const [fontsLoaded] = useFonts({
    // Add any custom fonts here if needed
  });

  const [canMountNonCriticalServices, setCanMountNonCriticalServices] =
    useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  // Handle splash screen hiding

  useEffect(() => {
    console.log("ðŸ“Š MainLayout: fontsLoaded =", fontsLoaded);

    const hideSplashScreen = async () => {
      if (fontsLoaded) {
        try {
          console.log("ðŸš€ Hiding splash screen...");

          await SplashScreen.hideAsync();
        } catch (error) {
          console.warn("SplashScreen hide error:", error);
        }
      }
    };

    hideSplashScreen();
  }, [fontsLoaded]);

  // Handle authentication routing with call screen protection

  useAuthRouting(isAuthenticated);

  // Setup Nearby notification channel & listener

  const router = useRouter();

  useEffect(() => {
    setupNearbyNotificationChannel();

    const cleanup = configureNearbyNotifications(() => {
      router.push("/nearby-match");
    });

    return cleanup;
  }, []);

  // Initialize IAP (Google Play Billing / Apple IAP)

  useEffect(() => {
    const startupTask = InteractionManager.runAfterInteractions(() => {
      setCanMountNonCriticalServices(true);

      import("../services/unifiedPaymentService")
        .then(({ unifiedPaymentService }) => unifiedPaymentService.initialize())
        .catch((err) => {
          console.warn("[IAP] Init warning (non-fatal):", err?.message);
        });
    });

    return () => startupTask.cancel?.();
  }, []);

  // Don't render anything until fonts are loaded

  if (!fontsLoaded) {
    console.log("âŒ› Waiting for fonts to load...");

    return null;
  }

  return (
    <>
      <ThemedStatusBar translucent />

      {canMountNonCriticalServices ? <InterstitialAdManager /> : null}

      {canMountNonCriticalServices ? <CallLogicHandler /> : null}

      <LiquidGlassBackground themeMode={theme}>
        <Stack
          screenOptions={{
            headerShown: false,

            animation: "slide_from_right",

            animationDuration: 200,

            gestureEnabled: true,

            fullScreenGestureEnabled: true,

            freezeOnBlur: true,

            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false, animation: "fade" }}
          />

          <Stack.Screen
            name="nearby-match"
            options={{ headerShown: false, animation: "slide_from_bottom" }}
          />

          <Stack.Screen name="(screens)/user/UserProfileScreen" />

          <Stack.Screen name="(screens)/user/ProfileEditScreen" />

          <Stack.Screen name="(screens)/user/PrivacySettingsScreen" />

          <Stack.Screen name="(screens)/user/ChangePasswordScreen" />

          <Stack.Screen name="(screens)/user/NotificationSettingsScreen" />

          <Stack.Screen name="(screens)/user/SoundSettingsScreen" />

          <Stack.Screen
            name="(screens)/user/BlockedUsersScreen"
            options={{ animation: "slide_from_right" }}
          />

          <Stack.Screen
            name="(screens)/call/CallScreen"
            options={{ animation: "fade", gestureEnabled: false }}
          />

          <Stack.Screen
            name="(screens)/call/IncomingCallScreen"
            options={{ animation: "fade", gestureEnabled: false }}
          />

          <Stack.Screen
            name="(screens)/call/ListenCallAcceptedScreen"
            options={{ animation: "fade", gestureEnabled: false }}
          />

          <Stack.Screen name="(screens)/social/PostDetailScreen" />

          <Stack.Screen name="(screens)/social/HashtagScreen" />

          <Stack.Screen name="(screens)/social/NotificationsScreen" />

          <Stack.Screen name="(screens)/social/CrossingPathsScreen" />

          <Stack.Screen name="(screens)/wallet/CoinWalletScreen" />

          <Stack.Screen name="(screens)/hotspots/HotSpotsScreen" />

          <Stack.Screen name="(screens)/hotspots/HotSpotDetailScreen" />

          <Stack.Screen name="(screens)/hotspots/HotSpotChatScreen" />

          <Stack.Screen name="(screens)/groups/GroupVoiceRoom" />

          <Stack.Screen name="(screens)/store/StoreScreen" />

          <Stack.Screen name="(screens)/user/VibeScreen" />
          </Stack>
        </LiquidGlassBackground>
      {showAnimatedSplash ? (
        <AnimatedSplashScreen
          isReady={fontsLoaded}
          onAnimationComplete={() => setShowAnimatedSplash(false)}
        />
      ) : null}
    </>
  );
};

const ThemedPaperProvider = ({ children }) => {
  const themeCtx = useContext(ThemeContext);

  const theme =
    themeCtx && typeof themeCtx === "object" && "theme" in themeCtx
      ? themeCtx.theme
      : "light";

  const paperTheme = useMemo(() => getLiquidPaperTheme(theme), [theme]);

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
};

export default function RootLayout() {
  // Initialize VideoSDK lazily so native SDK setup does not block first render.

  const initVideoSDK = async () => {
    try {
      const { register } = await import("@videosdk.live/react-native-sdk");

      register();
    } catch (error) {
      console.error("VideoSDK registration failed:", error);
    }
  };

  // Initialize call timeout service lazily so notification/native modules do not block first render.

  const initCallTimeoutService = async () => {
    try {
      const module = await import("../services/callTimeoutService.js");

      const service = module.default;

      if (service && typeof service.initialize === "function") {
        service.initialize();
      } else {
        console.error("Call timeout service is missing initialize():", service);
      }
    } catch (error) {
      console.error("Call timeout service initialization failed:", error);
    }
  };

  // Defer non-visual startup work until after initial interactions finish.

  React.useEffect(() => {
    initVideoSDK();

    initCallTimeoutService();

    const startupTask = InteractionManager.runAfterInteractions(() => {
      import("@/services/AdService")

        .then(({ initializeAdMob }) => initializeAdMob())

        .catch((err) => console.warn("[AdMob] Init warning:", err?.message));

      serverWarmupService.initialize();
    });

    return () => {
      startupTask.cancel?.();

      serverWarmupService.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StateCommonProvider>
        <UserProvider>
          {/* Äáº·t AuthContextProvider bÃªn ngoÃ i Ä‘á»ƒ NotificationProvider cÃ³ thá»ƒ dÃ¹ng useAuth */}

          <AuthContextProvider>
            <AudioProvider>
              <VideoCallProvider>
                <NotificationProvider>
                  <ThemeProvider>
                    <AppStateProvider>
                      <LogoStateProvider>
                        <LocationProvider>
                          <ThemedPaperProvider>
                            <MainLayout />
                          </ThemedPaperProvider>
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
