import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationContext } from '../context/NotificationProvider';
import { useAuth } from '../context/authContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { getLiquidPalette, LiquidGlassBackground, LiquidSurface } from '../components/liquid';

interface NotificationSetting {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  enabled: boolean;
  category: 'message' | 'call' | 'social' | 'system';
}

const DEFAULT_NOTIFICATION_SETTINGS: Record<string, boolean> = {
  doNotDisturb: false,
  messageNotifications: true,
  groupNotifications: true,
  mentionNotifications: true,
  callNotifications: true,
  friendRequestNotifications: true,
  reactionNotifications: false,
  systemNotifications: true,
};

const NotificationSettingsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark, palette: contextPalette } = useTheme();
  const { clearBadge, scheduleNotification } = useNotificationContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const palette = useMemo(() => {
    const cp = contextPalette || getLiquidPalette(theme);
    return {
      text: cp.textColor,
      subtleText: cp.subtitleColor,
      softText: isDark ? 'rgba(255,255,248,0.62)' : 'rgba(11,33,36,0.62)',
      border: cp.menuBorder || (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)'),
      success: '#2FE0AC',
      warning: '#F6C966',
      info: '#8BD9FF',
      danger: '#FF6B7F',
    };
  }, [theme, isDark, contextPalette]);

  const [settingValues, setSettingValues] = useState<Record<string, boolean>>(DEFAULT_NOTIFICATION_SETTINGS);

  const staticSettings = useMemo<NotificationSetting[]>(() => [
    {
      id: 'messageNotifications',
      titleKey: 'settings.messages',
      descKey: 'settings.messages_desc',
      icon: 'message-text-outline',
      enabled: settingValues.messageNotifications,
      category: 'message',
    },
    {
      id: 'groupNotifications',
      titleKey: 'settings.group_messages',
      descKey: 'settings.group_messages_desc',
      icon: 'account-group-outline',
      enabled: settingValues.groupNotifications,
      category: 'message',
    },
    {
      id: 'mentionNotifications',
      titleKey: 'settings.mentions',
      descKey: 'settings.mentions_desc',
      icon: 'at',
      enabled: settingValues.mentionNotifications,
      category: 'message',
    },
    {
      id: 'callNotifications',
      titleKey: 'settings.calls',
      descKey: 'settings.calls_desc',
      icon: 'phone-outline',
      enabled: settingValues.callNotifications,
      category: 'call',
    },
    {
      id: 'friendRequestNotifications',
      titleKey: 'settings.friend_requests',
      descKey: 'settings.friend_requests_desc',
      icon: 'account-plus-outline',
      enabled: settingValues.friendRequestNotifications,
      category: 'social',
    },
    {
      id: 'reactionNotifications',
      titleKey: 'settings.reactions',
      descKey: 'settings.reactions_desc',
      icon: 'emoticon-happy-outline',
      enabled: settingValues.reactionNotifications,
      category: 'social',
    },
    {
      id: 'systemNotifications',
      titleKey: 'settings.system_updates',
      descKey: 'settings.system_updates_desc',
      icon: 'cog-outline',
      enabled: settingValues.systemNotifications,
      category: 'system',
    },
  ], [settingValues]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      const savedDnd = await AsyncStorage.getItem('doNotDisturb');
      let nextSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };

      if (user?.uid) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          nextSettings = {
            ...nextSettings,
            ...(data.notificationSettings || {}),
            doNotDisturb: data.doNotDisturb ?? data.notificationSettings?.doNotDisturb ?? nextSettings.doNotDisturb,
          };
        }
      }

      if (savedSettings) {
        nextSettings = {
          ...nextSettings,
          ...JSON.parse(savedSettings),
        };
      }

      if (savedDnd !== null) {
        nextSettings.doNotDisturb = savedDnd === 'true';
      }

      setSettingValues(nextSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user?.uid]);

  const syncSettingsToFirestore = async (settingsObject: Record<string, boolean>) => {
    try {
      if (!user?.uid) return;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        notificationSettings: settingsObject,
        doNotDisturb: settingsObject.doNotDisturb === true,
      }, { merge: true });
    } catch (error) {
      console.error('Error syncing notification settings to Firestore:', error);
    }
  };

  const toggleSetting = async (settingId: string) => {
    const updatedValue = !settingValues[settingId];
    const newValues = {
      ...settingValues,
      [settingId]: updatedValue,
    };
    setSettingValues(newValues);

    try {
      setSaving(true);
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newValues));
      await AsyncStorage.setItem('doNotDisturb', String(newValues.doNotDisturb === true));
      await syncSettingsToFirestore(newValues);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert(t('common.error'), t('settings.update_error'));
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    if (settingValues.doNotDisturb) {
      Alert.alert(t('settings.dnd_settings'), t('settings.dnd_settings_desc'));
      return;
    }
    try {
      await scheduleNotification({
        title: `🔔 ${t('settings.test_notification')}`,
        body: 'This is a test notification from SaiGon Match!',
        data: { type: 'system' },
      });
    } catch (error) {
      console.log('[Notification] Lỗi test notification:', error);
      Alert.alert(t('common.error'), 'Failed to send test notification');
    }
  };

  const clearAllBadges = async () => {
    try {
      await clearBadge();
      Alert.alert(t('common.success'), t('settings.clear_all_badges'));
    } catch (error) {
      console.error('Failed to clear badges:', error);
      Alert.alert(t('common.error'), 'Failed to clear badges');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'message':
        return palette.info;
      case 'call':
        return palette.success;
      case 'social':
        return palette.warning;
      case 'system':
        return '#9BC4FF';
      default:
        return palette.subtleText;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'message':
        return t('settings.messages');
      case 'call':
        return t('settings.calls');
      case 'social':
        return t('settings.friend_requests');
      case 'system':
        return t('settings.system_updates');
      default:
        return t('settings.preferences');
    }
  };

  const groupedSettings = useMemo(() => {
    return staticSettings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, NotificationSetting[]>);
  }, [staticSettings]);

  const backButtonBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const backButtonBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)';

  if (loading) {
    return (
      <LiquidGlassBackground themeMode={theme} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.text} />
      </LiquidGlassBackground>
    );
  }

  const isDndActive = settingValues.doNotDisturb || false;

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
        <Text style={[styles.headerTitle, { color: palette.text }]}>{t('settings.notification_settings')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        
        {/* Do Not Disturb Master Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.softText }]}>{t('settings.quick_menu', { defaultValue: 'CÀI ĐẶT NHANH' })}</Text>
          <LiquidSurface themeMode={theme} style={styles.sectionCard} intensity={isDark ? 16 : 8}>
            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <MaterialCommunityIcons
                    name="bell-off-outline"
                    size={20}
                    color={palette.danger}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitleText, { color: palette.text }]}>
                    {t('settings.dnd_settings')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>
                    {t('settings.dnd_settings_desc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDndActive}
                onValueChange={() => toggleSetting('doNotDisturb')}
                trackColor={{
                  false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  true: 'rgba(255,107,127,0.48)',
                }}
                thumbColor={isDndActive ? '#FFF5F6' : '#FFFFFF'}
                disabled={saving}
              />
            </View>
          </LiquidSurface>
        </View>

        {/* Regular Settings Categorized */}
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <View key={category} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.softText }]}>{getCategoryTitle(category)}</Text>
            <LiquidSurface themeMode={theme} style={styles.sectionCard} intensity={isDark ? 16 : 8}>
              {categorySettings.map((setting, index) => {
                const displayEnabled = isDndActive ? false : setting.enabled;
                return (
                  <View
                    key={setting.id}
                    style={[
                      styles.settingItem,
                      { borderBottomColor: palette.border },
                      index === categorySettings.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={[styles.settingLeft, isDndActive && { opacity: 0.5 }]}>
                      <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                        <MaterialCommunityIcons
                          name={setting.icon as any}
                          size={20}
                          color={getCategoryColor(category)}
                        />
                      </View>
                      <View style={styles.settingContent}>
                        <Text style={[styles.settingTitleText, { color: palette.text }]}>
                          {t(setting.titleKey)}
                        </Text>
                        <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>
                          {t(setting.descKey)}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={displayEnabled}
                      onValueChange={() => toggleSetting(setting.id)}
                      trackColor={{
                        false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                        true: 'rgba(89,224,177,0.48)',
                      }}
                      thumbColor={displayEnabled ? '#EFFFF8' : '#FFFFFF'}
                      disabled={saving || isDndActive}
                    />
                  </View>
                );
              })}
            </LiquidSurface>
          </View>
        ))}

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionButton} onPress={testNotification} activeOpacity={0.88} disabled={isDndActive}>
            <LiquidSurface
              themeMode={theme}
              style={[styles.actionButtonGradient, isDndActive && { opacity: 0.4 }]}
              intensity={24}
            >
              <MaterialCommunityIcons name="bell-ring-outline" size={20} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>{t('settings.test_notification')}</Text>
            </LiquidSurface>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={clearAllBadges} activeOpacity={0.88}>
            <LiquidSurface
              themeMode={theme}
              style={styles.actionButtonGradient}
              intensity={12}
            >
              <MaterialCommunityIcons name="notification-clear-all" size={20} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>{t('settings.clear_all_badges')}</Text>
            </LiquidSurface>
          </TouchableOpacity>
        </View>
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
    borderRadius: 18,
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
  settingTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  actionSection: {
    marginTop: 18,
    gap: 12,
  },
  actionButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default NotificationSettingsScreen;
