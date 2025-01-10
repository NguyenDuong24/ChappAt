import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function IncomingCallScreen() {
    const { callerName = 'Unknown', callerAvatar } = useLocalSearchParams();

    const { meetingId, callerId, receiverId, status } = useLocalSearchParams();

    const handleAcceptCall = async () => {
        try {
            const q = query(collection(db, 'calls'), where('meetingId', '==', meetingId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              querySnapshot.forEach(async (docSnapshot) => {
                const callDocRef = doc(db, 'calls', docSnapshot.id);
                await updateDoc(callDocRef, {
                  status: 'accepted',
                });
                router.push({ pathname: '/CallScreen', params: { meetingId, callerId, receiverId,status } });
              });
            } 
          } catch (error) {
            console.error('Error the call:', error);
          }
        
    };

    const handleDeclineCall = async () => {
        try {
          const q = query(collection(db, 'calls'), where('meetingId', '==', meetingId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            querySnapshot.forEach(async (docSnapshot) => {
              const callDocRef = doc(db, 'calls', docSnapshot.id);
              await updateDoc(callDocRef, {
                status: 'declined',
              });
              router.back();
              console.log(`Call with meetingId ${meetingId} declined and status updated.`);
            });
          } else {
            console.log(`No calls found with meetingId: ${meetingId}`);
          }
        } catch (error) {
          console.error('Error declining the call:', error);
        }
      };
    return (
        <View style={styles.container}>
            {/* Ảnh đại diện người gọi */}
            <Image
                source={
                    callerAvatar
                        ? { uri: callerAvatar }
                        : require('../assets/images/logo.png') // Ảnh mặc định
                }
                style={styles.avatar}
            />

            {/* Tên người gọi */}
            <Text style={styles.callerName}>{callerName}</Text>

            {/* Các nút chức năng */}
            <View style={styles.optionsContainer}>
                <View style={styles.option}>
                    <Text style={styles.optionText}>Mute</Text>
                </View>
                <View style={styles.option}>
                    <Text style={styles.optionText}>Message</Text>
                </View>
            </View>

            {/* Nút Accept và Decline */}
            <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.declineButton} onPress={handleDeclineCall}>
                    <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptCall}>
                    <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    callerName: {
        fontSize: 24,
        color: 'white',
        marginBottom: 40,
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '60%',
        marginBottom: 50,
    },
    option: {
        alignItems: 'center',
    },
    optionText: {
        color: 'white',
        fontSize: 16,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
    },
    declineButton: {
        backgroundColor: 'red',
        borderRadius: 50,
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: 'green',
        borderRadius: 50,
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
});
