import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  View,
  FlatList,
  Alert,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  InteractionManager,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  useMediaDevice,
  MediaStream,
  RTCView,
} from '@videosdk.live/react-native-sdk';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createMeeting, getToken } from '@/api';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { endCall } from '@/services/firebaseCallService';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedGestureHandler,
  withRepeat,
  withTiming,
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { useAuth } from '@/context/authContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
// Removed DebugMonitor import for performance

const { width, height } = Dimensions.get('window');

// Enable/disable debug mode for call screen
const DEBUG_MODE = false;
const log = DEBUG_MODE ? console.log : () => { };

// Draggable Local Video Component - REANIMATED for 60fps smoothness
const DraggableLocalVideo = React.memo(function DraggableLocalVideo({ localParticipant, callType }: {
  localParticipant: any;
  callType: string;
}) {
  const translateX = useSharedValue(width - 140);
  const translateY = useSharedValue(100);
  const isDragging = useSharedValue(false);

  const panGestureEvent = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
      isDragging.value = true;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: () => {
      isDragging.value = false;
      const screenWidth = width - 120;
      const screenHeight = height - 160;

      // Snap to nearest edge (left or right)
      const finalX = translateX.value > (width / 2) - 60 ? screenWidth : 20;

      // Keep within vertical bounds
      const finalY = Math.min(Math.max(translateY.value, 60), screenHeight);

      translateX.value = withSpring(finalX, { damping: 15 });
      translateY.value = withSpring(finalY, { damping: 15 });
    },
  });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: withSpring(isDragging.value ? 1.05 : 1) },
      ],
      zIndex: isDragging.value ? 100 : 10,
      shadowOpacity: withSpring(isDragging.value ? 0.5 : 0.3),
    };
  });

  // Get participant ID - memoized
  const participantId = useMemo(() =>
    typeof localParticipant === 'string'
      ? localParticipant
      : localParticipant?.id || localParticipant,
    [localParticipant]
  );

  const {
    webcamStream,
    webcamOn,
    micOn,
  } = useParticipant(participantId, {
    onStreamEnabled: () => log('✅ Local webcam stream enabled'),
    onStreamDisabled: () => log('❌ Local webcam stream disabled'),
  });

  // MEMOIZED stream URL
  const streamURL = useMemo(() => {
    if (!webcamStream) return null;
    const stream = webcamStream as any;
    if (stream.toURL && typeof stream.toURL === 'function') {
      try { return stream.toURL(); } catch (e) { }
    }
    if (stream.track) {
      try { return new MediaStream([stream.track]).toURL(); } catch (e) { }
    }
    return stream.url || stream.uri || null;
  }, [webcamStream, (webcamStream as any)?.track]);

  if (callType === 'audio') return null;

  return (
    <PanGestureHandler onGestureEvent={panGestureEvent}>
      <Animated.View style={[styles.localVideoContainer, rStyle]}>
        {webcamOn && webcamStream && streamURL ? (
          <RTCView
            streamURL={streamURL}
            objectFit="cover"
            style={styles.localVideoStream}
            zOrder={1}
            mirror={true}
          />
        ) : (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.localVideoPlaceholder}
          >
            <Ionicons name="person-circle" size={40} color="#FFFFFF" />
            {!webcamOn && (
              <Text style={styles.localVideoOffText}>Camera Off</Text>
            )}
          </LinearGradient>
        )}

        {/* Local video status indicators */}
        <View style={styles.localVideoStatus}>
          <View style={[styles.localStatusIndicator, { backgroundColor: micOn ? '#4CAF50' : '#F44336' }]}>
            <Ionicons name={micOn ? "mic" : "mic-off"} size={10} color="#FFFFFF" />
          </View>
          <View style={[styles.localStatusIndicator, { backgroundColor: webcamOn ? '#4CAF50' : '#F44336' }]}>
            <Ionicons name={webcamOn ? "videocam" : "videocam-off"} size={10} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.localVideoName}>You</Text>
      </Animated.View>
    </PanGestureHandler>
  );
});

