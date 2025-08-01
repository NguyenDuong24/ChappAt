import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Component quản lý App State
 * Theo dõi khi app chuyển đổi giữa foreground/background
 */
const AppStateManager = ({ children }) => {
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      console.log(`App state changed from ${appState} to ${nextAppState}`);
      setAppState(nextAppState);
      
      // Có thể thêm logic xử lý khi app state thay đổi
      if (nextAppState === 'background') {
        // App đang chuyển sang background
        console.log('App moved to background');
      } else if (nextAppState === 'active') {
        // App đang active
        console.log('App is now active');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  return children;
};

export default AppStateManager;
