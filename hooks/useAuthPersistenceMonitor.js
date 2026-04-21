import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

/**
 * Hook để xử lý authentication routing
 * Tự động redirect user dựa trên authentication status
 * Cho phép các màn hình như chat, call screens hoạt động mà không bị redirect
 */
export const useAuthRouting = (isAuthenticated) => {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (typeof isAuthenticated === 'undefined') return;

    const inSignupFlow = segments[0] === 'signup';
    const inApp = segments[0] === '(tabs)';
    const inChat = segments[0] === 'chat';
    const inCallScreens = segments.includes('CallScreen') ||
      segments.includes('IncomingCallScreen') ||
      segments.includes('ListenCallAcceptedScreen');
    const inGroupChat = segments[0] === 'groups';
    const inGroupManagementScreen = segments[0]?.toLowerCase().includes('groupmanagementscreen');
    // Cho phép các màn hình gifts (ví dụ: /gifts/Inbox)
    const inGifts = segments[0] === 'gifts';
    const inAuthenticatedScreens = inApp || inChat || inCallScreens || inGroupChat || inGroupManagementScreen || inGifts ||
      segments.includes('UserProfileScreen') ||
      segments.includes('AddFriend') ||
      segments.includes('explore') ||
      segments.includes('ButtonToChat') ||
      segments.includes('NotificationsScreen') ||
      segments.includes('HotSpotsScreen') ||
      segments.includes('PostDetailScreen') ||
      segments.includes('SimpleNavigationTest') ||
      segments.includes('NotificationNavigationTest') ||
      segments.includes('NotificationDebugScreen') ||
      segments.includes('UserDebugScreen') ||
      segments.includes('HashtagPostsScreen') ||
      segments.includes('HashtagScreen') ||
      segments.includes('VibesScreen') ||
      segments.includes('VibeScreen') ||
      segments.includes('vibes') ||
      segments.includes('SearchMessageScreen') ||
      segments.includes('HotSpotChatScreen') ||
      segments.includes('ProximityRadar') ||
      segments.includes('GroupVoiceRoom') ||
      segments.includes('CoinWalletScreen') ||
      segments.includes('GroupManagementScreen') ||
      segments.includes('HotSpotDetailScreen') ||
      segments.includes('ProUpgradeScreen') ||
      segments.includes('StoreScreen') ||
      segments.includes('ChangePasswordScreen') ||
      segments.includes('ProfileVisitorsScreen') ||
      segments.includes('PrivacySettingsScreen') ||
      segments.includes('CrossingPathsScreen') ||
      segments.includes('subscription');

    console.log('🔐 Auth routing check:', { isAuthenticated, segments });

    // QUAN TRỌNG: Không redirect nếu đang ở call screens
    if (inCallScreens) {
      console.log('🔐 User in call screens, skipping auth routing');
      return;
    }

    if (isAuthenticated === 'pendingProfile') {
      // Force stay in signup onboarding
      if (!inSignupFlow) {
        router.replace('/signup/GenderSelectionScreen');
      }
      return;
    }

    const isIconSelection = segments.includes('IconSelectionScreen');

    if (isAuthenticated && !inAuthenticatedScreens && !isIconSelection) {
      // User đã đăng nhập nhưng không ở trong app screens
      console.log('🔐 Redirecting authenticated user to home');
      router.replace('/(tabs)/home');
    } else if (isAuthenticated === false && inAuthenticatedScreens) {
      // User chưa đăng nhập nhưng đang cố truy cập authenticated screens
      console.log('🔐 Redirecting unauthenticated user to signin');
      router.replace('/signin');
    }
  }, [isAuthenticated, segments, router]);
};

