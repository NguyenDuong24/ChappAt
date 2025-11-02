import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationContext } from '../context/NotificationProvider';
import { useAuth } from '../context/authContext';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: 'message' | 'call' | 'social' | 'system';
}

const NotificationSettingsScreen = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'messageNotifications',
      title: 'Messages',
      description: 'Get notified of new messages',
      icon: 'message-text',
      enabled: true,
      category: 'message',
    },
    {
      id: 'groupNotifications',
      title: 'Group Messages',
      description: 'Get notified of group messages',
      icon: 'account-group',
      enabled: true,
      category: 'message',
    },
    {
      id: 'mentionNotifications',
      title: 'Mentions',
      description: 'Get notified when someone mentions you',
      icon: 'at',
      enabled: true,
      category: 'message',
    },
    {
      id: 'callNotifications',
      title: 'Calls',
      description: 'Get notified of incoming calls',
      icon: 'phone',
      enabled: true,
      category: 'call',
    },
    {
      id: 'friendRequestNotifications',
      title: 'Friend Requests',
      description: 'Get notified of new friend requests',
      icon: 'account-plus',
      enabled: true,
      category: 'social',
    },
    {
      id: 'reactionNotifications',
      title: 'Reactions',
      description: 'Get notified when someone reacts to your messages',
      icon: 'emoticon-happy',
      enabled: false,
      category: 'social',
    },
    {
      id: 'systemNotifications',
      title: 'System Updates',
      description: 'Get notified of app updates and system messages',
      icon: 'cog',
      enabled: true,
      category: 'system',
    },
  ]);

  const [loading, setLoading] = useState(true);
  const { clearBadge, scheduleNotification } = useNotificationContext();
  const { user } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(currentSettings =>
          currentSettings.map(setting => ({
            ...setting,
            enabled: parsed[setting.id] !== undefined ? parsed[setting.id] : setting.enabled,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncSettingsToFirestore = async (settingsObject: Record<string, boolean>) => {
    try {
      if (!user?.uid) return;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { notificationSettings: settingsObject }, { merge: true });
    } catch (error) {
      console.error('Error syncing notification settings to Firestore:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSetting[]) => {
    try {
      const settingsObject = newSettings.reduce((acc, setting) => {
        acc[setting.id] = setting.enabled;
        return acc;
      }, {} as Record<string, boolean>);

      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settingsObject));
      await syncSettingsToFirestore(settingsObject);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const toggleSetting = (settingId: string) => {
    const newSettings = settings.map(setting =>
      setting.id === settingId
        ? { ...setting, enabled: !setting.enabled }
        : setting
    );
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const testNotification = async () => {
    try {
      await scheduleNotification({
        title: '🔔 Test Notification',
        body: 'This is a test notification from ChappAt!',
        data: { type: 'system' },
      });
    } catch (error) {
      console.log('[Notification] Lỗi test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const clearAllBadges = async () => {
    try {
      await clearBadge();
      Alert.alert('Success', 'All notification badges cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear badges');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'message':
        return '#4f8bff';
      case 'call':
        return '#ff6b6b';
      case 'social':
        return '#51cf66';
      case 'system':
        return '#ffd43b';
      default:
        return '#868e96';
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'message':
        return 'Messages';
      case 'call':
        return 'Calls';
      case 'social':
        return 'Social';
      case 'system':
        return 'System';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f8bff" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0e1a', '#1a1f3a', '#2a2f4a']}
        style={styles.background}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Notification Settings</Text>
          <Text style={styles.subtitle}>Customize your notification preferences</Text>
        </View>

        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View
                style={[
                  styles.categoryIndicator,
                  { backgroundColor: getCategoryColor(category) },
                ]}
              />
              <Text style={styles.categoryTitle}>{getCategoryTitle(category)}</Text>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.cardGradient}
              >
                {categorySettings.map((setting, index) => (
                  <View
                    key={setting.id}
                    style={[
                      styles.settingItem,
                      index < categorySettings.length - 1 && styles.settingItemBorder,
                    ]}
                  >
                    <View style={styles.settingLeft}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: `${getCategoryColor(category)}20` },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={setting.icon as any}
                          size={24}
                          color={getCategoryColor(category)}
                        />
                      </View>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>{setting.title}</Text>
                        <Text style={styles.settingDescription}>
                          {setting.description}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={setting.enabled}
                      onValueChange={() => toggleSetting(setting.id)}
                      trackColor={{
                        false: 'rgba(255,255,255,0.2)',
                        true: getCategoryColor(category),
                      }}
                      thumbColor={setting.enabled ? '#ffffff' : '#f4f3f4'}
                    />
                  </View>
                ))}
              </LinearGradient>
            </View>
          </View>
        ))}

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionButton} onPress={testNotification}>
            <LinearGradient
              colors={['#4f8bff', '#2d5aa0']}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons name="bell-ring" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Test Notification</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={clearAllBadges}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons name="notification-clear-all" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Clear All Badges</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can change these settings anytime. Some notifications may still appear
            based on system requirements.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e1a',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  actionSection: {
    marginVertical: 30,
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default NotificationSettingsScreen;
