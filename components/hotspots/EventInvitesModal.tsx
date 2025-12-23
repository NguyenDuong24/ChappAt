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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EventInvite, UserProfile } from '@/types/eventInvites';
import { eventInviteService } from '@/services/eventInviteService';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

interface EventInvitesModalProps {
  visible: boolean;
  onClose: () => void;
  onInviteAccepted?: (chatRoomId: string, eventId?: string, eventTitle?: string) => void;
}

const EventInvitesModal: React.FC<EventInvitesModalProps> = ({
  visible,
  onClose,
  onInviteAccepted
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [invites, setInvites] = useState<(EventInvite & { inviterProfile?: UserProfile, eventTitle?: string })[]>([]);
  const [sentInvites, setSentInvites] = useState<(EventInvite & { inviteeProfile?: UserProfile, eventTitle?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (visible && user?.uid) {
      loadInvites();
      loadSentInvites();
    }
  }, [visible, user?.uid]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const userInvites = await eventInviteService.getUserInvites(user!.uid);
      // Enrich with profiles and event titles
      const enrichedInvites = await Promise.all(
        userInvites.map(async (invite) => {
          try {
            const [inviterProfile, eventDetails] = await Promise.all([
              fetchUserProfile(invite.inviterId),
              fetchEventDetails(invite.eventId),
            ]);
            return {
              ...invite,
              inviterProfile,
              eventTitle: eventDetails?.title || 'Sự kiện',
            } as any;
          } catch {
            return invite as any;
          }
        })
      );
      setInvites(enrichedInvites);
    } catch (error) {
      console.error('Error loading invites:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách lời mời');
    } finally {
      setLoading(false);
    }
  };

  const loadSentInvites = async () => {
    try {
      if (!user?.uid) return;
      const sent = await eventInviteService.getSentInvitesPending(user.uid);
      const enriched = await Promise.all(
        sent.map(async (inv) => {
          try {
            const [inviteeProfile, eventDetails] = await Promise.all([
              fetchUserProfile(inv.inviteeId),
              fetchEventDetails(inv.eventId),
            ]);
            return { ...inv, inviteeProfile, eventTitle: eventDetails?.title || 'Sự kiện' } as any;
          } catch {
            return inv as any;
          }
        })
      );
      setSentInvites(enriched);
    } catch (e) {
      console.error('Error loading sent invites:', e);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await eventInviteService.cancelInvite(inviteId, user!.uid);
      Alert.alert('Đã thu hồi', 'Bạn đã thu hồi lời mời.');
      await loadSentInvites();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể thu hồi');
    }
  };

  const fetchUserProfile = async (userId: string): Promise<UserProfile | undefined> => {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) return undefined;
      const d: any = snap.data();
      return {
        id: userId,
        name: d?.displayName || d?.name || d?.username || 'Người dùng',
        avatar: d?.avatar || d?.photoURL || d?.profileUrl,
        age: typeof d?.age === 'number' ? d.age : undefined,
        bio: typeof d?.bio === 'string' ? d.bio : undefined,
      } as UserProfile;
    } catch {
      return undefined;
    }
  };

  const fetchEventDetails = async (eventId: string) => {
    try {
      const hot = await getDoc(doc(db, 'hotSpots', eventId));
      if (hot.exists()) {
        const d: any = hot.data();
        return { title: d?.title || d?.name || 'Sự kiện' };
      }
      const ev = await getDoc(doc(db, 'events', eventId));
      if (ev.exists()) {
        const d: any = ev.data();
        return { title: d?.title || d?.name || 'Sự kiện' };
      }
    } catch { }
    return { title: 'Sự kiện' };
  };

  const getCreatedAtDate = (ts: any): Date => {
    try {
      if (!ts) return new Date();
      if (typeof ts?.toDate === 'function') return ts.toDate();
      if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
      if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
    } catch { }
    return new Date();
  };

  const handleRespondToInvite = async (inviteId: string, response: 'accepted' | 'declined') => {
    setRespondingTo(prev => ({ ...prev, [inviteId]: true }));

    try {
      // Find the invite to get event details
      const invite = invites.find(inv => inv.id === inviteId);
      const chatRoomId = await eventInviteService.respondToInvite(inviteId, response);

      if (response === 'accepted' && chatRoomId) {
        if (invite) {
          onInviteAccepted?.(chatRoomId, invite.eventId, invite.eventTitle);
        } else {
          onInviteAccepted?.(chatRoomId);
        }
      } else if (response === 'declined') {
        Alert.alert(
          'Đã từ chối',
          'Bạn đã từ chối lời mời này.',
          [{ text: 'OK', onPress: () => loadInvites() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể phản hồi lời mời');
    } finally {
      setRespondingTo(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  const renderInviteCard = ({ item }: { item: EventInvite & { inviterProfile?: UserProfile, eventTitle?: string } }) => {
    const createdAtDate = getCreatedAtDate((item as any).createdAt);
    return (
      <View style={styles.inviteCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {item.inviterProfile?.avatar ? (
              <Image source={{ uri: item.inviterProfile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.inviterProfile?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inviteInfo}>
            <Text style={styles.inviterName}>
              {item.inviterProfile?.name || 'Người dùng'} mời bạn đi cùng
            </Text>
            <Text style={styles.eventTitle}>{item.eventTitle}</Text>
            <Text style={styles.inviteTime}>
              {createdAtDate.toLocaleDateString('vi-VN')} lúc {createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleRespondToInvite(item.id, 'declined')}
            disabled={respondingTo[item.id]}
          >
            {respondingTo[item.id] ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.declineButtonText}>Từ chối</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleRespondToInvite(item.id, 'accepted')}
            disabled={respondingTo[item.id]}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.acceptButtonGradient}
            >
              {respondingTo[item.id] ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.acceptButtonText}>Đồng ý</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInviteCardSent = ({ item }: { item: EventInvite & { inviteeProfile?: UserProfile, eventTitle?: string } }) => {
    const createdAtDate = getCreatedAtDate((item as any).createdAt);
    return (
      <View style={styles.inviteCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {item.inviteeProfile?.avatar ? (
              <Image source={{ uri: item.inviteeProfile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.inviteeProfile?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.inviteInfo}>
            <Text style={styles.inviterName}>Bạn đã mời {item.inviteeProfile?.name || 'người dùng'}</Text>
            <Text style={styles.eventTitle}>{item.eventTitle}</Text>
            <Text style={styles.inviteTime}>
              {createdAtDate.toLocaleDateString('vi-VN')} lúc {createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={() => handleCancelInvite(item.id!)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.declineButtonText}>Thu hồi</Text>
          </TouchableOpacity>
        </View>
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
        <View style={styles.headerTabs}>
          <TouchableOpacity onPress={() => setActiveTab('received')} style={[styles.tabBtn, activeTab === 'received' && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>Nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('sent')} style={[styles.tabBtn, activeTab === 'sent' && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>Đã gửi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerClose} onPress={onClose}>
            <MaterialIcons name="close" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading && activeTab === 'received' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EC4899" />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : activeTab === 'received' ? (
            invites.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="mail-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Chưa có lời mời</Text>
                <Text style={styles.emptySubtitle}>Khi ai đó rủ bạn, lời mời sẽ hiển thị ở đây.</Text>
              </View>
            ) : (
              <FlatList
                data={invites}
                renderItem={renderInviteCard}
                keyExtractor={item => item.id!}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )
          ) : (
            sentInvites.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="send" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Chưa gửi lời mời nào</Text>
                <Text style={styles.emptySubtitle}>Hãy mở danh sách người quan tâm để rủ ai đó đi cùng.</Text>
              </View>
            ) : (
              <FlatList
                data={sentInvites}
                renderItem={renderInviteCardSent}
                keyExtractor={item => item.id!}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )
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
  headerTabs: {
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 6,
    backgroundColor: '#f3f4f6'
  },
  tabActive: {
    backgroundColor: '#e9d5ff'
  },
  tabText: {
    fontWeight: '600',
    color: '#6b7280'
  },
  tabTextActive: {
    color: '#6d28d9'
  },
  headerClose: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 6
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
  inviteCard: {
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
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  inviteInfo: {
    flex: 1,
  },
  inviterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#10B981',
    marginBottom: 4,
  },
  inviteTime: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    height: 48,
  },
  declineButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  acceptButton: {
    paddingVertical: 0, // Reset padding because gradient handles it
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0,
  },
  acceptButtonGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});

export default EventInvitesModal;
