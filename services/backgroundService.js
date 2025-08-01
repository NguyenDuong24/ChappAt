import * as TaskManager from "expo-task-manager";
import * as Notifications from 'expo-notifications';

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";

/**
 * Định nghĩa background task cho notifications
 */
const defineBackgroundNotificationTask = () => {
  TaskManager.defineTask(
    BACKGROUND_NOTIFICATION_TASK,
    ({ data, error, executionInfo }) => {
      console.log("✅ Received a notification in the background!", {
        data,
        error,
        executionInfo,
      });
      // Xử lý notification data ở đây
      // Có thể lưu vào local storage hoặc gửi đến analytics
    }
  );
};

/**
 * Đăng ký background task
 */
const registerBackgroundNotificationTask = async () => {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log("Background notification task registered successfully");
  } catch (error) {
    console.error("Failed to register background notification task:", error);
  }
};

/**
 * Khởi tạo tất cả background services
 */
export const initializeBackgroundServices = () => {
  defineBackgroundNotificationTask();
  registerBackgroundNotificationTask();
};

export { BACKGROUND_NOTIFICATION_TASK };
