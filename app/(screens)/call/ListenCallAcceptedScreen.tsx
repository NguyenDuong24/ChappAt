import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Dimensions,
  StatusBar
} from 'react-native';
import { Audio } from 'expo-av';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { acceptCall, declineCall, cancelCall, CALL_STATUS } from '@/services/firebaseCallService';
import { useCallNavigation } from '@/hooks/useNewCallNavigation';

const { width, height } = Dimensions.get('window');

const ListenCallAcceptedScreen = () => {
  const { callId, meetingId, callerId, receiverId, callType, status } = useLocalSearchParams();
  const [callStatus, setCallStatus] = useState(status);
  const [callerInfo, setCallerInfo] = useState<any>(null);
  const { navigateToCallScreen, navigateBack } = useCallNavigation();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const fetchReceiverData = async () => {
      if (!receiverId || Array.isArray(receiverId)) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', receiverId as string));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCallerInfo(userData);
          console.log('Receiver Data (person being called):', userData);
        } else {
          console.log('No such user!');
        }
      } catch (error) {
        console.error('Error fetching receiver data:', error);
      }
    };

    fetchReceiverData();

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotating ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Ripple effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rippleAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave animation
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.05,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();


    // Play outgoing ringtone
    const playOutgoingSound = async () => {
      try {
        console.log('🔊 Playing outgoing ringtone');
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/outcoming.mp3'),
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
      } catch (error) {
        console.error('Error playing outgoing sound:', error);
      }
    };

    playOutgoingSound();

    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
    };
  }, [receiverId]);

  // Listen for call acceptance or rejection
  useEffect(() => {
    if (!callId || typeof callId !== 'string') return;

    const unsubscribe = onSnapshot(doc(db, 'calls', callId), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('Outgoing call status update:', data.status);

        if (data.status === CALL_STATUS.ACCEPTED) {
          console.log('Call accepted! Navigating to call screen...');
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
          navigateToCallScreen({
            id: callId,
            meetingId: meetingId,
            callerId: callerId,
            receiverId: receiverId,
            type: callType,
            status: CALL_STATUS.ACCEPTED
          });
        } else if (data.status === CALL_STATUS.DECLINED || data.status === CALL_STATUS.ENDED) {
          console.log('Call declined or ended.');
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
          navigateBack();
        }
      }
    });

    return () => unsubscribe();
  }, [callId]);

  const handleCancelCall = async () => {
    try {
      console.log('❌ Cancelling call:', callId);
      if (callId && typeof callId === 'string') {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
        await cancelCall(callId);
        console.log('✅ Call cancelled in Firebase');
        navigateBack();
      }
    } catch (error) {
      console.error('Error cancelling call:', error);
    }
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.2, 0],
  });

  const waveTranslateY = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -10, 0],
  });

  const callTypeLabel = callType === 'video' ? 'Video Call' : 'Audio Call';

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.callTypeBadge}>
            <Ionicons
              name={callType === 'video' ? 'videocam' : 'call'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.callTypeText}>{callTypeLabel}</Text>
          </View>
          <Animated.Text
            style={[
              styles.headerText,
              { transform: [{ translateY: waveTranslateY }] }
            ]}
          >
            Calling...
          </Animated.Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {/* Ripple rings */}
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  transform: [{ scale: rippleScale }],
                  opacity: rippleOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  transform: [{
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.4],
                    })
                  }],
                  opacity: rippleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.15, 0],
                  }),
                },
              ]}
            />

            {/* Rotating border */}
            <Animated.View
              style={[
                styles.rotatingBorder,
                { transform: [{ rotate: rotateInterpolate }] },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', 'transparent', '#FFFFFF']}
                style={styles.borderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            {/* Avatar */}
            {callerInfo ? (
              <Animated.View
                style={[
                  styles.avatarWrapper,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Image
                  source={{
                    uri: callerInfo.profileUrl || 'https://via.placeholder.com/200'
                  }}
                  style={styles.avatar}
                />
                <View style={styles.avatarOverlay} />
              </Animated.View>
            ) : (
              <Animated.View
                style={[
                  styles.avatarWrapper,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#E0E0E0']}
                  style={styles.avatarPlaceholder}
                >
                  <Ionicons name="person" size={80} color="#667eea" />
                </LinearGradient>
              </Animated.View>
            )}
          </View>

          {/* User Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.receiverName}>
              {callerInfo?.username || callerInfo?.displayName || 'Unknown User'}
            </Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.callStatus}>
                {callType === 'audio' ? 'Waiting for answer...' : 'Waiting for video call...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Button */}
        <Animated.View
          style={{
            transform: [{ scale: buttonScaleAnim }]
          }}
        >
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelCall}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#F44336', '#D32F2F']}
              style={styles.cancelButtonGradient}
            >
              <Ionicons
                name="call"
                size={32}
                color="#FFFFFF"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
            </LinearGradient>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
};

export default ListenCallAcceptedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  callTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  profileSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  rotatingBorder: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  borderGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 120,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  infoContainer: {
    alignItems: 'center',
  },
  receiverName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  callStatus: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  cancelButton: {
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
