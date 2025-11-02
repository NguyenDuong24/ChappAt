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
  const [invites, setInvites] = useState<(EventInvite & { inviterProfile?: UserProfile, eventTitle?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (visible && user?.uid) {
      loadInvites();
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
    } catch {}
    return { title: 'Sự kiện' };
  };

  const getCreatedAtDate = (ts: any): Date => {
    try {
      if (!ts) return new Date();
      if (typeof ts?.toDate === 'function') return ts.toDate();
      if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
      if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
    } catch {}
    return new Date();
  };

  const handleRespondToInvite = async (inviteId: string, response: 'accepted' | 'declined') => {
    setRespondingTo(prev => ({ ...prev, [inviteId]: true }));
    
    try {
      // Find the invite to get event details
      const invite = invites.find(inv => inv.id === inviteId);
      const chatRoomId = await eventInviteService.respondToInvite(inviteId, response);
      
      if (response === 'accepted' && chatRoomId) {
        Alert.alert(
          '🎉 Tuyệt vời!',
          'Bạn đã chấp nhận lời mời! Giờ hai bạn có thể chat và lên kèo đi cùng nhau.',
          [
            {
              text: 'Đi tới chat',
              onPress: () => {
                // Pass event details to parent for navigation
                if (invite) {
                  onInviteAccepted?.(chatRoomId, invite.eventId, invite.eventTitle);
                } else {
                  onInviteAccepted?.(chatRoomId);
                }
                onClose();
              }
            },
            {
              text: 'Để sau',
              style: 'cancel',
              onPress: () => {
                // Keep modal open and refresh list so the accepted invite moves out of pending
                loadInvites();
              }
            }
          ]
        );
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
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <>
                <MaterialIcons name="close" size={18} color="#666" />
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
              style={styles.acceptButtonGradient}
            >
              {respondingTo[item.id] ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="check" size={18} color="white" />
                  <Text style={styles.acceptButtonText}>Đồng ý</Text>
                </>
              )}
            </LinearGradient>
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
        <View style={styles.header}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Lời mời đi cùng 💌</Text>
              <Text style={styles.headerSubtitle}>
                {invites.length} lời mời đang chờ
              </Text>
            </View>
            
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : invites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="mail-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Không có lời mời nào</Text>
              <Text style={styles.emptySubtitle}>
                Khi có ai đó mời bạn đi cùng sự kiện, nó sẽ xuất hiện ở đây!
              </Text>
            </View>
          ) : (
            <FlatList
              data={invites}
              renderItem={renderInviteCard}
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
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  declineButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default EventInvitesModal;
