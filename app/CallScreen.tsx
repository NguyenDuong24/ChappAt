import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Platform,
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
import { createMeeting, token } from '../api';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import DebugMonitor from '../components/call/DebugMonitor';

// Add error boundary for video components
class VideoErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Video component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Video temporarily unavailable</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const { width, height } = Dimensions.get('window');

// Draggable Local Video Component cho sender
function DraggableLocalVideo({ localParticipant, callType }: { 
  localParticipant: any; 
  callType: string; 
}) {
  const translateX = useRef(new Animated.Value(width - 140)).current; // Start from right
  const translateY = useRef(new Animated.Value(100)).current; // Start from top
  const [isDragging, setIsDragging] = useState(false);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      setIsDragging(false);
      
      // Snap to edges
      const { translationX, translationY } = event.nativeEvent;
      const screenWidth = width - 120; // Account for video width
      const screenHeight = height - 160; // Account for video height and controls
      
      // Snap to nearest edge
      const finalX = translationX > screenWidth / 2 ? screenWidth : 20;
      const finalY = Math.max(60, Math.min(screenHeight, translationY));
      
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: finalX,
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: finalY,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (event.nativeEvent.state === State.BEGAN) {
      setIsDragging(true);
    }
  };

  const {
    webcamStream,
    webcamOn,
    displayName,
    micOn,
  } = useParticipant(localParticipant, {
    onStreamEnabled: (stream) => {
    },
    onStreamDisabled: (stream) => {
    },
  });

  if (callType === 'audio') return null;

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.localVideoContainer,
          {
            transform: [
              { translateX: translateX },
              { translateY: translateY },
            ],
            opacity: isDragging ? 0.8 : 1,
            elevation: isDragging ? 10 : 5,
          },
        ]}
      >
        {webcamOn && webcamStream && Platform.OS !== 'android' ? (
          <RTCView
            streamURL={new MediaStream([webcamStream.track]).toURL()}
            objectFit="cover"
            style={styles.localVideoStream}
          />
        ) : (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.localVideoPlaceholder}
          >
            <Ionicons name="person-circle" size={30} color="#FFFFFF" />
            <Text style={styles.placeholderText}>
              {Platform.OS === 'android' ? 'Video disabled on Android' : 'Camera off'}
            </Text>
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
}

// Hook to play remote mic stream
function useRemoteAudio(micStream: any, micOn: boolean, participantId: string) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function playAudio() {
      if (micOn && micStream && micStream.track && Platform.OS !== 'android') { // Disable on Android to avoid ExoPlayer thread issue
        try {
          // Create a new sound object for the remote stream
          const sound = new Audio.Sound();
          // VideoSDK micStream.track provides a MediaStreamTrack, but Expo Audio expects a file or URI
          // If VideoSDK provides a stream URL, use it. Otherwise, this may need a native module or workaround.
          // For now, try to use toURL if available
          const streamUrl = micStream.toURL ? micStream.toURL() : undefined;
          if (streamUrl) {
            await sound.loadAsync({ uri: streamUrl });
            await sound.playAsync();
            soundRef.current = sound;
          } else {
            console.warn('No stream URL for remote audio:', participantId);
          }
        } catch (error) {
          console.error('Error playing remote audio:', error);
        }
      }
    }
    playAudio();
    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [micStream, micOn, participantId]);
}