// Hook to play remote mic stream - OPTIMIZED with proper cleanup
function useRemoteAudio(micStream: any, micOn: boolean, participantId: string) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function playAudio() {
      // Prevent multiple simultaneous loading attempts
      if (isLoadingRef.current) return;

      if (micOn && micStream && micStream.track) {
        try {
          isLoadingRef.current = true;

          // Clean up previous sound first
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }

          const streamUrl = micStream.toURL ? micStream.toURL() : undefined;
          if (streamUrl && isMounted) {
            const sound = new Audio.Sound();
            await sound.loadAsync({ uri: streamUrl });
            if (isMounted) {
              await sound.playAsync();
              soundRef.current = sound;
            } else {
              await sound.unloadAsync();
            }
          }
        } catch (error) {
          log('Error playing remote audio:', error);
        } finally {
          isLoadingRef.current = false;
        }
      }
    }

    // Use InteractionManager to avoid blocking UI
    const handle = InteractionManager.runAfterInteractions(() => {
      playAudio();
    });

    return () => {
      isMounted = false;
      handle.cancel();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
    };
  }, [micStream, micOn, participantId]);
}

// Remote Video Component cho receiver (lớn) - OPTIMIZED with React.memo
const RemoteVideoView = React.memo(function RemoteVideoView({ participantId, callType, userName }: {
  participantId: string;
  callType: string;
  userName?: string | null;
}) {
  const {
    webcamStream,
    webcamOn,
    displayName,
    micOn,
    micStream,
  } = useParticipant(participantId, {
    onStreamEnabled: () => log('Remote stream enabled'),
    onStreamDisabled: () => log('Remote stream disabled'),
  });

  // Use the optimized hook for remote audio - ONLY ONCE (removed duplicate)
  useRemoteAudio(micStream, micOn, participantId);

  // Memoize webcam stream URL to prevent recalculation
  const webcamStreamURL = useMemo(() => {
    if (!webcamStream?.track) return null;
    try {
      return new MediaStream([webcamStream.track]).toURL();
    } catch (e) {
      log('Error getting webcam stream URL:', e);
      return null;
    }
  }, [webcamStream?.track]);

  return (
    <View style={styles.remoteVideoContainer}>
      {webcamOn && webcamStreamURL && callType === 'video' ? (
        <RTCView
          streamURL={webcamStreamURL}
          objectFit="cover"
          style={styles.remoteVideoStream}
        />
      ) : (
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={styles.remoteVideoPlaceholder}
        >
          <View style={styles.remoteAvatarContainer}>
            <Ionicons
              name="person-circle"
              size={callType === 'audio' ? 120 : 100}
              color="#FFFFFF"
            />
            <Text style={styles.remoteParticipantName}>
              {userName || displayName || "Remote User"}
            </Text>
            {callType === 'audio' && (
              <Text style={styles.audioCallLabel}>Audio Call</Text>
            )}
          </View>
        </LinearGradient>
      )}

      {/* Remote video status overlay */}
      <View style={styles.remoteVideoOverlay}>
        <View style={styles.remoteVideoStatus}>
          <View style={[styles.remoteStatusIndicator, { backgroundColor: micOn ? '#4CAF50' : '#F44336' }]}>
            <Ionicons name={micOn ? "mic" : "mic-off"} size={16} color="#FFFFFF" />
          </View>
          {callType === 'video' && (
            <View style={[styles.remoteStatusIndicator, { backgroundColor: webcamOn ? '#4CAF50' : '#F44336' }]}>
              <Ionicons name={webcamOn ? "videocam" : "videocam-off"} size={16} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={styles.remoteVideoName}>
          {userName || displayName || "Remote User"}
        </Text>
      </View>
    </View>
  );
});

// Audio service for call sounds
class AudioService {
  private static callingSound: Audio.Sound | null = null;
  private static joinSound: Audio.Sound | null = null;

  static async loadSounds() {
    try {
      // Ensure previous sounds are unloaded
      await this.cleanup();

      // Load calling sound
      const { sound: calling } = await Audio.Sound.createAsync(
        require('@/assets/sounds/calling.mp3'),
        { isLooping: true }
      );
      this.callingSound = calling;

      // Load join sound
      const { sound: join } = await Audio.Sound.createAsync(
        require('@/assets/sounds/join.mp3')
      );
      this.joinSound = join;
    } catch (error) {
      console.log('Error loading sounds:', error);
    }
  }

  static async playCallingSound() {
    try {
      if (this.callingSound) {
        await this.callingSound.replayAsync();
      }
    } catch (error) {
      console.log('Error playing calling sound:', error);
    }
  }

  static async stopCallingSound() {
    try {
      if (this.callingSound) {
        await this.callingSound.stopAsync();
      }
    } catch (error) {
      console.log('Error stopping calling sound:', error);
    }
  }

  static async playJoinSound() {
    try {
      if (this.joinSound) {
        await this.joinSound.replayAsync();
      }
    } catch (error) {
      console.log('Error playing join sound:', error);
    }
  }

  static async cleanup() {
    try {
      if (this.callingSound) {
        const sound = this.callingSound;
        this.callingSound = null;
        await sound.unloadAsync();
      }
      if (this.joinSound) {
        const sound = this.joinSound;
        this.joinSound = null;
        await sound.unloadAsync();
      }
    } catch (error) {
      console.log('Error cleaning up sounds:', error);
    }
  }
}
// JoinScreen Component - với UI đẹp hơn
function JoinScreen({ getMeetingId }: { getMeetingId: (id: string | null) => void }) {
  const [meetingVal, setMeetingVal] = useState("");
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.joinContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.iconWrapper}>
              <Ionicons name="videocam" size={60} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>Start Video Call</Text>
            <Text style={styles.subtitle}>Connect with your friends instantly</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => {
                getMeetingId(null);
              }}
              style={styles.createButton}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Create New Meeting</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                value={meetingVal}
                onChangeText={setMeetingVal}
                placeholder="Enter Meeting ID (XXXX-XXXX-XXXX)"
                style={styles.textInput}
                placeholderTextColor="#B0B0B0"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.joinButton,
                (!meetingVal.trim()) && styles.disabledButton
              ]}
              onPress={() => {
                getMeetingId(meetingVal);
              }}
              disabled={!meetingVal.trim()}
            >
              <Ionicons name="enter" size={24} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Join Meeting</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ControlsContainer Component - Enhanced with BlurView and Reanimated
