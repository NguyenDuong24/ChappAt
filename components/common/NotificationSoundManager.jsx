import React, { useEffect } from 'react';
import { useSound } from '../../hooks/useSound';

export const NotificationSoundManager = ({ 
  notification, 
  type = 'default' 
}) => {
  const { 
    playNotificationSound, 
    playMessageReceivedSound,
    playSuccessSound,
    playErrorSound 
  } = useSound();

  useEffect(() => {
    if (notification) {
      switch (type) {
        case 'message':
          playMessageReceivedSound();
          break;
        case 'success':
          playSuccessSound();
          break;
        case 'error':
          playErrorSound();
          break;
        default:
          playNotificationSound();
          break;
      }
    }
  }, [notification, type, playNotificationSound, playMessageReceivedSound, playSuccessSound, playErrorSound]);

  return null;
};

export default NotificationSoundManager;
