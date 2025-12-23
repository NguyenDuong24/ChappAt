import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const ChangePasswordScreen = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { updateUserPassword } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert(t('common.error'), t('signup.password_error_min'));
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(t('common.error'), t('signup.password_error_mismatch'));
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert(t('common.error'), t('signup.password_error_min'));
            return;
        }

        setLoading(true);
        try {
            const result = await updateUserPassword(currentPassword, newPassword);
            if (result.success) {
                Alert.alert(t('common.success'), t('settings.change_password_success', { defaultValue: 'Mật khẩu đã được cập nhật thành công' }));
                router.back();
            } else {
                Alert.alert(t('common.error'), result.msg);
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('common.error_generic'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#F8FAFC', '#EFF6FF']}
                style={styles.background}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings.change_password')}</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={['#6366F1', '#4F46E5']}
                        style={styles.iconGradient}
                    >
                        <MaterialCommunityIcons name="lock-reset" size={40} color="#FFFFFF" />
                    </LinearGradient>
                </View>

                <Text style={styles.description}>
                    {t('settings.change_password_desc')}
                </Text>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('settings.current_password', { defaultValue: 'Mật khẩu hiện tại' })}</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('settings.current_password_placeholder', { defaultValue: 'Nhập mật khẩu hiện tại' })}
                                secureTextEntry={!showCurrent}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholderTextColor="#94A3B8"
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                <MaterialCommunityIcons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('settings.new_password', { defaultValue: 'Mật khẩu mới' })}</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-plus-outline" size={20} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('settings.new_password_placeholder', { defaultValue: 'Nhập mật khẩu mới' })}
                                secureTextEntry={!showNew}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholderTextColor="#94A3B8"
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                <MaterialCommunityIcons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('settings.confirm_new_password', { defaultValue: 'Xác nhận mật khẩu mới' })}</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-check-outline" size={20} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('settings.confirm_new_password_placeholder', { defaultValue: 'Nhập lại mật khẩu mới' })}
                                secureTextEntry={!showConfirm}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholderTextColor="#94A3B8"
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                <MaterialCommunityIcons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleUpdatePassword}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#6366F1', '#4F46E5']}
                            style={styles.submitGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.submitText}>{t('common.save')}</Text>
                                    <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    iconContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 24,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    description: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
    },
    submitButton: {
        marginTop: 12,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        gap: 8,
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ChangePasswordScreen;
