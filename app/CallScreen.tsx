import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  View,
  Alert,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
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
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Draggable Local Video Component cho sender - tạm thời bỏ animation để fix lỗi Animated
function DraggableLocalVideo({ localParticipant, callType }: { 
  localParticipant: any; 
  callType: string; 
}) {
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
    <View style={styles.localVideoContainer}>
      {webcamOn && webcamStream && webcamStream.track ? (
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
    </View>
  );
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

  return (
    <View style={styles.remoteVideoContainer}>
      {webcamOn && webcamStream && webcamStream.track && callType === 'video' ? (
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
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
              {displayName || "Remote User"}
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
          {displayName || "Remote User"}
        </Text>
      </View>
    </View>
  );
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
  leave,
  toggleWebcam, 
  toggleMic, 
  callType, 
  micEnabled, 
  webcamEnabled 
}: {
  leave: () => void;
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
          onPress={() => {
            try {
              leave();
            } catch (error) {
              console.error('Error leaving call:', error);
            }
          }}
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

  return (
    <View style={styles.participantContainer}>
      {webcamOn && webcamStream && webcamStream.track ? (
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
  console.log('🎥 ParticipantList called with:', { participants, callType, localParticipantId });
  
  // Ensure participants is always an array
  const safeParticipants = Array.isArray(participants) ? participants : [];
  console.log('🔧 Safe participants:', safeParticipants);
  
  const remoteParticipants = safeParticipants.filter(id => id !== localParticipantId);
  console.log('👥 Remote participants:', remoteParticipants);
  
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
    },
    onMeetingLeft: async () => {
      try {
        router.replace('/(tabs)/home');
      } catch (error) {
        console.error('Error during meeting left cleanup:', error);
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

  // Get participants từ useMeeting Hook
  const participantsArrId = participants ? Array.from(participants.keys()) : [];
  
  // Debug logging for participants
  useEffect(() => {
    console.log('📊 Participants updated:', {
      participantsType: typeof participants,
      participantsIsMap: participants instanceof Map,
      participantsSize: participants?.size || 0,
      participantsArrId,
      localParticipantId: localParticipant?.id
    });
  }, [participants, participantsArrId, localParticipant]);

  // Auto join meeting
  useEffect(() => {
    const initializeCall = async () => {
      
      // Join meeting
      join();
    };

    initializeCall();

    // Cleanup on unmount - Proper leave call
    return () => {
      try {
        if (leave) {
          leave(); // Properly leave meeting on unmount
        }
      } catch (error) {
        console.error('Error leaving meeting:', error);
      }
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
      
      <VideoErrorBoundary>
        <ParticipantList 
          participants={participantsArrId || []} 
          callType={callType || 'video'}
          localParticipantId={localParticipant?.id}
        />
      </VideoErrorBoundary>
      
      <ControlsContainer
        leave={leave}
        toggleWebcam={toggleWebcam}
        toggleMic={toggleMic}
        callType={callType}
        micEnabled={localMicOn}
        webcamEnabled={localWebcamOn}
      />
    </LinearGradient>
  );
}

// VideoErrorBoundary để catch lỗi video rendering
class VideoErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('VideoErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Video Error: {this.state.error?.message || 'Unknown error'}</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// General ErrorBoundary để catch tất cả lỗi trong call
class CallErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CallErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Call Error: {this.state.error?.message || 'Unknown error'}</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
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

  console.log('📞 CallScreen params:', { paramMeetingId, paramCallType, createNew });

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

  console.log('📞 CallScreen state:', { meetingId, paramCallType });

  return meetingId ? (
    <SafeAreaView style={styles.container}>
      <MeetingProvider
        config={{
          meetingId,
          micEnabled: true,
          webcamEnabled: (paramCallType as string) !== 'audio',
          name: "User", // Có thể customize
          multiStream: true, // Enable multi-stream for better performance
        }}
        token={token}
      >
        <CallErrorBoundary>
          <MeetingView callType={paramCallType as string} />
        </CallErrorBoundary>
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
  waitingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
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
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryText: {
    color: '#FFA500',
    fontSize: 18,
    fontWeight: 'bold',
  },
  multipleParticipantsIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  participantCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
