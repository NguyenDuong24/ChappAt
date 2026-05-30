import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { Colors } from '@/constants/Colors';
import { useLogoState } from '@/context/LogoStateContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { reload } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { sendProductionEmailVerification } from '@/utils/emailVerification';
import { useTranslation } from 'react-i18next';

const EmailVerificationScreen = () => {
    const { t } = useTranslation();
    const { user, refreshUser, cancelRegistration } = useAuth();
    const router = useRouter();
    const logoUrl = useLogoState();
    const [isChecking, setIsChecking] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        let interval;
        if (resendCooldown > 0) {
            interval = globalThis.setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => globalThis.clearInterval(interval);
    }, [resendCooldown]);

    const checkVerification = useCallback(async () => {
        if (!auth.currentUser) return;
        setIsChecking(true);
        try {
            await reload(auth.currentUser);
            if (auth.currentUser.emailVerified) {
                await refreshUser();
                router.replace('/signup/ProfileSetupScreen');
            } else {
                Alert.alert(
                    t('signup.verification_pending_title'),
                    t('signup.verification_pending_message')
                );
            }
        } catch (error) {
            console.error('Error checking verification:', error);
            Alert.alert(t('common.error'), t('signup.verification_check_failed'));
        } finally {
            setIsChecking(false);
        }
    }, [refreshUser, router, t]);

    const handleResendEmail = useCallback(async () => {
        if (resendCooldown > 0) return;
        if (!auth.currentUser) return;

        try {
            await sendProductionEmailVerification(auth.currentUser);
            Alert.alert(t('signup.verification_sent_title'), t('signup.verification_sent_message'));
            setResendCooldown(60);
        } catch (error) {
            console.error('Error resending email:', error);
            Alert.alert(t('common.error'), t('signup.verification_check_failed'));
        }
    }, [resendCooldown, t]);

    const handleCancelAction = useCallback(() => {
        Alert.alert(
            t('signup.cancel_title'),
            t('signup.cancel_message'),
            [
                { text: t('common.no'), style: 'cancel' },
                {
                    text: t('signup.cancel_confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' });
                        } catch (error) {
                            console.error('cancelRegistration failed:', error);
                        }
                    },
                },
            ]
        );
    }, [cancelRegistration, t]);

    return (
        <ImageBackground
            source={require('../../assets/images/cover.webp')}
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

                <Text style={styles.title}>{t('signup.email_title')}</Text>
                <Text style={styles.subtitle}>
                    {t('signup.email_subtitle_verify')}{'\n'}
                    <Text style={styles.emailText}>{user?.email}</Text>
                </Text>
                <Text style={styles.instruction}>
                    {t('signup.verification_instruction_full')}
                </Text>

                <TouchableOpacity
                    style={styles.checkButton}
                    onPress={checkVerification}
                    disabled={isChecking}
                >
                    {isChecking ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.checkButtonText}>{t('signup.verification_checked_button')}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.resendButton, resendCooldown > 0 && styles.disabledButton]}
                    onPress={handleResendEmail}
                    disabled={resendCooldown > 0}
                >
                    <Text style={styles.resendButtonText}>
                        {resendCooldown > 0 
                          ? t('signup.verification_resend_cooldown', { count: resendCooldown }) 
                          : t('signup.verification_resend_button')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCancelAction} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>{t('signup.cancel_registration')}</Text>
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
