// Cloud Function để gửi push notifications
// File: functions/src/sendNotification.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

function hasDoNotDisturbEnabled(userData) {
  return userData?.doNotDisturb === true || userData?.notificationSettings?.doNotDisturb === true;
}

// Cloud Function để gửi notification
exports.sendNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify user authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { targetUserId, notification } = data;

    if (!targetUserId || !notification) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Get target user's FCM tokens
    const userDoc = await db.collection('users').doc(targetUserId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Target user not found');
    }

    const userData = userDoc.data();
    if (hasDoNotDisturbEnabled(userData)) {
      console.log('User has Do Not Disturb enabled:', targetUserId);
      return { success: true, message: 'Suppressed by user settings' };
    }

    const fcmTokens = userData.fcmTokens;

    if (!fcmTokens || Object.keys(fcmTokens).length === 0) {
      console.log('No FCM tokens found for user:', targetUserId);
      return { success: false, message: 'No FCM tokens found' };
    }

    // Prepare notification payload
    const payload = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: undefined,
          channelId: getChannelId(notification.data?.type),
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: undefined,
            badge: 1,
            category: notification.categoryId,
          },
        },
      },
    };

    // Send to all tokens
    const tokens = Object.keys(fcmTokens);
    const results = [];

    for (const token of tokens) {
      try {
        const result = await messaging.send({
          ...payload,
          token: token,
        });
        results.push({ token, success: true, messageId: result });
      } catch (error) {
        console.error('Error sending to token:', token, error);
        results.push({ token, success: false, error: error.message });
        
        // Remove invalid tokens
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          await removeInvalidToken(targetUserId, token);
        }
      }
    }

    return { success: true, results };

  } catch (error) {
    console.error('Error sending notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Function để gửi notification đến nhiều users
exports.sendBulkNotification = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userIds, notification } = data;

    if (!userIds || !Array.isArray(userIds) || !notification) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    const results = [];

    for (const userId of userIds) {
      try {
        const result = await sendNotificationToUser(userId, notification);
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return { success: true, results };

  } catch (error) {
    console.error('Error sending bulk notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Trigger notification khi có tin nhắn mới
exports.onNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const { senderId, receiverId, senderName, text, chatType } = messageData;

      // Không gửi notification cho chính người gửi
      if (senderId === receiverId) return;

      // Kiểm tra user settings để xem có muốn nhận notification không
      const receiverDoc = await db.collection('users').doc(receiverId).get();
      const receiverData = receiverDoc.data();
      
      if (hasDoNotDisturbEnabled(receiverData) || receiverData?.notificationSettings?.messageNotifications === false) {
        console.log('User has disabled message notifications');
        return;
      }

      // Tạo notification payload
      const notification = {
        title: chatType === 'group' ? `📱 ${messageData.groupName}` : `💬 ${senderName}`,
        body: chatType === 'group' ? `${senderName}: ${text}` : text,
        data: {
          type: chatType === 'group' ? 'group' : 'message',
          chatId: messageData.chatId,
          senderId: senderId,
          messageId: context.params.messageId,
        },
      };

      // Gửi notification
      await sendNotificationToUser(receiverId, notification);

    } catch (error) {
      console.error('Error sending new message notification:', error);
    }
  });

// Trigger notification khi có cuộc gọi mới
exports.onNewCall = functions.firestore
  .document('calls/{callId}')
  .onCreate(async (snap, context) => {
    try {
      const callData = snap.data();
      const { callerId, receiverId, callerName, callType } = callData;

      if (callerId === receiverId) return;

      const notification = {
        title: `${callType === 'video' ? '📹' : '📞'} ${callerName}`,
        body: `${callType === 'video' ? 'Video' : 'Voice'} call incoming`,
        data: {
          type: 'call',
          callId: context.params.callId,
          callerId: callerId,
          callType: callType,
        },
      };

      await sendNotificationToUser(receiverId, notification);

    } catch (error) {
      console.error('Error sending call notification:', error);
    }
  });

// Helper function để gửi notification đến user
async function sendNotificationToUser(userId, notification) {
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  if (hasDoNotDisturbEnabled(userData)) {
    console.log('User has Do Not Disturb enabled:', userId);
    return { success: true, message: 'Suppressed by user settings' };
  }

  const fcmTokens = userData.fcmTokens;

  if (!fcmTokens || Object.keys(fcmTokens).length === 0) {
    throw new Error('No FCM tokens found');
  }

  const payload = {
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.data || {},
    android: {
      priority: 'high',
      notification: {
        sound: undefined,
        channelId: getChannelId(notification.data?.type),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: undefined,
          badge: 1,
        },
      },
    },
  };

  const tokens = Object.keys(fcmTokens);
  const results = [];

  for (const token of tokens) {
    try {
      const result = await messaging.send({
        ...payload,
        token: token,
      });
      results.push({ token, success: true, messageId: result });
    } catch (error) {
      console.error('Error sending to token:', token, error);
      results.push({ token, success: false, error: error.message });
      
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        await removeInvalidToken(userId, token);
      }
    }
  }

  return results;
}

// Helper function để xóa token không hợp lệ
async function removeInvalidToken(userId, token) {
  try {
    await db.collection('users').doc(userId).update({
      [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete()
    });
    console.log('Removed invalid token:', token);
  } catch (error) {
    console.error('Error removing invalid token:', error);
  }
}

// Helper function để lấy channel ID
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
