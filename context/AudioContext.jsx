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
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // Temporary disable sound loading to prevent errors
  const ENABLE_SOUNDS = false;

  // Simple sound notification system without actual audio files
  const soundAssets = {};

  // Khởi tạo Audio
  const initializeAudio = async () => {
    try {
      console.log('🔇 Audio system disabled - no sounds will be loaded');
      setIsInitialized(true);
      setSoundsLoaded(true);
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      setIsInitialized(true);
      setSoundsLoaded(true);
    }
  };

  // Preload âm thanh
  const preloadSounds = async () => {
    if (!ENABLE_SOUNDS) return;
    
    try {
      for (const [key, source] of Object.entries(soundAssets)) {
        try {
          const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
          soundsRef.current[key] = sound;
        } catch (error) {
          // Silently handle missing sound files
          soundsRef.current[key] = null;
        }
      }
    } catch (error) {
      // Silently handle preload errors
    }
  };

  // Phát âm thanh
  const playSound = async (soundName, options = {}) => {
    if (!ENABLE_SOUNDS) {
      // Disable console log to prevent spam and lag
      // console.log(`🔊 Would play sound: ${soundName}`);
      return;
    }

    try {
      if (!isInitialized) {
        await initializeAudio();
      }

      const sound = soundsRef.current[soundName];
      if (sound) {
        await sound.setPositionAsync(0);
        
        if (options.volume !== undefined) {
          await sound.setVolumeAsync(options.volume);
        }

        if (options.isLooping !== undefined) {
          await sound.setIsLoopingAsync(options.isLooping);
        }

        await sound.playAsync();
        return sound;
      }
    } catch (error) {
      // Silently handle play errors
    }
  };

  // Dừng âm thanh
  const stopSound = async (soundName) => {
    if (!ENABLE_SOUNDS) return;
    
    try {
      const sound = soundsRef.current[soundName];
      if (sound) {
        await sound.stopAsync();
      }
    } catch (error) {
      // Silently handle stop errors
    }
  };

  // Dừng tất cả âm thanh
  const stopAllSounds = async () => {
    if (!ENABLE_SOUNDS) return;
    
    try {
      for (const sound of Object.values(soundsRef.current)) {
        if (sound) {
          await sound.stopAsync();
        }
      }
    } catch (error) {
      // Silently handle stop all errors
    }
  };

  // Cleanup
  const cleanup = async () => {
    if (!ENABLE_SOUNDS) return;
    
    try {
      for (const sound of Object.values(soundsRef.current)) {
        if (sound) {
          await sound.unloadAsync();
        }
      }
      soundsRef.current = {};
    } catch (error) {
      // Silently handle cleanup errors
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
    soundsLoaded,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
