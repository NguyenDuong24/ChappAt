import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProfile } from '@/types/eventInvites';
import { eventInviteService } from '@/services/eventInviteService';
import { useAuth } from '@/context/authContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [invitingUsers, setInvitingUsers] = useState<{ [key: string]: boolean }>({});
  const [hotSpotData, setHotSpotData] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<{ [key: string]: boolean }>({});

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
      loadHotSpotData();
    }
  }, [visible, eventId]);

  const loadInterestedUsers = async (isLoadMore = false) => {
    if (isLoadMore) {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setInterestedUsers([]);
      setLastVisible(null);
      setHasMore(true);
    }

    try {
      const result = await eventInviteService.getInterestedUsers(
        eventId,
        10,
        isLoadMore ? lastVisible : null
      );

      const newUsers = result.users.filter(u => u.id !== user?.uid);

      if (isLoadMore) {
        setInterestedUsers(prev => [...prev, ...newUsers]);
      } else {
        setInterestedUsers(newUsers);
      }

      setLastVisible(result.lastVisible);
      setHasMore(result.users.length === 10);

      // Check for existing pending invites for new users in parallel
      if (user?.uid && newUsers.length > 0) {
        const pendingChecks: { [key: string]: boolean } = { ...pendingInvites };

        await Promise.all(newUsers.map(async (targetUser) => {
          if (pendingChecks[targetUser.id] !== undefined) return;
          try {
            const existing = await eventInviteService.checkExistingInvite(
              eventId,
              user.uid,
              targetUser.id
            );
            pendingChecks[targetUser.id] = !!existing;
          } catch (error) {
            console.error('Error checking pending invite for user:', targetUser.id, error);
            pendingChecks[targetUser.id] = false;
          }
        }));

        setPendingInvites(pendingChecks);
      }
    } catch (error) {
      console.error('Error loading interested users:', error);
      if (!isLoadMore) {
        Alert.alert('Lỗi', 'Không thể tải danh sách người quan tâm');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadHotSpotData = async () => {
    try {
      const hotSpotRef = doc(db, 'hotSpots', eventId);
      const hotSpotSnap = await getDoc(hotSpotRef);
      if (hotSpotSnap.exists()) {
        setHotSpotData({ id: hotSpotSnap.id, ...hotSpotSnap.data() });
      }
    } catch (error) {
      console.error('Error loading hot spot data:', error);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadInterestedUsers(true);
    }
  };

  const handleInviteUser = async (targetUserId: string) => {
    if (!user?.uid) return;
    if (pendingInvites[targetUserId]) {
      Alert.alert('Đã gửi', 'Bạn đã có lời mời đang chờ người này.');
      return;
    }

    setInvitingUsers(prev => ({ ...prev, [targetUserId]: true }));

    try {
      const targetUser = interestedUsers.find(u => u.id === targetUserId);

      // Ensure no duplicate pending invite
      const existing = await eventInviteService.checkExistingInvite(eventId, user.uid, targetUserId);
      if (existing) {
        setPendingInvites(prev => ({ ...prev, [targetUserId]: true }));
        Alert.alert('Đã gửi', 'Bạn đã có lời mời đang chờ người này.');
        return;
      }

      const inviteId = await eventInviteService.sendInvite(eventId, user.uid, targetUserId);
      setPendingInvites(prev => ({ ...prev, [targetUserId]: true }));

      Alert.alert(
        'Thành công! 💌',
        `Đã gửi lời mời đến ${targetUser?.name || 'người dùng'}! Họ sẽ nhận được thông báo.`,
        [{ text: 'OK' }]
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
              <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
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
          style={[styles.inviteButton, (invitingUsers[item.id] || pendingInvites[item.id]) && styles.inviteButtonDisabled]}
          onPress={() => handleInviteUser(item.id)}
          disabled={invitingUsers[item.id] || pendingInvites[item.id]}
        >
          <LinearGradient
            colors={invitingUsers[item.id] ? ['#ccc', '#999'] : pendingInvites[item.id] ? ['#10B981', '#059669'] : ['#EC4899', '#8B5CF6']}
            style={styles.inviteButtonGradient}
          >
            {invitingUsers[item.id] ? (
              <ActivityIndicator size="small" color="white" />
            ) : pendingInvites[item.id] ? (
              <>
                <MaterialIcons name="check-circle" size={16} color="white" />
                <Text style={styles.inviteButtonText}>Đã gửi lời mời</Text>
              </>
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
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={() => (
                loadingMore ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color="#EC4899" />
                  </View>
                ) : null
              )}
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