// ControlsContainer Component - Enhanced with BlurView and Reanimated
function ControlsContainer({
  end,
  toggleWebcam,
  toggleMic,
  callType,
  micEnabled,
  webcamEnabled
}: {
  end: () => void;
  toggleWebcam: () => void;
  toggleMic: () => void;
  callType: string;
  micEnabled: boolean;
  webcamEnabled: boolean;
}) {
  const micScale = useSharedValue(1);
  const camScale = useSharedValue(1);
  const endScale = useSharedValue(1);

  const animatedMicStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));
  const animatedCamStyle = useAnimatedStyle(() => ({ transform: [{ scale: camScale.value }] }));
  const animatedEndStyle = useAnimatedStyle(() => ({ transform: [{ scale: endScale.value }] }));

  const animateButton = (scaleValue: any, callback: () => void) => {
    scaleValue.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    runOnJS(callback)();
  };

  return (
    <BlurView intensity={40} tint="dark" style={styles.controlsBlur}>
      <View style={styles.controls}>
        {/* Mic Button */}
        <Animated.View style={animatedMicStyle}>
          <TouchableOpacity
            onPress={() => animateButton(micScale, toggleMic)}
            style={[styles.controlButton, micEnabled ? styles.enabledButton : styles.disabledControlButton]}
            activeOpacity={0.8}
          >
            <Ionicons name={micEnabled ? "mic" : "mic-off"} size={24} color={micEnabled ? "#000000" : "#FFFFFF"} />
          </TouchableOpacity>
        </Animated.View>

        {/* Camera Button (Video calls only) */}
        {callType === 'video' && (
          <Animated.View style={animatedCamStyle}>
            <TouchableOpacity
              onPress={() => animateButton(camScale, toggleWebcam)}
              style={[styles.controlButton, webcamEnabled ? styles.enabledButton : styles.disabledControlButton]}
              activeOpacity={0.8}
            >
              <Ionicons name={webcamEnabled ? "videocam" : "videocam-off"} size={24} color={webcamEnabled ? "#000000" : "#FFFFFF"} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* End Call Button */}
        <Animated.View style={animatedEndStyle}>
          <TouchableOpacity
            onPress={() => animateButton(endScale, end)}
            style={[styles.controlButton, styles.endButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </BlurView>
  );
}

// ParticipantView Component - OPTIMIZED with Reanimated pulse
const ParticipantView = React.memo(function ParticipantView({ participantId, callType }: { participantId: string; callType?: string }) {
  const {
    webcamStream,
    webcamOn,
    displayName,
    micOn,
    micStream
  } = useParticipant(participantId, {
    onStreamEnabled: () => log('ParticipantView stream enabled'),
    onStreamDisabled: () => log('ParticipantView stream disabled'),
    onMediaStatusChanged: ({ kind, newStatus }) => log(`Media ${kind} status: ${newStatus}`),
  });

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  // Pulse animation when mic is on
  useEffect(() => {
    if (micOn) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(0);
      pulseScale.value = withTiming(1);
    }
  }, [micOn]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  }));

  // Memoize webcam stream URL
  const webcamStreamURL = useMemo(() => {
    if (!webcamStream?.track) return null;
    try {
      return new MediaStream([webcamStream.track]).toURL();
    } catch (e) {
      return null;
    }
  }, [webcamStream?.track]);

  // Play remote audio if available
  useRemoteAudio(micStream, micOn, participantId);

  return (
    <View style={styles.participantContainer}>
      <Animated.View style={pulseStyle} />
      {webcamOn && webcamStreamURL ? (
        <RTCView
          streamURL={webcamStreamURL}
          objectFit={"cover"}
          style={styles.videoStream}
        />
      ) : (
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.noVideoContainer}
        >
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color="#FFFFFF" />
          </View>
          <Text style={styles.participantName}>{displayName || "Participant"}</Text>
        </LinearGradient>
      )}

      {/* Mic and Camera status indicators */}
      <View style={styles.statusContainer}>
        <View style={styles.micStatus}>
          <Ionicons
            name={micOn ? "mic" : "mic-off"}
            size={16}
            color={micOn ? "#4CAF50" : "#F44336"}
          />
        </View>
        {callType === 'video' && (
          <View style={styles.cameraStatus}>
            <Ionicons
              name={webcamOn ? "videocam" : "videocam-off"}
              size={16}
              color={webcamOn ? "#4CAF50" : "#F44336"}
            />
          </View>
        )}
      </View>
    </View>
  );
});

