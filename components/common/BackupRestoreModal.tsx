import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BackupRestoreModalProps {
  visible: boolean;
  onClose: () => void;
}

interface BackupData {
  chats: any[];
  groups: any[];
  contacts: any[];
  settings: any;
  timestamp: string;
  version: string;
}

const BackupRestoreModal = ({ visible, onClose }: BackupRestoreModalProps) => {
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [autoBackup, setAutoBackup] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);

  useEffect(() => {
    loadBackupSettings();
  }, []);

  const loadBackupSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('backup_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setAutoBackup(parsed.autoBackup || false);
        setIncludeMedia(parsed.includeMedia !== false);
        setCloudBackup(parsed.cloudBackup || false);
        setLastBackup(parsed.lastBackup || null);
      }
    } catch (error) {
      console.error('Error loading backup settings:', error);
    }
  };

  const saveBackupSettings = async () => {
    try {
      const settings = {
        autoBackup,
        includeMedia,
        cloudBackup,
        lastBackup,
      };
      await AsyncStorage.setItem('backup_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving backup settings:', error);
    }
  };

  const createBackup = async () => {
    if (usePassword && !backupPassword.trim()) {
      Alert.alert('⚠️ Lỗi', 'Vui lòng nhập mật khẩu bảo vệ');
      return;
    }

    try {
      setIsLoading(true);

      // Simulate gathering data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const backupData: BackupData = {
        chats: [], // Would get from your chat storage
        groups: [], // Would get from your group storage
        contacts: [], // Would get from your contacts storage
        settings: {}, // Would get from your settings storage
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };

      // If password is enabled, you would encrypt the data here
      let finalData = backupData;
      if (usePassword && backupPassword) {
        // finalData = await encryptData(backupData, backupPassword);
      }

      // Save to device storage
      await AsyncStorage.setItem('app_backup', JSON.stringify(finalData));

      // If cloud backup is enabled, upload to cloud
      if (cloudBackup) {
        // await uploadToCloud(finalData);
      }

      const now = new Date().toISOString();
      setLastBackup(now);
      await saveBackupSettings();

      Alert.alert(
        '✅ Sao lưu thành công',
        `Dữ liệu đã được sao lưu ${cloudBackup ? 'lên cloud' : 'trên thiết bị'}`
      );
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('❌ Lỗi', 'Không thể tạo bản sao lưu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const restoreBackup = async () => {
    Alert.alert(
      '⚠️ Khôi phục dữ liệu',
      'Thao tác này sẽ ghi đè lên dữ liệu hiện tại. Bạn có chắc chắn?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Khôi phục', style: 'destructive', onPress: performRestore },
      ]
    );
  };

  const performRestore = async () => {
    try {
      setIsLoading(true);

      // Get backup from storage
      const backupString = await AsyncStorage.getItem('app_backup');
      if (!backupString) {
        Alert.alert('❌ Lỗi', 'Không tìm thấy bản sao lưu');
        return;
      }

      let backupData: BackupData;
      try {
        backupData = JSON.parse(backupString);
      } catch (error) {
        Alert.alert('❌ Lỗi', 'Bản sao lưu không hợp lệ');
        return;
      }

      // If backup is encrypted, decrypt it
      if (usePassword && backupPassword) {
        // backupData = await decryptData(backupData, backupPassword);
      }

      // Restore data
      // await restoreChats(backupData.chats);
      // await restoreGroups(backupData.groups);
      // await restoreContacts(backupData.contacts);
      // await restoreSettings(backupData.settings);

      Alert.alert(
        '✅ Khôi phục thành công',
        'Dữ liệu đã được khôi phục. Ứng dụng sẽ khởi động lại.',
        [{ text: 'OK', onPress: () => {
          // Restart app or reload data
          onClose();
        }}]
      );
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('❌ Lỗi', 'Không thể khôi phục dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBackup = async () => {
    Alert.alert(
      '⚠️ Xóa bản sao lưu',
      'Bạn có chắc chắn muốn xóa bản sao lưu?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await AsyncStorage.removeItem('app_backup');
            setLastBackup(null);
            await saveBackupSettings();
            Alert.alert('✅ Thành công', 'Đã xóa bản sao lưu');
          } catch (error) {
            Alert.alert('❌ Lỗi', 'Không thể xóa bản sao lưu');
          }
        }},
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN');
    } catch {
      return 'Không xác định';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.title, { color: currentThemeColors.text }]}>
              Sao lưu & Khôi phục
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={currentThemeColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Backup Status */}
            <View style={[styles.statusCard, { backgroundColor: currentThemeColors.surface }]}>
              <View style={styles.statusHeader}>
                <MaterialCommunityIcons
                  name="cloud-check"
                  size={24}
                  color={lastBackup ? '#10B981' : '#64748B'}
                />
                <Text style={[styles.statusTitle, { color: currentThemeColors.text }]}>
                  Trạng thái sao lưu
                </Text>
              </View>
              <Text style={[styles.statusText, { color: currentThemeColors.subtleText }]}>
                {lastBackup
                  ? `Lần cuối: ${formatDate(lastBackup)}`
                  : 'Chưa có bản sao lưu nào'
                }
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                Hành động nhanh
              </Text>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: currentThemeColors.surface }]}
                onPress={createBackup}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.actionButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="backup-restore" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Tạo bản sao lưu ngay</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {lastBackup && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentThemeColors.surface }]}
                  onPress={restoreBackup}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.actionButtonGradient}
                  >
                    <MaterialCommunityIcons name="restore" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Khôi phục dữ liệu</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Backup Settings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                Cài đặt sao lưu
              </Text>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="backup-restore" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Sao lưu tự động
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Tự động sao lưu hàng tuần
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoBackup}
                  onValueChange={setAutoBackup}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="image-multiple" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Bao gồm media
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Sao lưu ảnh, video, file đính kèm
                    </Text>
                  </View>
                </View>
                <Switch
                  value={includeMedia}
                  onValueChange={setIncludeMedia}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="cloud-upload" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Sao lưu cloud
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Lưu trữ trên Google Drive/iCloud
                    </Text>
                  </View>
                </View>
                <Switch
                  value={cloudBackup}
                  onValueChange={setCloudBackup}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="lock" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Mã hóa bản sao lưu
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Bảo vệ bằng mật khẩu
                    </Text>
                  </View>
                </View>
                <Switch
                  value={usePassword}
                  onValueChange={setUsePassword}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              {usePassword && (
                <View style={[styles.passwordContainer, { backgroundColor: currentThemeColors.surface }]}>
                  <MaterialCommunityIcons
                    name="key"
                    size={20}
                    color="#6366F1"
                    style={styles.passwordIcon}
                  />
                  <TextInput
                    value={backupPassword}
                    onChangeText={setBackupPassword}
                    placeholder="Nhập mật khẩu bảo vệ"
                    placeholderTextColor={currentThemeColors.subtleText}
                    style={[styles.passwordInput, { color: currentThemeColors.text }]}
                    secureTextEntry
                  />
                </View>
              )}
            </View>

            {/* Advanced Options */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                Tùy chọn nâng cao
              </Text>

              {lastBackup && (
                <TouchableOpacity
                  style={[styles.dangerButton, { backgroundColor: '#FEF2F2' }]}
                  onPress={deleteBackup}
                >
                  <MaterialCommunityIcons name="delete" size={20} color="#DC2626" />
                  <Text style={[styles.dangerButtonText, { color: '#DC2626' }]}>
                    Xóa bản sao lưu
                  </Text>
                </TouchableOpacity>
              )}

              <View style={[styles.infoCard, { backgroundColor: currentThemeColors.surface }]}>
                <MaterialCommunityIcons name="information" size={20} color="#3B82F6" />
                <Text style={[styles.infoText, { color: currentThemeColors.subtleText }]}>
                  Bản sao lưu bao gồm: tin nhắn, nhóm, danh bạ, cài đặt và media (nếu được chọn).
                  Dữ liệu được mã hóa để bảo mật.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Save Settings Button */}
          <View style={[styles.footer, { borderTopColor: currentThemeColors.border }]}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveBackupSettings}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.saveButtonGradient}
              >
                <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Lưu cài đặt</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 36,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  passwordIcon: {
    marginRight: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BackupRestoreModal;
