import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

export default function IncomingCallScreen() {
    const { meetingId, callerId, receiverId, status, type } = useLocalSearchParams();
    const [callerInfo, setCallerInfo] = useState(null); // State để lưu thông tin người gọi
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const buttonScaleAnim = useRef(new Animated.Value(1)).current;
    const soundRef = useRef<Audio.Sound | null>(null);

    // Fetch thông tin người gọi từ Firestore
    useEffect(() => {
        const fetchCallerInfo = async () => {
            if (!callerId) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', callerId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setCallerInfo(userData);
                    console.log('Caller Data:', userData);
                } else {
                    console.log('No such user!');
                }
            } catch (error) {
                console.error('Error fetching caller data:', error);
            }
        };

        fetchCallerInfo();
    }, [callerId]);

    useEffect(() => {
        // Hiệu ứng avatar
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.1,
                    duration: 800,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Hiệu ứng nút
        Animated.loop(
            Animated.sequence([
                Animated.timing(buttonScaleAnim, {
                    toValue: 1.05,
                    duration: 500,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonScaleAnim, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Phát nhạc chuông
        const playRingtone = async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: 'https://www.soundjay.com/button/beep-07.wav' },
                    { shouldPlay: true, isLooping: true }
                );
                soundRef.current = sound;
            } catch (error) {
                console.error('Error playing ringtone:', error);
            }
        };

        playRingtone();

        return () => {
            if (soundRef.current) {
                soundRef.current.stopAsync();
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const stopRingtone = async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
    };

    const handleAcceptCall = async () => {
        await stopRingtone();
        try {
            const q = query(collection(db, 'calls'), where('meetingId', '==', meetingId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                querySnapshot.forEach(async (docSnapshot) => {
                    await updateDoc(doc(db, 'calls', docSnapshot.id), { status: 'accepted' });
                    router.push({ pathname: '/CallScreen', params: { meetingId, callerId, receiverId, status, type } });
                });
            }
        } catch (error) {
            console.error('Error accepting the call:', error);
        }
    };

    const handleDeclineCall = async () => {
        await stopRingtone();
        try {
            const q = query(collection(db, 'calls'), where('meetingId', '==', meetingId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                querySnapshot.forEach(async (docSnapshot) => {
                    await updateDoc(doc(db, 'calls', docSnapshot.id), { status: 'declined' });
                    router.back();
                });
            }
        } catch (error) {
            console.error('Error declining the call:', error);
        }
    };

    return (
        <LinearGradient colors={['#1E1E1E', '#4A148C']} style={styles.container}>
            {callerInfo ? (
                <>
                    <Animated.Image
                        source={{ uri: callerInfo.profileUrl || require('@/assets/images/logo.png') }}
                        style={[styles.avatar, { transform: [{ scale: scaleAnim }]}]}
                    />
                    <Text style={styles.callerName}>{callerInfo.username || 'Unknown'}</Text>
                    <Text style={styles.callerStatus}>Incoming Call...</Text>
                </>
            ) : (
                <Text style={styles.callerName}>Loading caller info...</Text>
            )}

            <View style={styles.buttonsContainer}>
                <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                    <TouchableOpacity style={styles.declineButton} onPress={handleDeclineCall} activeOpacity={0.8}>
                        <Ionicons name="close" size={24} color="white" />
                        <Text style={styles.buttonText}>Decline</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                    <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptCall} activeOpacity={0.8}>
                        <Ionicons name="call" size={24} color="white" />
                        <Text style={styles.buttonText}>Accept</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    avatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 20,
        borderWidth: 3,
        borderColor: 'white',
    },
    callerName: {
        fontSize: 28,
        color: 'white',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    callerStatus: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 50,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
    },
    declineButton: {
        backgroundColor: '#D32F2F',
        borderRadius: 50,
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 50,
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        marginTop: 5,
    },
});