// Remote Video Component cho receiver (lớn)
function RemoteVideoView({ participantId, callType }: { 
  participantId: string; 
  callType: string; 
}) {
  const {
    webcamStream,
    webcamOn,
    displayName,
    micOn,
    micStream,
  } = useParticipant(participantId, {
    onStreamEnabled: (stream) => {
    },
    onStreamDisabled: (stream) => {
    },
  });

  // --- Remote mic playback logic ---
  const [remoteAudio, setRemoteAudio] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function playRemoteMic() {
      if (micOn && micStream && Platform.OS !== 'android') { // Temporarily disable on Android to avoid ExoPlayer thread issue
        try {
          // Try to get a valid URI from micStream
          const streamUri = (micStream as any).url || (micStream as any).uri || undefined;
          if (streamUri) {
            const sound = new Audio.Sound();
            await sound.loadAsync({ uri: streamUri }, { shouldPlay: true, isLooping: true });
            if (isMounted) setRemoteAudio(sound);
          } else {
            console.warn('Remote micStream does not have a valid URI property. Cannot play remote audio.');
          }
        } catch (err) {
          console.log('Error playing remote mic:', err);
        }
      }
    }
    playRemoteMic();
    return () => {
      isMounted = false;
      if (remoteAudio) {
        remoteAudio.unloadAsync();
      }
    };
  }, [micOn, micStream]);
  // --- End remote mic playback logic ---

  // Play remote audio if available
  useRemoteAudio(micStream, micOn, participantId);

  return (
    <View style={styles.remoteVideoContainer}>
      {webcamOn && webcamStream && callType === 'video' && Platform.OS !== 'android' ? (
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
          objectFit="cover"
          style={styles.remoteVideoStream}
        />
      ) : (
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.remoteVideoPlaceholder}
        >
          <Ionicons 
            name="person-circle" 
            size={callType === 'audio' ? 120 : 100} 
            color="#FFFFFF" 
          />
          <Text style={styles.remoteParticipantName}>
            {displayName || "Remote User"}
          </Text>
          {callType === 'audio' && (
            <Text style={styles.audioCallLabel}>Audio Call</Text>
          )}
          {Platform.OS === 'android' && callType === 'video' && (
            <Text style={styles.placeholderText}>Video disabled on Android</Text>
          )}
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
          {displayName || "Remote User"}
        </Text>
      </View>
    </View>
  );
}

// Audio service for call sounds
class AudioService {
  private static callingSound: Audio.Sound | null = null;
  private static joinSound: Audio.Sound | null = null;

  static async loadSounds() {
    try {
      if (Platform.OS !== 'android') { // Temporarily disable sounds on Android
        this.callingSound = new Audio.Sound();
        await this.callingSound.loadAsync(require('../assets/sounds/calling.mp3'));
      }
    } catch (error) {
      console.log('Error loading sounds:', error);
    }
  }

  static async playCallingSound() {
    try {
      if (Platform.OS !== 'android' && this.callingSound) {
        await this.callingSound.replayAsync();
      }
    } catch (error) {
      console.log('Error playing calling sound:', error);
    }
  }

