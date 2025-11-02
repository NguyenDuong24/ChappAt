// Network request interceptor cho debug
export const networkDebugger = {
  logRequest: (url: string, method: string, data?: any) => {
    if (__DEV__) {
      console.group(`🌐 [${method.toUpperCase()}] ${url}`);
      console.log('Request data:', data);
      console.groupEnd();
    }
  },

  logResponse: (url: string, status: number, data?: any) => {
    if (__DEV__) {
      const statusColor = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢';
      console.group(`${statusColor} [${status}] ${url}`);
      console.log('Response data:', data);
      console.groupEnd();
    }
  },

  logError: (url: string, error: any) => {
    if (__DEV__) {
      console.group(`🔴 [ERROR] ${url}`);
      console.error('Error details:', error);
      console.groupEnd();
    }
  }
};
