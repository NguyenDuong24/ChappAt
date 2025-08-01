import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { ROUTES } from '../constants/Navigation';

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
    
    const inApp = segments[0] === '(tabs)';
    const inChat = segments[0] === 'chat';
    const inAuthenticatedScreens = inApp || inChat || 
      segments.includes('CallScreen') || 
      segments.includes('IncomingCallScreen') || 
      segments.includes('ListenCallAcceptedScreen') ||
      segments.includes('UserProfileScreen') ||
      segments.includes('AddFriend');
    
    if (isAuthenticated && !inAuthenticatedScreens) {
      // User đã đăng nhập nhưng không ở trong app screens
      router.replace(ROUTES.HOME);
    } else if (isAuthenticated === false) {
      // User chưa đăng nhập
      router.replace(ROUTES.SIGNIN);
    }
  }, [isAuthenticated, segments, router]);
};
