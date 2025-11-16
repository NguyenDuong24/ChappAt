import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Image } from 'react-native';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { acceptCall, declineCall, cancelCall, CALL_STATUS } from '@/services/firebaseCallService';
import { useCallNavigation } from '@/hooks/useNewCallNavigation';
import { useAudio } from '@/context/AudioContext';

const ListenCallAcceptedScreen = () => {
  const { callId, meetingId, callerId, receiverId, callType, status } = useLocalSearchParams();
  const [callStatus, setCallStatus] = useState(status);
  const [callerInfo, setCallerInfo] = useState<any>(null);
  const { navigateToCallScreen, navigateBack } = useCallNavigation();
  const { playSound, stopSound } = useAudio();
  const pulse = new Animated.Value(1);

  useEffect(() => {
    const fetchReceiverData = async () => {
      if (!receiverId || Array.isArray(receiverId)) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', receiverId as string));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCallerInfo(userData); // Reusing callerInfo state to store receiver data
          console.log('Receiver Data (person being called):', userData);
        } else {
          console.log('No such user!');
        }
      } catch (error) {
        console.error('Error fetching receiver data:', error);
      }
    };

    fetchReceiverData();

    // Hiệu ứng nhấp nháy
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Phát âm thanh gọi đi
    const playOutgoingCallSound = async () => {
      try {
        console.log('🔊 Playing outgoing call sound');
        await playSound('outgoingCall', { isLooping: true });
      } catch (error) {
        console.error('Error playing outgoing call sound:', error);
      }
    };

    playOutgoingCallSound();

    return () => {
      // Dừng âm thanh khi component unmount
      stopSound('outgoingCall');
    };
  }, [receiverId]);

  const handleCancelCall = async () => {
    try {
      console.log('❌ Cancelling call:', callId);
      if (callId && typeof callId === 'string') {
        // Dừng âm thanh trước khi cancel
        await stopSound('outgoingCall');
        
        await cancelCall(callId);
        console.log('✅ Call cancelled in Firebase');
        
        // Navigate back
        navigateBack();
      }
    } catch (error) {
      console.error('Error cancelling call:', error);
    }
  };

  return (
    <LinearGradient colors={['#6A11CB', '#2575FC']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Calling...</Text>
      </View>

      <View style={styles.content}>
        {callerInfo && (
          <Animated.View style={[styles.profileContainer, { transform: [{ scale: pulse }] }]}>
            <Image source={{ uri: callerInfo.profileUrl }} style={styles.profileImage} />
            <Text style={styles.receiverName}>{callerInfo.username}</Text>
            <Text style={styles.callStatus}>
              {callType === 'audio' ? 'Waiting for answer...' : 'Video call waiting...'}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelCall}>
          <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default ListenCallAcceptedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    width: '100%',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  receiverName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  receiverBio: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.8,
  },
  statusText: {
    fontSize: 18,
    color: '#FFF',
    marginTop: 20,
  },
  status: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  callStatus: {
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 50,
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});