const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Helpers
function getChannelId(type) {
  switch (type) {
    case 'message':
    case 'group':
      return 'messages';
    case 'call':
      return 'calls';
    case 'friend_request':
      return 'social';
    default:
      return 'default';
  }
}

function isNotificationAllowed(userData, type, isGroup = false) {
  if (userData?.doNotDisturb === true || userData?.notificationSettings?.doNotDisturb === true) {
    return false;
  }

  const settings = userData?.notificationSettings;
  if (!settings) return true;
  const map = {
    message: 'messageNotifications',
    group: 'groupNotifications',
    mention: 'mentionNotifications',
    call: 'callNotifications',
    friend_request: 'friendRequestNotifications',
    reaction: 'reactionNotifications',
    system: 'systemNotifications',
  };
  const key = isGroup ? map.group : map[type] || undefined;
  if (!key) return true;
  const val = settings[key];
  return val !== false; // default allow unless explicitly false
}

async function isAdminRequest(context) {
  if (context.auth?.token?.admin === true) return true;
  const uid = context.auth?.uid;
  if (!uid) return false;

  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  return userDoc.exists && userDoc.data()?.role === 'admin';
}

// Cloud Function trigger khi có tin nhắn mới
exports.onMessageCreated = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const messageId = context.params.messageId;
      
      console.log('New message created:', messageId, messageData);
      
      // Kiểm tra dữ liệu cần thiết
      if (!messageData.receiverId || !messageData.senderId) {
        console.log('Missing receiverId or senderId');
        return null;
      }
      
      // Lấy thông tin user nhận tin nhắn
      const receiverDoc = await admin.firestore()
        .collection('users')
        .doc(messageData.receiverId)
        .get();
        
      if (!receiverDoc.exists) {
        console.log('Receiver not found');
        return null;
      }
      
      const receiverData = receiverDoc.data();

      // Tôn trọng user settings
      const isGroup = (messageData.chatId && String(messageData.chatId).startsWith('group_')) || messageData.chatType === 'group';
      if (!isNotificationAllowed(receiverData, isGroup ? 'group' : 'message', isGroup)) {
        console.log('User has disabled message notifications (isGroup=', isGroup, ')');
        return null;
      }
      
      // Kiểm tra FCM tokens
      if (!receiverData.fcmTokens || Object.keys(receiverData.fcmTokens).length === 0) {
        console.log('No FCM tokens found for receiver');
        return null;
      }
      
      const tokens = Object.keys(receiverData.fcmTokens);
      
      // Lấy thông tin người gửi
      const senderDoc = await admin.firestore()
        .collection('users')
        .doc(messageData.senderId)
        .get();
        
      const senderData = senderDoc.exists ? senderDoc.data() : {};
      const senderName = senderData.displayName || senderData.fullName || 'Someone';
      
      // Tạo notification payload
      const type = isGroup ? 'group' : 'message';
      const payload = {
        notification: {
          title: isGroup ? `📱 ${messageData.groupName || 'Group'}` : `💬 ${senderName}`,
          body: messageData.text ? 
            (messageData.text.length > 80 ? 
              `${messageData.text.substring(0, 80)}...` : 
              messageData.text) 
            : (isGroup ? `${senderName} sent a message` : 'Sent you a message'),
          sound: undefined,
        },
        data: {
          type,
          chatId: messageData.chatId || '',
          senderId: messageData.senderId,
          messageId: messageId,
          senderName: senderName,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: getChannelId(type),
            icon: 'ic_notification',
            color: '#4f8bff',
            sound: undefined,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: undefined,
              badge: 1,
              category: 'message',
            },
          },
        },
      };
      
      // Gửi notification đến tất cả devices của user
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        ...payload,
      });
      
      console.log('Notification sent:', response.successCount, 'success,', response.failureCount, 'failed');
      
      // Xóa invalid tokens
      const invalidTokens = [];
      response.responses.forEach((result, index) => {
        if (!result.success && (
          result.error?.code === 'messaging/invalid-registration-token' ||
          result.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(tokens[index]);
        }
      });
      
      if (invalidTokens.length > 0) {
        console.log('Removing invalid tokens:', invalidTokens);
        const updateData = {};
        invalidTokens.forEach(token => {
          updateData[`fcmTokens.${token}`] = admin.firestore.FieldValue.delete();
        });
        
        await admin.firestore()
          .collection('users')
          .doc(messageData.receiverId)
          .update(updateData);
      }
      
      return null;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });

