// 🎵 Sound Notification - Example Usage

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSound } from '@/hooks/useSound';

/**
 * Example 1: Basic Chat Screen with Sound
 */
export const ChatScreenExample = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const currentUserId = 'user123';
  
  const { playMessageReceivedSound, playMessageSentSound } = useSound();
  const previousCountRef = useRef(0);

  // Play sound when new message received
  useEffect(() => {
    if (messages.length > previousCountRef.current && previousCountRef.current > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // Only play sound if message is from another user
      if (latestMessage.userId !== currentUserId) {
        playMessageReceivedSound();
      }
    }
    previousCountRef.current = messages.length;
  }, [messages, currentUserId, playMessageReceivedSound]);

  const handleSend = async () => {
    // Send message logic
    await sendMessage(input);
    
    // Play sent sound
    playMessageSentSound();
    
    setInput('');
  };

  return (
    <View>
      {/* Your chat UI */}
    </View>
  );
};

/**
 * Example 2: Notification Handler with Sound
 */
export const NotificationExample = () => {
  const { playNotificationSound } = useSound();

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 Notification received:', notification);
        
        // Play notification sound
        playNotificationSound();
        
        // Handle notification
        handleNotification(notification);
      }
    );

    return () => subscription.remove();
  }, [playNotificationSound]);

  return null;
};

/**
 * Example 3: Call Screen with Sound
 */
export const CallScreenExample = () => {
  const {
    playIncomingCallSound,
    playOutgoingCallSound,
    playCallAcceptedSound,
    playCallEndSound,
    stopCallSounds
  } = useSound();

  const handleIncomingCall = () => {
    // Play incoming call sound (looping)
    playIncomingCallSound();
  };

  const handleAcceptCall = () => {
    // Stop ringing
    stopCallSounds();
    
    // Play accepted sound
    playCallAcceptedSound();
  };

  const handleEndCall = () => {
    // Stop all call sounds
    stopCallSounds();
    
    // Play end sound
    playCallEndSound();
  };

  return (
    <View>
      {/* Your call UI */}
    </View>
  );
};

/**
 * Example 4: Group Chat with Sound
 */
export const GroupChatExample = () => {
  const { playMessageReceivedSound, playMessageSentSound } = useSound();
  const [groupMessages, setGroupMessages] = useState([]);
  const previousCountRef = useRef(0);
  const currentUser = useAuth();

  // Monitor new messages
  useEffect(() => {
    if (groupMessages.length > previousCountRef.current && previousCountRef.current > 0) {
      const latestMessage = groupMessages[groupMessages.length - 1];
      
      // Check if message is from another user
      if (latestMessage.uid !== currentUser.uid) {
        playMessageReceivedSound();
      }
    }
    previousCountRef.current = groupMessages.length;
  }, [groupMessages, currentUser.uid, playMessageReceivedSound]);

  const handleSendGroupMessage = async (text) => {
    await sendToGroup(text);
    playMessageSentSound();
  };

  return null;
};

/**
 * Example 5: Custom Sound Volume
 */
export const CustomVolumeExample = () => {
  const { playSound } = useAudio(); // Direct access to AudioContext

  const playQuietNotification = () => {
    playSound('notification', { volume: 0.3 }); // 30% volume
  };

  const playLoudNotification = () => {
    playSound('notification', { volume: 1.0 }); // 100% volume
  };

  return null;
};

/**
 * Example 6: Sound Settings UI
 */
export const SoundSettingsExample = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playSuccessSound } = useSound();

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    // Update in AudioContext
    // You can add a setSoundEnabled function in AudioContext
    
    if (!soundEnabled) {
      playSuccessSound(); // Play confirmation
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleSound}>
        <Text>Sound: {soundEnabled ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Example 7: All Available Sound Functions
 */
export const AllSoundsExample = () => {
  const {
    // Message sounds
    playMessageReceivedSound,
    playMessageSentSound,
    
    // Call sounds
    playIncomingCallSound,
    playOutgoingCallSound,
    playCallAcceptedSound,
    playCallEndSound,
    
    // Notification sounds
    playNotificationSound,
    
    // System sounds
    playTypingSound,
    playSuccessSound,
    playErrorSound,
    
    // Control
    stopCallSounds,
    stopAllSounds,
  } = useSound();

  const testAllSounds = () => {
    console.log('Testing all sounds...');
    
    setTimeout(() => playMessageReceivedSound(), 0);
    setTimeout(() => playMessageSentSound(), 1000);
    setTimeout(() => playNotificationSound(), 2000);
    setTimeout(() => playSuccessSound(), 3000);
    setTimeout(() => playErrorSound(), 4000);
  };

  return (
    <TouchableOpacity onPress={testAllSounds}>
      <Text>Test All Sounds</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Best Practices:
 * 
 * 1. Always check if message is from current user before playing sound
 * 2. Use useRef to track previous message count
 * 3. Add sound in useEffect with proper dependencies
 * 4. Clean up sound subscriptions on unmount
 * 5. Test on real devices (emulator may not play sounds)
 * 6. Use volume control for different sound types
 * 7. Provide user settings to enable/disable sounds
 * 8. Don't spam sounds - debounce if needed
 */
