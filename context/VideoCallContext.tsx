import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';
import { createMeeting, token } from '@/api';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface CallParticipant {
  id: string;
  displayName: string;
  isLocal: boolean;
  micOn: boolean;
  webcamOn: boolean;
}

interface VideoCallContextType {
  // Meeting states
  isInCall: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  participants: CallParticipant[];
  meetingId: string | null;
  callType: 'audio' | 'video' | null;
  isConnecting: boolean;
  
  // Meeting controls
  createMeeting: () => Promise<string>;
  joinMeeting: (meetingId: string, callType: 'audio' | 'video') => void;
  leaveMeeting: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  
  // Call management
  initiateCall: (receiverId: string, callType: 'audio' | 'video') => Promise<string>;
  acceptCall: (callData: any) => Promise<void>;
  rejectCall: (callData: any) => Promise<void>;
  endCall: () => Promise<void>;
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined);

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within VideoCallProvider');
  }
  return context;
};

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Create meeting using api.js
  const createNewMeeting = async (): Promise<string> => {
    try {
      console.log('Creating meeting with VideoSDK...');
      const meetingId = await createMeeting({ token });
      setMeetingId(meetingId);
      console.log('Meeting created successfully:', meetingId);
      return meetingId;
    } catch (error) {
      console.error('Error creating meeting:', error);
      Alert.alert('Error', 'Failed to create meeting');
      throw error;
    }
  };

  // Join meeting
  const joinMeeting = (meetingId: string, type: 'audio' | 'video') => {
    setIsConnecting(true);
    setMeetingId(meetingId);
    setCallType(type);
    setIsInCall(true);
    if (type === 'audio') {
      setIsCameraOn(false);
    }
    // Set connecting to false after a delay to allow VideoSDK to initialize
    setTimeout(() => setIsConnecting(false), 1000);
  };

  // Leave meeting
  const leaveMeeting = () => {
    setIsConnecting(false);
    setIsInCall(false);
    setMeetingId(null);
    setCallType(null);
    setParticipants([]);
    setIsMicOn(true);
    setIsCameraOn(true);
    setIsScreenSharing(false);
  };

  // Toggle microphone
  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    // VideoSDK integration will handle actual mute/unmute
  };

  // Toggle camera
  const toggleCamera = () => {
    if (callType === 'video') {
      setIsCameraOn(!isCameraOn);
      // VideoSDK integration will handle actual enable/disable camera
    }
  };

  // Toggle screen share
  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // VideoSDK integration will handle actual screen share
  };

  // Initiate call
  const initiateCall = async (receiverId: string, type: 'audio' | 'video') => {
    try {
      console.log('🚀 Initiating call:', { receiverId, type });
      const newMeetingId = await createNewMeeting();
      
      // Save call information to Firebase
      const callData = {
        meetingId: newMeetingId,
        callerId: 'current-user-id', // Replace with actual current user ID
        receiverId: receiverId,
        type: type,
        status: 'calling',
        createdAt: new Date(),
      };
      
      console.log('💾 Saving call to Firebase:', callData);
      await addDoc(collection(db, 'calls'), callData);
      
      console.log('✅ Call initiated with meetingId:', newMeetingId);
      joinMeeting(newMeetingId, type);
      return newMeetingId; // Return meeting ID for navigation
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Error', 'Failed to initiate call');
      throw error;
    }
  };

  // Accept call
  const acceptCall = async (callData: any) => {
    try {
      console.log('✅ Call accepted in context:', callData);
      // Join meeting với thông tin từ callData
      if (callData.meetingId && callData.type) {
        joinMeeting(callData.meetingId, callData.type);
      } else if (callData.meetingId && callData.callType) {
        joinMeeting(callData.meetingId, callData.callType);
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      Alert.alert('Error', 'Failed to accept call');
    }
  };

  // Reject call
  const rejectCall = async (callData: any) => {
    try {
      // TODO: Update Firebase call status
      console.log('Call rejected:', callData);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  // End call
  const endCall = async () => {
    try {
      // TODO: Update Firebase call status
      console.log('Call ended:', meetingId);
      leaveMeeting();
    } catch (error) {
      console.error('Error ending call:', error);
      leaveMeeting(); // Still leave the call even if Firebase update fails
    }
  };

  const value: VideoCallContextType = {
    isInCall,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    participants,
    meetingId,
    callType,
    isConnecting,
    createMeeting: createNewMeeting,
    joinMeeting,
    leaveMeeting,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
};
