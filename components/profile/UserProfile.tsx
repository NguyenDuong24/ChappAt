import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBlockStatus } from '@/hooks/useBlockStatus';
import { followService } from '@/services/followService';
import { useAuth } from '@/context/authContext';

interface UserProfileProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    bio?: string;
    avatar?: string;
    status: 'online' | 'offline' | 'away' | 'busy';
    lastSeen?: Date;
    isVerified?: boolean;
    phoneNumber?: string;
    location?: string;
    website?: string;
    joinDate: Date;
  };
  isOwnProfile: boolean;
  onUpdateProfile?: (data: any) => void;
  onSendMessage?: () => void;
  onAddFriend?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  isDarkMode?: boolean;
}

const UserProfile = ({
  user,
  isOwnProfile,
  onUpdateProfile,
  onSendMessage,
  onAddFriend,
  onBlock,
  onReport,
  isDarkMode = false,
}: UserProfileProps) => {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: user.displayName,
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
  });
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  
  // Get block status
  const { 
    isBlocked, 
    isBlockedBy, 
    hasBlockRelation, 
    loading: blockLoading 
  } = useBlockStatus(currentUser?.uid, user.id);

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

  const statusOptions = [
    { value: 'online', label: 'Trực tuyến', color: '#10B981', icon: 'circle' },
    { value: 'away', label: 'Vắng mặt', color: '#F59E0B', icon: 'circle' },
    { value: 'busy', label: 'Bận', color: '#EF4444', icon: 'minus-circle' },
    { value: 'offline', label: 'Ẩn', color: '#6B7280', icon: 'circle-outline' },
  ];

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const formatJoinDate = (date: Date) => {
    return `Tham gia từ ${date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`;
  };

  const formatLastSeen = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa truy cập';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  const handleSaveProfile = () => {
    onUpdateProfile?.(editData);
    setIsEditing(false);
    Alert.alert('✅ Thành công', 'Hồ sơ đã được cập nhật');
  };

  // Handle block/unblock actions
  const handleBlockUser = async () => {
    if (!currentUser?.uid) return;

    Alert.alert(
      isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng',
      isBlocked 
        ? `Bạn có chắc muốn bỏ chặn ${user.displayName}? Họ sẽ có thể nhắn tin và xem nội dung của bạn.`
        : `Bạn có chắc muốn chặn ${user.displayName}? Họ sẽ không thể nhắn tin cho bạn và bạn sẽ không thấy nội dung của họ nữa.`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: isBlocked ? 'Bỏ chặn' : 'Chặn',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setBlockActionLoading(true);
              
              let success;
              if (isBlocked) {
                // Unblock user
                success = await followService.unblockUser(currentUser.uid, user.id);
              } else {
                // Block user
                success = await followService.blockUser(currentUser.uid, user.id);
              }

              if (success) {
                Alert.alert(
                  '✅ Thành công',
                  isBlocked 
                    ? `Đã bỏ chặn ${user.displayName}`
                    : `Đã chặn ${user.displayName}`
                );
                // Reload block status
                // The hook will automatically update
              } else {
                Alert.alert('❌ Lỗi', 'Không thể thực hiện thao tác. Vui lòng thử lại.');
              }
            } catch (error) {
              console.error('Block/unblock error:', error);
              Alert.alert('❌ Lỗi', 'Đã xảy ra lỗi. Vui lòng thử lại.');
            } finally {
              setBlockActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.primary, '#8B5CF6']}
      style={styles.headerGradient}
    >
      <View style={styles.headerContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {user.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isOwnProfile && (
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {/* Status Indicator */}
          <TouchableOpacity
            style={[styles.statusIndicator, { backgroundColor: getStatusInfo(user.status).color }]}
            onPress={isOwnProfile ? () => setStatusModalVisible(true) : undefined}
          >
            <MaterialCommunityIcons
              name={getStatusInfo(user.status).icon as any}
              size={12}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>{user.displayName}</Text>
            {user.isVerified && (
              <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
            )}
          </View>
          <Text style={styles.username}>@{user.username}</Text>
          <Text style={styles.statusText}>
            {user.status === 'online' ? 'Đang trực tuyến' : formatLastSeen(user.lastSeen)}
          </Text>
        </View>

        {/* Action Buttons - Disabled if blocked */}
        {!isOwnProfile && !isBlockedBy && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.primaryActionButton,
                isBlocked && styles.disabledButton
              ]} 
              onPress={isBlocked ? undefined : onSendMessage}
              disabled={isBlocked}
            >
              <MaterialCommunityIcons 
                name="message" 
                size={20} 
                color={isBlocked ? colors.subtleText : "#FFFFFF"} 
              />
              <Text style={[
                styles.actionButtonText,
                isBlocked && { color: colors.subtleText }
              ]}>
                Nhắn tin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.secondaryActionButton,
                isBlocked && styles.disabledButton
              ]} 
              onPress={isBlocked ? undefined : onAddFriend}
              disabled={isBlocked}
            >
              <MaterialCommunityIcons 
                name="account-plus" 
                size={20} 
                color={isBlocked ? colors.subtleText : colors.primary} 
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  // Render block relationship banner
  const renderBlockBanner = () => {
    if (isOwnProfile || !hasBlockRelation) return null;

    return (
      <View style={[styles.blockBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger }]}>
        <MaterialCommunityIcons name="block-helper" size={24} color={colors.danger} />
        <View style={styles.blockBannerContent}>
          <Text style={[styles.blockBannerTitle, { color: colors.danger }]}>
            {isBlockedBy ? 'Bạn đã bị chặn' : 'Bạn đã chặn người dùng này'}
          </Text>
          <Text style={[styles.blockBannerText, { color: colors.subtleText }]}>
            {isBlockedBy 
              ? 'Bạn không thể xem nội dung hoặc nhắn tin với người dùng này.'
              : 'Bạn sẽ không thấy nội dung của họ và họ không thể nhắn tin cho bạn.'
            }
          </Text>
        </View>
      </View>
    );
  };

  const renderProfileInfo = () => (
    <View style={[styles.profileSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin cá nhân</Text>
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <MaterialCommunityIcons
              name={isEditing ? 'check' : 'pencil'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Bio */}
      <View style={styles.infoItem}>
        <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Giới thiệu</Text>
          {isEditing ? (
            <TextInput
              value={editData.bio}
              onChangeText={(text) => setEditData({ ...editData, bio: text })}
              placeholder="Viết gì đó về bản thân..."
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
              multiline
              maxLength={150}
            />
          ) : (
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user.bio || 'Chưa có thông tin'}
            </Text>
          )}
        </View>
      </View>

      {/* Email */}
      <View style={styles.infoItem}>
        <MaterialCommunityIcons name="email" size={20} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Email</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
        </View>
      </View>

      {/* Phone */}
      {user.phoneNumber && (
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Số điện thoại</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user.phoneNumber}</Text>
          </View>
        </View>
      )}

      {/* Location */}
      <View style={styles.infoItem}>
        <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Vị trí</Text>
          {isEditing ? (
            <TextInput
              value={editData.location}
              onChangeText={(text) => setEditData({ ...editData, location: text })}
              placeholder="Thành phố, Quốc gia"
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
            />
          ) : (
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user.location || 'Chưa cập nhật'}
            </Text>
          )}
        </View>
      </View>

      {/* Website */}
      <View style={styles.infoItem}>
        <MaterialCommunityIcons name="web" size={20} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Website</Text>
          {isEditing ? (
            <TextInput
              value={editData.website}
              onChangeText={(text) => setEditData({ ...editData, website: text })}
              placeholder="https://example.com"
              style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
            />
          ) : (
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user.website || 'Chưa có'}
            </Text>
          )}
        </View>
      </View>

      {/* Join Date */}
      <View style={styles.infoItem}>
        <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: colors.subtleText }]}>Ngày tham gia</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {formatJoinDate(user.joinDate)}
          </Text>
        </View>
      </View>

      {isEditing && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
          <LinearGradient
            colors={[colors.primary, '#8B5CF6']}
            style={styles.saveButtonGradient}
          >
            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMoreActions = () => {
    if (isOwnProfile) return null;

    return (
      <View style={[styles.profileSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thêm</Text>
        
        {!isBlockedBy && (
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={handleBlockUser}
            disabled={blockActionLoading}
          >
            {blockActionLoading ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <MaterialCommunityIcons 
                name={isBlocked ? "account-check" : "block-helper"} 
                size={20} 
                color={isBlocked ? colors.warning : colors.danger} 
              />
            )}
            <Text style={[
              styles.actionText, 
              { color: isBlocked ? colors.warning : colors.danger }
            ]}>
              {isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.subtleText} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionItem} onPress={onReport}>
          <MaterialCommunityIcons name="flag" size={20} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Báo cáo</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.subtleText} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderStatusModal = () => (
    <Modal
      visible={statusModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setStatusModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.statusModal, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Đặt trạng thái</Text>
          
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={styles.statusOption}
              onPress={() => {
                // Handle status change
                setStatusModalVisible(false);
              }}
            >
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusLabel, { color: colors.text }]}>{status.label}</Text>
              {user.status === status.value && (
                <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
            onPress={() => setStatusModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Show loading state while checking block status
  if (blockLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtleText }]}>
          Đang tải thông tin...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderBlockBanner()}
        {!isBlockedBy && renderProfileInfo()}
        {renderMoreActions()}
      </ScrollView>
      {renderStatusModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 8,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  secondaryActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModal: {
    width: '80%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    flex: 1,
    fontSize: 16,
  },
  modalButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  blockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    margin: 20,
    marginBottom: 0,
  },
  blockBannerContent: {
    marginLeft: 12,
    flex: 1,
  },
  blockBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  blockBannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default UserProfile;
