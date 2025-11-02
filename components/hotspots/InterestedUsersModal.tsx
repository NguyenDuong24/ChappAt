import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProfile } from '@/types/eventInvites';
import { eventInviteService } from '@/services/eventInviteService';
import { useAuth } from '@/context/authContext';

const { width } = Dimensions.get('window');

interface InterestedUsersModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

const InterestedUsersModal: React.FC<InterestedUsersModalProps> = ({
  visible,
  onClose,
  eventId,
  eventTitle
}) => {
  const { user } = useAuth();
  const viewerShowOnline = user?.showOnlineStatus !== false;
  const [interestedUsers, setInterestedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingUsers, setInvitingUsers] = useState<{[key: string]: boolean}>({});

  // Helper: safely format location which may be string or { latitude, longitude }
  const getLocationText = (loc: any): string | undefined => {
    if (!loc) return undefined;
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object') {
      const lat = loc.latitude ?? loc.lat ?? loc._lat;
      const lng = loc.longitude ?? loc.lng ?? loc._long ?? loc._lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
      return undefined;
    }
    try { return String(loc); } catch { return undefined; }
  };

  useEffect(() => {
    if (visible) {
      loadInterestedUsers();
    }
  }, [visible, eventId]);

  const loadInterestedUsers = async () => {
    setLoading(true);
    try {
      const users = await eventInviteService.getInterestedUsers(eventId);
      // Filter out current user
      setInterestedUsers(users.filter(u => u.id !== user?.uid));
    } catch (error) {
      console.error('Error loading interested users:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách người quan tâm');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (targetUserId: string) => {
    if (!user?.uid) return;
    
    setInvitingUsers(prev => ({ ...prev, [targetUserId]: true }));
    
    try {
      await eventInviteService.sendInvite(eventId, user.uid, targetUserId);
      Alert.alert(
        'Thành công! 💌', 
        'Lời mời đã được gửi! Họ sẽ nhận được thông báo và có thể phản hồi.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lời mời');
    } finally {
      setInvitingUsers(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const renderUserCard = ({ item }: { item: UserProfile }) => {
    const locationText = getLocationText((item as any).location);

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {viewerShowOnline && <View style={styles.onlineIndicator} />}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name || 'Người dùng'}</Text>
            {typeof item.age === 'number' && (
              <Text style={styles.userAge}>{item.age} tuổi</Text>
            )}
            {locationText && (
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={12} color="#666" />
                <Text style={styles.userLocation}>{locationText}</Text>
              </View>
            )}
            {typeof item.bio === 'string' && item.bio.length > 0 && (
              <Text style={styles.userBio} numberOfLines={2}>{item.bio}</Text>
            )}
          </View>
        </View>
  
        <TouchableOpacity 
          style={[styles.inviteButton, invitingUsers[item.id] && styles.inviteButtonDisabled]}
          onPress={() => handleInviteUser(item.id)}
          disabled={invitingUsers[item.id]}
        >
          <LinearGradient
            colors={invitingUsers[item.id] ? ['#ccc', '#999'] : ['#EC4899', '#8B5CF6']}
            style={styles.inviteButtonGradient}
          >
            {invitingUsers[item.id] ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="group-add" size={16} color="white" />
                <Text style={styles.inviteButtonText}>Rủ đi cùng</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#7C3AED', '#EC4899']}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Những người quan tâm 🎉</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>{eventTitle}</Text>
            </View>
            
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EC4899" />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : interestedUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Chưa có ai quan tâm</Text>
              <Text style={styles.emptySubtitle}>
                Hãy chia sẻ sự kiện để thu hút thêm người tham gia!
              </Text>
            </View>
          ) : (
            <FlatList
              data={interestedUsers}
              renderItem={renderUserCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 18,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userAge: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  inviteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteButtonDisabled: {
    opacity: 0.7,
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default InterestedUsersModal;
