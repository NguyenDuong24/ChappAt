import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

interface PrivacySecurityModalProps {
  visible: boolean;
  onClose: () => void;
}

const PrivacySecurityModal = ({ visible, onClose }: PrivacySecurityModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Privacy settings
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [allowMessageFromStrangers, setAllowMessageFromStrangers] = useState(false);
  const [showProfileToEveryone, setShowProfileToEveryone] = useState(true);

  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  useEffect(() => {
    if (visible && user?.uid) {
      loadPrivacySettings();
    }
  }, [visible, user?.uid]);

  const loadPrivacySettings = async () => {
    try {
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
      Alert.alert('Lỗi', 'Không thể cập nhật cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = () => {
    Alert.alert('Chặn người dùng', 'Tính năng này sẽ được phát triển trong phiên bản tiếp theo.');
  };

  const handleChangePassword = () => {
    Alert.alert('Đổi mật khẩu', 'Mở màn hình đổi mật khẩu');
  };

  const handleTwoFactorToggle = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Bật xác thực 2 yếu tố',
        'Bạn có muốn bật xác thực 2 yếu tố để bảo vệ tài khoản?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Bật', onPress: () => updateSetting('twoFactorEnabled', true) },
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
          <MaterialCommunityIcons name={icon as any} size={20} color="#6366F1" />
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
          <MaterialCommunityIcons name="chevron-right" size={24} color="#64748B" />
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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Quyền riêng tư & Bảo mật</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderSection(
              'Quyền riêng tư tài khoản',
              <>
                {renderSettingItem(
                  'account-eye',
                  'Hiển thị trạng thái online',
                  'Cho phép người khác thấy khi bạn đang online',
                  true,
                  showOnlineStatus,
                  (val) => updateSetting('showOnlineStatus', val)
                )}
                {renderSettingItem(
                  'account-card-details',
                  'Hiển thị profile công khai',
                  'Cho phép mọi người xem thông tin profile của bạn',
                  true,
                  showProfileToEveryone,
                  (val) => updateSetting('showProfileToEveryone', val)
                )}
              </>
            )}

            {renderSection(
              'Quyền riêng tư chat',
              <>
                {renderSettingItem(
                  'check-all',
                  'Hiển thị xác nhận đã đọc',
                  'Cho người khác biết bạn đã đọc tin nhắn',
                  true,
                  showReadReceipts,
                  (val) => updateSetting('showReadReceipts', val)
                )}
                {renderSettingItem(
                  'message-text-outline',
                  'Cho phép tin nhắn từ người lạ',
                  'Nhận tin nhắn từ người không có trong danh bạ',
                  true,
                  allowMessageFromStrangers,
                  (val) => updateSetting('allowMessageFromStrangers', val)
                )}
              </>
            )}

            {renderSection(
              'Bảo mật tài khoản',
              <>
                {renderSettingItem(
                  'lock-reset',
                  'Đổi mật khẩu',
                  'Cập nhật mật khẩu tài khoản',
                  false,
                  undefined,
                  undefined,
                  handleChangePassword
                )}
                {renderSettingItem(
                  'shield-check',
                  'Xác thực 2 yếu tố',
                  'Bảo vệ tài khoản với xác thực bổ sung',
                  true,
                  twoFactorEnabled,
                  handleTwoFactorToggle
                )}
                {renderSettingItem(
                  'bell-alert',
                  'Thông báo đăng nhập',
                  'Nhận thông báo khi có đăng nhập mới',
                  true,
                  loginAlerts,
                  (val) => updateSetting('loginAlerts', val)
                )}
              </>
            )}

            {renderSection(
              'Chặn và hạn chế',
              <>
                {renderSettingItem(
                  'account-cancel',
                  'Danh sách người bị chặn',
                  'Quản lý người dùng đã bị chặn',
                  false,
                  undefined,
                  undefined,
                  handleBlockUser
                )}
                {renderSettingItem(
                  'flag-outline',
                  'Báo cáo vi phạm',
                  'Báo cáo người dùng vi phạm quy định',
                  false,
                  undefined,
                  undefined,
                  () => Alert.alert('Báo cáo', 'Mở màn hình báo cáo')
                )}
              </>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#0F172A',
  },
  sectionContent: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    backgroundColor: '#F8FAFC',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  bottomPadding: {
    height: 40,
  },
});

export default PrivacySecurityModal;
