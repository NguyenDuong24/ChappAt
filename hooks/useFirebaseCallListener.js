import { useEffect, useRef } from 'react';
import { useAuth } from '../context/authContext';
import { 
  listenForUserCallChanges, 
  CALL_STATUS 
} from '../services/firebaseCallService';

// Hook để lắng nghe tất cả call changes
export const useFirebaseCallListener = (onIncomingCall, onCallStatusChange) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) {
      console.log('❌ No user found, skipping Firebase listener setup');
      return;
    }

    console.log('🔄 Setting up Firebase call listener for user:', user.uid);
    console.log('🔄 User object:', user);

    // Cleanup previous listener
    if (unsubscribeRef.current) {
      console.log('🔄 Cleaning up previous listener');
      unsubscribeRef.current();
    }

    // Setup new listener
    unsubscribeRef.current = listenForUserCallChanges(user.uid, (callData) => {
      console.log('📱 Call change detected for user:', user.uid, callData);

      // Xử lý theo role của user trong cuộc gọi
      if (callData.userRole === 'receiver') {
        if (callData.status === CALL_STATUS.RINGING) {
          // User nhận cuộc gọi → hiển thị IncomingCallScreen
          console.log('📞 INCOMING CALL FOR RECEIVER - Navigating to IncomingCallScreen');
          onIncomingCall && onIncomingCall(callData, 'receiver');
        } else if (callData.status === CALL_STATUS.ACCEPTED) {
          // Receiver đã accept → navigate to CallScreen
          console.log('✅ Receiver accepted call, calling status change handler');
          onCallStatusChange && onCallStatusChange(callData, 'receiver');
        }
      } else if (callData.userRole === 'caller') {
        // User đang gọi → xử lý status changes (hiển thị ListenCallAcceptedScreen khi ringing)
        console.log('📱 Call status change for caller:', callData.status);
        onCallStatusChange && onCallStatusChange(callData, 'caller');
      }
    });

    console.log('✅ Firebase listener setup complete for user:', user.uid);

    return () => {
      if (unsubscribeRef.current) {
        console.log('🔄 Cleaning up Firebase listener for user:', user.uid);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, onIncomingCall, onCallStatusChange]);

  return unsubscribeRef.current;
};

// Hook riêng cho incoming calls (receiver)
export const useIncomingCallListener = (onIncomingCall) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;

    console.log('📞 Setting up incoming call listener for:', user.uid);

    unsubscribeRef.current = listenForUserCallChanges(user.uid, (callData) => {
      if (callData.userRole === 'receiver' && callData.status === CALL_STATUS.RINGING) {
        console.log('📞 New incoming call:', callData);
        onIncomingCall && onIncomingCall(callData);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.uid, onIncomingCall]);
};

// Hook riêng cho call status changes (caller)
export const useCallStatusListener = (onCallStatusChange) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;

    console.log('📱 Setting up call status listener for:', user.uid);

    unsubscribeRef.current = listenForUserCallChanges(user.uid, (callData) => {
      if (callData.userRole === 'caller') {
        console.log('📱 Call status changed:', callData.status);
        onCallStatusChange && onCallStatusChange(callData);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.uid, onCallStatusChange]);
};
