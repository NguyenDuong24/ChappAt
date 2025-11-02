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
import { useNotificationContext, NotificationNavigationService } from '@/services/core';
import { db } from '@/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

interface Notification {
  id: string;
  type: 'message' | 'call' | 'friend_request' | 'hot_spot' | 'event_pass' | 'system' | 'like' | 'comment' | 'follow' | 'mention';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
  senderAvatar?: string;
  senderName?: string;
  senderId?: string;
  receiverId?: string;
}

type CategoryKey = 'all' | 'message' | 'call' | 'friend_request' | 'event_pass' | 'system' | 'hot_spot' | 'like' | 'comment' | 'follow' | 'accepted_invite';

const NotificationsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { pushToken } = useNotificationContext();
  
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [category, setCategory] = useState<CategoryKey>('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Mock data - Instagram-style notifications
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'friend_request',
      title: 'Yêu cầu kết bạn',
      message: 'alice_nguyen và 2 người khác muốn theo dõi bạn',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      isRead: false,
      senderName: 'alice_nguyen',
      senderAvatar: 'https://i.pravatar.cc/150?img=1',
      data: { userId: 'user_1' }
    },
    {
      id: '2',
      type: 'message',
      title: 'Tin nhắn mới',
      message: 'bob_wilson đã gửi cho bạn một tin nhắn',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isRead: false,
      senderName: 'bob_wilson',
      senderAvatar: 'https://i.pravatar.cc/150?img=2',
      data: { chatId: 'chat_1' }
    },
    {
      id: '3',
      type: 'hot_spot',
      title: 'Hoạt động tại Hot Spot',
      message: 'charlie_brown đã check-in tại Quán Cafe Central và 5 người khác',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isRead: false,
      senderName: 'charlie_brown',
      senderAvatar: 'https://i.pravatar.cc/150?img=3',
      data: { hotSpotId: 'hotspot_1' }
    },
    {
      id: '4',
      type: 'event_pass',
      title: 'Event Pass mới',
      message: 'Bạn đã nhận được huy hiệu "Khám phá thành phố" từ sự kiện cuối tuần',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      data: { eventPassId: 'pass_1' }
    },
    {
      id: '5',
      type: 'call',
      title: 'Cuộc gọi nhỡ',
      message: 'diana_lee đã gọi cho bạn lúc 14:30',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      senderName: 'diana_lee',
      senderAvatar: 'https://i.pravatar.cc/150?img=4',
      data: { callId: 'call_1' }
    },
    {
      id: '6',
      type: 'system',
      title: 'Cập nhật ứng dụng',
      message: 'Phiên bản mới của ChappAt đã có sẵn với nhiều tính năng thú vị',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      data: { updateVersion: '2.1.0' }
    }
  ];

  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
      setupRealtimeListener();
    }
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  // Setup real-time listener for notifications
  const setupRealtimeListener = () => {
    if (!user?.uid) return;

    try {
      const notificationsRef = collection(db, 'notifications');
      
      // Try with ordering first, fall back to simple query if index not ready
      let q;
      try {
        // This will fail if the composite index isn't built yet
        q = query(
          notificationsRef,
          where('receiverId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
      } catch (indexError) {
        console.log('📝 Using fallback query (index not ready)');
        // Fallback to simple query without ordering
        q = query(
          notificationsRef,
          where('receiverId', '==', user.uid)
        );
      }

      const unsubscribeListener = onSnapshot(q, (snapshot) => {
        const notificationsList: Notification[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          notificationsList.push({
            id: doc.id,
            type: data.type || 'system',
            title: data.title || 'Thông báo mới',
            message: data.message || data.body || '',
            timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
            isRead: data.isRead || false,
            data: data.data || {},
            senderAvatar: data.senderAvatar,
            senderName: data.senderName,
            senderId: data.senderId,
            receiverId: data.receiverId
          });
        });

        // Always sort client-side by timestamp (newest first) for consistency
        notificationsList.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });

        setNotifications(notificationsList);
        setLoading(false);
        console.log(`📬 Loaded ${notificationsList.length} notifications (real-time)`);
      }, (error) => {
        console.error('❌ Error listening to notifications:', error);
        
        // If the error is about missing index, try simpler query
        if (error.message && error.message.includes('index')) {
          console.log('🔄 Retrying with simple query...');
          
          // Retry with simple query
          const simpleQ = query(
            notificationsRef,
            where('receiverId', '==', user.uid)
          );
          
          const retryListener = onSnapshot(simpleQ, (retrySnapshot) => {
            const retryNotificationsList: Notification[] = [];
            
            retrySnapshot.forEach((doc) => {
              const data = doc.data();
              retryNotificationsList.push({
                id: doc.id,
                type: data.type || 'system',
                title: data.title || 'Thông báo mới',
                message: data.message || data.body || '',
                timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                isRead: data.isRead || false,
                data: data.data || {},
                senderAvatar: data.senderAvatar,
                senderName: data.senderName,
                senderId: data.senderId,
                receiverId: data.receiverId
              });
            });

            // Client-side sorting
            retryNotificationsList.sort((a, b) => {
              const dateA = new Date(a.timestamp);
              const dateB = new Date(b.timestamp);
              return dateB.getTime() - dateA.getTime();
            });

            setNotifications(retryNotificationsList);
            setLoading(false);
            console.log(`📬 Loaded ${retryNotificationsList.length} notifications (fallback)`);
          }, (retryError) => {
            console.error('❌ Fallback query also failed:', retryError);
            // Final fallback to mock data
            setNotifications(mockNotifications);
            setLoading(false);
          });
          
          setUnsubscribe(() => retryListener);
        } else {
          // Fallback to mock data for other errors
          setNotifications(mockNotifications);
          setLoading(false);
        }
      });

      setUnsubscribe(() => unsubscribeListener);
    } catch (error) {
      console.error('❌ Error setting up notifications listener:', error);
      setNotifications(mockNotifications);
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!user?.uid) {
      setNotifications(mockNotifications);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const notificationsRef = collection(db, 'notifications');
      
      // Try with ordering first, fall back to simple query if index not ready
      let q;
      try {
        q = query(
          notificationsRef,
          where('receiverId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
      } catch (indexError) {
        console.log('📝 Using fallback query for initial load');
        q = query(
          notificationsRef,
          where('receiverId', '==', user.uid)
        );
      }

      try {
        const snapshot = await getDocs(q);
        const notificationsList: Notification[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          notificationsList.push({
            id: doc.id,
            type: data.type || 'system',
            title: data.title || 'Thông báo mới',
            message: data.message || data.body || '',
            timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
            isRead: data.isRead || false,
            data: data.data || {},
            senderAvatar: data.senderAvatar,
            senderName: data.senderName,
            senderId: data.senderId,
            receiverId: data.receiverId
          });
        });

        // Sort client-side by timestamp (newest first)
        notificationsList.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });

        setNotifications(notificationsList);
        console.log(`📬 Loaded ${notificationsList.length} notifications from Firestore`);
      } catch (queryError) {
        console.error('❌ Query error:', queryError);
        
        // If it's an index error, try simple query
        if (queryError instanceof Error && queryError.message.includes('index')) {
          console.log('🔄 Retrying with simple query for initial load...');
          
          const simpleQ = query(
            notificationsRef,
            where('receiverId', '==', user.uid)
          );
          
          const retrySnapshot = await getDocs(simpleQ);
          const retryNotificationsList: Notification[] = [];
          
          retrySnapshot.forEach((doc) => {
            const data = doc.data();
            retryNotificationsList.push({
              id: doc.id,
              type: data.type || 'system',
              title: data.title || 'Thông báo mới',
              message: data.message || data.body || '',
              timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
              isRead: data.isRead || false,
              data: data.data || {},
              senderAvatar: data.senderAvatar,
              senderName: data.senderName,
              senderId: data.senderId,
              receiverId: data.receiverId
            });
          });

          // Client-side sorting
          retryNotificationsList.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return dateB.getTime() - dateA.getTime();
          });

          setNotifications(retryNotificationsList);
          console.log(`📬 Loaded ${retryNotificationsList.length} notifications (fallback query)`);
        } else {
          throw queryError; // Re-throw non-index errors
        }
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      // Final fallback to mock data
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update in Firestore
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date()
      });

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      // Still update local state as fallback
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user?.uid) return;

      // Get all unread notifications
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      // Update each notification in Firestore
      const updatePromises = unreadNotifications.map(notif => {
        const notificationRef = doc(db, 'notifications', notif.id);
        return updateDoc(notificationRef, {
          isRead: true,
          readAt: new Date()
        });
      });

      await Promise.all(updatePromises);

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );

      Alert.alert('Thành công', `Đã đánh dấu ${unreadNotifications.length} thông báo là đã đọc`);
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      // Still update local state as fallback
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      Alert.alert('Lỗi', 'Không thể đánh dấu tất cả thông báo. Vui lòng thử lại.');
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    console.log('🧭 Notification pressed:', notification);
    
    // Use navigation service for proper routing
    const navigationData = {
      type: notification.type,
      postId: notification.data?.postId,
      userId: notification.senderId || notification.data?.userId,
      chatId: notification.data?.chatId,
      groupId: notification.data?.groupId,
      hotSpotId: notification.data?.hotSpotId,
      hashtag: notification.data?.hashtag,
      senderId: notification.senderId,
      title: notification.title || '',
      body: notification.message || '',
    };

    console.log('🧭 Navigation data prepared:', navigationData);
    
    try {
      // Try notification service first
      NotificationNavigationService.handleNotificationTap(navigationData);
      console.log('✅ Navigation triggered successfully');
    } catch (error) {
      console.error('❌ Navigation service failed:', error);
      
      // Fallback: try direct router navigation
      try {
        console.log('🔄 Trying direct router navigation...');
        
        if (navigationData.type === 'like' || navigationData.type === 'comment') {
          if (navigationData.postId) {
            router.push(`/PostDetailScreen?postId=${navigationData.postId}` as any);
            console.log('✅ Direct post navigation successful');
            return;
          }
        } else if (navigationData.type === 'follow') {
          if (navigationData.userId) {
            router.push(`/UserProfileScreen?userId=${navigationData.userId}` as any);
            console.log('✅ Direct profile navigation successful');
            return;
          }
        }
        
        // If no specific navigation worked, show alert
        Alert.alert(
          'Debug Info',
          `Navigation data: ${JSON.stringify(navigationData)}`,
          [{ text: 'OK' }]
        );
        
      } catch (directError) {
        console.error('❌ Direct navigation also failed:', directError);
        Alert.alert(
          'Lỗi Navigation',
          'Không thể mở nội dung này. Vui lòng thử lại.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message': return '#3B82F6';
      case 'hot_spot': return '#F59E0B';
      case 'event_pass': return '#8B5CF6';
      case 'friend_request': return '#10B981';
      case 'call': return '#EF4444';
      case 'system': return '#6B7280';
      case 'like': return '#E91E63';
      case 'comment': return '#FF9800';
      case 'follow': return '#4CAF50';
      case 'mention': return '#9C27B0';
      case 'accepted_invite': return '#22C55E';
      default: return '#6366F1';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return 'message';
      case 'hot_spot': return 'place';
      case 'event_pass': return 'military-tech';
      case 'friend_request': return 'person-add';
      case 'call': return 'call';
      case 'system': return 'settings';
      case 'like': return 'favorite'; // Heart icon for likes
      case 'comment': return 'comment'; // Comment icon
      case 'follow': return 'person-add'; // Person add for follows
      case 'mention': return 'alternate-email'; // @ symbol for mentions
      default: return 'notifications';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    const passUnread = filter === 'all' ? true : !notif.isRead;
    const passCategory = category === 'all' ? true : notif.type === category;
    return passUnread && passCategory;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleAction = (notification: Notification, action: string) => {
    // Mark as read when user interacts
    markAsRead(notification.id);
    
    switch (action) {
      case 'accept':
        Alert.alert('Chấp nhận', `Bạn đã chấp nhận lời mời kết bạn từ ${notification.senderName}`);
        break;
      case 'decline':
        Alert.alert('Từ chối', `Bạn đã từ chối lời mời từ ${notification.senderName}`);
        break;
      case 'reply':
        if (notification.data?.chatId) {
          router.push(`/chat/${notification.data.chatId}`);
        } else {
          Alert.alert('Trả lời', `Mở chat với ${notification.senderName}`);
        }
        break;
      case 'view_post':
        if (notification.data?.postId) {
          Alert.alert('Xem bài viết', `Mở bài viết ${notification.data.postId}`);
          // router.push(`/post/${notification.data.postId}`);
        }
        break;
      case 'like_back':
        Alert.alert('❤️', `Bạn đã like lại bài viết của ${notification.senderName}`);
        break;
      case 'reply_comment':
        if (notification.data?.postId) {
          Alert.alert('Trả lời comment', `Mở bài viết để trả lời comment từ ${notification.senderName}`);
        }
        break;
      case 'follow_back':
        Alert.alert('Theo dõi lại', `Bạn đã theo dõi lại ${notification.senderName}`);
        break;
      case 'view_profile':
        if (notification.senderId) {
          Alert.alert('Xem profile', `Mở profile của ${notification.senderName}`);
          // router.push(`/profile/${notification.senderId}`);
        }
        break;
      case 'join':
        Alert.alert('Tham gia', `Bạn đã tham gia Hot Spot`);
        break;
      case 'view':
        Alert.alert('Xem', `Xem chi tiết Hot Spot`);
        break;
      default:
        break;
    }
  };

  // Instagram-style UI styles with theme support
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentThemeColors.background,
    },

    // Header - Instagram style
    header: {
      backgroundColor: currentThemeColors.background,
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight! + 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: currentThemeColors.border,
    },

    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    backButton: {
      marginRight: 16,
      padding: 8,
    },

    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: currentThemeColors.text,
    },

    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },

    // Filter Section - Instagram style
    filterContainer: {
      backgroundColor: currentThemeColors.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: currentThemeColors.border,
    },

    filterTabs: {
      flexDirection: 'row',
      marginBottom: 12,
    },

    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: currentThemeColors.surface,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },

    filterTabActive: {
      backgroundColor: currentThemeColors.tint,
      borderColor: currentThemeColors.tint,
    },

    filterTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: currentThemeColors.text,
    },

    filterTabTextActive: {
      color: 'white',
    },

    // Categories - Instagram story-like chips
    categoriesContainer: {
      flexDirection: 'row',
      gap: 8,
    },

    categoryChip: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: currentThemeColors.surface,
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },

    categoryChipActive: {
      backgroundColor: currentThemeColors.tint,
      borderColor: currentThemeColors.tint,
    },

    // Notification List
    notificationsList: {
      flex: 1,
    },

    // Notification Item - Instagram style
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: currentThemeColors.background,
      borderBottomWidth: 0.5,
      borderBottomColor: currentThemeColors.border,
    },

    notificationItemUnread: {
      backgroundColor: currentThemeColors.tint + '05',
    },

    // Avatar container
    avatarContainer: {
      marginRight: 12,
      position: 'relative',
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: currentThemeColors.surface,
    },

    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: currentThemeColors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Notification type indicator
    typeIndicator: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: currentThemeColors.background,
    },

    // Content area
    contentArea: {
      flex: 1,
    },

    notificationText: {
      fontSize: 14,
      lineHeight: 18,
      color: currentThemeColors.text,
      marginBottom: 4,
    },

    senderName: {
      fontWeight: '700',
    },

    timestamp: {
      fontSize: 12,
      color: currentThemeColors.mutedText,
      marginBottom: 8,
    },

    // Action buttons - Instagram style
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },

    actionButton: {
      paddingHorizontal: 20,
      paddingVertical: 6,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },

    primaryButton: {
      backgroundColor: currentThemeColors.tint,
    },

    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: currentThemeColors.border,
    },

    primaryButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },

    secondaryButtonText: {
      color: currentThemeColors.text,
      fontSize: 14,
      fontWeight: '600',
    },

    // Unread indicator
    unreadDot: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: currentThemeColors.tint,
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 64,
    },

    emptyIcon: {
      marginBottom: 16,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: currentThemeColors.text,
      marginBottom: 8,
      textAlign: 'center',
    },

    emptySubtitle: {
      fontSize: 16,
      color: currentThemeColors.subtleText,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Loading state
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      fontSize: 16,
      color: currentThemeColors.subtleText,
      marginTop: 16,
      fontWeight: '500',
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      </View>
    );
  }

  // Instagram-style notification renderer
  const renderNotificationItem = ({ item: notification }: { item: Notification }) => {
    const typeIcon = getNotificationIcon(notification.type);
    const typeColor = getNotificationColor(notification.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !notification.isRead && styles.notificationItemUnread
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.95}
      >
        {/* Avatar or Icon */}
        <View style={styles.avatarContainer}>
          {notification.senderAvatar ? (
            <Image
              source={{ uri: notification.senderAvatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons
                name={typeIcon as any}
                size={24}
                color={typeColor}
              />
            </View>
          )}
          
          {/* Type indicator */}
          <View style={[styles.typeIndicator, { backgroundColor: typeColor }]}>
            <MaterialIcons
              name={typeIcon as any}
              size={12}
              color="white"
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          <Text style={styles.notificationText} numberOfLines={3}>
            {notification.senderName && (
              <Text style={styles.senderName}>{notification.senderName} </Text>
            )}
            {notification.message}
          </Text>
          
          <Text style={styles.timestamp}>
            {formatTimestamp(notification.timestamp)}
          </Text>

          {/* Action Buttons */}
          {renderActionButtons(notification)}
        </View>

        {/* Unread indicator */}
        {!notification.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Action buttons renderer
  const renderActionButtons = (notification: Notification) => {
    switch (notification.type) {
      case 'friend_request':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleAction(notification, 'accept')}
            >
              <Text style={styles.primaryButtonText}>Chấp nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => handleAction(notification, 'decline')}
            >
              <Text style={styles.secondaryButtonText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'message':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleAction(notification, 'reply')}
            >
              <Text style={styles.primaryButtonText}>Trả lời</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'like':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleAction(notification, 'view_post')}
            >
              <Text style={styles.primaryButtonText}>Xem bài viết</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => handleAction(notification, 'like_back')}
            >
              <Text style={styles.secondaryButtonText}>❤️</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'comment':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleAction(notification, 'reply_comment')}
            >
              <Text style={styles.primaryButtonText}>Trả lời</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => handleAction(notification, 'view_post')}
            >
              <Text style={styles.secondaryButtonText}>Xem</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'follow':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleAction(notification, 'follow_back')}
            >
              <Text style={styles.primaryButtonText}>Theo dõi lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => handleAction(notification, 'view_profile')}
            >
              <Text style={styles.secondaryButtonText}>Xem</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'hot_spot':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleAction(notification, 'join')}
            >
              <Text style={styles.primaryButtonText}>Tham gia</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => handleAction(notification, 'view')}
            >
              <Text style={styles.secondaryButtonText}>Xem</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={theme === 'dark' ? "light-content" : "dark-content"} 
        backgroundColor={currentThemeColors.background} 
      />

      {/* Instagram-style Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={currentThemeColors.text} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thông báo</Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={markAllAsRead}>
              <Ionicons 
                name="checkmark-done" 
                size={24} 
                color={currentThemeColors.text} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filter and Category Section */}
      <View style={styles.filterContainer}>
        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[
              styles.filterTab,
              filter === 'all' && styles.filterTabActive
            ]}
          >
            <Text style={[
              styles.filterTabText,
              filter === 'all' && styles.filterTabTextActive
            ]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilter('unread')}
            style={[
              styles.filterTab,
              filter === 'unread' && styles.filterTabActive
            ]}
          >
            <Text style={[
              styles.filterTabText,
              filter === 'unread' && styles.filterTabTextActive
            ]}>
              Chưa đọc ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Chips */}
        <View style={styles.categoriesContainer}>
          {[ 
            { key: 'all', icon: 'apps', color: currentThemeColors.tint },
            { key: 'like', icon: 'favorite', color: '#E91E63' },
            { key: 'comment', icon: 'comment', color: '#FF9800' },
            { key: 'follow', icon: 'person-add', color: '#4CAF50' },
            { key: 'message', icon: 'message', color: Colors.info },
            { key: 'hot_spot', icon: 'place', color: Colors.warning },
            { key: 'accepted_invite', icon: 'how-to-reg', color: '#22C55E' },
            { key: 'call', icon: 'call', color: Colors.error },
            { key: 'system', icon: 'settings', color: Colors.gray500 }
          ].map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setCategory(cat.key as CategoryKey)}
              style={[
                styles.categoryChip,
                category === cat.key && styles.categoryChipActive
              ]}
            >
              <MaterialIcons
                name={cat.icon as any}
                size={20}
                color={category === cat.key ? 'white' : cat.color}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={currentThemeColors.tint}
            colors={[currentThemeColors.tint]}
          />
        }
        style={styles.notificationsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="notifications-off-outline" 
              size={64} 
              color={currentThemeColors.mutedText}
              style={styles.emptyIcon} 
            />
            <Text style={styles.emptyTitle}>
              {filter === 'unread' ? 'Bạn đã đọc hết!' : 'Chưa có thông báo'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread' 
                ? 'Tất cả thông báo đã được đánh dấu là đã đọc' 
                : 'Khi có thông báo mới, chúng sẽ xuất hiện ở đây'
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default NotificationsScreen;