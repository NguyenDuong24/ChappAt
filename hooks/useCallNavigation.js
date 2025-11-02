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
   * Navigate đến màn hình ListenCallScreen (người nhận call)
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
   * Navigate đến màn hình IncomingCallScreen (người gọi chờ)
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
        receiverId: callData.receiverId,
        status: callData.status,
        callType: callData.type,
      },
    });
  }, [router]);

  /**
   * Navigate đến màn hình cuộc gọi video
   */
  const navigateToCallScreen = useCallback((callData) => {
    router.push({
      pathname: '/CallScreen',
      params: {
        meetingId: callData.meetingId,
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        status: callData.status,
        callType: callData.type,
      },
    });
  }, [router]);

  /**
   * Navigate đến màn hình chờ cuộc gọi được chấp nhận
   */
  const navigateToListenCallAccepted = useCallback((callData) => {
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
  }, [router]);

  /**
   * Xử lý khi cuộc gọi bị hủy - quay lại màn hình trước
   */
  const handleCallCanceled = useCallback(() => {
    if (currentScreen === 'IncomingCallScreen' || currentScreen === 'CallScreen') {
      router.back();
    }
  }, [router, currentScreen]);

  return {
    navigateToIncomingCall,
    navigateToCallScreen,
    navigateToListenCallAccepted,
    handleCallCanceled,
    currentScreen,
  };
};
