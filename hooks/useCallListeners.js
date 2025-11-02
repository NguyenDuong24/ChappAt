import { useEffect, useCallback, useRef } from 'react';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Hook để lắng nghe cuộc gọi được chấp nhận
 * @param {string} callerId - ID của người gọi
 * @param {function} onCallAccepted - Callback khi cuộc gọi được chấp nhận
 * @returns {function} Unsubscribe function
 */
export const useCallAcceptedListener = (callerId, onCallAccepted) => {
  const processedCallsRef = useRef(new Set());
  
  const debouncedOnCallAccepted = useCallback(
    debounce((callData) => {
      const callKey = `${callData.callerId}-${callData.timestamp?.seconds || Date.now()}`;
      if (!processedCallsRef.current.has(callKey)) {
        processedCallsRef.current.add(callKey);
        console.log('✅ Call accepted in context:', callData);
        onCallAccepted(callData);
        
        // Clean up old processed calls
        if (processedCallsRef.current.size > 10) {
          const entries = Array.from(processedCallsRef.current);
          entries.slice(0, 5).forEach(entry => processedCallsRef.current.delete(entry));
        }
      }
    }, 500),
    [onCallAccepted]
  );

  const listenCallAccepted = useCallback((callerId, onCaller) => {
    if (!callerId) return () => {};
    
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
  }, []);

  useEffect(() => {
    if (!callerId || !debouncedOnCallAccepted) return;
    
    const unsubscribe = listenCallAccepted(callerId, debouncedOnCallAccepted);
    return () => {
      unsubscribe();
      processedCallsRef.current.clear();
    };
  }, [callerId, debouncedOnCallAccepted, listenCallAccepted]);
};

/**
 * Hook để lắng nghe yêu cầu cuộc gọi
 * @param {string} callerId - ID của người gọi
 * @param {function} onCallRequest - Callback khi có yêu cầu cuộc gọi
 */
export const useCallRequestListener = (callerId, onCallRequest) => {
  const listenRequestCall = useCallback((callerId, onCaller) => {
    if (!callerId) return () => {};
    
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
  }, []);

  useEffect(() => {
    if (!callerId || !onCallRequest) return;
    
    const unsubscribe = listenRequestCall(callerId, onCallRequest);
    return () => unsubscribe();
  }, [callerId, onCallRequest, listenRequestCall]);
};

/**
 * Hook để lắng nghe cuộc gọi bị hủy
 * @param {string} receiverId - ID của người nhận
 * @param {function} onCallCanceled - Callback khi cuộc gọi bị hủy
 */
export const useCallCanceledListener = (receiverId, onCallCanceled) => {
  const processedCalls = useRef(new Set());
  
  const listencCallerCancelCall = useCallback((receiverId, onCaller) => {
    if (!receiverId) return () => {};
    
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', receiverId),
      where('status', '==', 'cancel')
    );
    
    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const callData = change.doc.data();
          const callId = change.doc.id;
          
          // Prevent duplicate processing
          if (!processedCalls.current.has(callId)) {
            processedCalls.current.add(callId);
            onCaller(callData);
            
            // Clean up old entries to prevent memory leak
            if (processedCalls.current.size > 100) {
              const entries = Array.from(processedCalls.current);
              processedCalls.current = new Set(entries.slice(-50));
            }
          }
        }
      });
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!receiverId || !onCallCanceled) return;
    
    const unsubscribe = listencCallerCancelCall(receiverId, onCallCanceled);
    return () => unsubscribe();
  }, [receiverId, onCallCanceled, listencCallerCancelCall]);
};

/**
 * Hook để lắng nghe cuộc gọi đến
 * @param {string} userId - ID của người dùng
 * @param {function} onIncomingCall - Callback khi có cuộc gọi đến
 */
export const useIncomingCallListener = (userId, onIncomingCall) => {
  const listenForIncomingCalls = useCallback((userId, onCallReceived) => {
    if (!userId) return () => {};
    
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
  }, []);

  useEffect(() => {
    if (!userId || !onIncomingCall) return;
    
    const unsubscribe = listenForIncomingCalls(userId, onIncomingCall);
    return () => unsubscribe();
  }, [userId, onIncomingCall, listenForIncomingCalls]);
};
