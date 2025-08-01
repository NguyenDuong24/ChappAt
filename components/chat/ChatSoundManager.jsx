import React, { useEffect, useRef } from 'react';
import { useSound } from '../../hooks/useSound';

export const ChatSoundManager = ({ 
  onMessageSent, 
  onMessageReceived, 
  onTyping,
  onError,
  onSuccess 
}) => {
  const { 
    playMessageReceivedSound, 
    playMessageSentSound, 
    playTypingSound,
    playErrorSound,
    playSuccessSound 
  } = useSound();

  const lastMessageSentRef = useRef(null);
  const lastMessageReceivedRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Play sound when message is sent
  useEffect(() => {
    if (onMessageSent && onMessageSent !== lastMessageSentRef.current) {
      playMessageSentSound();
      lastMessageSentRef.current = onMessageSent;
    }
  }, [onMessageSent, playMessageSentSound]);

  // Play sound when message is received
  useEffect(() => {
    if (onMessageReceived && onMessageReceived !== lastMessageReceivedRef.current) {
      playMessageReceivedSound();
      lastMessageReceivedRef.current = onMessageReceived;
    }
  }, [onMessageReceived, playMessageReceivedSound]);

  // Play typing sound (with debounce)
  useEffect(() => {
    if (onTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        playTypingSound();
      }, 200); // Debounce 200ms
    }
  }, [onTyping, playTypingSound]);

  // Play error sound
  useEffect(() => {
    if (onError) {
      playErrorSound();
    }
  }, [onError, playErrorSound]);

  // Play success sound
  useEffect(() => {
    if (onSuccess) {
      playSuccessSound();
    }
  }, [onSuccess, playSuccessSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ChatSoundManager;
