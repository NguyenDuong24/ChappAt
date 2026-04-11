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

  // Enable sound system
  const ENABLE_SOUNDS = true;

  // Sound assets mapping
  const soundAssets = {
    incomingCall: require('../assets/sounds/incoming.mp3'),
    outgoingCall: require('../assets/sounds/outcoming.mp3'),
    messageReceived: require('../assets/sounds/notification.mp3'),
    messageSent: require('../assets/sounds/join.mp3'),
    notification: require('../assets/sounds/notification.mp3'),
    callEnd: require('../assets/sounds/join.mp3'),
    callAccepted: require('../assets/sounds/join.mp3'),
    typing: require('../assets/sounds/join.mp3'),
    success: require('../assets/sounds/join.mp3'),
    error: require('../assets/sounds/calling.mp3'),
  };

  // Khởi tạo Audio
  const initializeAudio = async () => {
    if (Platform.OS === 'android') {
      // Disable audio on Android to prevent ExoPlayer thread access crash
      console.log('🔇 Audio disabled on Android to prevent ExoPlayer issues');
      setIsInitialized(true);
      setSoundsLoaded(true);
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('Audio system initialized successfully');
      await preloadSounds();
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
    if (Platform.OS === 'android') return; // Skip on Android
    
    if (!ENABLE_SOUNDS) return;
    
    console.log('🔊 Starting to preload sounds...');
    try {
      for (const [key, source] of Object.entries(soundAssets)) {
        try {
          console.log(`🔊 Loading sound: ${key}`);
          const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
          soundsRef.current[key] = sound;
          console.log(`✅ Loaded sound: ${key}`);
        } catch (error) {
          console.error(`❌ Failed to load sound ${key}:`, error);
          soundsRef.current[key] = null;
        }
      }
      console.log('🔊 Preload complete!');
    } catch (error) {
      console.error('❌ Error in preloadSounds:', error);
    }
  };

  // Phát âm thanh
  const playSound = async (soundName, options = {}) => {
    if (Platform.OS === 'android') return; // Skip on Android
    
    if (!ENABLE_SOUNDS) {
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
        console.log(`🔊 Playing sound: ${soundName}`);
        return sound;
      } else {
        console.warn(`Sound not loaded: ${soundName}`);
      }
    } catch (error) {
      console.error(`Error playing sound ${soundName}:`, error);
    }
  };

  // Dừng âm thanh
  const stopSound = async (soundName) => {
    if (Platform.OS === 'android') return; // Skip on Android
    
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
    if (Platform.OS === 'android') return; // Skip on Android
    
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
    if (Platform.OS === 'android') return; // Skip on Android
    
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
