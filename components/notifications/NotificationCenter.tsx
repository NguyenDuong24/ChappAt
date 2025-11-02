import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

interface NotificationItem {
  id: string;
  type: 'message' | 'friend_request' | 'group_invite' | 'system' | 'update';
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  avatar?: string;
  actionData?: any;
}

interface NotificationCenterProps {
  notifications: NotificationItem[];
  onNotificationPress: (notification: NotificationItem) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onRefresh?: () => void;
  isDarkMode?: boolean;
}

const NotificationCenter = ({
  notifications,
  onNotificationPress,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onRefresh,
  isDarkMode = false,
}: NotificationCenterProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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
    unread: isDarkMode ? '#1E40AF' : '#3B82F6',
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return 'message-text';
      case 'friend_request': return 'account-plus';
      case 'group_invite': return 'account-group';
      case 'system': return 'cog';
      case 'update': return 'download';
      default: return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message': return colors.primary;
      case 'friend_request': return colors.success;
      case 'group_invite': return colors.warning;
      case 'system': return colors.subtleText;
      case 'update': return colors.danger;
      default: return colors.primary;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return timestamp.toLocaleDateString('vi-VN');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  const handleLongPress = (notification: NotificationItem) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedNotifications(new Set([notification.id]));
    }
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedNotifications);
      if (newSelected.has(notification.id)) {
        newSelected.delete(notification.id);
      } else {
        newSelected.add(notification.id);
      }
      setSelectedNotifications(newSelected);
      
      if (newSelected.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      if (!notification.isRead) {
        onMarkAsRead(notification.id);
      }
      onNotificationPress(notification);
    }
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Xóa thông báo',
      `Bạn có chắc chắn muốn xóa ${selectedNotifications.size} thông báo?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            selectedNotifications.forEach(id => onDeleteNotification(id));
            setSelectedNotifications(new Set());
            setIsSelectionMode(false);
          },
        },
      ]
    );
  };

  const handleMarkSelectedAsRead = () => {
    selectedNotifications.forEach(id => onMarkAsRead(id));
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    const isSelected = selectedNotifications.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: isSelected ? `${colors.primary}20` : colors.surface,
            borderColor: colors.border,
            borderLeftColor: !item.isRead ? colors.unread : colors.border,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationLeft}>
            <View
              style={[
                styles.notificationIcon,
                { backgroundColor: `${getNotificationColor(item.type)}20` },
              ]}
            >
              <MaterialCommunityIcons
                name={getNotificationIcon(item.type)}
                size={20}
                color={getNotificationColor(item.type)}
              />
            </View>
            
            <View style={styles.notificationText}>
              <Text
                style={[
                  styles.notificationTitle,
                  {
                    color: colors.text,
                    fontWeight: !item.isRead ? '600' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.notificationMessage,
                  { color: colors.subtleText },
                ]}
                numberOfLines={2}
              >
                {item.content}
              </Text>
              <Text
                style={[
                  styles.notificationTime,
                  { color: colors.subtleText },
                ]}
              >
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </View>

          <View style={styles.notificationRight}>
            {isSelectionMode && (
              <View
                style={[
                  styles.selectionIndicator,
                  {
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                {isSelected && (
                  <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>
            )}
            
            {!item.isRead && !isSelectionMode && (
              <View style={[styles.unreadDot, { backgroundColor: colors.unread }]} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerLeft}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Thông báo
        </Text>
        {unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.headerRight}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleMarkSelectedAsRead}
            >
              <MaterialCommunityIcons name="check-all" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleDeleteSelected}
            >
              <MaterialCommunityIcons name="delete" size={20} color={colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedNotifications(new Set());
              }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.subtleText} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <MaterialCommunityIcons 
              name="check-all" 
              size={20} 
              color={unreadCount > 0 ? colors.primary : colors.subtleText} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="bell-outline" size={64} color={colors.subtleText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Không có thông báo
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.subtleText }]}>
        Khi có thông báo mới, chúng sẽ xuất hiện ở đây
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        renderEmptyState()
      )}

      {isSelectionMode && (
        <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text style={[styles.selectionText, { color: colors.text }]}>
            Đã chọn {selectedNotifications.size} thông báo
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleMarkSelectedAsRead}
            >
              <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Đánh dấu đã đọc</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.danger }]}
              onPress={handleDeleteSelected}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  unreadBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NotificationCenter;
