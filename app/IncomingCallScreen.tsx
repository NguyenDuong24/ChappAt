import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { cancelCall, acceptCall, CALL_STATUS } from '@/services/firebaseCallService';
import { useCallNavigation } from '@/hooks/useNewCallNavigation';
import { useAudio } from '@/context/AudioContext';

export const options = {
  headerShown: false,
};

export default function IncomingCallScreen() {
    const { callId, meetingId, callerId, receiverId, callType, status, senderName, senderAvatar } = useLocalSearchParams();
    const [callerInfo, setCallerInfo] = useState<any>(null);
    const [callStatus, setCallStatus] = useState(status);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const buttonScaleAnim = useRef(new Animated.Value(1)).current;
    const { navigateToCallScreen, navigateBack } = useCallNavigation();
    const { playSound, stopSound } = useAudio();

    // Fetch thông tin người gọi từ Firestore hoặc từ notification data
    useEffect(() => {
        const fetchCallerInfo = async () => {
            // Nếu đã có senderName và senderAvatar từ notification, sử dụng chúng
            if (senderName && senderAvatar) {
                setCallerInfo({
                    username: Array.isArray(senderName) ? senderName[0] : senderName,
                    profileUrl: Array.isArray(senderAvatar) ? senderAvatar[0] : senderAvatar,
                });
                console.log('Caller info from notification:', { senderName, senderAvatar });
                return;
            }

            // Fallback: fetch từ callerId
            if (!callerId || Array.isArray(callerId)) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', callerId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setCallerInfo(userData);
                    console.log('Caller Data (person calling):', userData);
                } else {
                    console.log('No such user!');
                }
            } catch (error) {
                console.error('Error fetching caller data:', error);
            }
        };

        fetchCallerInfo();
    }, [callerId, senderName, senderAvatar]);

    // Fetch call data từ callId nếu chỉ có callId được provide (từ notification tap)
    useEffect(() => {
        const fetchCallData = async () => {
            if (!callId || Array.isArray(callId)) return;
            if (meetingId && callerId && receiverId) return; // Đã có đủ data từ params

            try {
                console.log('📞 Fetching call data from callId:', callId);
                const callDoc = await getDoc(doc(db, 'calls', callId));
                if (callDoc.exists()) {
                    const callData = callDoc.data();
                    console.log('Call data from notification:', callData);
                    
                    // Update caller info if not already fetched
                    if (!callerInfo && callData.callerId) {
                        const userDoc = await getDoc(doc(db, 'users', callData.callerId));
                        if (userDoc.exists()) {
                            setCallerInfo(userDoc.data());
                        }
                    }
                    
                    // Update call status
                    setCallStatus(callData.status);
                } else {
                    console.log('Call not found:', callId);
                    // Navigate back if call doesn't exist
                    navigateBack();
                }
            } catch (error) {
                console.error('Error fetching call data:', error);
                navigateBack();
            }
        };

        fetchCallData();
    }, [callId, meetingId, callerId, receiverId, callerInfo, navigateBack]);

    // Listen for real-time call status changes
    useEffect(() => {
        if (!callId || Array.isArray(callId)) return;

        const callDocRef = doc(db, 'calls', callId);
        const unsubscribe = onSnapshot(callDocRef, (doc) => {
            if (doc.exists()) {
                const callData = doc.data();
                const newStatus = callData.status;
                console.log('📞 Call status updated:', newStatus);

                // Update local status
                setCallStatus(newStatus);

                // If call is cancelled, declined, ended, navigate back
                if ([CALL_STATUS.CANCELLED, CALL_STATUS.DECLINED, CALL_STATUS.ENDED].includes(newStatus)) {
                    console.log('📞 Call ended, navigating back');
                    stopSound('incomingCall');
                    navigateBack();
                }
            } else {
                console.log('Call document deleted');
                navigateBack();
            }
        }, (error) => {
            console.error('Error listening to call status:', error);
        });

        return () => unsubscribe();
    }, [callId, navigateBack, stopSound]);

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

        // Phát nhạc chuông cho cuộc gọi đến
        const playRingtone = async () => {
            try {
                console.log('🔊 Playing ringtone for incoming call');
                await playSound('incomingCall', { isLooping: true });
            } catch (error) {
                console.error('Error playing ringtone:', error);
            }
        };

        playRingtone();

        return () => {
            // Dừng nhạc chuông khi component unmount
            stopSound('incomingCall');
        };
    }, []);

    const handleAcceptCall = async () => {
        await stopRingtone();
        try {
            console.log('🎯 Accepting call with meetingId:', meetingId);
            if (callId && typeof callId === 'string') {
                // Accept call trong Firebase
                await acceptCall(callId);
                console.log('✅ Call accepted in Firebase');
                
                // Phát âm thanh call accepted
                await playSound('callAccepted');
                
                // Navigate to CallScreen với meetingId
                navigateToCallScreen({
                    id: callId,
                    meetingId: meetingId,
                    callerId: callerId,
                    receiverId: receiverId,
                    type: callType,
                    status: CALL_STATUS.ACCEPTED
                });
            }
        } catch (error) {
            console.error('Error accepting call:', error);
        }
    };

    const handleDeclineCall = async () => {
        await stopSound();
        try {
            console.log('❌ Declining call');
            if (callId && typeof callId === 'string') {
                // Cancel call trong Firebase
                await cancelCall(callId);
                console.log('✅ Call declined in Firebase');
                
                // Navigate back
                navigateBack();
            }
        } catch (error) {
            console.error('Error declining call:', error);
        }
    };

    const stopRingtone = async () => {
        await stopSound('incomingCall');
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