  static async stopCallingSound() {
    try {
      if (Platform.OS !== 'android' && this.callingSound) {
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
        await this.callingSound.unloadAsync();
      }
      if (this.joinSound) {
        await this.joinSound.unloadAsync();
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

// ControlsContainer Component - Enhanced with manual fallback
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
  
  const handleMicToggle = async () => {
    console.log(`🎤 Current mic state: ${micEnabled}, toggling to: ${!micEnabled}`);
    try {
      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      toggleMic();
      console.log('✅ Mic toggle completed');
    } catch (error) {
      console.error('❌ Error toggling mic:', error);
    }
  };

  const handleCameraToggle = async () => {
    console.log(`📷 Current camera state: ${webcamEnabled}, toggling to: ${!webcamEnabled}`);
    try {
      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      toggleWebcam();
      console.log('✅ Camera toggle completed');
    } catch (error) {
      console.error('❌ Error toggling camera:', error);
    }
  };

  return (
    <View style={[styles.controlsBlur, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handleMicToggle}
          style={[styles.controlButton, micEnabled ? styles.enabledButton : styles.disabledControlButton]}
        >
          <Ionicons 
            name={micEnabled ? "mic" : "mic-off"} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>

        {callType === 'video' && (
          <TouchableOpacity
            onPress={handleCameraToggle}
            style={[styles.controlButton, webcamEnabled ? styles.enabledButton : styles.disabledControlButton]}
          >
            <Ionicons 
              name={webcamEnabled ? "videocam" : "videocam-off"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={end}
          style={[styles.controlButton, styles.endButton]}
        >
          <Ionicons name="call-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ParticipantView Component - với proper events và stream handling
function ParticipantView({ participantId, callType }: { participantId: string; callType?: string }) {
  const { 
    webcamStream, 
    webcamOn, 
    displayName, 
    micOn,
    micStream 
  } = useParticipant(participantId, {
    onStreamEnabled: (stream) => {
    },
    onStreamDisabled: (stream) => {
    },
    onMediaStatusChanged: ({ kind, newStatus }) => {
    },
  });

  // Play remote audio if available
  useRemoteAudio(micStream, micOn, participantId);

  return (
    <View style={styles.participantContainer}>
      {webcamOn && webcamStream ? (
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
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
}

// Modern ParticipantList với Picture-in-Picture layout
function ParticipantList({ participants, callType, localParticipantId }: {
  participants: string[];
  callType: string;
  localParticipantId?: string;
}) {
  const remoteParticipants = participants.filter(id => id !== localParticipantId);
  const firstRemoteParticipant = remoteParticipants[0];

  return (
    <View style={styles.modernCallContainer}>
      {/* Remote Video (Full Screen Background) */}
      {firstRemoteParticipant ? (
        <RemoteVideoView 
          participantId={firstRemoteParticipant} 
          callType={callType}
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
}

// MeetingView Component - với âm thanh và UI đẹp hơn + proper VideoSDK methods
function MeetingView({ callType }: { callType: string }) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(true);
  
  const { 
    join, 
    leave, 
    end,
    toggleWebcam, 
    toggleMic,
    participants, 
    meetingId,
    localMicOn,
    localWebcamOn,
    localParticipant 
  } = useMeeting({
    onMeetingJoined: async () => {
      setIsConnecting(false);
      await AudioService.stopCallingSound();
      await AudioService.playJoinSound();
    },
    onMeetingLeft: async () => {
      await AudioService.stopCallingSound();
      await AudioService.cleanup();
      router.replace('/(tabs)/home');
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

  // Get participants từ useMeeting Hook
  const participantsArrId = [...participants.keys()];

  // Auto join meeting và play calling sound
  useEffect(() => {
    const initializeCall = async () => {
      
      // Load sounds
      await AudioService.loadSounds();
      
      // Play calling sound
      await AudioService.playCallingSound();
      
      // Join meeting
      join();
    };

    initializeCall();

    // Cleanup on unmount - Proper leave call
    return () => {
      leave(); // Properly leave meeting on unmount
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
      
      {/* Meeting ID Header */}
      {meetingId && (
        <View style={styles.headerContainer}>
          <Text style={styles.meetingIdText}>Meeting ID: {meetingId}</Text>
          {isConnecting && (
            <View style={styles.connectingIndicator}>
              <Text style={styles.connectingText}>Connecting...</Text>
            </View>
          )}
        </View>
      )}
      
      <ParticipantList 
        participants={participantsArrId} 
        callType={callType}
        localParticipantId={localParticipant?.id}
      />
      
      <ControlsContainer
        end={end}
        toggleWebcam={toggleWebcam}
        toggleMic={toggleMic}
        callType={callType}
        micEnabled={localMicOn}
        webcamEnabled={localWebcamOn}
      />
    </LinearGradient>
  );
}

// Main CallScreen Component - theo VideoSDK guide
export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [meetingId, setMeetingId] = useState<string | null>(null);
  
  // Lấy thông tin từ params
  const { 
    meetingId: paramMeetingId, 
    callType: paramCallType = 'video',
    createNew 
  } = params;

  const getMeetingId = async (id: string | null) => {
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
    if (createNew === 'true') {
      getMeetingId(null);
    } else if (paramMeetingId && typeof paramMeetingId === 'string') {
      setMeetingId(paramMeetingId);
    }
  }, [createNew, paramMeetingId]);

  return meetingId ? (
    <SafeAreaView style={styles.container}>
      <MeetingProvider
        config={{
          meetingId,
          micEnabled: true,
          webcamEnabled: (paramCallType as string) !== 'audio',
          name: "User", // Có thể customize
        }}
        token={token}
      >
        <MeetingView callType={paramCallType as string} />
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
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  enabledButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
  },
  disabledControlButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    borderColor: '#F44336',
  },
  leaveButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    borderColor: '#F44336',
  },
  endButton: {
    backgroundColor: 'rgba(139, 69, 19, 0.8)',
    borderColor: '#8B4513',
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
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  audioCallLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  remoteVideoOverlay: {
    position: 'absolute',
    top: 20,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  remoteVideoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  // Local Video (Picture-in-Picture)
  localVideoContainer: {
    position: 'absolute',
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: '#000',
  },
  localVideoStream: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoStatus: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    gap: 2,
  },
  localStatusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoName: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    textAlign: 'center',
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
  placeholderText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
});

