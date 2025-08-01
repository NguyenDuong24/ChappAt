import React, { createContext, useContext, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const AudioContext = createContext();

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const soundsRef = useRef({});

  // Danh sách âm thanh với fallback URLs từ internet
  const soundAssets = {
    incomingCall: { uri: 'https://www.soundjay.com/misc/sounds/ring07.wav' },
    outgoingCall: { uri: 'https://www.soundjay.com/misc/sounds/ring06.wav' },
    messageReceived: { uri: 'https://www.soundjay.com/misc/sounds/message-incoming-132126.mp3' },
    messageSent: { uri: 'https://www.soundjay.com/misc/sounds/message-sent-sound.mp3' },
    notification: { uri: 'https://www.soundjay.com/misc/sounds/notification-sound.mp3' },
    callEnd: { uri: 'https://www.soundjay.com/misc/sounds/call-end.mp3' },
    callAccepted: { uri: 'https://www.soundjay.com/misc/sounds/call-accepted.mp3' },
    typing: { uri: 'https://www.soundjay.com/misc/sounds/typing.mp3' },
    success: { uri: 'https://www.soundjay.com/misc/sounds/success.mp3' },
    error: { uri: 'https://www.soundjay.com/misc/sounds/error.mp3' },
  };

  // Khởi tạo Audio
  const initializeAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

      // Preload các âm thanh
      await preloadSounds();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      setIsInitialized(true); // Vẫn cho phép app hoạt động
    }
  };

  // Preload âm thanh
  const preloadSounds = async () => {
    try {
      for (const [key, source] of Object.entries(soundAssets)) {
        try {
          const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
          soundsRef.current[key] = sound;
        } catch (error) {
          console.warn(`Failed to preload sound ${key}:`, error);
          // Tạo silent sound fallback
          soundsRef.current[key] = null;
        }
      }
    } catch (error) {
      console.error('Failed to preload sounds:', error);
    }
  };

  // Phát âm thanh
  const playSound = async (soundName, options = {}) => {
    try {
      if (!isInitialized) {
        await initializeAudio();
      }

      const sound = soundsRef.current[soundName];
      if (sound) {
        // Reset position
        await sound.setPositionAsync(0);
        
        // Set volume
        if (options.volume !== undefined) {
          await sound.setVolumeAsync(options.volume);
        }

        // Set looping
        if (options.isLooping !== undefined) {
          await sound.setIsLoopingAsync(options.isLooping);
        }

        await sound.playAsync();
        return sound;
      } else {
        console.warn(`Sound ${soundName} not available`);
      }
    } catch (error) {
      console.error(`Failed to play sound ${soundName}:`, error);
    }
  };

  // Dừng âm thanh
  const stopSound = async (soundName) => {
    try {
      const sound = soundsRef.current[soundName];
      if (sound) {
        await sound.stopAsync();
      }
    } catch (error) {
      console.error(`Failed to stop sound ${soundName}:`, error);
    }
  };

  // Dừng tất cả âm thanh
  const stopAllSounds = async () => {
    try {
      for (const sound of Object.values(soundsRef.current)) {
        if (sound) {
          await sound.stopAsync();
        }
      }
    } catch (error) {
      console.error('Failed to stop all sounds:', error);
    }
  };

  // Cleanup
  const cleanup = async () => {
    try {
      for (const sound of Object.values(soundsRef.current)) {
        if (sound) {
          await sound.unloadAsync();
        }
      }
      soundsRef.current = {};
    } catch (error) {
      console.error('Failed to cleanup sounds:', error);
    }
  };

  React.useEffect(() => {
    initializeAudio();
    return cleanup;
  }, []);

  const value = {
    playSound,
    stopSound,
    stopAllSounds,
    isInitialized,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
