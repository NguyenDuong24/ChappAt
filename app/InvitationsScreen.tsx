import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useHotSpotInvitations } from '@/hooks/useHotSpots';
import { HotSpotInvitation } from '@/types/hotSpots';

const InvitationsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { sentInvitations, receivedInvitations, loading, respondToInvitation } = useHotSpotInvitations();

  const [selectedTab, setSelectedTab] = useState<'received' | 'sent'>('received');

  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    const success = await respondToInvitation(invitationId, response);
    if (success && response === 'accepted') {
      Alert.alert(
        'Lời mời được chấp nhận!',
        'Phòng chat đã được tạo. Bạn có thể bắt đầu trò chuyện ngay bây giờ.',
        [
          {
            text: 'Xem phòng chat',
            onPress: () => {
              // TODO: Navigate to chat room
              console.log('Navigate to chat room');
            }
          },
          { text: 'Đóng' }
        ]
      );
    }
  };

  const renderInvitationItem = ({ item }: { item: HotSpotInvitation }) => {
    const isReceived = selectedTab === 'received';
    const isPending = item.status === 'pending';
    const isExpired = new Date(item.expiresAt) < new Date();

    return (
      <View style={[styles.invitationItem, isExpired && styles.invitationItemExpired]}>
        {/* User Avatar */}
        <Image
          source={{ uri: 'https://via.placeholder.com/50' }} // TODO: Get user avatar
          style={styles.userAvatar}
        />

        <View style={styles.invitationContent}>
          {/* Header */}
          <View style={styles.invitationHeader}>
            <Text style={styles.userName}>
              {isReceived ? 'Từ: Người dùng' : 'Đến: Người dùng'} {/* TODO: Get actual user names */}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>

          {/* Hot Spot Info */}
          <TouchableOpacity
            style={styles.hotSpotInfo}
            onPress={() => {
              router.push({
                pathname: '/(screens)/hotspots/HotSpotDetailScreen',
                params: { hotSpotId: item.hotSpotId }
              });
            }}
          >
            <FontAwesome5 name="map-marker-alt" size={14} color="#4ECDC4" />
            <Text style={styles.hotSpotTitle} numberOfLines={1}>
              Hot Spot {/* TODO: Get actual hot spot title */}
            </Text>
          </TouchableOpacity>

          {/* Message */}
          {item.message && (
            <Text style={styles.invitationMessage} numberOfLines={2}>
              "{item.message}"
            </Text>
          )}

          {/* Status & Actions */}
          <View style={styles.invitationFooter}>
            <View style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {getStatusText(item.status)}
              </Text>
            </View>

            {isReceived && isPending && !isExpired && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => handleInvitationResponse(item.id, 'declined')}
                >
                  <MaterialIcons name="close" size={16} color="#FF6B6B" />
                  <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
                    Từ chối
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleInvitationResponse(item.id, 'accepted')}
                >
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                    Chấp nhận
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {item.status === 'accepted' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.chatButton]}
                onPress={() => {
                  // TODO: Navigate to chat room
                  console.log('Navigate to chat room');
                }}
              >
                <MaterialIcons name="chat" size={16} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                  Chat
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isExpired && (
            <View style={styles.expiredOverlay}>
              <MaterialIcons name="schedule" size={16} color="#999" />
              <Text style={styles.expiredText}>Đã hết hạn</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const currentInvitations = selectedTab === 'received' ? receivedInvitations : sentInvitations;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Đang tải lời mời...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Lời mời</Text>
          <Text style={styles.subtitle}>Quản lý lời mời Hot Spot</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'received' && styles.tabActive]}
          onPress={() => setSelectedTab('received')}
        >
          <MaterialIcons
            name="mail"
            size={20}
            color={selectedTab === 'received' ? '#4ECDC4' : '#999'}
          />
          <Text
            style={[styles.tabText, selectedTab === 'received' && styles.tabTextActive]}
          >
            Nhận được ({receivedInvitations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sent' && styles.tabActive]}
          onPress={() => setSelectedTab('sent')}
        >
          <MaterialIcons
            name="send"
            size={20}
            color={selectedTab === 'sent' ? '#4ECDC4' : '#999'}
          />
          <Text
            style={[styles.tabText, selectedTab === 'sent' && styles.tabTextActive]}
          >
            Đã gửi ({sentInvitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Invitations List */}
      {currentInvitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name={selectedTab === 'received' ? 'mail-outline' : 'send'}
            size={48}
            color="#CCC"
          />
          <Text style={styles.emptyText}>
            {selectedTab === 'received'
              ? 'Chưa có lời mời nào'
              : 'Chưa gửi lời mời nào'}
          </Text>
          <Text style={styles.emptySubtext}>
            {selectedTab === 'received'
              ? 'Khi có người mời bạn đi cùng sẽ hiển thị ở đây'
              : 'Hãy tìm Hot Spots thú vị và mời bạn bè cùng đi'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentInvitations}
          keyExtractor={(item) => item.id}
          renderItem={renderInvitationItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

// Helper functions
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return '#FFB84D';
    case 'accepted': return '#4ECDC4';
    case 'declined': return '#FF6B6B';
    case 'expired': return '#999';
    default: return '#CCC';
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return 'Chờ phản hồi';
    case 'accepted': return 'Đã chấp nhận';
    case 'declined': return 'Đã từ chối';
    case 'expired': return 'Đã hết hạn';
    default: return 'Không xác định';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4ECDC4',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#999',
  },
  tabTextActive: {
    color: '#4ECDC4',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  invitationItem: {
    flexDirection: 'row',
    padding: 16,
    marginVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invitationItemExpired: {
    opacity: 0.6,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  invitationContent: {
    flex: 1,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  hotSpotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hotSpotTitle: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#4ECDC4',
  },
  invitationMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  invitationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  declineButton: {
    backgroundColor: '#FFF',
    borderColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  acceptButton: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  chatButton: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  expiredText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default InvitationsScreen;
