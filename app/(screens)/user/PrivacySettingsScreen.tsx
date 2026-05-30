import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useTheme } from '@/context/ThemeContext';
import { getLiquidPalette, LiquidGlassBackground, LiquidSurface } from '@/components/liquid';
import { db } from '@/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const PrivacySettingsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark, palette: contextPalette } = useTheme();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [isIncognito, setIsIncognito] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const palette = useMemo(() => {
    const cp = contextPalette || getLiquidPalette(theme);
    return {
      text: cp.textColor,
      subtleText: cp.subtitleColor,
      softText: isDark ? 'rgba(255,255,248,0.62)' : 'rgba(11,33,36,0.62)',
      border: cp.menuBorder || (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)'),
      success: '#2FE0AC',
      warning: '#F6C966',
      info: '#9BD0FF',
      danger: '#FF6B7F',
      primary: cp.primary,
      secondary: cp.secondary,
      appGradient: cp.appGradient,
      cardGradient: cp.cardGradient,
    };
  }, [theme, isDark, contextPalette]);

  const isEmailUser = useMemo(() => {
    if (!user || !user.providerData) return false;
    return user.providerData.some((p: any) => p.providerId === 'password');
  }, [user]);

  const loadPrivacySettings = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setInitialLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data: any = userSnap.data();
        setShowOnlineStatus(data.showOnlineStatus ?? true);
        setProfileVisible(data.profileVisible ?? true);
        setIsIncognito(data.isIncognito ?? false);
        setLoginAlerts(data.loginAlerts ?? true);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setInitialLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadPrivacySettings();
  }, [loadPrivacySettings]);

  const updateSetting = async (field: string, value: boolean) => {
    if (!user?.uid) return;

    // Keep the previous value for rollbacks (Optimistic UI)
    let prevValue = false;
    switch (field) {
      case 'showOnlineStatus':
        prevValue = showOnlineStatus;
        setShowOnlineStatus(value);
        break;
      case 'profileVisible':
        prevValue = profileVisible;
        setProfileVisible(value);
        break;
      case 'isIncognito':
        prevValue = isIncognito;
        setIsIncognito(value);
        break;
      case 'loginAlerts':
        prevValue = loginAlerts;
        setLoginAlerts(value);
        break;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      if (field === 'showOnlineStatus') {
        await updateDoc(userRef, { showOnlineStatus: value, isOnline: value });
      } else {
        await updateDoc(userRef, { [field]: value });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert state on error
      switch (field) {
        case 'showOnlineStatus':
          setShowOnlineStatus(prevValue);
          break;
        case 'profileVisible':
          setProfileVisible(prevValue);
          break;
        case 'isIncognito':
          setIsIncognito(prevValue);
          break;
        case 'loginAlerts':
          setLoginAlerts(prevValue);
          break;
      }
      Alert.alert(
        t('common.error', { defaultValue: 'Lỗi' }), 
        t('settings.update_error', { defaultValue: 'Không thể cập nhật cài đặt' })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error', { defaultValue: 'Lỗi' }), t('common.error_generic', { defaultValue: 'Không thể mở liên kết' }));
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:supportsaigonmatch@gmail.com?subject=Support Request from ' + (user?.email || 'User'));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.delete_account', { defaultValue: 'Xóa tài khoản' }),
      t('settings.delete_account_confirm', { 
        defaultValue: 'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản không? Hành động này không thể hoàn tác và toàn bộ dữ liệu của bạn sẽ bị xóa sạch.' 
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Hủy' }), style: 'cancel' },
        { 
          text: t('common.delete', { defaultValue: 'Xóa' }), 
          style: 'destructive', 
          onPress: () => {
            Linking.openURL('mailto:supportsaigonmatch@gmail.com?subject=Delete Account Request&body=Please delete my account associated with ' + (user?.email || 'User ID: ' + user?.uid));
          } 
        },
      ]
    );
  };

  const backButtonBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const backButtonBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)';
  const iconBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onToggle: (val: boolean) => void,
    color: string,
    isLast: boolean = false
  ) => (
    <View style={[styles.settingItem, { borderBottomColor: palette.border }, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
          true: 'rgba(89,224,177,0.48)',
        }}
        thumbColor={value ? '#EFFFF8' : '#FFFFFF'}
        disabled={loading}
      />
    </View>
  );

  const renderNavigationItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    color: string,
    isLast: boolean = false
  ) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.settingItem, { borderBottomColor: palette.border }, isLast && { borderBottomWidth: 0 }]}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>{subtitle}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={palette.subtleText} />
    </TouchableOpacity>
  );

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.softText }]}>{title}</Text>
      <LiquidSurface themeMode={theme} style={styles.sectionCard} intensity={isDark ? 16 : 8}>
        {content}
      </LiquidSurface>
    </View>
  );

  if (initialLoading) {
    return (
      <LiquidGlassBackground themeMode={theme} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.text} />
      </LiquidGlassBackground>
    );
  }

  return (
    <LiquidGlassBackground themeMode={theme} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: backButtonBg, borderColor: backButtonBorder }]}
          activeOpacity={0.86}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{t('settings.privacy')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {renderSection(
          t('settings.account_privacy'),
          <>
            {renderSettingItem(
              'account-eye-outline',
              t('settings.online_status'),
              t('settings.online_status_desc'),
              showOnlineStatus,
              (val) => updateSetting('showOnlineStatus', val),
              palette.success,
              false
            )}
            {renderNavigationItem(
              'account-cancel-outline',
              t('settings.blocked_users'),
              t('settings.blocked_users_desc'),
              () => router.push('/(screens)/user/BlockedUsersScreen'),
              palette.danger,
              true
            )}
          </>
        )}


        {renderSection(
          t('settings.legal', { defaultValue: 'Pháp lý & Hỗ trợ' }),
          <>
            {renderNavigationItem(
              'delete-outline',
              t('settings.delete_account', { defaultValue: 'Xóa tài khoản' }),
              t('settings.delete_account_desc', { defaultValue: 'Gửi yêu cầu xóa vĩnh viễn tài khoản' }),
              handleDeleteAccount,
              palette.danger,
              true
            )}
          </>
        )}
      </ScrollView>
    </LiquidGlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 26,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 7,
    marginLeft: 2,
    letterSpacing: 0.7,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  settingContent: {
    flex: 1,
    paddingRight: 8,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
});

export default PrivacySettingsScreen;