// Cloud Function trigger khi có cuộc gọi mới
exports.onCallCreated = functions.firestore
  .document('calls/{callId}')
  .onCreate(async (snap, context) => {
    try {
      const callData = snap.data();
      const callId = context.params.callId;
      
      console.log('New call created:', callId, callData);
      
      if (!callData.receiverId || !callData.callerId || callData.status !== 'ringing') {
        console.log('Invalid call data or not ringing');
        return null;
      }
      
      // Lấy thông tin user nhận cuộc gọi
      const receiverDoc = await admin.firestore()
        .collection('users')
        .doc(callData.receiverId)
        .get();
        
      if (!receiverDoc.exists) {
        console.log('Receiver not found');
        return null;
      }
      
      const receiverData = receiverDoc.data();

      // Tôn trọng user settings
      if (!isNotificationAllowed(receiverData, 'call')) {
        console.log('User has disabled call notifications');
        return null;
      }
      
      if (!receiverData.fcmTokens || Object.keys(receiverData.fcmTokens).length === 0) {
        console.log('No FCM tokens found for receiver');
        return null;
      }
      
      const tokens = Object.keys(receiverData.fcmTokens);
      
      // Lấy thông tin người gọi
      const callerDoc = await admin.firestore()
        .collection('users')
        .doc(callData.callerId)
        .get();
        
      const callerData = callerDoc.exists ? callerDoc.data() : {};
      const callerName = callerData.displayName || callerData.fullName || 'Someone';
      
      const callType = callData.type || 'audio';
      const emoji = callType === 'video' ? '📹' : '📞';
      
      // Tạo notification payload cho cuộc gọi
      const payload = {
        notification: {
          title: `${emoji} ${callerName}`,
          body: `Incoming ${callType} call`,
          sound: 'call_sound',
        },
        data: {
          type: 'call',
          callId: callId,
          callerId: callData.callerId,
          callerName: callerName,
          callType: callType,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: getChannelId('call'),
            icon: 'ic_call',
            color: '#ff6b6b',
            sound: 'call_sound',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'call_sound.wav',
              badge: 1,
              category: 'call',
              'content-available': 1,
            },
          },
        },
      };
      
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        ...payload,
      });
      
      console.log('Call notification sent:', response.successCount, 'success,', response.failureCount, 'failed');
      
      // Cleanup invalid tokens
      const invalidTokens = [];
      response.responses.forEach((result, index) => {
        if (!result.success && (
          result.error?.code === 'messaging/invalid-registration-token' ||
          result.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(tokens[index]);
        }
      });
      
      if (invalidTokens.length > 0) {
        const updateData = {};
        invalidTokens.forEach(token => {
          updateData[`fcmTokens.${token}`] = admin.firestore.FieldValue.delete();
        });
        
        await admin.firestore()
          .collection('users')
          .doc(callData.receiverId)
          .update(updateData);
      }
      
      return null;
    } catch (error) {
      console.error('Error sending call notification:', error);
      return null;
    }
  });

