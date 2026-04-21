import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useTheme } from '@/context/ThemeContext';
import { getLiquidPalette } from '@/components/liquid';
import { db } from '@/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const glassGradient = ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.08)'] as const;

const PrivacySettingsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark, palette: contextPalette } = useTheme();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [allowMessageFromStrangers, setAllowMessageFromStrangers] = useState(false);
  const [showProfileToEveryone, setShowProfileToEveryone] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const palette = useMemo(() => {
    if (contextPalette) return {
      text: contextPalette.textColor,
      subtleText: contextPalette.subtitleColor,
      softText: isDark ? 'rgba(255,255,248,0.62)' : 'rgba(11,33,36,0.62)',
      border: contextPalette.menuBorder || (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)'),
      success: '#2FE0AC',
      warning: '#F6C966',
      info: '#9BD0FF',
    };
    const lp = getLiquidPalette(theme);
    return {
      text: lp.textColor,
      subtleText: lp.subtitleColor,
      softText: isDark ? 'rgba(255,255,248,0.62)' : 'rgba(11,33,36,0.62)',
      border: lp.menuBorder,
      success: '#2FE0AC',
      warning: '#F6C966',
      info: '#9BD0FF',
    };
  }, [theme, isDark, contextPalette]);

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
        const data: any = userSnap.data();
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
      Alert.alert(t('common.error'), t('settings.update_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = async (value: boolean) => {
    if (!value) {
      updateSetting('twoFactorEnabled', false);
      return;
    }

    Alert.alert(
      t('settings.two_factor_title'),
      t('settings.two_factor_desc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => updateSetting('twoFactorEnabled', true) },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onToggle: (val: boolean) => void,
    color: string
  ) => (
    <View style={[styles.settingItem, { borderBottomColor: palette.border }]}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
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
        trackColor={{ false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', true: 'rgba(89,224,177,0.48)' }}
        thumbColor={value ? '#EFFFF8' : '#FFFFFF'}
        disabled={loading}
      />
    </View>
  );

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.softText }]}>{title}</Text>
      <LinearGradient colors={glassGradient} style={styles.sectionCard}>
        {content}
      </LinearGradient>
    </View>
  );

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#0A6C54', '#0A4C3B']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator size="large" color={'#EFFFF8'} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A6C54', '#0A4C3B']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.86}>
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
              palette.success
            )}
            {renderSettingItem(
              'account-card-details-outline',
              t('settings.public_profile'),
              t('settings.public_profile_desc'),
              showProfileToEveryone,
              (val) => updateSetting('showProfileToEveryone', val),
              palette.info
            )}
          </>
        )}

        {renderSection(
          t('settings.chat_privacy'),
          <>
            {renderSettingItem(
              'check-all',
              t('settings.read_receipts'),
              t('settings.read_receipts_desc'),
              showReadReceipts,
              (val) => updateSetting('showReadReceipts', val),
              palette.success
            )}
            {renderSettingItem(
              'message-text-outline',
              t('settings.stranger_messages'),
              t('settings.stranger_messages_desc'),
              allowMessageFromStrangers,
              (val) => updateSetting('allowMessageFromStrangers', val),
              palette.warning
            )}
          </>
        )}

        {renderSection(
          t('settings.account_security'),
          <>
            {renderSettingItem(
              'shield-check-outline',
              t('settings.two_factor'),
              t('settings.two_factor_desc_short'),
              twoFactorEnabled,
              handleTwoFactorToggle,
              palette.warning
            )}
            {renderSettingItem(
              'bell-alert-outline',
              t('settings.login_alerts'),
              t('settings.login_alerts_desc'),
              loginAlerts,
              (val) => updateSetting('loginAlerts', val),
              palette.info
            )}
          </>
        )}
      </ScrollView>
    </View>
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
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
