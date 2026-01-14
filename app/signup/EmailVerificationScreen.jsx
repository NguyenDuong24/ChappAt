import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { Colors } from '@/constants/Colors';
import { useLogoState } from '@/context/LogoStateContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification, reload } from 'firebase/auth';
import { auth } from '@/firebaseConfig';

const EmailVerificationScreen = () => {
    const { user, refreshUser } = useAuth();
    const router = useRouter();
    const logoUrl = useLogoState();
    const [isChecking, setIsChecking] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        let interval;
        if (resendCooldown > 0) {
            interval = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendCooldown]);

    const checkVerification = useCallback(async () => {
        if (!auth.currentUser) return;
        setIsChecking(true);
        try {
            await reload(auth.currentUser);
            if (auth.currentUser.emailVerified) {
                // Email verified!
                // Update profileCompleted status in Firestore if needed, or just proceed
                // The authContext listener might pick this up, but we want to be sure
                await refreshUser();
                router.replace('/signup/GenderSelectionScreen');
            } else {
                Alert.alert('Chưa xác thực', 'Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư đến và nhấn vào liên kết xác thực.');
            }
        } catch (error) {
            console.error('Error checking verification:', error);
            Alert.alert('Lỗi', 'Không thể kiểm tra trạng thái xác thực. Vui lòng thử lại.');
        } finally {
            setIsChecking(false);
        }
    }, [refreshUser, router]);

    const handleResendEmail = useCallback(async () => {
        if (resendCooldown > 0) return;
        if (!auth.currentUser) return;

        try {
            await sendEmailVerification(auth.currentUser);
            Alert.alert('Đã gửi lại', 'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư đến.');
            setResendCooldown(60); // 60 seconds cooldown
        } catch (error) {
            console.error('Error resending email:', error);
            Alert.alert('Lỗi', 'Không thể gửi lại email. Vui lòng thử lại sau.');
        }
    }, [resendCooldown]);

    const handleCancel = useCallback(() => {
        Alert.alert(
            'Huỷ đăng ký?',
            'Bạn có chắc muốn huỷ đăng ký? Tài khoản của bạn sẽ bị xoá.',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Huỷ',
                    style: 'destructive',
                    onPress: async () => {
                        // Since user is created but not verified/completed, we should probably delete it or sign out
                        // For now, let's just sign out and let the cleanup logic handle it if possible, 
                        // or explicitly delete if it's a "pending" user.
                        // But authContext cancelRegistration handles this well.
                        try {
                            // We need to import cancelRegistration from useAuth, but I didn't destructure it above.
                            // Let's add it to destructuring.
                        } catch (_) { }
                    },
                },
            ]
        );
    }, []);

    // Re-get cancelRegistration from hook to use in handleCancel
    const { cancelRegistration } = useAuth();
    const handleCancelAction = async () => {
        try {
            await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' });
        } catch (e) {
            console.error(e);
        }
    };


    return (
        <ImageBackground
            source={require('../../assets/images/cover.png')}
            style={styles.background}
            resizeMode="cover"
        >
            <LinearGradient colors={['rgba(15,23,42,0.9)', 'rgba(15,23,42,0.7)']} style={styles.backdrop} />

            <View style={styles.container}>
                {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" />
                ) : (
                    <View style={styles.logoPlaceholder} />
                )}

                <View style={styles.iconContainer}>
                    <Ionicons name="mail-open-outline" size={80} color={Colors.primary} />
                </View>

                <Text style={styles.title}>Xác thực Email</Text>
                <Text style={styles.subtitle}>
                    Chúng tôi đã gửi một liên kết xác thực đến{'\n'}
                    <Text style={styles.emailText}>{user?.email}</Text>
                </Text>
                <Text style={styles.instruction}>
                    Vui lòng kiểm tra hộp thư đến (và cả mục Spam) để xác thực tài khoản của bạn.
                </Text>

                <TouchableOpacity
                    style={styles.checkButton}
                    onPress={checkVerification}
                    disabled={isChecking}
                >
                    {isChecking ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.checkButtonText}>Tôi đã xác thực</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.resendButton, resendCooldown > 0 && styles.disabledButton]}
                    onPress={handleResendEmail}
                    disabled={resendCooldown > 0}
                >
                    <Text style={styles.resendButtonText}>
                        {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại Email'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCancelAction} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Huỷ đăng ký</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 40,
        borderRadius: 20,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        marginBottom: 40,
    },
    iconContainer: {
        marginBottom: 24,
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
    },
    emailText: {
        fontWeight: 'bold',
        color: '#fff',
    },
    instruction: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    checkButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    checkButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resendButton: {
        paddingVertical: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 30,
    },
    disabledButton: {
        opacity: 0.5,
    },
    resendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 8,
    },
    cancelText: {
        color: '#ff6b6b',
        textDecorationLine: 'underline',
        fontSize: 14,
    },
});

export default EmailVerificationScreen;