// Modern ParticipantList với Picture-in-Picture layout - OPTIMIZED with React.memo
const ParticipantList = React.memo(function ParticipantList({ participants, callType, localParticipantId, otherUserName }: {
  participants: string[];
  callType: string;
  localParticipantId?: string;
  otherUserName?: string | null;
}) {
  // Memoize filtered participants to prevent recalculation
  const remoteParticipants = useMemo(() =>
    participants.filter(id => id !== localParticipantId),
    [participants, localParticipantId]
  );

  const firstRemoteParticipant = remoteParticipants[0];

  return (
    <View style={styles.modernCallContainer}>
      {/* Remote Video (Full Screen Background) */}
      {firstRemoteParticipant ? (
        <RemoteVideoView
          participantId={firstRemoteParticipant}
          callType={callType}
          userName={otherUserName}
        />
      ) : (
        <View style={styles.waitingContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.waitingGradient}
          >
            <Ionicons name="person-add" size={80} color="rgba(255,255,255,0.6)" />
            <Text style={styles.waitingText}>Waiting for others to join...</Text>
          </LinearGradient>
        </View>
      )}

      {/* Local Video (Picture-in-Picture) */}
      {localParticipantId && (
        <DraggableLocalVideo
          localParticipant={localParticipantId}
          callType={callType}
        />
      )}

      {/* Multiple participants indicator */}
      {remoteParticipants.length > 1 && (
        <View style={styles.multipleParticipantsIndicator}>
          <Text style={styles.participantCountText}>
            +{remoteParticipants.length - 1} more
          </Text>
        </View>
      )}
    </View>
  );
});

