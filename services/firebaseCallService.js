import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  getDoc,
  limit  // Added for performance
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { createMeeting, token } from '@/api';
import ExpoPushNotificationService from './expoPushNotificationService';
import callTimeoutService from './callTimeoutService.js';
import * as Notifications from 'expo-notifications';

// PERFORMANCE: Enable/disable debug mode
const DEBUG_MODE = false;
const log = DEBUG_MODE ? console.log : () => { };
const logError = console.error; // Always log errors

// Simple throttle function to prevent rapid-fire callbacks
const throttle = (func, delay) => {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

export const CALL_STATUS = {
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  ENDED: 'ended'
};

export const CALL_TYPE = {
  AUDIO: 'audio',
  VIDEO: 'video'
};

// Helper function to clear call notification
const clearCallNotification = async (callId) => {
  try {
    // Dismiss all notifications with call data
    const notifications = await Notifications.getPresentedNotificationsAsync();
    for (const notification of notifications) {
      const data = notification.request.content.data;
      if (data && data.type === 'call' && data.callId === callId) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
        log('🧹 Cleared call notification for call:', callId);
      }
    }
  } catch (error) {
    logError('❌ Error clearing call notification:', error);
  }
};

// Tạo cuộc gọi mới với VideoSDK meetingId
export const createCall = async (callerId, receiverId, callType = CALL_TYPE.VIDEO) => {
  try {
    log('🔄 Creating new call...');

    // Tạo meeting ID từ VideoSDK
    const meetingId = await createMeeting({ token });
    log('✅ VideoSDK Meeting created:', meetingId);

    // Tạo call document trong Firebase
    const callData = {
      callerId,
      receiverId,
      meetingId,
      type: callType,
      status: CALL_STATUS.RINGING,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const callRef = await addDoc(collection(db, 'calls'), callData);
    log('✅ Firebase call created:', callRef.id);

    // GỬI PUSH NOTIFICATION CHO RECEIVER NGAY LẬP TỨC (giống chat)
    try {
      // Lấy thông tin caller
      const callerDoc = await getDoc(doc(db, 'users', callerId));
      const callerInfo = callerDoc.exists() ? callerDoc.data() : {};

      // Lấy thông tin receiver để có expoPushToken
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (receiverDoc.exists()) {
        const receiverData = receiverDoc.data();
        const expoPushToken = receiverData.expoPushToken;

        if (expoPushToken) {
          log('📤 Sending REAL push notification for incoming call to receiver:', receiverId);

          const callTypeText = callType === CALL_TYPE.VIDEO ? 'Video call' : 'Voice call';

          // Gửi push notification với âm thanh incoming call
          const success = await ExpoPushNotificationService.sendRealPushNotification(expoPushToken, {
            title: callerInfo.username || 'Unknown',
            body: 'Incoming call',
            data: {
              type: 'call',
              callId: callRef.id,
              callerId: callerId,
              meetingId: meetingId,
              callType: callType,
              senderId: callerId,
              senderName: callerInfo.username,
              senderAvatar: callerInfo.profileUrl,
            },
            priority: 'high',
            sound: 'incoming.mp3',
            badge: 1,
            channelId: 'calls',
            ongoing: true,
            sticky: true,
            android: {
              fullScreenIntent: true
            }
          });

          if (success) {
            log('✅ Push notification sent successfully for incoming call');

            // BẮT ĐẦU TIMEOUT CHO CUỘC GỌI (30 giây)
            callTimeoutService.startCallTimeout(callRef.id, 30000, async () => {
              await updateCallStatus(callRef.id, CALL_STATUS.CANCELLED, {
                cancelledBy: 'timeout',
                cancelledAt: new Date().toISOString(),
                timeoutReason: 'User did not respond within timeout period'
              });
            });

          } else {
            log('❌ Failed to send push notification for incoming call');
          }
        } else {
          log('⚠️ No expoPushToken found for receiver:', receiverId);
        }
      }
    } catch (notifError) {
      logError('❌ Error sending call notification:', notifError);
      // Không throw error để không ảnh hưởng đến việc tạo call
    }

    return {
      id: callRef.id,
      meetingId,
      ...callData
    };
  } catch (error) {
    logError('❌ Error creating call:', error);
    throw error;
  }
};

// Cập nhật trạng thái cuộc gọi
export const updateCallStatus = async (callId, status, additionalData = {}) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    });
    log(`✅ Call status updated to: ${status}`);
  } catch (error) {
    logError('❌ Error updating call status:', error);
    throw error;
  }
};

// Accept cuộc gọi
export const acceptCall = async (callId) => {
  try {
    // DỪNG TIMEOUT TRƯỚC KHI ACCEPT
    callTimeoutService.stopCallTimeout(callId);

    await updateCallStatus(callId, CALL_STATUS.ACCEPTED, {
      acceptedAt: serverTimestamp()
    });

    // Clear call notification
    await clearCallNotification(callId);

    log('✅ Call accepted');
  } catch (error) {
    logError('❌ Error accepting call:', error);
    throw error;
  }
};

// Decline cuộc gọi
export const declineCall = async (callId) => {
  try {
    // DỪNG TIMEOUT TRƯỚC KHI DECLINE
    callTimeoutService.stopCallTimeout(callId);

    await updateCallStatus(callId, CALL_STATUS.DECLINED, {
      declinedAt: serverTimestamp()
    });

    // Clear call notification
    await clearCallNotification(callId);

    log('✅ Call declined');
  } catch (error) {
    logError('❌ Error declining call:', error);
    throw error;
  }
};

