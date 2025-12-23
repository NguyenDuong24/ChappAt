import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

class CallTimeoutService {
  constructor() {
    this.timeouts = new Map();
    this.appStateListener = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;

    console.log('⏰ Initializing call timeout service...');

    // Listen for app state changes
    this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    this.isInitialized = true;
    console.log('✅ Call timeout service initialized');
  }

  /**
   * Bắt đầu timeout cho cuộc gọi
   * @param callId ID của cuộc gọi
   * @param timeoutMs Thời gian timeout (mặc định 30 giây)
   */
  startCallTimeout(callId, timeoutMs = 30000, onTimeoutCallback) {
    console.log(`⏰ Starting timeout for call ${callId}, duration: ${timeoutMs}ms`);

    // Clear existing timeout if any
    this.clearCallTimeout(callId);

    // Set new timeout
    const timeout = setTimeout(async () => {
      console.log(`⏰ Call ${callId} timed out, auto-cancelling...`);

      try {
        if (onTimeoutCallback && typeof onTimeoutCallback === 'function') {
          await onTimeoutCallback();
        } else {
          console.warn(`⚠️ No timeout callback provided for call ${callId}`);
        }

        // Clear call notification
        await clearCallNotification(callId);

        console.log(`✅ Call ${callId} auto-cancelled due to timeout`);

        // Clear call notifications
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Remove from timeouts map
        this.timeouts.delete(callId);

      } catch (error) {
        console.error(`❌ Error auto-cancelling call ${callId}:`, error);
      }
    }, timeoutMs);

    // Store timeout
    this.timeouts.set(callId, timeout);
  }

  /**
   * Dừng timeout cho cuộc gọi (khi user trả lời hoặc từ chối)
   * @param callId ID của cuộc gọi
   */
  stopCallTimeout(callId) {
    console.log(`⏰ Stopping timeout for call ${callId}`);
    this.clearCallTimeout(callId);
  }

  /**
   * Xử lý khi app state thay đổi
   */
  handleAppStateChange(nextAppState) {
    console.log('📱 App state changed:', AppState.currentState, '->', nextAppState);

    if (nextAppState === 'active') {
      // App trở lại foreground - kiểm tra các cuộc gọi đang timeout
      this.checkAndCancelExpiredCalls();
    }
  }

  /**
   * Kiểm tra và huỷ các cuộc gọi đã hết thời gian khi app trở lại foreground
   */
  async checkAndCancelExpiredCalls() {
    console.log('🔍 Checking for expired calls...');

    // Trong thực tế, bạn có thể query Firebase để tìm các cuộc gọi
    // đang RINGING và đã tạo quá 30 giây trước
    // Nhưng để đơn giản, chúng ta sẽ dựa vào timeouts đang active

    // Lưu ý: Khi app killed và restart, timeouts sẽ bị reset
    // Nên logic này chủ yếu cho trường hợp app background
  }

  /**
   * Clear timeout cho một cuộc gọi
   */
  clearCallTimeout(callId) {
    const timeout = this.timeouts.get(callId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(callId);
      console.log(`🧹 Cleared timeout for call ${callId}`);
    }
  }

  /**
   * Lấy số lượng timeouts đang active
   */
  getActiveTimeoutsCount() {
    return this.timeouts.size;
  }

  /**
   * Cleanup service
   */
  cleanup() {
    console.log('🧹 Cleaning up call timeout service...');

    // Clear all timeouts
    for (const [callId, timeout] of this.timeouts) {
      clearTimeout(timeout);
      console.log(`🧹 Cleared timeout for call ${callId}`);
    }
    this.timeouts.clear();

    // Remove app state listener
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }

    this.isInitialized = false;
    console.log('✅ Call timeout service cleaned up');
  }
}

// Export singleton instance
export default new CallTimeoutService();

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
