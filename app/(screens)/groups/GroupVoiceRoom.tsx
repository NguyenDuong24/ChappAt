import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
} from '@videosdk.live/react-native-sdk';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createMeeting, getToken } from '@/api';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Avatar } from 'react-native-paper';
import VoiceRoomChat from '@/components/call/VoiceRoomChat';

const { width, height } = Dimensions.get('window');

// Participant Card Component
function ParticipantView({
  participantId,
  isLocal,
  userData,
  isSpeakingExternal
}: {
  participantId: string;
  isLocal: boolean;
  userData?: any;
  isSpeakingExternal?: boolean;
}) {
  const { displayName, micOn } = useParticipant(participantId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userData?.profileUrl || userData?.photoURL) {
      setAvatarUrl(userData.profileUrl || userData.photoURL);
    }
  }, [userData]);

  // Pulse animation when speaking
  useEffect(() => {
    if (isSpeakingExternal && micOn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 600, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [isSpeakingExternal, micOn]);

  const getInitial = () => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    if (userData?.username) return userData.username.charAt(0).toUpperCase();
    return 'U';
  };

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  return (
    <View style={styles.participantCard}>
      <LinearGradient
        colors={isSpeakingExternal && micOn ? ['#10b981', '#059669'] : ['#4a5568', '#2d3748']}
        style={[
          styles.participantGradient,
          isSpeakingExternal && micOn && styles.participantGradientSpeaking
        ]}
      >
        <Animated.View style={[styles.avatarContainer, isSpeakingExternal && micOn && { transform: [{ scale }] }]}>
          {avatarUrl ? (
            <Avatar.Image
              size={60}
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={60}
              label={getInitial()}
              style={styles.avatar}
            />
          )}
          {!micOn && (
            <View style={styles.micOffBadge}>
              <Ionicons name="mic-off" size={16} color="#fff" />
            </View>
          )}
          {micOn && isSpeakingExternal && (
            <Animated.View style={[styles.speakingPulse, { opacity: ringOpacity }]} />
          )}
        </Animated.View>
        <Text style={styles.participantName} numberOfLines={1}>
          {displayName || userData?.username || 'Guest'}
          {isLocal && ' (Bạn)'}
        </Text>
        {micOn && isSpeakingExternal && (
          <Text style={styles.speakingText}>Đang nói...</Text>
        )}
      </LinearGradient>
    </View>
  );
}

