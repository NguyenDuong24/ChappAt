import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  Modal,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
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
import { useTheme } from '@/context/ThemeContext';
import { getLiquidPalette, LiquidGlassBackground } from '@/components/liquid';
import { getThemeColors, getThemeDisplayName } from '@/constants/Colors';
import { db } from '@/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface SettingsScreenProps {
  currentUser?: any;
  onSignOut?: () => void;
}

const SettingsScreen = ({ currentUser, onSignOut }: SettingsScreenProps) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { theme, isDark, palette: contextPalette, themes, setTheme } = useTheme();

  // Fallback helper
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [backupVisible, setBackupVisible] = useState(false);
  const [dataManagementVisible, setDataManagementVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);

  const palette = useMemo(() => {
    const lp = contextPalette || getLiquidPalette(theme);
    return {
      text: lp.textColor,
      subtleText: lp.subtitleColor,
      softText: isDark ? 'rgba(235,245,255,0.72)' : 'rgba(31,41,55,0.66)',
      border: lp.menuBorder || (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.10)'),
      surface: isDark ? 'rgba(14, 23, 38, 0.88)' : 'rgba(255, 255, 255, 0.92)',
      surfaceStrong: isDark ? 'rgba(18, 30, 48, 0.94)' : 'rgba(255, 255, 255, 0.98)',
      modalSurface: isDark ? '#111827' : '#FFFFFF',
      iconBg: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.055)',
      activeBg: isDark ? 'rgba(45,212,191,0.15)' : 'rgba(13,148,136,0.10)',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#2563EB',
      accent: lp.primary,
      accentSoft: lp.secondary,
    };
  }, [theme, isDark, contextPalette]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguageModalVisible(false);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile');
  };

  const openEditProfile = () => {
    try {
      router.push('/profile/EditProfile');
    } catch {
      try {
        router.push('/(tabs)/profile/EditProfile');
      } catch {}
    }
  };

  const handleToggleOnlineStatus = async (val: boolean) => {
    setOnlineStatus(val);
    try {
      const uid = currentUser?.uid || user?.uid;
      if (!uid) return;
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, { showOnlineStatus: val });
      if (val === false) {
        await updateDoc(ref, { isOnline: false });
      }
      try {
        await refreshUser?.();
      } catch {}
    } catch {
      Alert.alert(tf('common.error', 'Lỗi'), tf('settings.online_status_error', 'Không thể cập nhật trạng thái online'));
    }
  };

  const settingsSections = useMemo(() => [
    {
      title: tf('settings.title', 'Cài đặt'),
      items: [
        {
          icon: 'shield-account-outline',
          title: tf('settings.privacy', 'Quyền riêng tư'),
          subtitle: tf('settings.privacy_desc', 'Quản lý quyền riêng tư của bạn'),
          onPress: () => router.push('/(screens)/user/PrivacySettingsScreen'),
          color: palette.success,
        },
        {
          icon: 'lock-reset',
          title: tf('settings.change_password', 'Đổi mật khẩu'),
          subtitle: tf('settings.change_password_desc', 'Thay đổi mật khẩu của bạn'),
          onPress: () => router.push('/(screens)/user/ChangePasswordScreen'),
          color: palette.warning,
        },
      ],
    },
    {
      title: tf('chat.title', 'Trò chuyện'),
      items: [
        {
          icon: 'account-clock-outline',
          title: tf('settings.online_status', 'Trạng thái online'),
          subtitle: tf('settings.online_status_desc', 'Hiển thị trạng thái online của bạn'),
          isSwitch: true,
          value: onlineStatus,
          onToggle: handleToggleOnlineStatus,
          color: palette.success,
        },
      ],
    },
    {
      title: tf('settings.language', 'Ngôn ngữ'),
      items: [
        {
          icon: 'translate',
          title: tf('settings.select_language', 'Chọn ngôn ngữ'),
          subtitle: i18n.language === 'vi' ? tf('settings.vietnamese', 'Tiếng Việt') : tf('settings.english', 'English'),
          onPress: () => setLanguageModalVisible(true),
          color: palette.info,
        },
      ],
    },
    {
      title: tf('settings.appearance', 'Giao diện'),
      items: [
        {
          icon: 'theme-light-dark',
          title: tf('settings.dark_mode', 'Chế độ tối'),
          subtitle: `${tf('settings.appearance_desc', 'Tùy chỉnh giao diện')} · ${getThemeDisplayName(theme)}`,
          onPress: () => setThemeModalVisible(true),
          color: '#9BC4FF',
        },
      ],
    },
    {
      title: tf('settings.support', 'Hỗ trợ'),
      items: [
        {
          icon: 'help-circle-outline',
          title: tf('settings.help_center', 'Trung tâm trợ giúp'),
          subtitle: tf('settings.help_center_desc', 'Tìm kiếm trợ giúp'),
          onPress: () => setHelpVisible(true),
          color: '#9BD0FF',
        },
        {
          icon: 'message-star-outline',
          title: tf('settings.send_feedback', 'Gửi phản hồi'),
          subtitle: tf('settings.send_feedback_desc', 'Chia sẻ ý kiến của bạn'),
          onPress: () => setFeedbackVisible(true),
          color: palette.success,
        },
        {
          icon: 'flag-outline',
          title: tf('settings.report_issue', 'Báo cáo lỗi'),
          subtitle: tf('settings.report_issue_desc', 'Báo cáo lỗi hoặc vi phạm'),
          onPress: () => setReportVisible(true),
          color: palette.danger,
        },
        {
          icon: 'share-variant-outline',
          title: tf('settings.share_app', 'Chia sẻ ứng dụng'),
          subtitle: tf('settings.share_app_desc', 'Mời bạn bè tham gia'),
          onPress: () => handleShare(),
          color: palette.info,
        },
      ],
    },
    {
      title: tf('settings.legal', 'Pháp lý'),
      items: [
        {
          icon: 'file-document-outline',
          title: tf('settings.terms', 'Điều khoản sử dụng'),
          subtitle: tf('settings.terms_desc', 'Điều khoản dịch vụ'),
          onPress: () => handleOpenURL('https://nguyenduong24.github.io/ChappAt-Legal-Site/terms.html'),
          color: '#D4FFE8',
        },
        {
          icon: 'shield-check-outline',
          title: tf('settings.privacy_policy', 'Chính sách bảo mật'),
          subtitle: tf('settings.privacy_policy_desc', 'Chính sách quyền riêng tư'),
          onPress: () => handleOpenURL('https://nguyenduong24.github.io/ChappAt-Legal-Site/privacy.html'),
          color: '#D4FFE8',
        },
        {
          icon: 'information-outline',
          title: tf('settings.about', 'Về ứng dụng'),
          subtitle: tf('settings.about_desc', 'Thông tin ứng dụng'),
          onPress: () => showAppInfo(),
          color: '#D4FFE8',
        },
      ],
    },
  ], [tf, onlineStatus, handleToggleOnlineStatus, palette, i18n.language, theme, router]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: tf('settings.share_message', 'Tham gia SaiGon Match cùng tôi!'),
        title: tf('settings.share_title', 'Chia sẻ ứng dụng'),
      });
    } catch {
      Alert.alert(tf('common.error', 'Lỗi'), tf('settings.share_error', 'Không thể chia sẻ'));
    }
  };

  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(tf('common.error', 'Lỗi'), tf('common.error_url', 'Không thể mở liên kết'));
      }
    } catch {
      Alert.alert(tf('common.error', 'Lỗi'), tf('common.error_url', 'Không thể mở liên kết'));
    }
  };

  const showAppInfo = () => {
    Alert.alert(
      tf('settings.about', 'Về ứng dụng'),
      `SaiGon Match - ${tf('home.subtitle', 'Kết nối và gặp gỡ')}\n${tf('settings.about_desc', 'Ứng dụng kết nối')}\nCopyright © 2026`,
      [{ text: tf('common.ok', 'OK') }]
    );
  };

  const handleSignOut = () => {
    Alert.alert(tf('profile.logout', 'Đăng xuất'), tf('settings.logout_confirm', 'Bạn có chắc muốn đăng xuất?'), [
      { text: tf('common.cancel', 'Hủy'), style: 'cancel' },
      {
        text: tf('profile.logout', 'Đăng xuất'),
        style: 'destructive',
        onPress: () => onSignOut?.(),
      },
    ]);
  };

  const handleFeedbackSubmit = async (feedback: any) => {
    try {
      await submitFeedback(feedback, {
        uid: currentUser?.uid || user?.uid,
        email: currentUser?.email || user?.email,
        username: currentUser?.username || currentUser?.displayName || user?.username || user?.displayName,
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
      console.log('submitReport error:', e);
      throw e;
    }
  };

  // Load online status
  useEffect(() => {
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
      } catch {}
    })();
  }, [currentUser?.uid, user?.uid]);

  const renderSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.softText }]}>{section.title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {section.items.map((it: any) =>
          it.isSwitch ? (
            <View key={it.title} style={[styles.settingItem, { borderBottomColor: palette.border }]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: palette.iconBg }]}>
                  <MaterialCommunityIcons name={it.icon} size={20} color={it.color} />
                </View>
                <View style={styles.settingContentWrap}>
                  <Text style={[styles.settingTitle, { color: palette.text }]}>{it.title}</Text>
                  <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>{it.subtitle}</Text>
                </View>
              </View>
              <Switch
                value={it.value}
                onValueChange={it.onToggle}
                trackColor={{ false: isDark ? 'rgba(148,163,184,0.32)' : 'rgba(148,163,184,0.32)', true: 'rgba(16,185,129,0.45)' }}
                thumbColor={it.value ? '#FFFFFF' : (isDark ? '#CBD5E1' : '#F8FAFC')}
              />
            </View>
          ) : (
            <TouchableOpacity
              key={it.title}
              style={[styles.settingItem, { borderBottomColor: palette.border }]}
              onPress={it.onPress}
              activeOpacity={0.88}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: palette.iconBg }]}>
                  <MaterialCommunityIcons name={it.icon} size={20} color={it.color} />
                </View>
                <View style={styles.settingContentWrap}>
                  <Text style={[styles.settingTitle, { color: palette.text }]}>{it.title}</Text>
                  <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>{it.subtitle}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={palette.subtleText} />
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );

  const displayName = currentUser?.displayName || currentUser?.username || user?.displayName || user?.username || tf('chat.unknown_user', 'Người dùng');
  const displayEmail = currentUser?.email || user?.email || tf('settings.no_email', 'Chưa có email');
  const displayAvatar = currentUser?.profileUrl || user?.profileUrl || user?.photoURL || 'https://via.placeholder.com/80';

  return (
    <LiquidGlassBackground themeMode={theme} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: palette.surface, borderColor: palette.border }]} activeOpacity={0.86}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{tf('settings.title', 'Cài đặt')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.userInfo, { backgroundColor: palette.surfaceStrong, borderColor: palette.border }]}>
          <Image source={{ uri: displayAvatar }} style={styles.userAvatar} contentFit="cover" />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: palette.text }]}>{displayName}</Text>
            <Text style={[styles.userEmail, { color: palette.subtleText }]}>{displayEmail}</Text>
          </View>
          <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: palette.iconBg, borderColor: palette.border }]} onPress={openEditProfile}>
            <MaterialCommunityIcons name="pencil" size={18} color={palette.text} />
          </TouchableOpacity>
        </View>

        {settingsSections.map(renderSection)}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.9}>
          <LinearGradient colors={['rgba(255,117,138,0.95)', 'rgba(232,84,108,0.95)']} style={styles.signOutGradient}>
            <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
            <Text style={styles.signOutText}>{tf('profile.logout', 'Đăng xuất')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={languageModalVisible} transparent animationType="fade" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(2,6,23,0.62)' : 'rgba(15,23,42,0.36)' }]}>
          <View style={[styles.modalContent, { backgroundColor: palette.modalSurface, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>{tf('settings.select_language', 'Chọn ngôn ngữ')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={palette.text} />
              </TouchableOpacity>
            </View>

            {[
              { key: 'vi', label: tf('settings.vietnamese', 'Tiếng Việt') },
              { key: 'en', label: tf('settings.english', 'English') },
            ].map((lang) => {
              const selected = i18n.language === lang.key;
              return (
                <TouchableOpacity
                  key={lang.key}
                  style={[styles.languageOption, selected && styles.languageOptionActive, { backgroundColor: selected ? palette.activeBg : palette.surfaceStrong, borderColor: selected ? palette.accent : palette.border }]}
                  onPress={() => changeLanguage(lang.key)}
                >
                  <Text style={[styles.languageText, { color: palette.text }]}>{lang.label}</Text>
                  {selected && <MaterialCommunityIcons name="check" size={18} color={palette.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={themeModalVisible} transparent animationType="fade" onRequestClose={() => setThemeModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(2,6,23,0.62)' : 'rgba(15,23,42,0.36)' }]}>
          <View style={[styles.modalContent, { backgroundColor: palette.modalSurface, borderColor: palette.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>{tf('settings.appearance', 'Giao diện')}</Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={palette.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.themePickerScroll} showsVerticalScrollIndicator={false}>
              {themes.map((themeKey) => {
                const themeColors = getThemeColors(themeKey);
                const selected = theme === themeKey;

                return (
                  <TouchableOpacity
                    key={themeKey}
                    style={[
                      styles.themeOption,
                      selected && styles.themeOptionActive,
                      { backgroundColor: selected ? palette.activeBg : palette.surfaceStrong, borderColor: selected ? palette.accent : palette.border }
                    ]}
                    onPress={() => {
                      setTheme(themeKey);
                      setThemeModalVisible(false);
                    }}
                  >
                    <View style={styles.themeOptionLeft}>
                      <View style={[styles.themePreviewSwatch, { backgroundColor: themeColors.background, borderColor: selected ? palette.accent : themeColors.border }]}>
                        <View style={[styles.themePreviewDot, { backgroundColor: themeColors.tint }]} />
                      </View>
                      <View style={styles.settingContentWrap}>
                        <Text style={[styles.settingTitle, { color: palette.text }]}>{getThemeDisplayName(themeKey)}</Text>
                        <Text style={[styles.settingSubtitle, { color: palette.subtleText }]}>{themeKey}</Text>
                      </View>
                    </View>
                    {selected && <MaterialCommunityIcons name="check-circle" size={20} color={palette.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FeedbackModalSimple visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} onSubmit={handleFeedbackSubmit} />

      <ReportModalSimple
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={handleReportSubmit}
        targetType="user"
        targetInfo={{
          id: 'app-issue',
          name: tf('common.app_name', 'SaiGon Match'),
          content: tf('settings.report_issue', 'Báo cáo lỗi'),
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
            Alert.alert(tf('common.success', 'Thành công'), tf('settings.support_success', 'Gửi yêu cầu hỗ trợ thành công'));
          } catch (e) {
            console.error('Submit support request error:', e);
            Alert.alert(tf('common.error', 'Lỗi'), tf('settings.support_error', 'Gửi yêu cầu thất bại'));
          }
        }}
      />

      <BackupRestoreModal visible={backupVisible} onClose={() => setBackupVisible(false)} />
      <DataManagementModal visible={dataManagementVisible} onClose={() => setDataManagementVisible(false)} />
      <TestModal visible={testModalVisible} onClose={() => setTestModalVisible(false)} title="Test Modal" />
    </LiquidGlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: Platform.OS === 'ios' ? 160 : 140,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 2,
    fontSize: 12,
  },
  editProfileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    letterSpacing: 0,
  },
  sectionContent: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
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
  settingContentWrap: {
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
  signOutButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  signOutGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  languageOption: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  languageOptionActive: {
    borderWidth: 1,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themePickerScroll: {
    maxHeight: 360,
  },
  themeOption: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  themeOptionActive: {
    borderWidth: 1,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themePreviewSwatch: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  themePreviewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default SettingsScreen;
