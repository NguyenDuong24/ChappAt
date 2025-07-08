import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Image } from 'react-native';
import { getDoc, doc, query, collection, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ListenCallAcceptedScreen = () => {
  const { meetingId, receiverId } = useLocalSearchParams();
  const [callStatus, setCallStatus] = useState('ringing');
  const [receiverInfo, setReceiverInfo] = useState(null);
  const router = useRouter();
  const pulse = new Animated.Value(1);

  useEffect(() => {
    const fetchReceiverData = async () => {
      if (!receiverId) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', receiverId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setReceiverInfo(userData);
          console.log('Receiver Data:', userData);
        } else {
          console.log('No such user!');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
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
  }, [receiverId]);

  const cancelCall = async () => {
    try {
      const q = query(collection(db, 'calls'), where('meetingId', '==', meetingId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        querySnapshot.forEach(async (docSnapshot) => {
          const callDocRef = doc(db, 'calls', docSnapshot.id);
          await updateDoc(callDocRef, { status: 'cancel' });
          router.back();
        });
      }
    } catch (error) {
      console.error('Error declining the call:', error);
    }
  };

  return (
    <LinearGradient colors={['#6A11CB', '#2575FC']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Calling...</Text>
      </View>

      <View style={styles.content}>
        {receiverInfo && (
          <Animated.View style={[styles.profileContainer, { transform: [{ scale: pulse }] }]}>
            <Image source={{ uri: receiverInfo.profileUrl }} style={styles.profileImage} />
            <Text style={styles.receiverName}>{receiverInfo.username}</Text>
          </Animated.View>
        )}

        <Text style={styles.statusText}>
          Status: <Text style={styles.status}>{callStatus}</Text>
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={cancelCall}>
          <Ionicons name="close-circle" size={32} color="#FFF" />
          <Text style={styles.cancelText}>End Call</Text>
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
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cancelText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});