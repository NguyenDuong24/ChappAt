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
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/authContext';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Avatar } from 'react-native-paper';
import VoiceRoomChat from '@/components/call/VoiceRoomChat';

const { width } = Dimensions.get('window');

// Participant Card Component
function ParticipantView({
  participantId,
  isLocal,
  userData,
  isSpeakingExternal,
  layout = 'speaker',
  emphasizeGlow = false,
  onPress,
  showPinHint = false,
}: {
  participantId: string;
  isLocal: boolean;
  userData?: any;
  isSpeakingExternal?: boolean;
  layout?: 'host' | 'speaker';
  emphasizeGlow?: boolean;
  onPress?: () => void;
  showPinHint?: boolean;
}) {
  const { t } = useTranslation();
  const participant = useParticipant(participantId) as any;
  const { displayName, micOn } = participant;
  const audioLevel = Number(participant?.audioLevel ?? participant?.audioVolume ?? 0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const volumeScaleAnim = useRef(new Animated.Value(1)).current;
  const resolvedName = userData?.displayName || userData?.username || displayName || t('chat.unknown_user');

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

  useEffect(() => {
    const safeLevel = Number.isFinite(audioLevel) ? Math.max(0, Math.min(audioLevel, 1)) : 0;
    const scaleTarget = micOn ? 1 + safeLevel * 0.28 : 1;
    Animated.spring(volumeScaleAnim, {
      toValue: scaleTarget,
      useNativeDriver: true,
      friction: 6,
      tension: 110,
    }).start();
  }, [audioLevel, micOn]);

  const getInitial = () => {
    if (resolvedName) return resolvedName.charAt(0).toUpperCase();
    return 'U';
  };

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
  const isHostLayout = layout === 'host';
  const avatarSize = isHostLayout ? 84 : 60;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.participantCard, isHostLayout && styles.hostParticipantCard]}
    >
      <LinearGradient
        colors={isSpeakingExternal && micOn ? ['#10b981', '#059669'] : ['#4a5568', '#2d3748']}
        style={[
          styles.participantGradient,
          isSpeakingExternal && micOn && styles.participantGradientSpeaking,
          isHostLayout && styles.hostParticipantGradient,
          emphasizeGlow && isSpeakingExternal && micOn && styles.hostParticipantGradientSpeaking
        ]}
      >
        <Animated.View
          style={[
            styles.avatarContainer,
            {
              transform: [{ scale }, { scale: volumeScaleAnim }],
            },
          ]}
        >
          {avatarUrl ? (
            <Avatar.Image
              size={avatarSize}
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={avatarSize}
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
        <Text style={[styles.participantName, isHostLayout && styles.hostParticipantName]} numberOfLines={1}>
          {resolvedName}
          {isLocal && ` (${t('common.you')})`}
        </Text>
        {!!showPinHint && !isHostLayout && (
          <Text style={styles.pinHintText}>{t('group_voice.tap_to_spotlight')}</Text>
        )}
        {micOn && isSpeakingExternal && (
          <Text style={styles.speakingText}>{t('group_voice.speaking')}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Controls Component
function Controls({ onLeave, onLike }: { onLeave: () => void; onLike: () => void }) {
  const { t } = useTranslation();
  const { leave, toggleMic, localMicOn } = useMeeting();

  const handleToggleMic = () => {
    toggleMic();
  };

  const handleLeave = () => {
    Alert.alert(
      t('group_voice.leave_title'),
      t('group_voice.leave_message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('group_voice.leave_action'),
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
    <View style={styles.controlsDock}>
      <TouchableOpacity style={styles.dockButton} onPress={onLike}>
        <Ionicons name="heart" size={20} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dockButton, localMicOn ? styles.micOnButton : styles.micOffButton]}
        onPress={handleToggleMic}
      >
        <Ionicons name={localMicOn ? 'mic' : 'mic-off'} size={20} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
        <Ionicons name="call" size={22} color="#fff" />
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
  const { t } = useTranslation();
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [spotlightParticipantId, setSpotlightParticipantId] = useState<string | null>(null);
  const { join, participants, localParticipant } = useMeeting({
    onMeetingJoined: () => {
      console.log('âœ… Meeting joined successfully');
      console.log('Local participant ID:', localParticipant?.id);
    },
    onMeetingLeft: () => {
      console.log('ðŸ‘‹ Meeting left');
      onLeave();
    },
    onParticipantJoined: (participant) => {
      console.log('ðŸ‘¤ Participant joined:', participant.displayName, 'ID:', participant.id);
    },
    onParticipantLeft: (participant) => {
      console.log('ðŸ‘‹ Participant left:', participant.displayName);
    },
    onSpeakerChanged: (speakerId) => {
      // VideoSDK event cung cáº¥p ID cá»§a ngÆ°á»i Ä‘ang nÃ³i
      setActiveSpeakerId(speakerId);
    }
  });

  const [participantsData, setParticipantsData] = useState<Map<string, any>>(new Map());
  const heartSlots = useRef(
    [...Array(8)].map(() => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.8),
      x: Math.random() * 38 - 19,
      drift: Math.random() * 20 - 10,
      size: 16,
      color: '#fb7185',
    }))
  ).current;
  const heartIndexRef = useRef(0);

  // Get all participants (excluding duplicate local participant)
  const participantsArray = [...participants.keys()];

  // IMPORTANT: Don't add localParticipant to the list if it's already in participants Map
  // VideoSDK automatically includes local participant in the participants Map
  const allParticipants = participantsArray;

  console.log('ðŸ“Š Participants count:', {
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
    // Request audio permissions first vÃ  báº­t loa ngoÃ i
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('group_voice.mic_permission_required')); 
          return;
        }

        // ðŸ”Š QUAN TRá»ŒNG: Cáº¥u hÃ¬nh Ä‘á»ƒ phÃ¡t qua loa ngoÃ i (multimedia speaker)
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // Android: loa ngoÃ i
          interruptionModeIOS: 2, // iOS: AVAudioSessionCategoryPlayAndRecord
        });

        // ðŸ”Š Cáº¥u hÃ¬nh audio cho group voice chat (khÃ´ng dÃ¹ng in-call mode)
        // KhÃ´ng dÃ¹ng InCallManager Ä‘á»ƒ trÃ¡nh cháº¿ Ä‘á»™ gá»i Ä‘iá»‡n (táº¯t mÃ n hÃ¬nh, loa thoáº¡i)
        console.log('ðŸŽ¤ Audio configured (speaker mode - no proximity sensor), joining meeting...');
        // Join the meeting after audio route configured
        join();
      } catch (error) {
        console.error('âŒ Audio permission/config error:', error);
        Alert.alert(t('common.error'), t('group_voice.audio_init_error')); 
      }
    })();

    // No cleanup needed - khÃ´ng dÃ¹ng InCallManager
  }, []);

  const triggerHeart = () => {
    const slot = heartSlots[heartIndexRef.current % heartSlots.length];
    heartIndexRef.current += 1;
    const palette = ['#fb7185', '#f43f5e', '#f97316', '#facc15', '#a78bfa', '#22d3ee'];

    slot.x = Math.random() * 40 - 20;
    slot.drift = Math.random() * 26 - 13;
    slot.size = 14 + Math.floor(Math.random() * 8);
    slot.color = palette[Math.floor(Math.random() * palette.length)];
    slot.y.setValue(0);
    slot.opacity.setValue(0);
    slot.scale.setValue(0.85);

    Animated.parallel([
      Animated.timing(slot.opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slot.y, {
        toValue: -170,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(slot.scale, {
        toValue: 1.35,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slot.opacity.setValue(0);
      slot.y.setValue(0);
      slot.scale.setValue(0.85);
    });
  };

  useEffect(() => {
    if (!activeSpeakerId) return;
    triggerHeart();
  }, [activeSpeakerId]);
  useEffect(() => {
    if (!spotlightParticipantId) return;
    if (!allParticipants.includes(spotlightParticipantId)) {
      setSpotlightParticipantId(null);
    }
  }, [allParticipants, spotlightParticipantId]);

  const hostParticipantId =
    spotlightParticipantId ||
    activeSpeakerId ||
    localParticipant?.id ||
    allParticipants[0] ||
    null;
  const speakerParticipants = allParticipants.filter((id) => id !== hostParticipantId);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <LinearGradient colors={['#0b1023', '#141a35', '#1f1147']} style={styles.gradient}>
          <View style={styles.tiktokHeader}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
              <Text style={styles.headerSubtitle}>{t('group_voice.listeners_count', { count: allParticipants.length })}</Text>
            </View>
            {!!spotlightParticipantId && (
              <TouchableOpacity
                onPress={() => setSpotlightParticipantId(null)}
                style={styles.clearSpotlightButton}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.clearSpotlightText}>{t('group_voice.auto')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.hostSection}>
            {hostParticipantId ? (
              <ParticipantView
                participantId={hostParticipantId}
                isLocal={hostParticipantId === localParticipant?.id}
                userData={hostParticipantId === localParticipant?.id ? currentUser : participantsData.get(hostParticipantId)}
                isSpeakingExternal={hostParticipantId === activeSpeakerId}
                layout="host"
                emphasizeGlow
              />
            ) : (
              <View style={styles.emptyHost}>
                <Ionicons name="radio" size={40} color="#fff" />
                <Text style={styles.emptyHostText}>{t('group_voice.waiting_host')}</Text>
              </View>
            )}
          </View>

          <View style={styles.speakersSection}>
            <Text style={styles.sectionLabel}>{t('group_voice.speakers')}</Text>
            <FlatList
              data={speakerParticipants}
              renderItem={({ item }) => {
                const isLocal = item === localParticipant?.id;
                const userData = isLocal ? currentUser : participantsData.get(item);
                const isSpeakingExternal = item === activeSpeakerId;
                return (
                  <ParticipantView
                    participantId={item}
                    isLocal={isLocal}
                    userData={userData}
                    isSpeakingExternal={isSpeakingExternal}
                    onPress={() => setSpotlightParticipantId(item)}
                    showPinHint
                  />
                );
              }}
              keyExtractor={(item) => item}
              numColumns={3}
              contentContainerStyle={styles.participantsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={styles.emptySpeakerText}>{t('group_voice.no_speakers')}</Text>}
            />
          </View>

          <View style={styles.chatOverlay}>
            <VoiceRoomChat groupId={groupId} currentUser={currentUser} />
          </View>

          <View style={styles.heartsLayer} pointerEvents="none">
            {heartSlots.map((slot, index) => (
              <Animated.View
                key={`heart-${index}`}
                style={[
                  styles.floatingHeart,
                  {
                    opacity: slot.opacity,
                    transform: [
                      { translateY: slot.y },
                      { translateX: Animated.multiply(slot.y, slot.drift / -170) },
                      { scale: slot.scale },
                    ],
                  },
                ]}
              >
                <Ionicons name="heart" size={slot.size} color={slot.color} />
              </Animated.View>
            ))}
          </View>

          <Controls onLeave={onLeave} onLike={triggerHeart} />
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Main Component
export default function GroupVoiceRoom() {
  const { t } = useTranslation();
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
        Alert.alert(t('common.error'), t('group_voice.auth_failed'));
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
            Alert.alert(t('common.error'), t('group_voice.create_room_error')); 
            router.back();
            return;
          }
        } else {
          // Join existing room
          await updateDoc(doc(db, 'groups', groupId as string), {
            voiceRoomActive: true, // âœ… Äáº£m báº£o active = true
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
          console.log('ðŸ”´ Last person leaving, setting voiceRoomActive = false');
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
          <Text style={styles.loadingText}>{t('group_voice.joining_room')}</Text>
        </LinearGradient>
      </View>
    );
  }

  console.log('ðŸ”§ Initializing MeetingProvider with:', {
    meetingId,
    userName: user?.displayName || user?.username || t('chat.unknown_user'),
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
        name: user?.displayName || user?.username || user?.uid || t('chat.unknown_user'),
      }}
      token={token}
    >
      <MeetingView
        groupName={groupData?.name || t('group_voice.default_room_name')}
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
  tiktokHeader: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  clearSpotlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  clearSpotlightText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  hostSection: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  emptyHost: {
    height: 170,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptyHostText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  speakersSection: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 16,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
    marginBottom: 8,
  },
  participantsList: {
    paddingBottom: 120,
  },
  participantCard: {
    width: (width - 48) / 3,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  hostParticipantCard: {
    width: '100%',
    paddingHorizontal: 0,
  },
  participantGradient: {
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    minHeight: 124,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hostParticipantGradient: {
    minHeight: 168,
    borderRadius: 22,
  },
  hostParticipantGradientSpeaking: {
    borderColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 14,
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
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pinHintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 4,
  },
  hostParticipantName: {
    fontSize: 16,
    fontWeight: '700',
  },
  controlsDock: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 14,
  },
  dockButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micOnButton: {
    backgroundColor: 'rgba(34,197,94,0.75)',
  },
  micOffButton: {
    backgroundColor: '#ef4444',
  },
  leaveButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
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
  chatOverlay: {
    height: 220,
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  heartsLayer: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 44,
    height: 190,
    overflow: 'visible',
  },
  floatingHeart: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  emptySpeakerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 12,
  },
});








