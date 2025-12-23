import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const PrivacySettingsScreen = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Privacy settings
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [showReadReceipts, setShowReadReceipts] = useState(true);
    const [allowMessageFromStrangers, setAllowMessageFromStrangers] = useState(false);
    const [showProfileToEveryone, setShowProfileToEveryone] = useState(true);

    // Security settings
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loginAlerts, setLoginAlerts] = useState(true);

    useEffect(() => {
        if (user?.uid) {
            loadPrivacySettings();
        }
    }, [user?.uid]);

    const loadPrivacySettings = async () => {
        try {
            setInitialLoading(true);
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                setShowOnlineStatus(data.showOnlineStatus ?? true);
                setShowReadReceipts(data.showReadReceipts ?? true);
                setAllowMessageFromStrangers(data.allowMessageFromStrangers ?? false);
                setShowProfileToEveryone(data.showProfileToEveryone ?? true);
                setTwoFactorEnabled(data.twoFactorEnabled ?? false);
                setLoginAlerts(data.loginAlerts ?? true);
            }
        } catch (error) {
            console.error('Error loading privacy settings:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const updateSetting = async (field: string, value: boolean) => {
        if (!user?.uid) return;

        try {
            setLoading(true);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { [field]: value });

            // Update local state
            switch (field) {
                case 'showOnlineStatus':
                    setShowOnlineStatus(value);
                    break;
                case 'showReadReceipts':
                    setShowReadReceipts(value);
                    break;
                case 'allowMessageFromStrangers':
                    setAllowMessageFromStrangers(value);
                    break;
                case 'showProfileToEveryone':
                    setShowProfileToEveryone(value);
                    break;
                case 'twoFactorEnabled':
                    setTwoFactorEnabled(value);
                    break;
                case 'loginAlerts':
                    setLoginAlerts(value);
                    break;
            }
        } catch (error) {
            console.error('Error updating setting:', error);
            Alert.alert(t('common.error'), t('settings.update_error', { defaultValue: 'Không thể cập nhật cài đặt' }));
        } finally {
            setLoading(false);
        }
    };

    const handleTwoFactorToggle = async (value: boolean) => {
        if (value) {
            Alert.alert(
                t('settings.two_factor_title', { defaultValue: 'Bật xác thực 2 yếu tố' }),
                t('settings.two_factor_desc', { defaultValue: 'Bạn có muốn bật xác thực 2 yếu tố để bảo vệ tài khoản?' }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.confirm'), onPress: () => updateSetting('twoFactorEnabled', true) },
                ]
            );
        } else {
            updateSetting('twoFactorEnabled', false);
        }
    };

    const renderSettingItem = (icon: string, title: string, subtitle: string, isSwitch: boolean, value?: boolean, onToggle?: (val: boolean) => void, onPress?: () => void) => (
        <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                    <MaterialCommunityIcons name={icon as any} size={22} color="#6366F1" />
                </View>
                <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{title}</Text>
                    <Text style={styles.settingSubtitle}>{subtitle}</Text>
                </View>
            </View>
            {isSwitch ? (
                <Switch
                    value={value}
                    onValueChange={onToggle}
                    trackColor={{ false: '#E2E8F0', true: '#6366F1' }}
                    thumbColor="#FFFFFF"
                    disabled={loading}
                />
            ) : (
                <TouchableOpacity onPress={onPress}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderSection = (title: string, items: React.ReactNode) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {items}
            </View>
        </View>
    );

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8FAFC', '#EFF6FF']}
                style={styles.background}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings.privacy')}</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {renderSection(
                    t('settings.account_privacy', { defaultValue: 'Quyền riêng tư tài khoản' }),
                    <>
                        {renderSettingItem(
                            'account-eye',
                            t('settings.online_status'),
                            t('settings.online_status_desc'),
                            true,
                            showOnlineStatus,
                            (val) => updateSetting('showOnlineStatus', val)
                        )}
                        {renderSettingItem(
                            'account-card-details',
                            t('settings.public_profile', { defaultValue: 'Hiển thị profile công khai' }),
                            t('settings.public_profile_desc', { defaultValue: 'Cho phép mọi người xem thông tin profile của bạn' }),
                            true,
                            showProfileToEveryone,
                            (val) => updateSetting('showProfileToEveryone', val)
                        )}
                    </>
                )}

                {renderSection(
                    t('settings.chat_privacy', { defaultValue: 'Quyền riêng tư chat' }),
                    <>
                        {renderSettingItem(
                            'check-all',
                            t('settings.read_receipts', { defaultValue: 'Hiển thị xác nhận đã đọc' }),
                            t('settings.read_receipts_desc', { defaultValue: 'Cho người khác biết bạn đã đọc tin nhắn' }),
                            true,
                            showReadReceipts,
                            (val) => updateSetting('showReadReceipts', val)
                        )}
                        {renderSettingItem(
                            'message-text-outline',
                            t('settings.stranger_messages', { defaultValue: 'Cho phép tin nhắn từ người lạ' }),
                            t('settings.stranger_messages_desc', { defaultValue: 'Nhận tin nhắn từ người không có trong danh bạ' }),
                            true,
                            allowMessageFromStrangers,
                            (val) => updateSetting('allowMessageFromStrangers', val)
                        )}
                    </>
                )}

                {renderSection(
                    t('settings.account_security', { defaultValue: 'Bảo mật tài khoản' }),
                    <>
                        {renderSettingItem(
                            'shield-check',
                            t('settings.two_factor', { defaultValue: 'Xác thực 2 yếu tố' }),
                            t('settings.two_factor_desc_short', { defaultValue: 'Bảo vệ tài khoản với xác thực bổ sung' }),
                            true,
                            twoFactorEnabled,
                            handleTwoFactorToggle
                        )}
                        {renderSettingItem(
                            'bell-alert',
                            t('settings.login_alerts', { defaultValue: 'Thông báo đăng nhập' }),
                            t('settings.login_alerts_desc', { defaultValue: 'Nhận thông báo khi có đăng nhập mới' }),
                            true,
                            loginAlerts,
                            (val) => updateSetting('loginAlerts', val)
                        )}
                    </>
                )}

                {renderSection(
                    t('settings.blocking', { defaultValue: 'Chặn và hạn chế' }),
                    <>
                        {renderSettingItem(
                            'account-cancel',
                            t('settings.blocked_users', { defaultValue: 'Danh sách người bị chặn' }),
                            t('settings.blocked_users_desc', { defaultValue: 'Quản lý người dùng đã bị chặn' }),
                            false,
                            undefined,
                            undefined,
                            () => Alert.alert(t('common.info'), t('common.coming_soon', { defaultValue: 'Tính năng này sẽ sớm ra mắt' }))
                        )}
                    </>
                )}

                <View style={styles.bottomPadding} />
            </ScrollView>
        </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
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
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F3FF',
        marginRight: 14,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#94A3B8',
        lineHeight: 18,
    },
    bottomPadding: {
        height: 40,
    },
});

export default PrivacySettingsScreen;
