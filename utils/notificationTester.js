// Test file để kiểm tra notification system
import { Alert } from 'react-native';
import messageService from '../services/messageService';
import firebaseMessaging from '../firebaseMessaging';
import * as Device from 'expo-device';

class NotificationTester {
  // Test 1: Kiểm tra FCM token
  async testFCMToken() {
    try {
      console.log('🔍 Testing FCM Token...');
      
      // Kiểm tra device có phải là physical device
      if (!Device.isDevice) {
        Alert.alert('⚠️ Warning', 'Push notifications only work on physical devices');
        return false;
      }
      
      // Khởi tạo Firebase Messaging
      await firebaseMessaging.initialize();
      
      // Lấy token
      const token = await firebaseMessaging.getFCMToken();
      
      if (token) {
        console.log('✅ FCM Token retrieved:', token.substring(0, 20) + '...');
        Alert.alert('✅ Success', 'FCM Token retrieved successfully');
        return true;
      } else {
        console.log('❌ Failed to get FCM token');
        Alert.alert('❌ Error', 'Failed to get FCM token');
        return false;
      }
    } catch (error) {
      console.error('❌ FCM Token test failed:', error);
      Alert.alert('❌ Error', `FCM Token test failed: ${error.message}`);
      return false;
    }
  }

  // Test 2: Gửi tin nhắn test
  async testSendMessage(senderId, receiverId, chatId) {
    try {
      console.log('🔍 Testing Send Message...');
      
      if (!senderId || !receiverId || !chatId) {
        Alert.alert('❌ Error', 'Missing senderId, receiverId, or chatId');
        return false;
      }
      
      const messageData = {
        text: `🧪 Test notification message at ${new Date().toLocaleTimeString()}`,
        senderId,
        receiverId,
        chatId,
        type: 'text'
      };
      
      const messageId = await messageService.sendMessage(messageData);
      
      if (messageId) {
        console.log('✅ Test message sent:', messageId);
        Alert.alert('✅ Success', `Test message sent: ${messageId}`);
        return true;
      } else {
        console.log('❌ Failed to send test message');
        Alert.alert('❌ Error', 'Failed to send test message');
        return false;
      }
    } catch (error) {
      console.error('❌ Send message test failed:', error);
      Alert.alert('❌ Error', `Send message test failed: ${error.message}`);
      return false;
    }
  }

  // Test 3: Gửi notification thủ công
  async testManualNotification(targetUserId) {
    try {
      console.log('🔍 Testing Manual Notification...');
      
      if (!targetUserId) {
        Alert.alert('❌ Error', 'Missing targetUserId');
        return false;
      }
      
      const notification = {
        title: '🧪 Test Notification',
        body: `Manual test notification at ${new Date().toLocaleTimeString()}`,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        }
      };
      
      const success = await messageService.sendManualNotification(targetUserId, notification);
      
      if (success) {
        console.log('✅ Manual notification sent');
        Alert.alert('✅ Success', 'Manual notification sent successfully');
        return true;
      } else {
        console.log('❌ Failed to send manual notification');
        Alert.alert('❌ Error', 'Failed to send manual notification');
        return false;
      }
    } catch (error) {
      console.error('❌ Manual notification test failed:', error);
      Alert.alert('❌ Error', `Manual notification test failed: ${error.message}`);
      return false;
    }
  }

  // Test 4: Kiểm tra Cloud Functions
  async testCloudFunctions() {
    try {
      console.log('🔍 Testing Cloud Functions...');
      
      // Test by sending a manual call to Cloud Function
      const testData = {
        test: true,
        message: 'Testing Cloud Functions connectivity',
        timestamp: new Date().toISOString(),
      };
      
      // Gọi thông qua messageService
      const success = await messageService.sendManualNotification('test_user_id', {
        title: 'Test Cloud Function',
        body: 'Testing connectivity',
        data: testData,
      });
      
      if (success) {
        console.log('✅ Cloud Functions test passed');
        Alert.alert('✅ Success', 'Cloud Functions are working');
        return true;
      } else {
        console.log('❌ Cloud Functions test failed');
        Alert.alert('❌ Error', 'Cloud Functions test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Cloud Functions test failed:', error);
      Alert.alert('❌ Error', `Cloud Functions test failed: ${error.message}`);
      return false;
    }
  }

  // Test tổng hợp tất cả
  async runAllTests(senderId, receiverId, chatId) {
    try {
      console.log('🚀 Starting comprehensive notification tests...');
      Alert.alert('🚀 Starting Tests', 'Running comprehensive notification tests...');
      
      const results = {
        fcmToken: false,
        sendMessage: false,
        manualNotification: false,
        cloudFunctions: false,
      };

      // Test 1: FCM Token
      results.fcmToken = await this.testFCMToken();
      await this.delay(2000);

      // Test 2: Send Message (nếu có đủ params)
      if (senderId && receiverId && chatId) {
        results.sendMessage = await this.testSendMessage(senderId, receiverId, chatId);
        await this.delay(2000);
      }

      // Test 3: Manual Notification (nếu có receiverId)
      if (receiverId) {
        results.manualNotification = await this.testManualNotification(receiverId);
        await this.delay(2000);
      }

      // Test 4: Cloud Functions
      results.cloudFunctions = await this.testCloudFunctions();

      // Kết quả tổng hợp
      const passed = Object.values(results).filter(Boolean).length;
      const total = Object.values(results).length;
      
      console.log('📊 Test Results:', results);
      
      const message = `
Test Results (${passed}/${total} passed):
✅ FCM Token: ${results.fcmToken ? 'PASS' : 'FAIL'}
✅ Send Message: ${results.sendMessage ? 'PASS' : 'SKIP'}
✅ Manual Notification: ${results.manualNotification ? 'PASS' : 'SKIP'} 
✅ Cloud Functions: ${results.cloudFunctions ? 'PASS' : 'FAIL'}

${passed === total ? '🎉 All tests passed!' : '⚠️ Some tests failed. Check console for details.'}
      `;
      
      Alert.alert('📊 Test Results', message);
      
      return results;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      Alert.alert('❌ Error', `Test suite failed: ${error.message}`);
      return null;
    }
  }

  // Helper: Delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Quick test cho development
  async quickTest() {
    return this.runAllTests(
      'test_sender_id',
      'test_receiver_id', 
      'test_chat_id'
    );
  }
}

export default new NotificationTester();

// Sử dụng:
// import notificationTester from '../utils/notificationTester';
// 
// // Test nhanh
// notificationTester.quickTest();
//
// // Test với user thực
// notificationTester.runAllTests(currentUserId, targetUserId, chatId);
