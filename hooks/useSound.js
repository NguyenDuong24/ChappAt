import { useAudio } from '../context/AudioContext';
import { useCallback, useEffect, useState } from 'react';
import { SoundSettings } from '../utils/soundSettings';

export const useSound = () => {
  const { playSound, stopSound, stopAllSounds } = useAudio();
  const [soundSettings, setSoundSettings] = useState(null);

  // Load sound settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await SoundSettings.getSettings();
      setSoundSettings(settings);
    };
    loadSettings();
  }, []);

  // Helper to play sound with settings
  const playSoundWithSettings = useCallback(async (soundName, category, options = {}) => {
    if (!soundSettings?.enabled) return;
    
    const volume = await SoundSettings.getVolume(category);
    const finalOptions = { ...options, volume: volume * (options.volume || 1) };
    
    return playSound(soundName, finalOptions);
  }, [playSound, soundSettings]);

  // Âm thanh cuộc gọi đến
  const playIncomingCallSound = useCallback(() => {
    return playSoundWithSettings('incomingCall', 'calls', { isLooping: true, volume: 1.0 });
  }, [playSoundWithSettings]);

  // Âm thanh cuộc gọi đi
  const playOutgoingCallSound = useCallback(() => {
    return playSoundWithSettings('outgoingCall', 'calls', { isLooping: true, volume: 0.8 });
  }, [playSoundWithSettings]);

  // Âm thanh tin nhắn nhận
  const playMessageReceivedSound = useCallback(() => {
    return playSoundWithSettings('messageReceived', 'messages', { volume: 0.7 });
  }, [playSoundWithSettings]);

  // Âm thanh tin nhắn gửi
  const playMessageSentSound = useCallback(() => {
    return playSoundWithSettings('messageSent', 'messages', { volume: 0.5 });
  }, [playSoundWithSettings]);

  // Âm thanh thông báo
  const playNotificationSound = useCallback(() => {
    return playSoundWithSettings('notification', 'notifications', { volume: 0.8 });
  }, [playSoundWithSettings]);

  // Âm thanh kết thúc cuộc gọi
  const playCallEndSound = useCallback(() => {
    return playSoundWithSettings('callEnd', 'calls', { volume: 0.8 });
  }, [playSoundWithSettings]);

  // Âm thanh chấp nhận cuộc gọi
  const playCallAcceptedSound = useCallback(() => {
    return playSoundWithSettings('callAccepted', 'calls', { volume: 0.7 });
  }, [playSoundWithSettings]);

  // Âm thanh typing
  const playTypingSound = useCallback(() => {
    return playSoundWithSettings('typing', 'system', { volume: 0.3 });
  }, [playSoundWithSettings]);

  // Âm thanh thành công
  const playSuccessSound = useCallback(() => {
    return playSoundWithSettings('success', 'system', { volume: 0.6 });
  }, [playSoundWithSettings]);

  // Âm thanh lỗi
  const playErrorSound = useCallback(() => {
    return playSoundWithSettings('error', 'system', { volume: 0.6 });
  }, [playSoundWithSettings]);

  // Dừng âm thanh cuộc gọi
  const stopCallSounds = useCallback(() => {
    stopSound('incomingCall');
    stopSound('outgoingCall');
  }, [stopSound]);

  return {
    playIncomingCallSound,
    playOutgoingCallSound,
    playMessageReceivedSound,
    playMessageSentSound,
    playNotificationSound,
    playCallEndSound,
    playCallAcceptedSound,
    playTypingSound,
    playSuccessSound,
    playErrorSound,
    stopCallSounds,
    stopAllSounds,
    soundSettings,
    setSoundSettings,
  };
};