// Cancel cuộc gọi
export const cancelCall = async (callId) => {
  try {
    // DỪNG TIMEOUT TRƯỚC KHI CANCEL
    callTimeoutService.stopCallTimeout(callId);

    await updateCallStatus(callId, CALL_STATUS.CANCELLED, {
      cancelledAt: serverTimestamp()
    });
    log('✅ Call cancelled');

    // XÓA NOTIFICATION CUỘC GỌI ĐẾN KHI BỊ HỦY
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      log('✅ Cleared all scheduled call notifications');
    } catch (notifError) {
      logError('❌ Error clearing call notifications:', notifError);
    }

    // XÓA NOTIFICATION HIỆN TẠI NẾU CÓ
    clearCallNotification(callId);
  } catch (error) {
    logError('❌ Error cancelling call:', error);
    throw error;
  }
};

// End cuộc gọi
export const endCall = async (callId) => {
  try {
    await updateCallStatus(callId, CALL_STATUS.ENDED, {
      endedAt: serverTimestamp()
    });
    log('✅ Call ended');
  } catch (error) {
    logError('❌ Error ending call:', error);
    throw error;
  }
};

// Lắng nghe incoming calls cho receiver - OPTIMIZED
export const listenForIncomingCalls = (userId, callback) => {
  log('👂 Setting up incoming call listener for user:', userId);

  const q = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    where('status', '==', CALL_STATUS.RINGING),
    orderBy('createdAt', 'desc'),
    limit(1) // Only get the most recent call for performance
  );

  // Throttle callback to prevent rapid-fire updates
  const throttledCallback = throttle(callback, 500);

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const callData = {
          id: change.doc.id,
          ...change.doc.data()
        };
        log('📞 New incoming call:', callData.id);
        throttledCallback(callData);
      }
    });
  });
};

// Lắng nghe call status changes cho caller - OPTIMIZED
export const listenForCallStatusChanges = (callId, callback) => {
  log('👂 Setting up call status listener for call:', callId);

  const callRef = doc(db, 'calls', callId);

  // Throttle callback to prevent rapid-fire updates
  const throttledCallback = throttle(callback, 300);

  return onSnapshot(callRef, (doc) => {
    if (doc.exists()) {
      const callData = {
        id: doc.id,
        ...doc.data()
      };
      log('📱 Call status changed:', callData.status);
      throttledCallback(callData);
    }
  });
};

// Lắng nghe tất cả call changes cho user (cả caller và receiver) - OPTIMIZED
export const listenForUserCallChanges = (userId, callback) => {
  log('👂 Setting up user call listener for user:', userId);

  // Chỉ coi cuộc gọi là "đang hoạt động" nếu mới tạo gần đây
  const ACTIVE_CALL_WINDOW_MS = 120000; // 2 phút
  const isRecent = (ts) => {
    try {
      if (!ts) return false;
      const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      return Date.now() - date.getTime() <= ACTIVE_CALL_WINDOW_MS;
    } catch (e) {
      return false;
    }
  };

  // Throttle callback to prevent rapid-fire updates
  const throttledCallback = throttle(callback, 300);

  // Query cho calls mà user là caller - LIMIT to 5 for performance
  const callerQuery = query(
    collection(db, 'calls'),
    where('callerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  // Query cho calls mà user là receiver - LIMIT to 5 for performance
  const receiverQuery = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  const unsubscribeCaller = onSnapshot(callerQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'modified') {
        const callData = {
          id: change.doc.id,
          ...change.doc.data(),
          userRole: 'caller'
        };
        log('📱 CALLER CALL DATA:', callData.id, callData.status);
        throttledCallback(callData);
      }
    });
  });

  const unsubscribeReceiver = onSnapshot(receiverQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const raw = change.doc.data();
      const callData = {
        id: change.doc.id,
        ...raw,
        userRole: 'receiver'
      };

      // Bỏ qua các trạng thái đã kết thúc
      const isEndedStatus = [CALL_STATUS.DECLINED, CALL_STATUS.CANCELLED, CALL_STATUS.ENDED].includes(callData.status);

      if (change.type === 'added') {
        // QUAN TRỌNG: Tránh tự động điều hướng khi app vừa mở
        const recent = isRecent(callData.createdAt) || isRecent(callData.updatedAt);
        if (callData.status === CALL_STATUS.RINGING && recent && !isEndedStatus) {
          log('📞 Recent incoming call (added) detected');
          throttledCallback(callData);
        }
      } else if (change.type === 'modified') {
        // Thay đổi realtime (vd: accepted/ended) → luôn chuyển tiếp cho listener xử lý
        log('♻️ Receiver doc modified:', callData.status);
        throttledCallback(callData);
      }
    });
  });

  // Return function để unsubscribe cả 2 listeners
  return () => {
    unsubscribeCaller();
    unsubscribeReceiver();
  };
};

// Xóa cuộc gọi cũ (cleanup)
export const deleteCall = async (callId) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await deleteDoc(callRef);
    log('✅ Call deleted from Firebase');
  } catch (error) {
    logError('❌ Error deleting call:', error);
  }
};

// Cleanup old calls (older than 1 hour)
export const cleanupOldCalls = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const q = query(
      collection(db, 'calls'),
      where('createdAt', '<', oneHourAgo),
      limit(20) // Limit to prevent massive operations
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    log(`✅ Cleaned up ${snapshot.docs.length} old calls`);
  } catch (error) {
    logError('❌ Error cleaning up old calls:', error);
  }
};