// MeetingView Component - với âm thanh và UI đẹp hơn + proper VideoSDK methods
function MeetingView({ callType, callId }: { callType: string; callId?: string }) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(true);
  const isMounted = useRef(true);
  const [otherUserName, setOtherUserName] = useState<string | null>(null);
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const { user } = useAuth(); // Get current user

  // Camera switching logic - Use Device ID for robustness
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const { getCameras } = useMediaDevice();

  // Loading animation values
  const loadingScale = useSharedValue(1);
  const loadingOpacity = useSharedValue(0.5);

  useEffect(() => {
    loadingScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
    loadingOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const loadingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingScale.value }],
    opacity: loadingOpacity.value,
  }));

  // Initial camera fetch and setup
  useEffect(() => {
    let mounted = true;
    const fetchCameras = async () => {
      try {
        const cams = await getCameras();
        if (mounted && cams && cams.length > 0) {
          setCameras(cams);

          // Try to identify the default (front) camera to sync state
          // Most apps default to front camera. We try to find it.
          const frontCam = cams.find((cam: any) =>
            cam.label?.toLowerCase().includes('front') ||
            cam.facingMode === 'user' ||
            cam.deviceId?.toLowerCase().includes('front')
          );

          if (frontCam) {
            setCurrentDeviceId(frontCam.deviceId);
          } else {
            // If can't determine, assume the first one (or the second if usually front is 2nd)
            // Often index 1 is front on mobile, but not always.
            // We'll default to the first one if no label matches, but this might be the "2 clicks" cause if wrong.
            // Better to assume we are on the one that looks like 'front' or just the first one.
            setCurrentDeviceId(cams[0].deviceId);
          }
        }
      } catch (e) {
        console.log("Error fetching cameras:", e);
      }
    };
    fetchCameras();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch other user's name and avatar
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!callId) return;
      try {
        // Fetch call document to get callerId and receiverId
        const callDoc = await getDoc(doc(db, 'calls', callId));
        if (callDoc.exists()) {
          const callData = callDoc.data();
          const otherUserId = callData.callerId === user?.uid ? callData.receiverId : callData.callerId;

          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setOtherUserName(userData.username || userData.displayName || 'Unknown User');
              setOtherUserAvatar(userData.profileUrl || userData.photoURL || null);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching other user name:', error);
      }
    };

    if (user?.uid) {
      fetchOtherUser();
    }
  }, [callId, user?.uid]);

  const {
    join,
    leave,
    end,
    toggleWebcam,
    toggleMic,
    changeWebcam,
    participants,
    meetingId,
    localMicOn,
    localWebcamOn,
    localParticipant
  } = useMeeting({
    onMeetingJoined: async () => {
      if (!isMounted.current) return;
      setIsConnecting(false);
      await AudioService.stopCallingSound();
      await AudioService.playJoinSound();
    },
    onMeetingLeft: async () => {
      // Update Firebase call status to ENDED
      if (callId) {
        try {
          await endCall(callId);
          console.log('✅ Call ended in Firebase:', callId);
        } catch (error) {
          console.error('❌ Error ending call in Firebase:', error);
        }
      }
      await AudioService.stopCallingSound();
      await AudioService.cleanup();
      if (isMounted.current) {
        // Always replace to home to avoid going back to IncomingCallScreen/ListenCallScreen
        router.replace('/(tabs)/home');
      }
    },
    onParticipantJoined: (participant) => {
    },
    onParticipantLeft: (participant) => {
    },
    onMicRequested: () => {
    },
    onWebcamRequested: () => {
    },
    onError: (error) => {
      console.error("❌ Meeting error:", error);
    },
  });

  const handleSwitchCamera = async () => {
    try {
      // Re-fetch cameras to ensure we have the latest list
      const currentCameras = await getCameras();
      if (currentCameras && currentCameras.length > 1) {
        setCameras(currentCameras); // Update list

        // Find index of current device
        let currentIndex = currentCameras.findIndex((c: any) => c.deviceId === currentDeviceId);

        // If current not found (e.g. first switch), try to guess or start from 0
        if (currentIndex === -1) {
          // Fallback: if we don't know where we are, we might be on Front.
          // Let's try to switch to Back (usually index 0 or labeled 'back').
          // Or just pick index 0.
          currentIndex = 0;
        }

        const nextIndex = (currentIndex + 1) % currentCameras.length;
        const nextCamera = currentCameras[nextIndex];

        console.log(`Switching camera: ${currentIndex} -> ${nextIndex} (${nextCamera.label})`);

        if (changeWebcam) {
          changeWebcam(nextCamera.deviceId);
          setCurrentDeviceId(nextCamera.deviceId);
        }
      } else {
        console.log("No alternative camera found");
      }
    } catch (e) {
      console.error("Error switching camera:", e);
    }
  };

  // Get participants từ useMeeting Hook - Memoized to prevent recalculation
  const participantsArrId = useMemo(() => [...participants.keys()], [participants]);

  // Auto join meeting và play calling sound - Use InteractionManager for better performance
  useEffect(() => {
    const initializeCall = async () => {
      // Use InteractionManager to avoid blocking UI
      InteractionManager.runAfterInteractions(async () => {
        // Load sounds
        await AudioService.loadSounds();

        // Play calling sound
        await AudioService.playCallingSound();

        // Join meeting
        join();
      });
    };

    initializeCall();

    // Cleanup on unmount - Proper leave call
    return () => {
      try {
        leave(); // Properly leave meeting on unmount
      } catch (e) {
        console.log('Error leaving meeting:', e);
      }
      AudioService.cleanup();
    };
  }, []);

  // Debug log để theo dõi trạng thái mic và camera
  useEffect(() => {
  }, [localMicOn, localWebcamOn]);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.meetingContainer}
    >
      <StatusBar barStyle="light-content" />

      {/* Header with Other User Name */}
      {!isConnecting && (
        <View style={styles.headerContainer}>
          {otherUserName ? (
            <Text style={styles.meetingIdText}>{otherUserName}</Text>
          ) : (
            <Text style={styles.meetingIdText}>Connected</Text>
          )}
        </View>
      )}

      {/* Loading View */}
      {isConnecting ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <Animated.View style={[styles.loadingRipple, loadingStyle]} />
            <View style={styles.loadingAvatarContainer}>
              {otherUserAvatar ? (
                <Image source={{ uri: otherUserAvatar }} style={styles.loadingAvatar} />
              ) : (
                <Ionicons name="person" size={40} color="#FFF" />
              )}
            </View>
            <Text style={styles.loadingName}>{otherUserName || "Connecting..."}</Text>
            <Text style={styles.loadingStatus}>Calling...</Text>
          </View>
        </View>
      ) : (
        <>
          <ParticipantList
            participants={participantsArrId}
            callType={callType}
            localParticipantId={localParticipant?.id}
            otherUserName={otherUserName}
          />

          <ControlsContainer
            end={end}
            toggleWebcam={toggleWebcam}
            toggleMic={toggleMic}
            callType={callType}
            micEnabled={localMicOn}
            webcamEnabled={localWebcamOn}
          />
        </>
      )}
    </LinearGradient>
  );
}