// Cloud Function trigger khi có friend request
exports.onFriendRequestCreated = functions.firestore
  .document('friendRequests/{requestId}')
  .onCreate(async (snap, context) => {
    try {
      const requestData = snap.data();
      const requestId = context.params.requestId;
      
      console.log('New friend request created:', requestId, requestData);
      
      if (!requestData.toUserId || !requestData.fromUserId) {
        console.log('Missing user IDs in friend request');
        return null;
      }
      
      // Lấy thông tin user nhận friend request
      const toUserDoc = await admin.firestore()
        .collection('users')
        .doc(requestData.toUserId)
        .get();
        
      if (!toUserDoc.exists) {
        console.log('Target user not found');
        return null;
      }
      
      const toUserData = toUserDoc.data();

      // Tôn trọng user settings
      if (!isNotificationAllowed(toUserData, 'friend_request')) {
        console.log('User has disabled friend request notifications');
        return null;
      }
      
      if (!toUserData.fcmTokens || Object.keys(toUserData.fcmTokens).length === 0) {
        console.log('No FCM tokens found for target user');
        return null;
      }
      
      const tokens = Object.keys(toUserData.fcmTokens);
      
      // Lấy thông tin người gửi friend request
      const fromUserDoc = await admin.firestore()
        .collection('users')
        .doc(requestData.fromUserId)
        .get();
        
      const fromUserData = fromUserDoc.exists ? fromUserDoc.data() : {};
      const fromUserName = fromUserData.displayName || fromUserData.fullName || 'Someone';
      
      const payload = {
        notification: {
          title: '👋 Friend Request',
          body: `${fromUserName} sent you a friend request`,
          sound: undefined,
        },
        data: {
          type: 'friend_request',
          requestId: requestId,
          fromUserId: requestData.fromUserId,
          fromUserName: fromUserName,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: getChannelId('friend_request'),
            icon: 'ic_notification',
            color: '#51cf66',
            sound: undefined,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: undefined,
              badge: 1,
              category: 'friend_request',
            },
          },
        },
      };
      
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        ...payload,
      });
      
      console.log('Friend request notification sent:', response.successCount, 'success,', response.failureCount, 'failed');

      // Cleanup invalid tokens
      const invalidTokens = [];
      response.responses.forEach((result, index) => {
        if (!result.success && (
          result.error?.code === 'messaging/invalid-registration-token' ||
          result.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(tokens[index]);
        }
      });

      if (invalidTokens.length > 0) {
        const updateData = {};
        invalidTokens.forEach(token => {
          updateData[`fcmTokens.${token}`] = admin.firestore.FieldValue.delete();
        });
        await admin.firestore()
          .collection('users')
          .doc(requestData.toUserId)
          .update(updateData);
      }
      
      return null;
    } catch (error) {
      console.error('Error sending friend request notification:', error);
      return null;
    }
  });

// Manual function để gửi notification
exports.sendNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    if (!(await isAdminRequest(context))) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }
    
    const { targetUserId, notification } = data;
    
    if (!targetUserId || !notification) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }
    
    // Lấy FCM tokens của target user
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(targetUserId)
      .get();
      
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();

    // Respect user settings by type if provided
    const type = notification?.data?.type || notification?.categoryId;
    const isGroup = type === 'group';
    if (type && !isNotificationAllowed(userData, type, isGroup)) {
      return { success: true, message: 'Suppressed by user settings' };
    }
    
    if (!userData.fcmTokens || Object.keys(userData.fcmTokens).length === 0) {
      console.log('No FCM tokens for user:', targetUserId);
      return { success: true, message: 'No tokens to send to' };
    }
    
    const tokens = Object.keys(userData.fcmTokens);
    
    const payload = {
      notification: {
        title: notification.title,
        body: notification.body,
        sound: undefined,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: getChannelId(type),
          sound: undefined,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: undefined,
            badge: notification.badge || 1,
            category: notification.categoryId || type,
          },
        },
      },
    };
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      ...payload,
    });
    
    // Cleanup invalid tokens
    const invalidTokens = [];
    response.responses.forEach((result, index) => {
      if (!result.success && (
        result.error?.code === 'messaging/invalid-registration-token' ||
        result.error?.code === 'messaging/registration-token-not-registered'
      )) {
        invalidTokens.push(tokens[index]);
      }
    });
    
    if (invalidTokens.length > 0) {
      const updateData = {};
      invalidTokens.forEach(token => {
        updateData[`fcmTokens.${token}`] = admin.firestore.FieldValue.delete();
      });
      
      await admin.firestore()
        .collection('users')
        .doc(targetUserId)
        .update(updateData);
    }
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokensRemoved: invalidTokens.length,
    };
    
  } catch (error) {
    console.error('Error in sendNotification function:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});
