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
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import FeedbackModalSimple from '@/components/common/FeedbackModalSimple';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import HelpSupportModalSimple from '@/components/common/HelpSupportModalSimple';
import BackupRestoreModal from '@/components/common/BackupRestoreModal';
import PrivacySecurityModal from '@/components/common/PrivacySecurityModal';
import DataManagementModal from '@/components/common/DataManagementModal';
import TestModal from '@/components/common/TestModal';
import { useRouter } from 'expo-router';
import { submitFeedback, submitReport, submitSupportRequest } from '@/services/supportService';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

interface SettingsScreenProps {
  currentUser?: any;
  onSignOut?: () => void;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
}

const SettingsScreen = ({ currentUser, onSignOut, onThemeToggle, isDarkMode = false }: SettingsScreenProps) => {
  // Modal states
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [backupVisible, setBackupVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [dataManagementVisible, setDataManagementVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  
  // Settings states
  const [notifications, setNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [dataUsage, setDataUsage] = useState(false);

  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const openEditProfile = () => {
    try {
      // Primary (group names like (tabs) are omitted in path resolution)
      router.push('/profile/EditProfile');
    } catch (e) {
      // Fallback in case explicit grouped path is needed
      try { router.push('/(tabs)/profile/EditProfile'); } catch {}
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
      try { await refreshUser?.(); } catch {}
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái online');
    }
  }

  const settingsSections = [
    {
      title: 'Tài khoản',
      items: [
        {
          icon: 'shield-account',
          title: 'Quyền riêng tư & Bảo mật',
          subtitle: 'Quản lý quyền riêng tư và bảo mật',
          onPress: () => setPrivacyVisible(true),
          color: colors.success,
        },
        {
          icon: 'key',
          title: 'Đổi mật khẩu',
          subtitle: 'Cập nhật mật khẩu tài khoản',
          onPress: () => Alert.alert('Chức năng', 'Mở màn hình đổi mật khẩu'),
          color: colors.warning,
        },
      ],
    },
    {
      title: 'Chat',
      items: [
        {
          icon: 'account-clock',
          title: 'Trạng thái online',
          subtitle: 'Hiển thị khi bạn đang online',
          isSwitch: true,
          value: onlineStatus,
          onToggle: handleToggleOnlineStatus,
          color: colors.success,
        }
      ],
    },
    {
      title: 'Giao diện',
      items: [
        {
          icon: 'theme-light-dark',
          title: 'Chế độ tối',
          subtitle: 'Chuyển đổi giữa sáng và tối',
          isSwitch: true,
          value: isDarkMode,
          onToggle: onThemeToggle,
          color: colors.primary,
        }
      ],
    },
    {
      title: 'Hỗ trợ',
      items: [
        {
          icon: 'help-circle',
          title: 'Trung tâm trợ giúp',
          subtitle: 'FAQ, hướng dẫn và hỗ trợ',
          onPress: () => setHelpVisible(true),
          color: colors.primary,
        },
        {
          icon: 'message-star',
          title: 'Gửi phản hồi',
          subtitle: 'Chia sẻ ý kiến về ứng dụng',
          onPress: () => setFeedbackVisible(true),
          color: colors.success,
        },
        {
          icon: 'flag',
          title: 'Báo cáo sự cố',
          subtitle: 'Báo cáo lỗi hoặc sự cố',
          onPress: () => setReportVisible(true),
          color: colors.danger,
        },
        {
          icon: 'share-variant',
          title: 'Chia sẻ ứng dụng',
          subtitle: 'Giới thiệu ứng dụng cho bạn bè',
          onPress: () => handleShare(),
          color: colors.primary,
        },
      ],
    },
    {
      title: 'Pháp lý',
      items: [
        {
          icon: 'file-document',
          title: 'Điều khoản sử dụng',
          subtitle: 'Xem điều khoản và điều kiện',
          onPress: () => handleOpenURL('https://example.com/terms'),
          color: colors.subtleText,
        },
        {
          icon: 'shield-check',
          title: 'Chính sách bảo mật',
          subtitle: 'Tìm hiểu cách bảo vệ dữ liệu',
          onPress: () => handleOpenURL('https://example.com/privacy'),
          color: colors.subtleText,
        },
        {
          icon: 'information',
          title: 'Về ứng dụng',
          subtitle: 'Phiên bản 1.0.0',
          onPress: () => showAppInfo(),
          color: colors.subtleText,
        },
      ],
    }
  ];

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Hãy thử ứng dụng chat tuyệt vời này! Tải về tại: https://example.com/download',
        title: 'Chia sẻ ChappAt',
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chia sẻ ứng dụng');
    }
  };

  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Lỗi', 'Không thể mở liên kết');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở liên kết');
    }
  };

  const showAppInfo = () => {
    Alert.alert(
      'Về ChappAt',
      'ChappAt - Ứng dụng chat hiện đại\nPhiên bản: 1.0.0\nBản quyền © 2025\n\nPhát triển bởi: Your Team',
      [{ text: 'OK' }]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
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
    console.log('📤 handleReportSubmit called with:', report);
    console.log('👤 currentUser:', currentUser);
    console.log('🔐 user from useAuth:', user);
    console.log('🔥 Auth state check:', { isAuthenticated: user ? true : false, user });

    try {
      const userInfo = {
        uid: currentUser?.uid || user?.uid,
        email: currentUser?.email || user?.email,
        username: currentUser?.username || currentUser?.displayName || user?.username || user?.displayName,
      };
      console.log('👨‍💼 User info for report:', userInfo);

      await submitReport(report, userInfo);
      console.log('✅ Report submitted successfully from SettingsScreen');
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
      } catch {}
    })();
  }, [currentUser?.uid, user?.uid]);

  const renderSettingItem = (item: any) => {
    if (item.isSwitch) {
      return (
        <View key={item.title} style={[styles.settingItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
              <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.settingSubtitle, { color: colors.subtleText }]}>{item.subtitle}</Text>
            </View>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border, true: `${item.color}40` }}
            thumbColor={item.value ? item.color : colors.subtleText}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.title}
        style={[styles.settingItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        onPress={item.onPress}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
            <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.settingSubtitle, { color: colors.subtleText }]}>{item.subtitle}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.subtleText} />
      </TouchableOpacity>
    );
  };

  const renderSection = (section: any) => (
    <View key={section.title} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }] }>
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
      {/* Header */}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* User Info Display */}
        <View style={[styles.userInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image source={{ uri: user?.profileUrl || 'https://via.placeholder.com/50' }} style={styles.userAvatar} />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || user?.username || 'User'}</Text>
            <Text style={[styles.userEmail, { color: colors.subtleText }]}>{user?.email || 'No email'}</Text>
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
            <Text style={styles.signOutText}>Đăng xuất</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

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
            Alert.alert('✅ Thành công', 'Yêu cầu hỗ trợ đã được gửi thành công!');
          } catch (e) {
            console.error('Submit support request error:', e);
            Alert.alert('❌ Lỗi', 'Không thể gửi yêu cầu hỗ trợ. Vui lòng thử lại.');
          }
        }}
      />

      <BackupRestoreModal
        visible={backupVisible}
        onClose={() => setBackupVisible(false)}
      />

      <PrivacySecurityModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
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
});

export default SettingsScreen;
