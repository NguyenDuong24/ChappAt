import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Dimensions,
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getToken, createCallRoom } from '@/api';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/authContext';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Avatar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
        colors={
          isSpeakingExternal && micOn
            ? ['#10b981', '#047857']
            : isHostLayout
              ? ['#2A1E4A', '#130C25']
              : ['#181935', '#0A0C1C']
        }
        style={[
          styles.participantGradient,
          isSpeakingExternal && micOn && styles.participantGradientSpeaking,
          isHostLayout && styles.hostParticipantGradient,
          emphasizeGlow && isSpeakingExternal && micOn && styles.hostParticipantGradientSpeaking
        ]}
      >
        {isHostLayout && (
          <View style={styles.hostBadge}>
            <LinearGradient colors={['#fbbf24', '#f97316']} style={styles.hostBadgeGradient}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.hostBadgeText}>HOST</Text>
            </LinearGradient>
          </View>
        )}
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
  const insets = useSafeAreaInsets();

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
    <View style={[styles.controlsDock, { marginBottom: Math.max(insets.bottom, 16) + 12 }]}>
      <TouchableOpacity style={[styles.dockButton, styles.heartButton]} onPress={onLike} activeOpacity={0.82}>
        <Ionicons name="heart" size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dockButton, localMicOn ? styles.micOnButton : styles.micOffButton]}
        onPress={handleToggleMic}
        activeOpacity={0.82}
      >
        <Ionicons name={localMicOn ? 'mic' : 'mic-off'} size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveButton} onPress={handleLeave} activeOpacity={0.82}>
        <Ionicons name="call" size={30} color="#fff" style={styles.hangupIcon} />
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
  const insets = useSafeAreaInsets();
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [spotlightParticipantId, setSpotlightParticipantId] = useState<string | null>(null);
  const { join, participants, localParticipant } = useMeeting({
    onMeetingJoined: () => {
      console.log('Ã¢Å“â€¦ Meeting joined successfully');
      console.log('Local participant ID:', localParticipant?.id);
    },
    onMeetingLeft: () => {
      console.log('Ã°Å¸â€˜â€¹ Meeting left');
      onLeave();
    },
    onParticipantJoined: (participant) => {
      console.log('Ã°Å¸â€˜Â¤ Participant joined:', participant.displayName, 'ID:', participant.id);
    },
    onParticipantLeft: (participant) => {
      console.log('Ã°Å¸â€˜â€¹ Participant left:', participant.displayName);
    },
    onSpeakerChanged: (speakerId) => {
      // VideoSDK event cung cÃ¡ÂºÂ¥p ID cÃ¡Â»Â§a ngÃ†Â°Ã¡Â»Âi Ã„â€˜ang nÃƒÂ³i
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

  console.log('Ã°Å¸â€œÅ  Participants count:', {
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
    // Request audio permissions first vÃƒÂ  bÃ¡ÂºÂ­t loa ngoÃƒÂ i
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('group_voice.mic_permission_required')); 
          return;
        }

        // Ã°Å¸â€Å  QUAN TRÃ¡Â»Å’NG: CÃ¡ÂºÂ¥u hÃƒÂ¬nh Ã„â€˜Ã¡Â»Æ’ phÃƒÂ¡t qua loa ngoÃƒÂ i (multimedia speaker)
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // Android: loa ngoÃƒÂ i
          interruptionModeIOS: 2, // iOS: AVAudioSessionCategoryPlayAndRecord
        });

        // Ã°Å¸â€Å  CÃ¡ÂºÂ¥u hÃƒÂ¬nh audio cho group voice chat (khÃƒÂ´ng dÃƒÂ¹ng in-call mode)
        // KhÃƒÂ´ng dÃƒÂ¹ng InCallManager Ã„â€˜Ã¡Â»Æ’ trÃƒÂ¡nh chÃ¡ÂºÂ¿ Ã„â€˜Ã¡Â»â„¢ gÃ¡Â»Âi Ã„â€˜iÃ¡Â»â€¡n (tÃ¡ÂºÂ¯t mÃƒÂ n hÃƒÂ¬nh, loa thoÃ¡ÂºÂ¡i)
        console.log('Ã°Å¸Å½Â¤ Audio configured (speaker mode - no proximity sensor), joining meeting...');
        // Join the meeting after audio route configured
        join();
      } catch (error) {
        console.error('Ã¢ÂÅ’ Audio permission/config error:', error);
        Alert.alert(t('common.error'), t('group_voice.audio_init_error')); 
      }
    })();

    // No cleanup needed - khÃƒÂ´ng dÃƒÂ¹ng InCallManager
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <LinearGradient colors={['#070A1F', '#111238', '#2A174D']} style={styles.gradient}>
          <View style={[styles.tiktokHeader, { paddingTop: Math.max(insets.top, 18) + 10 }]}>
            <View style={styles.liveBadgeWrapper}>
              <LinearGradient colors={['#ff416c', '#ff4b2b']} style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE</Text>
              </LinearGradient>
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
    </View>
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
  const isInitializingRoom = useRef(false);

  useEffect(() => {
    if (!groupId || !user) return;

    let isMounted = true;
    const groupRef = doc(db, 'groups', groupId as string);

    const initializeVoiceRoom = async () => {
      if (isInitializingRoom.current) return;
      isInitializingRoom.current = true;

      try {
        setLoading(true);
        // Step 1: Fetch Firestore group document
        const groupDoc = await getDoc(groupRef);
        if (!groupDoc.exists()) {
          Alert.alert(t('common.error'), t('groups.group_not_found', { defaultValue: 'Group not found' }));
          router.back();
          return;
        }

        const data = groupDoc.data();
        let roomId = data?.voiceRoomId;

        if (isMounted) {
          setGroupData({ id: groupDoc.id, ...data });
        }

        let scopedToken: string;

        if (!roomId) {
          console.log('🚀 Creating voice room and getting token in a single API call...');
          const callRoomData = await createCallRoom({
            metadata: {
              source: 'group_voice',
              groupId: groupId as string,
            },
          });
          roomId = callRoomData.roomId || callRoomData.meetingId;
          scopedToken = callRoomData.token;

          if (!roomId || !scopedToken) {
            throw new Error('Server did not return roomId or token');
          }

          // Background Firestore update (non-blocking!)
          updateDoc(groupRef, {
            voiceRoomId: roomId,
            voiceRoomActive: true,
            voiceRoomParticipants: arrayUnion(user.uid),
          }).catch(err => console.error("Error updating Firestore in background:", err));
        } else {
          // Optimization: fetch token and update Firestore in parallel, only blocking on the token!
          console.log('🚀 Voice room already exists. Fetching token and updating Firestore in parallel...');
          const tokenPromise = getToken(roomId);
          
          const updateRoomPromise = updateDoc(groupRef, {
            voiceRoomActive: true,
            voiceRoomParticipants: arrayUnion(user.uid),
          });

          scopedToken = await tokenPromise;

          // Let Firestore update execute in background without blocking joining flow
          updateRoomPromise.catch(err => console.error("Error updating participants in background:", err));
        }

        if (!isMounted) return;
        setToken(scopedToken);
        setMeetingId(roomId);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing voice room:', error);
        Alert.alert(t('common.error'), t('group_voice.create_room_error'));
        router.back();
      } finally {
        isInitializingRoom.current = false;
      }
    };

    initializeVoiceRoom();

    const unsubscribe = onSnapshot(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        setGroupData({ id: snapshot.id, ...snapshot.data() });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (groupId && user) {
        updateDoc(groupRef, {
          voiceRoomParticipants: arrayRemove(user.uid),
        }).catch(console.error);
      }
    };
  }, [groupId, user, router, t]);

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
          console.log('Ã°Å¸â€Â´ Last person leaving, setting voiceRoomActive = false');
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
        <LinearGradient colors={['#0EA5E9', '#06B6D4']} style={styles.gradient}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>{t('group_voice.joining_room')}</Text>
        </LinearGradient>
      </View>
    );
  }

  console.log('Ã°Å¸â€Â§ Initializing MeetingProvider with:', {
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
    backgroundColor: '#070A1F',
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadgeWrapper: {
    borderRadius: 999,
    marginRight: 10,
    overflow: 'hidden',
    shadowColor: '#ff416c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.78)',
  },
  clearSpotlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  clearSpotlightText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  hostSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  emptyHost: {
    height: 178,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderStyle: 'dashed',
  },
  emptyHostText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  speakersSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  participantsList: {
    paddingBottom: 132,
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
    borderRadius: 22,
    padding: 12,
    alignItems: 'center',
    minHeight: 128,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  hostParticipantGradient: {
    minHeight: 178,
    borderRadius: 28,
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hostParticipantGradientSpeaking: {
    borderColor: '#67e8f9',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.9,
    shadowRadius: 18,
  },
  participantGradientSpeaking: {
    borderColor: '#34d399',
    borderWidth: 2,
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 14,
  },
  hostBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
  },
  hostBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  hostBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  micOffBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#fb7185',
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
    fontWeight: '700',
    textAlign: 'center',
  },
  pinHintText: {
    color: 'rgba(203,213,225,0.76)',
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
    marginHorizontal: 18,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 34,
    backgroundColor: 'rgba(13, 18, 40, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  dockButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heartButton: {
    backgroundColor: 'rgba(244, 63, 94, 0.24)',
    borderColor: 'rgba(251, 113, 133, 0.42)',
  },
  micOnButton: {
    backgroundColor: 'rgba(16,185,129,0.26)',
    borderColor: 'rgba(52,211,153,0.48)',
  },
  micOffButton: {
    backgroundColor: 'rgba(239,68,68,0.26)',
    borderColor: 'rgba(248,113,113,0.52)',
  },
  leaveButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.62,
    shadowRadius: 16,
  },
  hangupIcon: {
    transform: [{ rotate: '135deg' }],
  },
  speakingPulse: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 72,
    borderWidth: 3,
    borderColor: '#34d399',
  },
  speakingText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  chatOverlay: {
    height: 218,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(8, 13, 31, 0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  heartsLayer: {
    position: 'absolute',
    right: 28,
    bottom: 126,
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








