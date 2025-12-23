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
    Linking,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useNotificationContext } from '@/context/NotificationProvider';
import NotificationNavigationService from '@/services/core/NotificationNavigationService';
import { db } from '@/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { NotificationActionsService } from '@/services/notificationActions';

const { width, height } = Dimensions.get('window');

interface Notification {
    id: string;
    type: 'message' | 'call' | 'friend_request' | 'hot_spot' | 'event_pass' | 'system' | 'like' | 'comment' | 'follow' | 'mention' | 'accepted_invite';
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
    const { t } = useTranslation();
    const router = useRouter();
    const { user } = useAuth();
    const { expoPushToken } = useNotificationContext();

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

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const filteredNotifications = notifications.filter(n => {
        const matchesFilter = filter === 'all' || !n.isRead;
        const matchesCategory = category === 'all' || n.type === category;
        return matchesFilter && matchesCategory;
    });

    // Mock data - Instagram-style notifications
    const mockNotifications: Notification[] = [
        {
            id: '1',
            type: 'friend_request',
            title: t('notifications.types.friend_request'),
            message: `alice_nguyen ${t('notifications.wants_to_follow', { count: 2 })}`,
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            isRead: false,
            senderName: 'alice_nguyen',
            senderAvatar: 'https://i.pravatar.cc/150?img=1',
            data: { userId: 'user_1' }
        },
        {
            id: '2',
            type: 'message',
            title: t('notifications.types.message'),
            message: `bob_wilson ${t('notifications.sent_you_message')}`,
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            isRead: false,
            senderName: 'bob_wilson',
            senderAvatar: 'https://i.pravatar.cc/150?img=2',
            data: { chatId: 'chat_1' }
        },
        {
            id: '3',
            type: 'hot_spot',
            title: t('notifications.types.hot_spot'),
            message: `charlie_brown ${t('notifications.checked_in_at', { location: 'Quán Cafe Central', count: 5 })}`,
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            isRead: false,
            senderName: 'charlie_brown',
            senderAvatar: 'https://i.pravatar.cc/150?img=3',
            data: { hotSpotId: 'hotspot_1' }
        },
        {
            id: '4',
            type: 'event_pass',
            title: t('notifications.types.event_pass'),
            message: t('notifications.received_badge', { badge: 'Khám phá thành phố' }),
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            isRead: true,
            data: { eventPassId: 'pass_1' }
        },
        {
            id: '5',
            type: 'call',
            title: t('notifications.types.call'),
            message: `diana_lee ${t('notifications.called_you_at', { time: '14:30' })}`,
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            isRead: true,
            senderName: 'diana_lee',
            senderAvatar: 'https://i.pravatar.cc/150?img=4',
            data: { callId: 'call_1' }
        },
        {
            id: '6',
            type: 'system',
            title: t('notifications.types.system'),
            message: t('notifications.new_version_available'),
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
                        title: data.title || t('notifications.new_notification'),
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
                                title: data.title || t('notifications.types.system'),
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
                        title: data.title || t('notifications.new_notification'),
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
                            title: data.title || t('notifications.types.system'),
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

            Alert.alert(t('common.success'), t('notifications.all_read_success'));
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
            // Still update local state as fallback
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, isRead: true }))
            );
            Alert.alert(t('common.error'), t('notifications.all_read_error'));
        }
    };

    const handleAction = async (notification: Notification, action: string) => {
        console.log('🎬 Handle action:', action);

        try {
            switch (action) {
                case 'accept':
                    // Implement accept friend request logic
                    console.log('Accept friend request');
                    break;
                case 'decline':
                    // Implement decline friend request logic
                    console.log('Decline friend request');
                    break;
                case 'reply':
                    if (notification.data?.chatId) {
                        router.push(`/chat/${notification.data.chatId}`);
                    }
                    break;
                case 'view_post':
                case 'reply_comment':
                    if (notification.data?.postId) {
                        router.push({
                            pathname: '/(screens)/social/PostDetailScreen',
                            params: { postId: notification.data.postId }
                        });
                    }
                    break;
                case 'like_back':
                    if (notification.data?.postId && user?.uid && notification.senderId) {
                        const success = await NotificationActionsService.likePost(
                            user.uid,
                            notification.data.postId,
                            notification.senderId
                        );
                        if (success) {
                            Alert.alert('❤️', `${t('common.you')} ${t('notifications.liked_your_post')} ${notification.senderName}`);
                        }
                    }
                    break;
                case 'follow_back':
                    if (notification.senderId && user?.uid) {
                        await NotificationActionsService.followUser(
                            user.uid,
                            notification.senderId,
                            notification.senderName || t('notifications.this_user')
                        );
                    }
                    break;
                case 'view_profile':
                    if (notification.senderId) {
                        router.push({
                            pathname: '/(screens)/user/UserProfileScreen',
                            params: { userId: notification.senderId }
                        });
                    }
                    break;
                case 'join':
                case 'view':
                    if (notification.data?.hotSpotId) {
                        router.push({
                            pathname: '/(screens)/hotspots/HotSpotDetailScreen',
                            params: { hotSpotId: notification.data.hotSpotId }
                        });
                    }
                    break;
                default:
                    console.log('Unknown action:', action);
            }
        } catch (error) {
            console.error('Error handling action:', error);
            Alert.alert(t('common.error'), t('error_generic'));
        }
    };

    const handleNotificationPress = async (notification: Notification) => {
        await markAsRead(notification.id);

        console.log('compass Notification pressed:', notification);

        // Prepare navigation data based on notification type
        const navigationData = {
            type: notification.type,
            postId: notification.data?.postId,
            userId: notification.senderId || notification.data?.userId,
            chatId: notification.data?.chatId,
            groupId: notification.data?.groupId,
            hotSpotId: notification.data?.hotSpotId || notification.data?.hotspotId || notification.data?.id,
            hashtag: notification.data?.hashtag,
            senderId: notification.senderId,
            title: notification.title || '',
            body: notification.message || '',
            url: notification.data?.url,
        };

        console.log('compass Navigation data prepared:', navigationData);

        try {
            // Handle different notification types with proper navigation
            switch (notification.type) {
                case 'like':
                case 'comment':
                case 'mention':
                    // Navigate to post detail
                    if (navigationData.postId) {
                        console.log('compass Navigating to post:', navigationData.postId);
                        router.push({
                            pathname: '/(screens)/social/PostDetailScreen',
                            params: { postId: navigationData.postId }
                        });
                    } else {
                        Alert.alert(t('common.error'), t('social.no_posts'));
                    }
                    break;

                case 'follow':
                    // Navigate to user profile
                    if (navigationData.userId) {
                        console.log('compass Navigating to profile:', navigationData.userId);
                        router.push({
                            pathname: '/(screens)/user/UserProfileScreen',
                            params: { userId: navigationData.userId }
                        });
                    } else {
                        Alert.alert(t('common.error'), t('home.no_users'));
                    }
                    break;

                case 'friend_request':
                    if (navigationData.userId) {
                        router.push({
                            pathname: '/(screens)/user/UserProfileScreen',
                            params: { userId: navigationData.userId }
                        });
                    }
                    break;

                case 'message':
                    if (navigationData.chatId) {
                        router.push(`/chat/${navigationData.chatId}`);
                    }
                    break;

                case 'hot_spot':
                    console.log('🔥 Hotspot notification:', navigationData.hotSpotId);
                    if (navigationData.hotSpotId) {
                        router.push({
                            pathname: '/(screens)/hotspots/HotSpotDetailScreen',
                            params: { hotSpotId: navigationData.hotSpotId }
                        });
                    } else {
                        console.log('⚠️ No hotspot ID found, navigating to list');
                        router.push('/(screens)/hotspots/HotSpotsScreen');
                    }
                    break;

                case 'call':
                    // Navigate to caller profile
                    if (notification.senderId) {
                        console.log('🧭 Navigating to caller:', notification.senderId);
                        router.push({
                            pathname: '/(screens)/user/UserProfileScreen',
                            params: { userId: notification.senderId }
                        });
                    } else {
                        Alert.alert(t('chat.call'), notification.message);
                    }
                    break;

                case 'event_pass':
                    // Show event pass details
                    console.log('🎫 Event pass:', notification.data?.eventPassId);
                    if (notification.data?.eventPassId) {
                        router.push({
                            pathname: '/(screens)/events/EventPassDetailScreen',
                            params: { eventPassId: notification.data.eventPassId }
                        });
                    } else {
                        Alert.alert(notification.title, notification.message);
                    }
                    break;

                case 'accepted_invite':
                    // Navigate to group or show message
                    if (navigationData.groupId) {
                        console.log('🧭 Navigating to group:', navigationData.groupId);
                        router.push(`/groups/${navigationData.groupId}`);
                    } else if (notification.senderId) {
                        router.push({
                            pathname: '/(screens)/user/UserProfileScreen',
                            params: { userId: notification.senderId }
                        });
                    } else {
                        Alert.alert(notification.title, notification.message);
                    }
                    break;
                case 'system':
                    // Show system notification or open URL if available
                    console.log('📢 System notification');
                    if (navigationData.url) {
                        const supported = await Linking.canOpenURL(navigationData.url);
                        if (supported) {
                            await Linking.openURL(navigationData.url);
                        } else {
                            Alert.alert(notification.title, notification.message + '\n' + navigationData.url);
                        }
                    } else {
                        Alert.alert(notification.title, notification.message);
                    }
                    break;

                default:
                    console.log('⚠️ Unknown notification type:', notification.type);
                    Alert.alert(t('notifications.title'), notification.message);
                    break;
            }
        } catch (error) {
            console.error('❌ Error handling notification:', error);
            Alert.alert(t('common.error'), t('notifications.all_read_error'));
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
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
                        {formatTimestamp(notification.timestamp, t)}
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
                            <Text style={styles.primaryButtonText}>{t('notifications.actions.accept')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryButton]}
                            onPress={() => handleAction(notification, 'decline')}
                        >
                            <Text style={styles.secondaryButtonText}>{t('notifications.actions.decline')}</Text>
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
                            <Text style={styles.primaryButtonText}>{t('notifications.actions.reply')}</Text>
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
                            <Text style={styles.primaryButtonText}>{t('notifications.actions.view_post')}</Text>
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
                            <Text style={styles.primaryButtonText}>{t('notifications.actions.reply')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryButton]}
                            onPress={() => handleAction(notification, 'view_post')}
                        >
                            <Text style={styles.secondaryButtonText}>{t('notifications.actions.view')}</Text>
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
                            <Text style={styles.primaryButtonText}>{t('notifications.actions.follow_back')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryButton]}
                            onPress={() => handleAction(notification, 'view_profile')}
                        >
                            <Text style={styles.secondaryButtonText}>{t('notifications.actions.view')}</Text>
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
                            <Text style={styles.primaryButtonText}>{t('notifications.actions.join')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryButton]}
                            onPress={() => handleAction(notification, 'view')}
                        >
                            <Text style={styles.secondaryButtonText}>{t('notifications.actions.view')}</Text>
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
                        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
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
                            {t('common.all')}
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
                            {t('notifications.unread_count', { count: unreadCount })}
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
                            {filter === 'unread' ? t('notifications.no_unread') : t('notifications.no_notifications')}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'unread'
                                ? t('notifications.all_marked_read')
                                : t('notifications.new_notifications_will_appear')
                            }
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default NotificationsScreen;

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'message': return 'message';
        case 'call': return 'call';
        case 'friend_request': return 'person-add';
        case 'hot_spot': return 'place';
        case 'event_pass': return 'confirmation-number';
        case 'like': return 'favorite';
        case 'comment': return 'comment';
        case 'follow': return 'person';
        case 'mention': return 'alternate-email';
        case 'accepted_invite': return 'check-circle';
        default: return 'notifications';
    }
};

const getNotificationColor = (type: string) => {
    switch (type) {
        case 'message': return Colors.info;
        case 'call': return Colors.error;
        case 'friend_request': return '#4CAF50';
        case 'hot_spot': return Colors.warning;
        case 'event_pass': return '#9C27B0';
        case 'like': return '#E91E63';
        case 'comment': return '#FF9800';
        case 'follow': return '#2196F3';
        case 'mention': return '#00BCD4';
        case 'accepted_invite': return '#4CAF50';
        default: return Colors.gray500;
    }
};

const formatTimestamp = (timestamp: string, t: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return t('common.time.just_now');
    if (diff < 3600000) return t('common.time.minutes_ago', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('common.time.hours_ago', { count: Math.floor(diff / 3600000) });
    if (diff < 604800000) return t('common.time.days_ago', { count: Math.floor(diff / 86400000) });
    return date.toLocaleDateString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US');
};
