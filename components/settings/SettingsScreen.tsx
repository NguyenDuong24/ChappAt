import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Linking,
  Image,
  Modal,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import FeedbackModalSimple from '@/components/common/FeedbackModalSimple';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import HelpSupportModalSimple from '@/components/common/HelpSupportModalSimple';
import BackupRestoreModal from '@/components/common/BackupRestoreModal';
import DataManagementModal from '@/components/common/DataManagementModal';
import TestModal from '@/components/common/TestModal';
import { useRouter } from 'expo-router';
import { submitFeedback, submitReport, submitSupportRequest } from '@/services/supportService';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface SettingsScreenProps {
  currentUser?: any;
  onSignOut?: () => void;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
}

const SettingsScreen = ({ currentUser, onSignOut, onThemeToggle, isDarkMode = false }: SettingsScreenProps) => {
  const { t, i18n } = useTranslation();

  // Modal states
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [backupVisible, setBackupVisible] = useState(false);
  const [dataManagementVisible, setDataManagementVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Settings states
  const [notifications, setNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [dataUsage, setDataUsage] = useState(false);

  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguageModalVisible(false);
  };

  const openEditProfile = () => {
    try {
      // Primary (group names like (tabs) are omitted in path resolution)
      router.push('/profile/EditProfile');
    } catch (e) {
      // Fallback in case explicit grouped path is needed
      try { router.push('/(tabs)/profile/EditProfile'); } catch { }
    }
  };

  const colors = {
    background: isDarkMode ? '#0F172A' : '#FFFFFF',
    surface: isDarkMode ? '#1E293B' : '#F8FAFC',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
    subtleText: isDarkMode ? '#94A3B8' : '#64748B',
    border: isDarkMode ? '#374151' : '#E2E8F0',
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  // Hoisted function so it can be used in settingsSections before its definition
  async function handleToggleOnlineStatus(val: boolean) {
    setOnlineStatus(val);
    try {
      const uid = currentUser?.uid || user?.uid;
      if (!uid) return;
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, { showOnlineStatus: val });
      if (val === false) {
        await updateDoc(ref, { isOnline: false });
      }
      try { await refreshUser?.(); } catch { }
    } catch (e) {
      Alert.alert(t('common.error'), t('settings.online_status_error', { defaultValue: 'Could not update online status' }));
    }
  }

  const settingsSections = [
    {
      title: t('settings.title'),
      items: [
        {
          icon: 'shield-account',
          title: t('settings.privacy'),
          subtitle: t('settings.privacy_desc'),
          onPress: () => router.push('/(screens)/user/PrivacySettingsScreen'),
          color: colors.success,
        },
        {
          icon: 'key',
          title: t('settings.change_password'),
          subtitle: t('settings.change_password_desc'),
          onPress: () => router.push('/(screens)/user/ChangePasswordScreen'),
          color: colors.warning,
        },
      ],
    },
    {
      title: t('chat.title'),
      items: [
        {
          icon: 'account-clock',
          title: t('settings.online_status'),
          subtitle: t('settings.online_status_desc'),
          isSwitch: true,
          value: onlineStatus,
          onToggle: handleToggleOnlineStatus,
          color: colors.success,
        }
      ],
    },
    {
      title: t('settings.language'),
      items: [
        {
          icon: 'translate',
          title: t('settings.select_language'),
          subtitle: i18n.language === 'vi' ? t('settings.vietnamese') : t('settings.english'),
          onPress: () => setLanguageModalVisible(true),
          color: colors.primary,
        }
      ],
    },
    {
      title: t('settings.appearance'),
      items: [
        {
          icon: 'theme-light-dark',
          title: t('settings.dark_mode'),
          subtitle: t('settings.appearance_desc'),
          isSwitch: true,
          value: isDarkMode,
          onToggle: onThemeToggle,
          color: colors.primary,
        }
      ],
    },
    {
      title: t('settings.support'),
      items: [
        {
          icon: 'help-circle',
          title: t('settings.help_center'),
          subtitle: t('settings.help_center_desc'),
          onPress: () => setHelpVisible(true),
          color: colors.primary,
        },
        {
          icon: 'message-star',
          title: t('settings.send_feedback'),
          subtitle: t('settings.send_feedback_desc'),
          onPress: () => setFeedbackVisible(true),
          color: colors.success,
        },
        {
          icon: 'flag',
          title: t('settings.report_issue'),
          subtitle: t('settings.report_issue_desc'),
          onPress: () => setReportVisible(true),
          color: colors.danger,
        },
        {
          icon: 'share-variant',
          title: t('settings.share_app'),
          subtitle: t('settings.share_app_desc'),
          onPress: () => handleShare(),
          color: colors.primary,
        },
      ],
    },
    {
      title: t('settings.legal'),
      items: [
        {
          icon: 'file-document',
          title: t('settings.terms'),
          subtitle: t('settings.terms_desc'),
          onPress: () => handleOpenURL('https://example.com/terms'),
          color: colors.subtleText,
        },
        {
          icon: 'shield-check',
          title: t('settings.privacy_policy'),
          subtitle: t('settings.privacy_policy_desc'),
          onPress: () => handleOpenURL('https://example.com/privacy'),
          color: colors.subtleText,
        },
        {
          icon: 'information',
          title: t('settings.about'),
          subtitle: t('settings.about_desc'),
          onPress: () => showAppInfo(),
          color: colors.subtleText,
        },
      ],
    }
  ];

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('settings.share_message'),
        title: t('settings.share_title'),
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.share_error', { defaultValue: 'Could not share app' }));
    }
  };

  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('common.error_url', { defaultValue: 'Could not open link' }));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error_url', { defaultValue: 'Could not open link' }));
    }
  };

  const showAppInfo = () => {
    Alert.alert(
      t('settings.about'),
      `ChappAt - ${t('home.subtitle')}\n${t('settings.about_desc')}\nBản quyền © 2025\n\nPhát triển bởi: Your Team`,
      [{ text: t('common.ok') }]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      t('profile.logout'),
      t('settings.logout_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: () => onSignOut?.(),
        },
      ]
    );
  };

  const handleFeedbackSubmit = async (feedback: any) => {
    try {
      await submitFeedback(feedback, {
        uid: currentUser?.uid,
        email: currentUser?.email,
        username: currentUser?.username || currentUser?.displayName,
      });
    } catch (e) {
      console.log('submitFeedback error', e);
      throw e;
    }
  };

  const handleReportSubmit = async (report: any) => {
    try {
      const userInfo = {
        uid: currentUser?.uid || user?.uid,
        email: currentUser?.email || user?.email,
        username: currentUser?.username || currentUser?.displayName || user?.username || user?.displayName,
      };
      const sanitized = { ...report, images: Array.isArray(report?.images) ? report.images : [] };
      await submitReport(sanitized, userInfo);
    } catch (e) {
      console.log('❌ submitReport error:', e);
      throw e;
    }
  };

  React.useEffect(() => {
    // bootstrap from user doc
    (async () => {
      try {
        const uid = currentUser?.uid || user?.uid;
        if (!uid) return;
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data: any = snap.data();
          if (typeof data?.showOnlineStatus === 'boolean') {
            setOnlineStatus(data.showOnlineStatus);
          }
        }
      } catch { }
    })();
  }, [currentUser?.uid, user?.uid]);

  const renderSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {section.items.map((it: any) => (
          it.isSwitch ? (
            <View key={it.title} style={[styles.settingItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${it.color}20` }]}>
                  <MaterialCommunityIcons name={it.icon} size={20} color={it.color} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{it.title}</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.subtleText }]}>{it.subtitle}</Text>
                </View>
              </View>
              <Switch
                value={it.value}
                onValueChange={it.onToggle}
                trackColor={{ false: colors.border, true: `${it.color}40` }}
                thumbColor={it.value ? it.color : colors.subtleText}
              />
            </View>
          ) : (
            <TouchableOpacity key={it.title} style={[styles.settingItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} onPress={it.onPress}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${it.color}20` }]}>
                  <MaterialCommunityIcons name={it.icon} size={20} color={it.color} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>{it.title}</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.subtleText }]}>{it.subtitle}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.subtleText} />
            </TouchableOpacity>
          )
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Display */}
        <View style={[styles.userInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image source={{ uri: user?.profileUrl || 'https://via.placeholder.com/50' }} style={styles.userAvatar} />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || user?.username || t('chat.unknown_user')}</Text>
            <Text style={[styles.userEmail, { color: colors.subtleText }]}>{user?.email || t('settings.no_email')}</Text>
          </View>
          <TouchableOpacity style={styles.editProfileButton} onPress={openEditProfile}>
            <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {settingsSections.map(renderSection)}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.signOutGradient}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={styles.signOutText}>{t('profile.logout')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings.select_language')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.languageOption, i18n.language === 'vi' && { backgroundColor: `${colors.primary}20` }]}
              onPress={() => changeLanguage('vi')}
            >
              <Text style={[styles.languageText, { color: colors.text }, i18n.language === 'vi' && { color: colors.primary, fontWeight: 'bold' }]}>
                {t('settings.vietnamese')}
              </Text>
              {i18n.language === 'vi' && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.languageOption, i18n.language === 'en' && { backgroundColor: `${colors.primary}20` }]}
              onPress={() => changeLanguage('en')}
            >
              <Text style={[styles.languageText, { color: colors.text }, i18n.language === 'en' && { color: colors.primary, fontWeight: 'bold' }]}>
                {t('settings.english')}
              </Text>
              {i18n.language === 'en' && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <FeedbackModalSimple
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        onSubmit={handleFeedbackSubmit}
      />

      <ReportModalSimple
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={handleReportSubmit}
        targetType="user"
        targetInfo={{
          id: 'app-issue',
          name: 'Ứng dụng ChappAt',
          content: 'Báo cáo sự cố ứng dụng',
        }}
        currentUser={currentUser}
      />

      <HelpSupportModalSimple
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        startInContactForm={false}
        onSubmitContact={async (message: string, email?: string, images?: string[], type?: 'support' | 'bug' | 'suggestion') => {
          try {
            await submitSupportRequest(message, email, images, type, {
              uid: currentUser?.uid || user?.uid,
              email: currentUser?.email || user?.email,
              username: currentUser?.username || currentUser?.displayName || user?.username || user?.displayName,
            });
            Alert.alert('✅ ' + t('common.success'), t('settings.support_success'));
          } catch (e) {
            console.error('Submit support request error:', e);
            Alert.alert('❌ ' + t('common.error'), t('settings.support_error'));
          }
        }}
      />

      <BackupRestoreModal
        visible={backupVisible}
        onClose={() => setBackupVisible(false)}
      />

      <DataManagementModal
        visible={dataManagementVisible}
        onClose={() => setDataManagementVisible(false)}
      />

      <TestModal
        visible={testModalVisible}
        onClose={() => setTestModalVisible(false)}
        title="Test Modal"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginTop: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  editProfileButton: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  signOutButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  languageText: {
    fontSize: 16,
  },
});

export default SettingsScreen;
