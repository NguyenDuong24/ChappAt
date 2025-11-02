// NOTIFICATION SYSTEM DEBUGGER - Kiểm tra toàn diện hệ thống notification
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

class NotificationDebugger {
  async runFullDiagnostic() {
    console.log('🔍 STARTING NOTIFICATION DIAGNOSTIC...\n');
    
    const results = {
      device: await this.checkDevice(),
      permissions: await this.checkPermissions(),
      expoToken: await this.checkExpoToken(),
      firebaseIntegration: await this.checkFirebaseIntegration(),
      notificationSettings: await this.checkNotificationSettings(),
      testNotification: await this.testLocalNotification(),
    };

    console.log('📊 DIAGNOSTIC RESULTS:');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
  }

  async checkDevice() {
    console.log('1️⃣ Checking device compatibility...');
    
    const deviceInfo = {
      isDevice: Device.isDevice,
      platform: Platform.OS,
      platformVersion: Platform.Version,
      deviceName: Device.deviceName,
      isPhysicalDevice: Device.isDevice,
    };

    console.log('Device Info:', deviceInfo);
    
    if (!Device.isDevice) {
      console.log('❌ ERROR: Must use physical device for push notifications');
      return { status: 'error', message: 'Physical device required', data: deviceInfo };
    }

    console.log('✅ Device check passed\n');
    return { status: 'success', data: deviceInfo };
  }

  async checkPermissions() {
    console.log('2️⃣ Checking notification permissions...');
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Current permission status:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('🔄 Requesting permissions...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log('New permission status:', newStatus);
        
        if (newStatus !== 'granted') {
          console.log('❌ ERROR: Notification permissions denied');
          return { 
            status: 'error', 
            message: 'Permissions denied', 
            data: { existingStatus, newStatus } 
          };
        }
      }

      console.log('✅ Permissions check passed\n');
      return { 
        status: 'success', 
        data: { existingStatus, finalStatus: 'granted' } 
      };
    } catch (error) {
      console.log('❌ ERROR checking permissions:', error);
      return { status: 'error', message: error.message, data: null };
    }
  }

  async checkExpoToken() {
    console.log('3️⃣ Checking Expo push token...');
    
    try {
      // Lấy project ID
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                       Constants.easConfig?.projectId ?? 
                       Constants.expoConfig?.projectId;
      
      console.log('Project ID:', projectId);
      
      if (!projectId) {
        console.log('❌ ERROR: No project ID found in app config');
        return { 
          status: 'error', 
          message: 'Project ID not found',
          data: { 
            expoConfig: Constants.expoConfig,
            easConfig: Constants.easConfig 
          }
        };
      }

      // Lấy token
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenResponse.data;
      
      console.log('Expo Push Token:', token);
      
      // Lưu token
      await AsyncStorage.setItem('expoPushToken', token);
      
      console.log('✅ Expo token check passed\n');
      return { 
        status: 'success', 
        data: { token, projectId } 
      };
    } catch (error) {
      console.log('❌ ERROR getting Expo token:', error);
      return { status: 'error', message: error.message, data: null };
    }
  }

  async checkFirebaseIntegration() {
    console.log('4️⃣ Checking Firebase integration...');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ ERROR: No authenticated user');
        return { status: 'error', message: 'User not authenticated', data: null };
      }

      console.log('Current user:', user.uid);
      
      // Kiểm tra user document trong Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log('❌ ERROR: User document not found in Firestore');
        return { status: 'error', message: 'User document not found', data: null };
      }

      const userData = userDoc.data();
      console.log('User data:', userData);
      
      // Kiểm tra FCM tokens
      const fcmTokens = userData.fcmTokens || {};
      console.log('FCM tokens:', fcmTokens);
      
      console.log('✅ Firebase integration check passed\n');
      return { 
        status: 'success', 
        data: { 
          userId: user.uid, 
          fcmTokens,
          notificationSettings: userData.notificationSettings || {}
        } 
      };
    } catch (error) {
      console.log('❌ ERROR checking Firebase:', error);
      return { status: 'error', message: error.message, data: null };
    }
  }

  async checkNotificationSettings() {
    console.log('5️⃣ Checking notification settings...');
    
    try {
      // Lấy từ AsyncStorage
      const localSettings = await AsyncStorage.getItem('notificationSettings');
      console.log('Local settings:', localSettings);
      
      // Lấy từ Firestore
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const firestoreSettings = userDoc.data()?.notificationSettings;
        console.log('Firestore settings:', firestoreSettings);
        
        return { 
          status: 'success', 
          data: { 
            local: localSettings ? JSON.parse(localSettings) : null,
            firestore: firestoreSettings || null
          } 
        };
      }
      
      return { 
        status: 'partial', 
        data: { 
          local: localSettings ? JSON.parse(localSettings) : null,
          firestore: null
        } 
      };
    } catch (error) {
      console.log('❌ ERROR checking settings:', error);
      return { status: 'error', message: error.message, data: null };
    }
  }

  async testLocalNotification() {
    console.log('6️⃣ Testing local notification...');
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from ChappAt',
          data: { type: 'test', timestamp: Date.now() },
        },
        trigger: null, // Hiển thị ngay lập tức
      });
      
      console.log('Test notification scheduled with ID:', notificationId);
      console.log('✅ Local notification test passed\n');
      
      return { 
        status: 'success', 
        data: { notificationId } 
      };
    } catch (error) {
      console.log('❌ ERROR testing local notification:', error);
      return { status: 'error', message: error.message, data: null };
    }
  }

  async fixCommonIssues() {
    console.log('🔧 ATTEMPTING TO FIX COMMON ISSUES...\n');
    
    const fixes = [];
    
    try {
      // Fix 1: Update Expo push token in Firestore with safe key
      const user = auth.currentUser;
      if (user) {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                         Constants.easConfig?.projectId;
        
        if (projectId) {
          const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
          const token = tokenResponse.data;
          
          // Tạo safe key cho Firestore
          const safeTokenKey = token
            .replace(/\[/g, '_LB_')
            .replace(/\]/g, '_RB_')
            .replace(/~/g, '_TLD_')
            .replace(/\*/g, '_AST_')
            .replace(/\//g, '_SL_');
          
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            [`expoPushTokens.${safeTokenKey}`]: {
              token: token,
              timestamp: new Date().toISOString(),
              device: 'unknown',
              appVersion: Constants.expoConfig?.version || '1.0.0'
            },
            currentExpoPushToken: token,
            lastTokenUpdate: new Date().toISOString()
          });
          
          fixes.push('✅ Updated Expo push token in Firestore with safe encoding');
        }
      }
      
      // Fix 2: Reset notification settings if corrupted
      const localSettings = await AsyncStorage.getItem('notificationSettings');
      if (!localSettings) {
        const defaultSettings = {
          messages: true,
          groups: true,
          calls: true,
          friendRequests: true,
          system: true,
          sounds: true,
          vibration: true,
        };
        
        await AsyncStorage.setItem('notificationSettings', JSON.stringify(defaultSettings));
        fixes.push('✅ Reset notification settings to defaults');
      }
      
      // Fix 3: Clear notification badges
      await Notifications.setBadgeCountAsync(0);
      fixes.push('✅ Cleared notification badges');
      
      console.log('🎉 FIXES APPLIED:');
      fixes.forEach(fix => console.log(fix));
      
      return { status: 'success', fixes };
    } catch (error) {
      console.log('❌ ERROR applying fixes:', error);
      return { status: 'error', message: error.message, fixes };
    }
  }
}

export default new NotificationDebugger();
