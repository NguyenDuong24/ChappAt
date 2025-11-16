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
  getDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { createMeeting, token } from '../api';
import ExpoPushNotificationService from './expoPushNotificationService';
import callTimeoutService from './callTimeoutService.js';
import * as Notifications from 'expo-notifications';

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
        console.log('🧹 Cleared call notification for call:', callId);
      }
    }
  } catch (error) {
    console.error('❌ Error clearing call notification:', error);
  }
};

// Tạo cuộc gọi mới với VideoSDK meetingId
export const createCall = async (callerId, receiverId, callType = CALL_TYPE.VIDEO) => {
  try {
    console.log('🔄 Creating new call...');
    
    // Tạo meeting ID từ VideoSDK
    const meetingId = await createMeeting({ token });
    console.log('✅ VideoSDK Meeting created:', meetingId);
    
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
    console.log('✅ Firebase call created:', callRef.id);

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
          console.log('📤 Sending REAL push notification for incoming call to receiver:', receiverId);
          
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
            console.log('✅ Push notification sent successfully for incoming call');
            
            // BẮT ĐẦU TIMEOUT CHO CUỘC GỌI (30 giây)
            callTimeoutService.startCallTimeout(callRef.id, 30000);
            
          } else {
            console.log('❌ Failed to send push notification for incoming call');
          }
        } else {
          console.log('⚠️ No expoPushToken found for receiver:', receiverId);
        }
      }
    } catch (notifError) {
      console.error('❌ Error sending call notification:', notifError);
      // Không throw error để không ảnh hưởng đến việc tạo call
    }
    
    return {
      id: callRef.id,
      meetingId,
      ...callData
    };
  } catch (error) {
    console.error('❌ Error creating call:', error);
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
    console.log(`✅ Call status updated to: ${status}`);
  } catch (error) {
    console.error('❌ Error updating call status:', error);
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
    
    console.log('✅ Call accepted');
  } catch (error) {
    console.error('❌ Error accepting call:', error);
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
    
    console.log('✅ Call declined');
  } catch (error) {
    console.error('❌ Error declining call:', error);
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
    console.log('✅ Call cancelled');

    // XÓA NOTIFICATION CUỘC GỌI ĐẾN KHI BỊ HỦY
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ Cleared all scheduled call notifications');
    } catch (notifError) {
      console.error('❌ Error clearing call notifications:', notifError);
    }

    // XÓA NOTIFICATION HIỆN TẠI NẾU CÓ
    clearCallNotification(callId);
  } catch (error) {
    console.error('❌ Error cancelling call:', error);
    throw error;
  }
};

// End cuộc gọi
export const endCall = async (callId) => {
  try {
    await updateCallStatus(callId, CALL_STATUS.ENDED, {
      endedAt: serverTimestamp()
    });
    console.log('✅ Call ended');
  } catch (error) {
    console.error('❌ Error ending call:', error);
    throw error;
  }
};

// Lắng nghe incoming calls cho receiver
export const listenForIncomingCalls = (userId, callback) => {
  console.log('👂 Setting up incoming call listener for user:', userId);
  
  const q = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    where('status', '==', CALL_STATUS.RINGING),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const callData = {
          id: change.doc.id,
          ...change.doc.data()
        };
        console.log('📞 New incoming call:', callData);
        callback(callData);
      }
    });
  });
};

// Lắng nghe call status changes cho caller
export const listenForCallStatusChanges = (callId, callback) => {
  console.log('👂 Setting up call status listener for call:', callId);
  
  const callRef = doc(db, 'calls', callId);
  
  return onSnapshot(callRef, (doc) => {
    if (doc.exists()) {
      const callData = {
        id: doc.id,
        ...doc.data()
      };
      console.log('📱 Call status changed:', callData);
      callback(callData);
    }
  });
};

// Lắng nghe tất cả call changes cho user (cả caller và receiver)
export const listenForUserCallChanges = (userId, callback) => {
  console.log('👂 Setting up user call listener for user:', userId);
  
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

  // Query cho calls mà user là caller
  const callerQuery = query(
    collection(db, 'calls'),
    where('callerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  // Query cho calls mà user là receiver
  const receiverQuery = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribeCaller = onSnapshot(callerQuery, (snapshot) => {
    console.log('📱 Caller query snapshot:', snapshot.docs.length, 'documents');
    snapshot.docChanges().forEach((change) => {
      console.log('📱 Caller change type:', change.type, 'for doc:', change.doc.id);
      if (change.type === 'modified') {
        const callData = {
          id: change.doc.id,
          ...change.doc.data(),
          userRole: 'caller'
        };
        console.log('📱 CALLER CALL DATA:', callData);
        callback(callData);
      }
    });
  });

  const unsubscribeReceiver = onSnapshot(receiverQuery, (snapshot) => {
    console.log('📱 Receiver query snapshot:', snapshot.docs.length, 'documents');
    snapshot.docChanges().forEach((change) => {
      console.log('📱 Receiver change type:', change.type, 'for doc:', change.doc.id);
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
        // Chỉ xử lý khi là cuộc gọi mới đổ chuông và còn "mới" trong khung thời gian cho phép
        const recent = isRecent(callData.createdAt) || isRecent(callData.updatedAt);
        if (callData.status === CALL_STATUS.RINGING && recent && !isEndedStatus) {
          console.log('📞 Recent incoming call (added) detected, notifying listener');
          callback(callData);
        } else {
          console.log('⏭️ Ignoring initial receiver doc (added). Status:', callData.status, 'Recent:', recent);
        }
      } else if (change.type === 'modified') {
        // Thay đổi realtime (vd: accepted/ended) → luôn chuyển tiếp cho listener xử lý
        console.log('♻️ Receiver doc modified, forwarding update');
        callback(callData);
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
    console.log('✅ Call deleted from Firebase');
  } catch (error) {
    console.error('❌ Error deleting call:', error);
  }
};

// Cleanup old calls (older than 1 hour)
export const cleanupOldCalls = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const q = query(
      collection(db, 'calls'),
      where('createdAt', '<', oneHourAgo)
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleaned up ${snapshot.docs.length} old calls`);
  } catch (error) {
    console.error('❌ Error cleaning up old calls:', error);
  }
};
