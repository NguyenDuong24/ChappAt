/**
 * VietQR Payment Diagnostic Service
 * Helps debug why payments are not completing
 */

import { getAuth } from 'firebase/auth';

export const diagnosticService = {
  /**
   * Log current payment flow state
   */
  logPaymentFlow(stage: string, data: any) {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const log = {
      stage,
      timestamp,
      data,
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[DIAGNOSTIC] ${stage}`);
    console.log(`Time: ${timestamp}`);
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log(`${'='.repeat(60)}\n`);

    // Store in AsyncStorage for later debugging
    storeLog(log);
  },

  /**
   * Check if order exists in Firestore
   */
  async checkOrderExists(orderId: string) {
    try {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;

      if (!uid) {
        console.error('[DIAGNOSTIC] No UID found');
        return false;
      }

      const { getFirestore, doc, getDoc } = require('firebase/firestore');
      const db = getFirestore();
      const orderRef = doc(db, `users/${uid}/orders/${orderId}`);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        console.log('[DIAGNOSTIC] ✅ Order exists in Firestore:', orderSnap.data());
        return true;
      } else {
        console.error('[DIAGNOSTIC] ❌ Order does NOT exist in Firestore:', orderId);
        return false;
      }
    } catch (error) {
      console.error('[DIAGNOSTIC] Error checking order:', error);
      return false;
    }
  },

  /**
   * Check current order status
   */
  async checkOrderStatus(orderId: string) {
    try {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;

      if (!uid) {
        console.error('[DIAGNOSTIC] No UID found');
        return null;
      }

      const { getFirestore, doc, getDoc } = require('firebase/firestore');
      const db = getFirestore();
      const orderRef = doc(db, `users/${uid}/orders/${orderId}`);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        console.log('[DIAGNOSTIC] Current order status:', {
          orderId,
          status: orderData.status,
          amount: orderData.amount,
          createdAt: orderData.createdAt,
          product: orderData.product,
          verificationMethod: orderData.verificationMethod,
        });
        return orderData;
      } else {
        console.error('[DIAGNOSTIC] Order not found:', orderId);
        return null;
      }
    } catch (error) {
      console.error('[DIAGNOSTIC] Error:', error);
      return null;
    }
  },

  /**
   * Check server connectivity
   */
  async checkServerHealth() {
    try {
      const response = await fetch('https://saigondating-server.onrender.com/api/vietqr/order-status/test', {
        method: 'GET',
        timeout: 5000,
      }).catch(err => {
        // If we get 404 or 401, server is alive
        if (err.response?.status === 404 || err.response?.status === 401 || err.response?.status === 400) {
          return { status: 200, ok: true };
        }
        throw err;
      });

      if (response.ok || response.status === 200) {
        console.log('[DIAGNOSTIC] ✅ Server is responsive');
        return true;
      } else {
        console.error('[DIAGNOSTIC] ❌ Server returned:', response.status);
        return false;
      }
    } catch (error: any) {
      console.error('[DIAGNOSTIC] ❌ Server check failed:', error.message);
      return false;
    }
  },

  /**
   * Get payment status from backend
   */
  async getPaymentStatusFromBackend(orderId: string) {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken(false);

      if (!token) {
        console.error('[DIAGNOSTIC] No auth token');
        return null;
      }

      const response = await fetch(
        `https://saigondating-server.onrender.com/api/vietqr/order-status/${orderId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      console.log('[DIAGNOSTIC] Payment status from backend:', data);
      return data;
    } catch (error) {
      console.error('[DIAGNOSTIC] Error getting status:', error);
      return null;
    }
  },

  /**
   * Run full diagnostic
   */
  async runFullDiagnostic(orderId: string) {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 FULL PAYMENT DIAGNOSTIC');
    console.log('='.repeat(60) + '\n');

    const results = {
      orderId,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      checks: {
        firestore: false,
        firestoreStatus: null,
        server: false,
        backend: null,
      },
    };

    // Check 1: Firestore
    console.log('1️⃣  Checking Firestore...');
    const exists = await this.checkOrderExists(orderId);
    results.checks.firestore = exists;

    if (exists) {
      const orderData = await this.checkOrderStatus(orderId);
      results.checks.firestoreStatus = orderData?.status;
    }

    // Check 2: Server
    console.log('\n2️⃣  Checking server connectivity...');
    const serverOk = await this.checkServerHealth();
    results.checks.server = serverOk;

    // Check 3: Backend status
    console.log('\n3️⃣  Checking backend payment status...');
    const backendStatus = await this.getPaymentStatusFromBackend(orderId);
    results.checks.backend = backendStatus;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log(JSON.stringify(results, null, 2));
    console.log('='.repeat(60) + '\n');

    return results;
  },

  /**
   * Log possible issues
   */
  async analyzeProblem(orderId: string) {
    console.log('\n🔎 ANALYZING POTENTIAL ISSUES...\n');

    const orderExists = await this.checkOrderExists(orderId);
    const serverOk = await this.checkServerHealth();
    const backendStatus = await this.getPaymentStatusFromBackend(orderId);

    const issues: string[] = [];

    if (!orderExists) {
      issues.push('❌ Order does not exist in Firestore. Did create-payment succeed?');
    }

    if (!serverOk) {
      issues.push('❌ Server is not responding. Check Render.com dashboard');
    }

    if (orderExists && backendStatus?.status === 'pending') {
      issues.push('⚠️  Order is still pending. Possible causes:');
      issues.push('   • VietQRSmsBanking app is not running');
      issues.push('   • SMS was not received');
      issues.push('   • SMS was not sent to backend');
      issues.push('   • Amount mismatch');
    }

    if (orderExists && !backendStatus) {
      issues.push('❌ Cannot get status from backend');
    }

    if (issues.length === 0) {
      console.log('✅ No obvious issues found. Check:');
      console.log('   1. VietQRSmsBanking app logs');
      console.log('   2. Render backend logs');
      console.log('   3. Browser console for errors');
    } else {
      console.log('Potential Issues:');
      issues.forEach(issue => console.log(issue));
    }

    console.log('\n');
  },
};

/**
 * Store logs in AsyncStorage for debugging
 */
async function storeLog(log: any) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const existing = await AsyncStorage.getItem('payment_debug_logs');
    const logs = existing ? JSON.parse(existing) : [];
    logs.push(log);
    // Keep only last 50 logs
    await AsyncStorage.setItem('payment_debug_logs', JSON.stringify(logs.slice(-50)));
  } catch (error) {
    console.warn('Could not store debug log:', error);
  }
}
