import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    Image,
    Dimensions,
    StatusBar,
    Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { cancelCall, acceptCall, CALL_STATUS } from '@/services/firebaseCallService';
import { useCallNavigation } from '@/hooks/useNewCallNavigation';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function IncomingCallScreen() {
    const { callId, meetingId, callerId, receiverId, callType, status } = useLocalSearchParams();
    const [callerInfo, setCallerInfo] = useState<any>(null);
    const [callStatus, setCallStatus] = useState(status);

    // Animations
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const buttonScaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;

    const soundRef = useRef<Audio.Sound | null>(null);
    const { navigateToCallScreen, navigateBack } = useCallNavigation();

    // Fetch thông tin người gọi từ Firestore
    useEffect(() => {
        const fetchCallerInfo = async () => {
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
        fetchCallerInfo();
    }, [callerId]);

    // Listen for call status changes (e.g. caller cancels)
    useEffect(() => {
        if (!callId || typeof callId !== 'string') return;

        const unsubscribe = onSnapshot(doc(db, 'calls', callId), async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                console.log('Incoming call status update:', data.status);

                if (data.status === 'ended' || data.status === 'cancelled' || data.status === 'declined') {
                    console.log('Call ended remotely, closing incoming screen');
                    await stopRingtone();
                    navigateBack();
                }
            } else {
                // Call document deleted
                console.log('Call document missing, closing incoming screen');
                await stopRingtone();
                navigateBack();
            }
        });

        return () => unsubscribe();
    }, [callId]);

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Avatar pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.15,
                    duration: 1000,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotating ring animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Ripple effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(rippleAnim, {
                    toValue: 1,
                    duration: 2000,
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

        // Button pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(buttonScaleAnim, {
                    toValue: 1.08,
                    duration: 600,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonScaleAnim, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Phát nhạc chuông
        const playRingtone = async () => {
            try {
                console.log('🔊 Playing incoming ringtone');
                const { sound } = await Audio.Sound.createAsync(
                    require('@/assets/sounds/incoming.mp3'),
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
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (error) {
                console.error('Error stopping ringtone:', error);
            }
            soundRef.current = null;
        }
    };

    const handleAcceptCall = async () => {
        await stopRingtone();
        try {
            console.log('🎯 Accepting call with meetingId:', meetingId);
            if (callId && typeof callId === 'string') {
                await acceptCall(callId);
                console.log('✅ Call accepted in Firebase');

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
        await stopRingtone();
        try {
            console.log('❌ Declining call');
            if (callId && typeof callId === 'string') {
                await cancelCall(callId);
                console.log('✅ Call declined in Firebase');
                navigateBack();
            }
        } catch (error) {
            console.error('Error declining call:', error);
        }
    };

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.5],
    });

    const rippleOpacity = rippleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.6, 0.3, 0],
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
                {/* Call Type Badge */}
                <View style={styles.callTypeBadge}>
                    <Ionicons
                        name={callType === 'video' ? 'videocam' : 'call'}
                        size={16}
                        color="#FFFFFF"
                    />
                    <Text style={styles.callTypeText}>{callTypeLabel}</Text>
                </View>

                {/* Avatar Container with Ripple Effect */}
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
                                        outputRange: [0.8, 1.3],
                                    })
                                }],
                                opacity: rippleAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0.4, 0.2, 0],
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
                                { transform: [{ scale: scaleAnim }] },
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
                                { transform: [{ scale: scaleAnim }] },
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

                {/* Caller Info */}
                <View style={styles.infoContainer}>
                    <Text style={styles.callerName}>
                        {callerInfo?.username || callerInfo?.displayName || 'Unknown User'}
                    </Text>
                    <Text style={styles.callerStatus}>Incoming {callTypeLabel}...</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonsContainer}>
                    {/* Decline Button */}
                    <Animated.View
                        style={{
                            transform: [{ scale: buttonScaleAnim }]
                        }}
                    >
                        <TouchableOpacity
                            style={styles.declineButton}
                            onPress={handleDeclineCall}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#F44336', '#D32F2F']}
                                style={styles.buttonGradient}
                            >
                                <Ionicons name="close" size={32} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={styles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Accept Button */}
                    <Animated.View
                        style={{
                            transform: [{ scale: buttonScaleAnim }]
                        }}
                    >
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={handleAcceptCall}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#4CAF50', '#388E3C']}
                                style={styles.buttonGradient}
                            >
                                <Ionicons name="call" size={32} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Animated.View>
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
    content: {
        alignItems: 'center',
        width: '100%',
    },
    callTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    callTypeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    avatarContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    rippleRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    rotatingBorder: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    borderGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 110,
        borderWidth: 3,
        borderColor: 'transparent',
    },
    avatarWrapper: {
        width: 180,
        height: 180,
        borderRadius: 90,
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
        marginBottom: 60,
    },
    callerName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    callerStatus: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 40,
        marginTop: 20,
    },
    declineButton: {
        alignItems: 'center',
    },
    acceptButton: {
        alignItems: 'center',
    },
    buttonGradient: {
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
    declineButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