// Controls Component
function Controls({ onLeave }: { onLeave: () => void }) {
  const { leave, toggleMic, localMicOn, localWebcamOn } = useMeeting();

  const handleToggleMic = () => {
    console.log('🎤 Toggle mic - Current state:', localMicOn);
    toggleMic();
  };

  const handleLeave = () => {
    Alert.alert(
      'Rời phòng',
      'Bạn có chắc muốn rời khỏi phòng voice chat?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời phòng',
          style: 'destructive',
          onPress: () => {
            leave();
            onLeave();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={[styles.controlButton, localMicOn ? styles.micOnButton : styles.micOffButton]}
        onPress={handleToggleMic}
      >
        <Ionicons name={localMicOn ? 'mic' : 'mic-off'} size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
        <Ionicons name="call" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Meeting Screen Component
function MeetingView({
  groupName,
  onLeave,
  currentUser,
  groupId
}: {
  groupName: string;
  onLeave: () => void;
  currentUser: any;
  groupId: string;
}) {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const { join, participants, localParticipant } = useMeeting({
    onMeetingJoined: () => {
      console.log('✅ Meeting joined successfully');
      console.log('Local participant ID:', localParticipant?.id);
    },
    onMeetingLeft: () => {
      console.log('👋 Meeting left');
      onLeave();
    },
    onParticipantJoined: (participant) => {
      console.log('👤 Participant joined:', participant.displayName, 'ID:', participant.id);
    },
    onParticipantLeft: (participant) => {
      console.log('👋 Participant left:', participant.displayName);
    },
    onSpeakerChanged: (speakerId) => {
      // VideoSDK event cung cấp ID của người đang nói
      setActiveSpeakerId(speakerId);
    }
  });

  const [participantsData, setParticipantsData] = useState<Map<string, any>>(new Map());

  // Get all participants (excluding duplicate local participant)
  const participantsArray = [...participants.keys()];

  // IMPORTANT: Don't add localParticipant to the list if it's already in participants Map
  // VideoSDK automatically includes local participant in the participants Map
  const allParticipants = participantsArray;

  console.log('📊 Participants count:', {
    localParticipantId: localParticipant?.id,
    participantsArray,
    total: allParticipants.length,
  });

  // Load participant data from Firebase
  useEffect(() => {
    const loadParticipantData = async (participantId: string, displayName: string) => {
      try {
        // Try to extract UID from displayName or use participantId
        // You might need to adjust this based on how you set the name in MeetingProvider
        const userDoc = await getDoc(doc(db, 'users', displayName));
        if (userDoc.exists()) {
          setParticipantsData(prev => new Map(prev).set(participantId, userDoc.data()));
        }
      } catch (error) {
        console.error('Error loading participant data:', error);
      }
    };

    // Load data for all participants
    allParticipants.forEach((participantId) => {
      const participant = participants.get(participantId);
      if (participant?.displayName) {
        loadParticipantData(participantId, participant.displayName);
      }
    });
  }, [allParticipants.length]);

  useEffect(() => {
    // Request audio permissions first và bật loa ngoài
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Lỗi', 'Cần cấp quyền microphone để tham gia voice chat');
          return;
        }

        // 🔊 QUAN TRỌNG: Cấu hình để phát qua loa ngoài (multimedia speaker)
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // Android: loa ngoài
          interruptionModeIOS: 2, // iOS: AVAudioSessionCategoryPlayAndRecord
        });

        // 🔊 Cấu hình audio cho group voice chat (không dùng in-call mode)
        // Không dùng InCallManager để tránh chế độ gọi điện (tắt màn hình, loa thoại)
        console.log('🎤 Audio configured (speaker mode - no proximity sensor), joining meeting...');
        // Join the meeting after audio route configured
        join();
      } catch (error) {
        console.error('❌ Audio permission/config error:', error);
        Alert.alert('Lỗi', 'Không thể khởi tạo audio. Vui lòng thử lại.');
      }
    })();

    // No cleanup needed - không dùng InCallManager
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.headerSubtitle}>
              {allParticipants.length} {allParticipants.length === 1 ? 'người' : 'người'} trong phòng
            </Text>
          </View>

          {/* Participants Grid */}
          <View style={styles.participantsContainer}>
            <FlatList
              data={allParticipants}
              renderItem={({ item }) => {
                const isLocal = item === localParticipant?.id;
                const userData = isLocal ? currentUser : participantsData.get(item);
                const isSpeakingExternal = item === activeSpeakerId; // so sánh ID đang nói
                return (
                  <ParticipantView
                    participantId={item}
                    isLocal={isLocal}
                    userData={userData}
                    isSpeakingExternal={isSpeakingExternal}
                  />
                );
              }}
              keyExtractor={(item) => item}
              numColumns={2}
              contentContainerStyle={styles.participantsList}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Chat Area */}
          <View style={styles.chatContainer}>
            <VoiceRoomChat groupId={groupId} currentUser={currentUser} />
          </View>

          {/* Controls */}
          <Controls onLeave={onLeave} />
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Main Component
export default function GroupVoiceRoom() {
  const { groupId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Fetch token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const t = await getToken();
        setToken(t);
      } catch (e) {
        console.error("Failed to get token", e);
        Alert.alert("Error", "Failed to authenticate for voice chat");
        router.back();
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!groupId || !user) return;

    // Load group data
    const loadGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId as string));
        if (groupDoc.exists()) {
          setGroupData({ id: groupDoc.id, ...groupDoc.data() });
        }
      } catch (error) {
        console.error('Error loading group:', error);
      }
    };

    loadGroup();

    // Listen to voice room status
    const unsubscribe = onSnapshot(doc(db, 'groups', groupId as string), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        let roomId = data?.voiceRoomId;

        // If no room exists, create one
        if (!roomId) {
          // Wait for token before creating
          if (!token) return;

          try {
            roomId = await createMeeting({ token });
            await updateDoc(doc(db, 'groups', groupId as string), {
              voiceRoomId: roomId,
              voiceRoomActive: true,
              voiceRoomParticipants: arrayUnion(user.uid),
            });
          } catch (error) {
            console.error('Error creating meeting:', error);
            Alert.alert('Lỗi', 'Không thể tạo phòng voice chat. Vui lòng thử lại.');
            router.back();
            return;
          }
        } else {
          // Join existing room
          await updateDoc(doc(db, 'groups', groupId as string), {
            voiceRoomActive: true, // ✅ Đảm bảo active = true
            voiceRoomParticipants: arrayUnion(user.uid),
          });
        }

        setMeetingId(roomId);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      // Remove user from participants when leaving
      if (groupId && user) {
        updateDoc(doc(db, 'groups', groupId as string), {
          voiceRoomParticipants: arrayRemove(user.uid),
        }).catch(console.error);
      }
    };
  }, [groupId, user, token]); // Added token dependency

  const handleLeave = async () => {
    try {
      if (groupId && user) {
        // Get current participants
        const groupDoc = await getDoc(doc(db, 'groups', groupId as string));
        const currentParticipants = groupDoc.data()?.voiceRoomParticipants || [];

        // Remove current user
        await updateDoc(doc(db, 'groups', groupId as string), {
          voiceRoomParticipants: arrayRemove(user.uid),
        });

        // If this is the last person, set voiceRoomActive = false
        if (currentParticipants.length <= 1) {
          console.log('🔴 Last person leaving, setting voiceRoomActive = false');
          await updateDoc(doc(db, 'groups', groupId as string), {
            voiceRoomActive: false,
          });
        }
      }
    } catch (error) {
      console.error('Error leaving voice room:', error);
    }
    router.back();
  };

  if (loading || !meetingId || !token) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Đang tham gia phòng voice chat...</Text>
        </LinearGradient>
      </View>
    );
  }

  console.log('🔧 Initializing MeetingProvider with:', {
    meetingId,
    userName: user?.displayName || user?.username || 'Guest',
    micEnabled: true,
    webcamEnabled: false,
  });

  return (
    <MeetingProvider
      key={meetingId}
      config={{
        meetingId,
        micEnabled: true,
        webcamEnabled: false,
        name: user?.uid || 'Guest', // Pass UID để có thể load user data từ Firebase
      }}
      token={token}
    >
      <MeetingView
        groupName={groupData?.name || 'Voice Chat'}
        onLeave={handleLeave}
        currentUser={user}
        groupId={groupId as string}
      />
    </MeetingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a202c',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  participantsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  participantsList: {
    paddingVertical: 10,
  },
  participantCard: {
    width: (width - 40) / 2,
    padding: 10,
  },
  participantGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  participantGradientSpeaking: {
    borderColor: '#10b981',
    borderWidth: 3,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  micOffBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#e53e3e',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#48bb78',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#10b981',
    backgroundColor: 'transparent',
  },
  speakingRingInner: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'transparent',
  },
  participantName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 10,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micOnButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  micOffButton: {
    backgroundColor: '#e53e3e',
  },
  leaveButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e53e3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingPulse: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 72,
    borderWidth: 3,
    borderColor: '#10b981',
  },
  speakingText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  chatContainer: {
    height: 250,
    marginBottom: 10,
  },
});
