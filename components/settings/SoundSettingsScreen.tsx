import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SoundSettings } from '../../utils/soundSettings';
import { useSound } from '../../hooks/useSound';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getLiquidPalette, LiquidGlassBackground, LiquidSurface } from '../../components/liquid';

interface VolumeSettings {
  calls: number;
  messages: number;
  notifications: number;
  system: number;
}

interface VibrationSettings {
  calls: boolean;
  messages: boolean;
  notifications: boolean;
}

interface SoundSettingsData {
  enabled: boolean;
  volume: VolumeSettings;
  vibration: VibrationSettings;
}

export const SoundSettingsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme, isDark, palette: contextPalette } = useTheme();
  const { playMessageReceivedSound, playNotificationSound, playIncomingCallSound, stopCallSounds } = useSound();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SoundSettingsData | null>(null);

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

  useEffect(() => {
    loadSettings();
    return () => {
      stopCallSounds?.();
    };
  }, [stopCallSounds]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = await SoundSettings.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading sound settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof SoundSettingsData, value: any) => {
    if (!settings) return;
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    await SoundSettings.saveSettings(updatedSettings);
  };

  const updateVolume = async (category: keyof VolumeSettings, volume: number) => {
    if (!settings) return;
    const updatedSettings = {
      ...settings,
      volume: { ...settings.volume, [category]: volume }
    };
    setSettings(updatedSettings);
    await SoundSettings.saveSettings(updatedSettings);
  };

  const testSound = (type: string) => {
    try {
      switch (type) {
        case 'message':
          playMessageReceivedSound?.();
          break;
        case 'notification':
          playNotificationSound?.();
          break;
        case 'call':
          playIncomingCallSound?.();
          setTimeout(() => {
            stopCallSounds?.();
          }, 5000);
          break;
      }
    } catch (error) {
      console.warn('Failed to test sound:', error);
    }
  };

  const backButtonBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const backButtonBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)';

  const renderVolumeRow = (
    icon: string,
    label: string,
    category: keyof VolumeSettings,
    testType?: string,
    color?: string
  ) => {
    if (!settings) return null;
    const value = settings.volume[category];
    const percentage = Math.round(value * 100);

    return (
      <View style={[styles.settingItem, { borderBottomColor: palette.border }]}>
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <MaterialCommunityIcons name={icon as any} size={20} color={color || palette.text} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitleText, { color: palette.text }]}>{label}</Text>
            <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>{percentage}%</Text>
          </View>
        </View>

        <View style={styles.volumeControls}>
          <TouchableOpacity
            style={[styles.volumeBtn, { borderColor: palette.border, backgroundColor: 'rgba(255,255,255,0.08)' }]}
            onPress={() => updateVolume(category, Math.max(0, parseFloat((value - 0.1).toFixed(1))))}
            activeOpacity={0.8}
          >
            <Text style={[styles.volumeBtnText, { color: palette.text }]}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.volumeBtn, { borderColor: palette.border, backgroundColor: 'rgba(255,255,255,0.08)' }]}
            onPress={() => updateVolume(category, Math.min(1, parseFloat((value + 0.1).toFixed(1))))}
            activeOpacity={0.8}
          >
            <Text style={[styles.volumeBtnText, { color: palette.text }]}>+</Text>
          </TouchableOpacity>
          {testType && (
            <TouchableOpacity
              style={[styles.testBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
              onPress={() => testSound(testType)}
              activeOpacity={0.8}
            >
              <Text style={[styles.testBtnText, { color: palette.text }]}>{t('settings.test_sound')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSwitchRow = (
    icon: string,
    label: string,
    value: boolean,
    onToggle: (val: boolean) => void,
    color?: string,
    isLast: boolean = false
  ) => (
    <View style={[styles.settingItem, { borderBottomColor: palette.border }, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={color || palette.text} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitleText, { color: palette.text }]}>{label}</Text>
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
      />
    </View>
  );

  if (loading || !settings) {
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
        <Text style={[styles.headerTitle, { color: palette.text }]}>{t('settings.sound_settings')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.softText }]}>{t('settings.sound_settings')}</Text>
          <LiquidSurface themeMode={theme} style={styles.sectionCard} intensity={isDark ? 16 : 8}>
            {renderSwitchRow(
              'volume-high',
              t('settings.enable_sound'),
              settings.enabled,
              (val) => updateSetting('enabled', val),
              palette.success,
              true
            )}
          </LiquidSurface>
        </View>

        {settings.enabled && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.softText }]}>{t('sound_test.volume_settings', { defaultValue: 'ÂM LƯỢNG' })}</Text>
              <LiquidSurface themeMode={theme} style={styles.sectionCard} intensity={isDark ? 16 : 8}>
                {renderVolumeRow('phone-in-talk-outline', t('settings.call_volume'), 'calls', 'call', palette.success)}
                {renderVolumeRow('message-text-outline', t('settings.message_volume'), 'messages', 'message', palette.info)}
                {renderVolumeRow('bell-outline', t('settings.notification_volume'), 'notifications', 'notification', palette.warning)}
                {renderVolumeRow('cog-outline', t('settings.system_volume'), 'system', undefined, palette.subtleText)}
              </LiquidSurface>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.softText }]}>{t('settings.vibration')}</Text>
              <LiquidSurface themeMode={theme} style={styles.sectionCard} intensity={isDark ? 16 : 8}>
                {renderSwitchRow(
                  'vibrate',
                  t('settings.vibrate_on_calls'),
                  settings.vibration.calls,
                  (val) => updateSetting('vibration', { ...settings.vibration, calls: val }),
                  palette.success,
                  false
                )}
                {renderSwitchRow(
                  'vibrate',
                  t('settings.vibrate_on_messages'),
                  settings.vibration.messages,
                  (val) => updateSetting('vibration', { ...settings.vibration, messages: val }),
                  palette.info,
                  false
                )}
                {renderSwitchRow(
                  'vibrate',
                  t('settings.vibrate_on_notifications'),
                  settings.vibration.notifications,
                  (val) => updateSetting('vibration', { ...settings.vibration, notifications: val }),
                  palette.warning,
                  true
                )}
              </LiquidSurface>
            </View>
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
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  testBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SoundSettingsScreen;