// Main CallScreen Component - theo VideoSDK guide
export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Lấy thông tin từ params
  const {
    meetingId: paramMeetingId,
    callType: paramCallType = 'video',
    createNew
  } = params;

  // Fetch token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const t = await getToken();
        setToken(t);
      } catch (e) {
        Alert.alert("Error", "Failed to authenticate for video call");
        router.back();
      }
    };
    fetchToken();
  }, []);

  const getMeetingId = async (id: string | null) => {
    if (!token) return;
    try {
      const finalMeetingId = id == null ? await createMeeting({ token }) : id;
      setMeetingId(finalMeetingId);
    } catch (error) {
      console.error("❌ Error getting meeting ID:", error);
      Alert.alert("Error", "Failed to create/join meeting");
    }
  };

  // Auto create meeting nếu có createNew flag
  useEffect(() => {
    if (!token) return;
    if (createNew === 'true') {
      getMeetingId(null);
    } else if (paramMeetingId && typeof paramMeetingId === 'string') {
      setMeetingId(paramMeetingId);
    }
  }, [createNew, paramMeetingId, token]);

  if (!token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Authenticating...</Text>
      </View>
    );
  }

  return meetingId ? (
    <SafeAreaView style={styles.container}>
      <MeetingProvider
        key={meetingId}
        config={{
          meetingId,
          micEnabled: true,
          webcamEnabled: (paramCallType as string) !== 'audio',
          name: "User", // Có thể customize
        }}
        token={token}
      >
        <MeetingView callType={paramCallType as string} callId={params.callId as string} />
      </MeetingProvider>
    </SafeAreaView>
  ) : (
    <JoinScreen getMeetingId={getMeetingId} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // JoinScreen Styles
  joinContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 20,
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  joinButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  orText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    paddingVertical: 12,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginLeft: 8,
  },

  // Meeting Styles
  meetingContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  meetingIdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  connectingIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 165, 0, 0.3)',
    borderRadius: 20,
  },
  connectingText: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '500',
  },

  // Participant Styles
  participantContainer: {
    position: 'relative',
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  participantList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  videoStream: {
    height: height * 0.4,
    borderRadius: 12,
  },
  noVideoContainer: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  micStatus: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 8,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  waitingText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },

  // Audio Call Styles
  audioCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  audioCallText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  participantCount: {
    fontSize: 16,
    marginTop: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },

  // Controls Styles
  controlsBlur: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enabledButton: {
    backgroundColor: '#FFFFFF',
  },
  disabledControlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  secondaryControlButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  leaveButton: {
    // Gradient handled in controlButtonGradient
  },
  endButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 67, 54, 0.5)',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // Status indicators
  statusContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  cameraStatus: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },

  // Legacy styles (keeping for compatibility)
  meetingId: {
    fontSize: 16,
    padding: 12,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Modern Call UI Styles
  modernCallContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },

  // Remote Video (Full Screen)
  remoteVideoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  remoteVideoStream: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteAvatarContainer: {
    alignItems: 'center',
  },
  remoteParticipantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  audioCallLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  remoteVideoOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  remoteVideoStatus: {
    flexDirection: 'row',
    gap: 8,
  },
  remoteStatusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  remoteVideoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Local Video (Picture-in-Picture)
  localVideoContainer: {
    position: 'absolute',
    width: 120,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    backgroundColor: '#1a1a1a',
    elevation: 15,
  },
  localVideoStream: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#2c3e50',
  },
  localVideoOffText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  localVideoStatus: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  localStatusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  localVideoName: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
  },

  // Waiting State
  waitingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  // Multiple participants indicator
  multipleParticipantsIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  participantCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
