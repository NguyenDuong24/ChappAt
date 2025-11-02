// Debug utility cho dự án
export const debugLog = {
  info: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`🔵 [INFO] ${message}`, data || '');
    }
  },
  
  error: (message: string, error?: any) => {
    if (__DEV__) {
      console.error(`🔴 [ERROR] ${message}`, error || '');
    }
  },
  
  warn: (message: string, data?: any) => {
    if (__DEV__) {
      console.warn(`🟡 [WARN] ${message}`, data || '');
    }
  },
  
  success: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`🟢 [SUCCESS] ${message}`, data || '');
    }
  },

  // Debug cho VideoSDK calls
  call: (action: string, data?: any) => {
    if (__DEV__) {
      console.log(`📞 [CALL] ${action}`, data || '');
    }
  },

  // Debug cho Firebase
  firebase: (action: string, data?: any) => {
    if (__DEV__) {
      console.log(`🔥 [FIREBASE] ${action}`, data || '');
    }
  }
};

// Performance tracking
export const performanceTracker = {
  start: (label: string) => {
    if (__DEV__) {
      console.time(label);
    }
  },
  
  end: (label: string) => {
    if (__DEV__) {
      console.timeEnd(label);
    }
  }
};
