import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ListenCallAcceptedScreen = () => {
  const { meetingId, receiverId } = useLocalSearchParams(); // Thông tin từ route params
  const [callStatus, setCallStatus] = useState('ringing'); // Trạng thái cuộc gọi
  const router = useRouter();
  const rotation = new Animated.Value(0);

  useEffect(() => {
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };
    startRotation();
  }, [rotation]);

  const cancelCall = async () => {
    try {
      const q = query(collection(db, 'calls'), where('meetingId', '==', meetingId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        querySnapshot.forEach(async (docSnapshot) => {
          const callDocRef = doc(db, 'calls', docSnapshot.id);
          await updateDoc(callDocRef, {
            status: 'cancel',
          });
          router.back();
        });
      }
    } catch (error) {
      console.error('Error declining the call:', error);
    }
  };

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calling {receiverId}...</Text>
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ rotate: rotationInterpolate }] },
        ]}
      >
        <Ionicons name="call" size={50} color="#FFF" />
      </Animated.View>
      <Text style={styles.statusText}>
        Current Status: <Text style={styles.status}>{callStatus}</Text>
      </Text>
      <TouchableOpacity style={styles.cancelButton} onPress={cancelCall}>
        <Ionicons name="close-circle" size={20} color="#FFF" />
        <Text style={styles.cancelText}> Cancel Call</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ListenCallAcceptedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6200EA', // Changed to solid background color
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  iconContainer: {
    marginVertical: 30,
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusText: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 40,
  },
  status: {
    fontWeight: 'bold',
    color: '#FFC107',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  cancelText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
