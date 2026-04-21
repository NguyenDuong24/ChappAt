import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DataManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const DataManagementModal = ({ visible, onClose }: DataManagementModalProps) => {
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const currentThemeColors = Colors[theme] || Colors.light;
  
  const [isLoading, setIsLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState({
    totalUsed: '2.4 GB',
    chatData: '1.2 GB',
    mediaFiles: '800 MB',
    profileData: '50 MB',
    settings: '10 MB',
    cache: '340 MB',
  });

  // Settings
  const [autoDownloadWifi, setAutoDownloadWifi] = useState(true);
  const [autoDownloadMobile, setAutoDownloadMobile] = useState(false);
  const [autoDeleteOldChats, setAutoDeleteOldChats] = useState(false);
  const [compressMedia, setCompressMedia] = useState(true);
  const [lowDataMode, setLowDataMode] = useState(false);

  const dataCategories = [
    {
      title: 'Dữ liệu chat',
      description: 'Tin nhắn, cuộc trò chuyện',
      size: storageInfo.chatData,
      icon: 'chat',
      color: '#3B82F6',
      canClear: true,
    },
    {
      title: 'File media',
      description: 'Ảnh, video, file đính kèm',
      size: storageInfo.mediaFiles,
      icon: 'image-multiple',
      color: '#10B981',
      canClear: true,
    },
    {
      title: 'Dữ liệu profile',
      description: 'Thông tin cá nhân, danh bạ',
      size: storageInfo.profileData,
      icon: 'account',
      color: '#F59E0B',
      canClear: false,
    },
    {
      title: 'Cache & temp',
      description: 'Dữ liệu tạm, cache hệ thống',
      size: storageInfo.cache,
      icon: 'database',
      color: '#8B5CF6',
      canClear: true,
    },
    {
      title: 'Cài đặt',
      description: 'Preferences, configurations',
      size: storageInfo.settings,
      icon: 'cog',
      color: '#EF4444',
      canClear: false,
    },
  ];

  const clearData = async (category: string) => {
    const confirmations = {
      'Dữ liệu chat': 'Xóa tất cả tin nhắn và cuộc trò chuyện?',
      'File media': 'Xóa tất cả ảnh, video đã tải về?',
      'Cache & temp': 'Xóa dữ liệu cache và tạm thời?',
    };

    const message = confirmations[category as keyof typeof confirmations];
    if (!message) return;

    Alert.alert(
      '⚠️ Xác nhận xóa',
      message + ' Thao tác này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => performClearData(category) },
      ]
    );
  };

  const performClearData = async (category: string) => {
    try {
      setIsLoading(true);
      
      // Simulate clearing data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update storage info
      const newStorageInfo = { ...storageInfo };
      switch (category) {
        case 'Dữ liệu chat':
          newStorageInfo.chatData = '0 MB';
          break;
        case 'File media':
          newStorageInfo.mediaFiles = '0 MB';
          break;
        case 'Cache & temp':
          newStorageInfo.cache = '0 MB';
          break;
      }
      
      setStorageInfo(newStorageInfo);
      Alert.alert('✅ Thành công', `Đã xóa ${category.toLowerCase()}`);
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể xóa dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    Alert.alert(
      '📤 Xuất dữ liệu',
      'Chọn định dạng để xuất dữ liệu:',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'JSON', onPress: () => performExport('json') },
        { text: 'CSV', onPress: () => performExport('csv') },
        { text: 'PDF', onPress: () => performExport('pdf') },
      ]
    );
  };

  const performExport = async (format: string) => {
    try {
      setIsLoading(true);
      
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      Alert.alert(
        '✅ Xuất thành công',
        `Dữ liệu đã được xuất thành file ${format.toUpperCase()}. Kiểm tra thư mục Downloads.`
      );
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể xuất dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestDataDeletion = () => {
    Alert.alert(
      '🗑️ Yêu cầu xóa dữ liệu',
      'Bạn muốn yêu cầu xóa hoàn toàn dữ liệu cá nhân khỏi hệ thống?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Tiếp tục', onPress: () => {
          Linking.openURL('mailto:privacy@yourapp.com?subject=Data Deletion Request');
        }},
      ]
    );
  };

  const viewPrivacyPolicy = () => {
    Linking.openURL('https://yourapp.com/privacy-policy');
  };

  const downloadPersonalData = async () => {
    try {
      setIsLoading(true);
      
      // Simulate preparing data
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      Alert.alert(
        '📥 Dữ liệu cá nhân',
        'File chứa tất cả dữ liệu cá nhân của bạn đã được chuẩn bị. Link tải sẽ được gửi qua email.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể chuẩn bị dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeStorage = async () => {
    try {
      setIsLoading(true);
      
      // Simulate optimization
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update cache size
      setStorageInfo(prev => ({
        ...prev,
        cache: '45 MB'
      }));
      
      Alert.alert(
        '✅ Tối ưu hóa hoàn tất',
        'Đã giải phóng 295 MB dung lượng bằng cách xóa cache và file tạm không cần thiết.'
      );
    } catch (error) {
      Alert.alert('❌ Lỗi', 'Không thể tối ưu hóa. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
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
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.title, { color: currentThemeColors.text }]}>
              Quản lý dữ liệu
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={currentThemeColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Storage Overview */}
            <View style={[styles.storageCard, { backgroundColor: currentThemeColors.surface }]}>
              <View style={styles.storageHeader}>
                <MaterialCommunityIcons name="harddisk" size={24} color="#6366F1" />
                <Text style={[styles.storageTitle, { color: currentThemeColors.text }]}>
                  Dung lượng sử dụng
                </Text>
              </View>
              <Text style={[styles.storageSize, { color: currentThemeColors.text }]}>
                {storageInfo.totalUsed}
              </Text>
              <Text style={[styles.storageDescription, { color: currentThemeColors.subtleText }]}>
                Tổng dung lượng ứng dụng đang sử dụng
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                Hành động nhanh
              </Text>
              
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: currentThemeColors.surface }]}
                  onPress={optimizeStorage}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.quickActionGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <MaterialCommunityIcons name="broom" size={20} color="#fff" />
                    )}
                    <Text style={styles.quickActionText}>Tối ưu hóa</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: currentThemeColors.surface }]}
                  onPress={exportData}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.quickActionGradient}
                  >
                    <MaterialCommunityIcons name="export" size={20} color="#fff" />
                    <Text style={styles.quickActionText}>Xuất dữ liệu</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Data Categories */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                Phân loại dữ liệu
              </Text>
              {dataCategories.map((category, index) => (
                <View
                  key={index}
                  style={[styles.categoryItem, { backgroundColor: currentThemeColors.surface }]}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                      <MaterialCommunityIcons
                        name={category.icon as any}
                        size={20}
                        color={category.color}
                      />
                    </View>
                    <View style={styles.categoryText}>
                      <Text style={[styles.categoryTitle, { color: currentThemeColors.text }]}>
                        {category.title}
                      </Text>
                      <Text style={[styles.categoryDescription, { color: currentThemeColors.subtleText }]}>
                        {category.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={[styles.categorySize, { color: currentThemeColors.text }]}>
                      {category.size}
                    </Text>
                    {category.canClear && (
                      <TouchableOpacity
                        style={[styles.clearButton, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => clearData(category.title)}
                      >
                        <MaterialCommunityIcons name="delete" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Data Settings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                Cài đặt dữ liệu
              </Text>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="wifi" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Tự động tải về qua WiFi
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Tự động tải media khi kết nối WiFi
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoDownloadWifi}
                  onValueChange={setAutoDownloadWifi}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="signal-cellular-3" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Tự động tải về qua 3G/4G
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Tự động tải media qua mạng di động
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoDownloadMobile}
                  onValueChange={setAutoDownloadMobile}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="auto-upload" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Nén media
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Giảm chất lượng để tiết kiệm dung lượng
                    </Text>
                  </View>
                </View>
                <Switch
                  value={compressMedia}
                  onValueChange={setCompressMedia}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="delete-clock" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Tự động xóa chat cũ
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Xóa tin nhắn sau 1 năm
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoDeleteOldChats}
                  onValueChange={setAutoDeleteOldChats}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>

              <View style={[styles.settingItem, { backgroundColor: currentThemeColors.surface }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="database-sync" size={20} color="#6366F1" />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: currentThemeColors.text }]}>
                      Chế độ tiết kiệm data
                    </Text>
                    <Text style={[styles.settingDescription, { color: currentThemeColors.subtleText }]}>
                      Giảm thiểu việc sử dụng dữ liệu
                    </Text>
                  </View>
                </View>
                <Switch
                  value={lowDataMode}
                  onValueChange={setLowDataMode}
                  trackColor={{ false: currentThemeColors.border, true: '#6366F1' }}
                />
              </View>
            </View>

            {/* Privacy & GDPR */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                Quyền riêng tư & GDPR
              </Text>

              <TouchableOpacity
                style={[styles.privacyOption, { backgroundColor: currentThemeColors.surface }]}
                onPress={downloadPersonalData}
              >
                <MaterialCommunityIcons name="download" size={24} color="#3B82F6" />
                <View style={styles.privacyOptionText}>
                  <Text style={[styles.privacyOptionTitle, { color: currentThemeColors.text }]}>
                    Tải dữ liệu cá nhân
                  </Text>
                  <Text style={[styles.privacyOptionDescription, { color: currentThemeColors.subtleText }]}>
                    Nhận bản sao tất cả dữ liệu của bạn
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={currentThemeColors.subtleText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.privacyOption, { backgroundColor: currentThemeColors.surface }]}
                onPress={requestDataDeletion}
              >
                <MaterialCommunityIcons name="delete-forever" size={24} color="#DC2626" />
                <View style={styles.privacyOptionText}>
                  <Text style={[styles.privacyOptionTitle, { color: currentThemeColors.text }]}>
                    Yêu cầu xóa dữ liệu
                  </Text>
                  <Text style={[styles.privacyOptionDescription, { color: currentThemeColors.subtleText }]}>
                    Xóa hoàn toàn tài khoản và dữ liệu
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={currentThemeColors.subtleText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.privacyOption, { backgroundColor: currentThemeColors.surface }]}
                onPress={viewPrivacyPolicy}
              >
                <MaterialCommunityIcons name="shield-account" size={24} color="#10B981" />
                <View style={styles.privacyOptionText}>
                  <Text style={[styles.privacyOptionTitle, { color: currentThemeColors.text }]}>
                    Chính sách bảo mật
                  </Text>
                  <Text style={[styles.privacyOptionDescription, { color: currentThemeColors.subtleText }]}>
                    Xem cách chúng tôi bảo vệ dữ liệu
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="open-in-new"
                  size={20}
                  color={currentThemeColors.subtleText}
                />
              </TouchableOpacity>
            </View>
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
  storageCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  storageSize: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  storageDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 14,
  },
  categoryRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  categorySize: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    padding: 6,
    borderRadius: 16,
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
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  privacyOptionText: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyOptionDescription: {
    fontSize: 14,
  },
});

export default DataManagementModal;

