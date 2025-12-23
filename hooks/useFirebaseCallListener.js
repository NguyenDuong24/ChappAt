import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/authContext';
import {
  listenForUserCallChanges,
  CALL_STATUS
} from '../services/firebaseCallService';

// PERFORMANCE: Enable/disable debug mode
const DEBUG_MODE = false;
const log = DEBUG_MODE ? console.log : () => { };

// Debounce helper
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Hook để lắng nghe tất cả call changes - OPTIMIZED
export const useFirebaseCallListener = (onIncomingCall, onCallStatusChange) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef(null);
  const lastCallIdRef = useRef(null); // Prevent duplicate processing

  // Memoize callbacks to prevent recreating listener
  const handleCallChange = useCallback((callData) => {
    if (!callData || !user?.uid) return;

    // Prevent duplicate processing of same call
    const callKey = `${callData.id}-${callData.status}`;
    if (callKey === lastCallIdRef.current) {
      return;
    }
    lastCallIdRef.current = callKey;

    log('📱 Call change detected for user:', user.uid, callData.id, callData.status);

    // Xử lý theo role của user trong cuộc gọi
    if (callData.userRole === 'receiver') {
      if (callData.status === CALL_STATUS.RINGING) {
        log('📞 INCOMING CALL FOR RECEIVER');
        onIncomingCall && onIncomingCall(callData, 'receiver');
      } else if (callData.status === CALL_STATUS.ACCEPTED) {
        log('✅ Receiver accepted call');
        onCallStatusChange && onCallStatusChange(callData, 'receiver');
      }
    } else if (callData.userRole === 'caller') {
      log('📱 Call status change for caller:', callData.status);
      onCallStatusChange && onCallStatusChange(callData, 'caller');
    }
  }, [user?.uid, onIncomingCall, onCallStatusChange]);

  useEffect(() => {
    if (!user?.uid) {
      log('❌ No user found, skipping Firebase listener setup');
      return;
    }

    log('🔄 Setting up Firebase call listener for user:', user.uid);

    // Cleanup previous listener before creating new one
    if (unsubscribeRef.current) {
      log('🔄 Cleaning up previous listener');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Setup new listener with debounced callback
    unsubscribeRef.current = listenForUserCallChanges(
      user.uid,
      debounce(handleCallChange, 100) // Small debounce to batch rapid updates
    );

    log('✅ Firebase listener setup complete');

    return () => {
      if (unsubscribeRef.current) {
        log('🔄 Cleaning up Firebase listener');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      lastCallIdRef.current = null;
    };
  }, [user?.uid, handleCallChange]);

  return unsubscribeRef.current;
};

// Hook riêng cho incoming calls (receiver) - OPTIMIZED
export const useIncomingCallListener = (onIncomingCall) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef(null);
  const processedCallsRef = useRef(new Set());

  useEffect(() => {
    if (!user?.uid) return;

    log('📞 Setting up incoming call listener for:', user.uid);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = listenForUserCallChanges(user.uid, (callData) => {
      // Prevent duplicate processing
      if (processedCallsRef.current.has(callData.id)) return;

      if (callData.userRole === 'receiver' && callData.status === CALL_STATUS.RINGING) {
        processedCallsRef.current.add(callData.id);
        log('📞 New incoming call:', callData.id);
        onIncomingCall && onIncomingCall(callData);

        // Clean old entries
        if (processedCallsRef.current.size > 10) {
          const arr = Array.from(processedCallsRef.current);
          processedCallsRef.current = new Set(arr.slice(-5));
        }
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.uid, onIncomingCall]);
};

// Hook riêng cho call status changes (caller) - OPTIMIZED
export const useCallStatusListener = (onCallStatusChange) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;

    log('📱 Setting up call status listener for:', user.uid);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = listenForUserCallChanges(user.uid, (callData) => {
      if (callData.userRole === 'caller') {
        log('📱 Call status changed:', callData.status);
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
