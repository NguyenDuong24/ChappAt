import { useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';

/**
 * Hook để xử lý navigation cho các loại cuộc gọi khác nhau
 */
export const useCallNavigation = () => {
  const router = useRouter();
  const segments = useSegments();
  const currentScreen = segments[segments.length - 1];

  /**
   * Navigate đến màn hình ListenCallScreen (người gọi chờ)
   */
  const navigateToListenCallScreen = useCallback((callData) => {
    console.log('🚀 Navigating to ListenCallScreen:', callData);
    router.push({
      pathname: '/ListenCallAcceptedScreen',
      params: {
        callId: callData.id,
        meetingId: callData.meetingId,
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.type,
        status: callData.status
      }
    });
  }, [router]);

  /**
   * Navigate đến màn hình IncomingCallScreen (người nhận call)
   */
  const navigateToIncomingCallScreen = useCallback((callData) => {
    console.log('🚀 Navigating to IncomingCallScreen:', callData);
    router.push({
      pathname: '/IncomingCallScreen',
      params: {
        callId: callData.id,
        meetingId: callData.meetingId,
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.type,
        status: callData.status
      }
    });
  }, [router]);

  /**
   * Navigate đến màn hình CallScreen (cả 2 người vào call)
   */
  const navigateToCallScreen = useCallback((callData) => {
    console.log('🚀 Navigating to CallScreen:', callData);
    router.push({
      pathname: '/CallScreen',
      params: {
        meetingId: callData.meetingId,
        callType: callData.type,
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callId: callData.id
      }
    });
  }, [router]);

  /**
   * Navigate back to previous screen
   */
  const navigateBack = useCallback(() => {
    console.log('🔙 Navigating back');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }, [router]);

  return {
    navigateToListenCallScreen,
    navigateToIncomingCallScreen,
    navigateToCallScreen,
    navigateBack,
    currentScreen
  };
};
