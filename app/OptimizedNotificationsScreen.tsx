import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  StatusBar,
  Platform,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import optimizedNotificationService, { OptimizedNotification } from '@/services/optimizedNotificationService';

const { width, height } = Dimensions.get('window');

type CategoryKey = 'all' | 'message' | 'call' | 'friend_request' | 'event_pass' | 'system' | 'hot_spot' | 'like' | 'comment' | 'follow';

const OptimizedNotificationsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  const [notifications, setNotifications] = useState<OptimizedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadNotifications(true);
      setupRealtimeListener();
    }
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      optimizedNotificationService.cleanupUserListeners(user?.uid || '');
    };
  }, [user?.uid, category, filter]);

  // Load notifications using optimized service
  const loadNotifications = async (refresh: boolean = false) => {
    if (!user?.uid) return;

    try {
      if (refresh) {
        setLoading(true);
      }

      const result = await optimizedNotificationService.loadNotifications(
        user.uid,
        refresh,
        category === 'all' ? undefined : category,
        filter
      );

      setNotifications(result.notifications);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      Alert.alert('Lỗi', 'Không thể tải thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load more notifications for pagination
  const loadMoreNotifications = async () => {
    if (!user?.uid || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      
      const moreNotifications = await optimizedNotificationService.loadMoreNotifications(
        user.uid,
        category === 'all' ? undefined : category,
        filter
      );

      if (moreNotifications.length > 0) {
        setNotifications(prev => [...prev, ...moreNotifications]);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Setup real-time listener using optimized service
  const setupRealtimeListener = () => {
    if (!user?.uid) return;

    // Cleanup existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsubscribe = optimizedNotificationService.setupRealtimeListener(
      user.uid,
      (newNotification) => {
        // Add new notification to the top of the list
        setNotifications(prev => {
          // Check if notification already exists
          const exists = prev.find(n => n.id === newNotification.id);
          if (exists) return prev;
          
          return [newNotification, ...prev];
        });
      },
      category === 'all' ? undefined : category
    );

    unsubscribeRef.current = unsubscribe;
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(true);
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await optimizedNotificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.uid) return;

    try {
      await optimizedNotificationService.markAllAsRead(user.uid);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      Alert.alert('Lỗi', 'Không thể đánh dấu thông báo');
    }
  };

  // Handle notification press
  const handleNotificationPress = (notification: OptimizedNotification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    try {
      switch (notification.type) {
        case 'message':
          if (notification.data?.chatId) {
            router.push(`/chat/${notification.data.chatId}`);
          }
          break;
        case 'call':
          if (notification.data?.callId) {
            router.push(`/call/${notification.data.callId}`);
          }
          break;
        case 'friend_request':
          router.push('/friends');
          break;
        case 'hot_spot':
          if (notification.data?.hotSpotId) {
            router.push(`/hotspots/${notification.data.hotSpotId}`);
          }
          break;
        case 'like':
        case 'comment':
          if (notification.data?.postId) {
            router.push(`/posts/${notification.data.postId}`);
          }
          break;
        default:
          // Handle other notification types
          break;
      }
    } catch (error) {
      console.error('❌ Error handling notification press:', error);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    return true;
  });

  // Render notification item
  const renderNotificationItem = ({ item }: { item: OptimizedNotification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: currentThemeColors.cardBackground },
        !item.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            {getNotificationIcon(item.type)}
          </View>
          <View style={styles.notificationInfo}>
            <Text style={[styles.notificationTitle, { color: currentThemeColors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.notificationMessage, { color: currentThemeColors.secondaryText }]}>
              {item.message}
            </Text>
          </View>
          {item.senderAvatar && (
            <Image
              source={{ uri: item.senderAvatar }}
              style={styles.senderAvatar}
            />
          )}
        </View>
        <View style={styles.notificationFooter}>
          <Text style={[styles.timestamp, { color: currentThemeColors.secondaryText }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    const iconColor = currentThemeColors.primary;
    const iconSize = 24;

    switch (type) {
      case 'message':
        return <Ionicons name="chatbubble" size={iconSize} color={iconColor} />;
      case 'call':
        return <Ionicons name="call" size={iconSize} color={iconColor} />;
      case 'friend_request':
        return <Ionicons name="person-add" size={iconSize} color={iconColor} />;
      case 'like':
        return <Ionicons name="heart" size={iconSize} color={iconColor} />;
      case 'comment':
        return <Ionicons name="chatbubble-outline" size={iconSize} color={iconColor} />;
      case 'follow':
        return <Ionicons name="person-add-outline" size={iconSize} color={iconColor} />;
      case 'hot_spot':
        return <Ionicons name="location" size={iconSize} color={iconColor} />;
      case 'event_pass':
        return <Ionicons name="ticket" size={iconSize} color={iconColor} />;
      default:
        return <Ionicons name="notifications" size={iconSize} color={iconColor} />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

      if (diffInSeconds < 60) {
        return 'Vừa xong';
      } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)} phút trước`;
      } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
      } else {
        return date.toLocaleDateString('vi-VN');
      }
    } catch (error) {
      return 'Không xác định';
    }
  };

  // Render category filter
  const renderCategoryFilter = () => {
    const categories = [
      { key: 'all', label: 'Tất cả' },
      { key: 'message', label: 'Tin nhắn' },
      { key: 'call', label: 'Cuộc gọi' },
      { key: 'friend_request', label: 'Kết bạn' },
      { key: 'like', label: 'Thích' },
      { key: 'comment', label: 'Bình luận' }
    ];

    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={categories}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                {
                  backgroundColor: category === item.key
                    ? currentThemeColors.primary
                    : currentThemeColors.cardBackground
                }
              ]}
              onPress={() => setCategory(item.key as CategoryKey)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  {
                    color: category === item.key
                      ? '#FFFFFF'
                      : currentThemeColors.text
                  }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={currentThemeColors.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentThemeColors.primary} />
          <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
            Đang tải thông báo...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={currentThemeColors.background}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentThemeColors.cardBackground }]}>
        <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
          Thông báo
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === 'unread'
                  ? currentThemeColors.primary
                  : 'transparent'
              }
            ]}
            onPress={() => setFilter(filter === 'all' ? 'unread' : 'all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                {
                  color: filter === 'unread'
                    ? '#FFFFFF'
                    : currentThemeColors.text
                }
              ]}
            >
              {filter === 'all' ? 'Chưa đọc' : 'Tất cả'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <MaterialIcons
              name="done-all"
              size={20}
              color={currentThemeColors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Notifications List */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[currentThemeColors.primary]}
              tintColor={currentThemeColors.primary}
            />
          }
          onEndReached={loadMoreNotifications}
          onEndReachedThreshold={0.1}
          ListFooterComponent={() => 
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={currentThemeColors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="notifications-off"
                size={64}
                color={currentThemeColors.secondaryText}
              />
              <Text style={[styles.emptyText, { color: currentThemeColors.secondaryText }]}>
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </Text>
            </View>
          )}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  markAllButton: {
    padding: 8,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    marginLeft: 16,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  unreadNotification: {
    borderLeftColor: '#51cf66',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#51cf66',
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default OptimizedNotificationsScreen;
