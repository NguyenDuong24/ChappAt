import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useContext, useCallback, memo, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
    doc,
    collection,
    query,
    where,
    onSnapshot,
    getDocs,
    getDoc,
    limit,
    orderBy,
    startAfter,
    DocumentSnapshot
} from 'firebase/firestore';
import ChatItem from './ChatItem';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Constants
const ITEM_HEIGHT = 72;
const INITIAL_LOAD_LIMIT = 30;
const PAGINATION_LIMIT = 20;

// Memoized ChatItem
const MemoizedChatItem = memo(ChatItem, (prevProps, nextProps) => {
    return (
        prevProps.item?.id === nextProps.item?.id &&
        prevProps.lastMessage?.text === nextProps.lastMessage?.text &&
        prevProps.lastMessage?.createdAt?.seconds === nextProps.lastMessage?.createdAt?.seconds &&
        prevProps.unreadCount === nextProps.unreadCount &&
        prevProps.noBorder === nextProps.noBorder
    );
});

// Empty State Component
const EmptyState = memo(({ currentThemeColors }: { currentThemeColors: any }) => (
    <View style={styles.emptyContainer}>
        <View style={[styles.emptyCard, { backgroundColor: currentThemeColors.surface }]}>
            <MaterialCommunityIcons name="chat-outline" size={64} color="#cbd5e1" />
            <Text style={[styles.emptyTitle, { color: currentThemeColors.text }]}>
                Chưa có cuộc trò chuyện nào
            </Text>
            <Text style={[styles.emptySubtitle, { color: currentThemeColors.subtleText }]}>
                Hãy bắt đầu trò chuyện với bạn bè của bạn!
            </Text>
        </View>
    </View>
));

// Footer Component
const ListFooter = memo(({ loading, currentThemeColors }: { loading: boolean; currentThemeColors: any }) => {
    if (!loading) return null;
    return (
        <View style={styles.footer}>
            <ActivityIndicator size="small" color={currentThemeColors.primary} />
        </View>
    );
});

const isValidChat = (chat: any): boolean => {
    if (chat.chatType === 'hotspot') {
        if (!chat.lastMessage) return false;
        const hasText = chat.lastMessage.text?.trim().length > 0;
        const hasTime = chat.lastMessage.lastMessageTime;
        return hasText || hasTime;
    }

    if (!chat.lastMessage) return false;
    const hasText = chat.lastMessage.text?.trim().length > 0;
    const hasCreatedAt = chat.lastMessage.createdAt;
    return hasText && hasCreatedAt;
};

const ChatList = ({ currenUser, onRefresh }: { currenUser: any, onRefresh?: () => void }) => {
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const currentThemeColors = useMemo(() =>
        theme === 'dark' ? Colors.dark : Colors.light,
        [theme]
    );

    const [sortedChats, setSortedChats] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const isFocused = useIsFocused();

    const isMountedRef = useRef(true);
    const lastRoomDocRef = useRef<DocumentSnapshot | null>(null);
    const lastHotspotDocRef = useRef<DocumentSnapshot | null>(null);
    const realtimeRoomIdsRef = useRef<Set<string>>(new Set());
    const realtimeHotspotIdsRef = useRef<Set<string>>(new Set());
    const unsubscribesRef = useRef<(() => void)[]>([]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            unsubscribesRef.current.forEach(unsub => unsub());
        };
    }, []);

    // Initial load - Get first 30 rooms with realtime
    const loadInitialChats = useCallback(async () => {
        if (!currenUser?.uid) return;

        try {
            // Clear previous realtime listeners
            unsubscribesRef.current.forEach(unsub => unsub());
            unsubscribesRef.current = [];
            realtimeRoomIdsRef.current.clear();
            realtimeHotspotIdsRef.current.clear();

            // Load regular rooms
            const roomsQuery = query(
                collection(db, 'rooms'),
                where('participants', 'array-contains', currenUser.uid),
                orderBy('updatedAt', 'desc'),
                limit(INITIAL_LOAD_LIMIT)
            );

            const roomsSnapshot = await getDocs(roomsQuery);
            lastRoomDocRef.current = roomsSnapshot.docs[roomsSnapshot.docs.length - 1] || null;

            // Process rooms and embed user info
            const roomChats = await Promise.all(
                roomsSnapshot.docs.map(async (roomDoc) => {
                    const roomData = roomDoc.data();
                    const otherUserId = roomData.participants?.find((uid: string) => uid !== currenUser.uid);
                    if (!otherUserId) return null;

                    // Embed user info directly in room (nếu có)
                    let userData = roomData.participantsData?.[otherUserId] || { id: otherUserId, username: 'Unknown', profileUrl: null };

                    // Fallback: fetch if not embedded
                    if (userData.username === 'Unknown') {
                        try {
                            const userSnap = await getDoc(doc(db, 'users', otherUserId));
                            if (userSnap.exists()) {
                                userData = { id: otherUserId, ...userSnap.data() };
                            }
                        } catch (e) {
                            console.warn('Error fetching user:', e);
                        }
                    }

                    realtimeRoomIdsRef.current.add(roomDoc.id);

                    return {
                        id: roomDoc.id,
                        chatRoomId: roomDoc.id,
                        chatType: 'regular',
                        user: userData,
                        lastMessage: roomData.lastMessage,
                        unreadCount: roomData.unreadCounts?.[currenUser.uid] || 0,
                        updatedAt: roomData.updatedAt
                    };
                })
            );

            // Load hotspot chats
            const hotSpotsQuery = query(
                collection(db, 'hotSpotChats'),
                where('participants', 'array-contains', currenUser.uid),
                orderBy('lastMessageTime', 'desc'),
                limit(INITIAL_LOAD_LIMIT)
            );

            const hotSpotsSnapshot = await getDocs(hotSpotsQuery);
            lastHotspotDocRef.current = hotSpotsSnapshot.docs[hotSpotsSnapshot.docs.length - 1] || null;

            const hotspotChats = await Promise.all(
                hotSpotsSnapshot.docs.map(async (chatDoc) => {
                    const chatData = chatDoc.data();

                    // Check expiration
                    if (chatData.endTime) {
                        const endTime = chatData.endTime.seconds
                            ? new Date(chatData.endTime.seconds * 1000)
                            : new Date(chatData.endTime);
                        if (endTime < new Date()) return null;
                    }

                    const otherUserId = chatData.participants?.find((id: string) => id !== currenUser.uid);
                    if (!otherUserId) return null;

                    let userData = chatData.participantsData?.[otherUserId] || { id: otherUserId, username: 'Unknown' };

                    if (userData.username === 'Unknown') {
                        try {
                            const userSnap = await getDoc(doc(db, 'users', otherUserId));
                            if (userSnap.exists()) {
                                userData = { id: otherUserId, ...userSnap.data() };
                            }
                        } catch (e) { }
                    }

                    realtimeHotspotIdsRef.current.add(chatDoc.id);

                    return {
                        id: `hotspot_${chatDoc.id}`,
                        chatRoomId: chatDoc.id,
                        chatType: 'hotspot',
                        hotSpotId: chatData.eventId,
                        user: userData,
                        lastMessage: {
                            text: chatData.lastMessage || '',
                            lastMessageTime: chatData.lastMessageTime,
                        },
                        unreadCount: 0,
                        updatedAt: chatData.lastMessageTime,
                        endTime: chatData.endTime
                    };
                })
            );

            // Combine and filter
            const allChats = [...roomChats, ...hotspotChats].filter(c => c !== null && isValidChat(c));

            // Sort by time
            allChats.sort((a, b) => {
                const timeA = a.lastMessage?.createdAt?.seconds || a.updatedAt?.seconds || 0;
                const timeB = b.lastMessage?.createdAt?.seconds || b.updatedAt?.seconds || 0;
                return timeB - timeA;
            });

            setSortedChats(allChats);
            setHasMore(roomsSnapshot.docs.length === INITIAL_LOAD_LIMIT || hotSpotsSnapshot.docs.length === INITIAL_LOAD_LIMIT);

            // Setup realtime for first 30 rooms
            setupRealtimeListeners();

        } catch (error) {
            console.error('Error loading initial chats:', error);
        }
    }, [currenUser?.uid]);

    // Setup realtime listeners for tracked rooms only
    const setupRealtimeListeners = useCallback(() => {
        if (realtimeRoomIdsRef.current.size === 0 && realtimeHotspotIdsRef.current.size === 0) return;

        // Realtime for regular rooms (max 30)
        if (realtimeRoomIdsRef.current.size > 0) {
            const roomIds = Array.from(realtimeRoomIdsRef.current);

            // Firestore 'in' query has limit of 10, so batch them
            for (let i = 0; i < roomIds.length; i += 10) {
                const batchIds = roomIds.slice(i, i + 10);
                const roomsQuery = query(
                    collection(db, 'rooms'),
                    where('__name__', 'in', batchIds)
                );

                const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
                    if (!isMountedRef.current) return;

                    setSortedChats(prev => {
                        const updated = [...prev];
                        snapshot.docChanges().forEach(change => {
                            const roomData = change.doc.data();
                            const idx = updated.findIndex(c => c.chatRoomId === change.doc.id && c.chatType === 'regular');

                            if (change.type === 'modified' && idx !== -1) {
                                updated[idx] = {
                                    ...updated[idx],
                                    lastMessage: roomData.lastMessage,
                                    unreadCount: roomData.unreadCounts?.[currenUser.uid] || 0,
                                    updatedAt: roomData.updatedAt
                                };
                            }
                        });

                        // Re-sort
                        updated.sort((a, b) => {
                            const timeA = a.lastMessage?.createdAt?.seconds || a.updatedAt?.seconds || 0;
                            const timeB = b.lastMessage?.createdAt?.seconds || b.updatedAt?.seconds || 0;
                            return timeB - timeA;
                        });

                        return updated;
                    });
                });

                unsubscribesRef.current.push(unsubscribe);
            }
        }

        // Realtime for hotspot chats
        if (realtimeHotspotIdsRef.current.size > 0) {
            const hotspotIds = Array.from(realtimeHotspotIdsRef.current);

            for (let i = 0; i < hotspotIds.length; i += 10) {
                const batchIds = hotspotIds.slice(i, i + 10);
                const hotspotQuery = query(
                    collection(db, 'hotSpotChats'),
                    where('__name__', 'in', batchIds)
                );

                const unsubscribe = onSnapshot(hotspotQuery, (snapshot) => {
                    if (!isMountedRef.current) return;

                    setSortedChats(prev => {
                        const updated = [...prev];
                        snapshot.docChanges().forEach(change => {
                            const chatData = change.doc.data();
                            const idx = updated.findIndex(c => c.chatRoomId === change.doc.id && c.chatType === 'hotspot');

                            if (change.type === 'modified' && idx !== -1) {
                                updated[idx] = {
                                    ...updated[idx],
                                    lastMessage: {
                                        text: chatData.lastMessage || '',
                                        lastMessageTime: chatData.lastMessageTime,
                                    },
                                    updatedAt: chatData.lastMessageTime
                                };
                            }
                        });

                        updated.sort((a, b) => {
                            const timeA = a.lastMessage?.createdAt?.seconds || a.updatedAt?.seconds || 0;
                            const timeB = b.lastMessage?.createdAt?.seconds || b.updatedAt?.seconds || 0;
                            return timeB - timeA;
                        });

                        return updated;
                    });
                });

                unsubscribesRef.current.push(unsubscribe);
            }
        }
    }, [currenUser?.uid]);

    // Load more (pagination) - NO realtime for these
    const loadMoreChats = useCallback(async () => {
        if (loadingMore || !hasMore || !currenUser?.uid) return;

        setLoadingMore(true);
        try {
            const moreChats: any[] = [];

            // Load more regular rooms
            if (lastRoomDocRef.current) {
                const roomsQuery = query(
                    collection(db, 'rooms'),
                    where('participants', 'array-contains', currenUser.uid),
                    orderBy('updatedAt', 'desc'),
                    startAfter(lastRoomDocRef.current),
                    limit(PAGINATION_LIMIT)
                );

                const roomsSnapshot = await getDocs(roomsQuery);
                if (roomsSnapshot.docs.length > 0) {
                    lastRoomDocRef.current = roomsSnapshot.docs[roomsSnapshot.docs.length - 1];
                } else {
                    lastRoomDocRef.current = null;
                }

                const roomChats = await Promise.all(
                    roomsSnapshot.docs.map(async (roomDoc) => {
                        const roomData = roomDoc.data();
                        const otherUserId = roomData.participants?.find((uid: string) => uid !== currenUser.uid);
                        if (!otherUserId) return null;

                        let userData = roomData.participantsData?.[otherUserId] || { id: otherUserId, username: 'Unknown', profileUrl: null };

                        if (userData.username === 'Unknown') {
                            try {
                                const userSnap = await getDoc(doc(db, 'users', otherUserId));
                                if (userSnap.exists()) {
                                    userData = { id: otherUserId, ...userSnap.data() };
                                }
                            } catch (e) { }
                        }

                        return {
                            id: roomDoc.id,
                            chatRoomId: roomDoc.id,
                            chatType: 'regular',
                            user: userData,
                            lastMessage: roomData.lastMessage,
                            unreadCount: roomData.unreadCounts?.[currenUser.uid] || 0,
                            updatedAt: roomData.updatedAt
                        };
                    })
                );
                moreChats.push(...roomChats.filter(c => c !== null));
            }

            // Load more hotspot chats
            if (lastHotspotDocRef.current) {
                const hotSpotsQuery = query(
                    collection(db, 'hotSpotChats'),
                    where('participants', 'array-contains', currenUser.uid),
                    orderBy('lastMessageTime', 'desc'),
                    startAfter(lastHotspotDocRef.current),
                    limit(PAGINATION_LIMIT)
                );

                const hotSpotsSnapshot = await getDocs(hotSpotsQuery);
                if (hotSpotsSnapshot.docs.length > 0) {
                    lastHotspotDocRef.current = hotSpotsSnapshot.docs[hotSpotsSnapshot.docs.length - 1];
                } else {
                    lastHotspotDocRef.current = null;
                }

                const hotspotChats = await Promise.all(
                    hotSpotsSnapshot.docs.map(async (chatDoc) => {
                        const chatData = chatDoc.data();

                        if (chatData.endTime) {
                            const endTime = chatData.endTime.seconds
                                ? new Date(chatData.endTime.seconds * 1000)
                                : new Date(chatData.endTime);
                            if (endTime < new Date()) return null;
                        }

                        const otherUserId = chatData.participants?.find((id: string) => id !== currenUser.uid);
                        if (!otherUserId) return null;

                        let userData = chatData.participantsData?.[otherUserId] || { id: otherUserId, username: 'Unknown' };

                        if (userData.username === 'Unknown') {
                            try {
                                const userSnap = await getDoc(doc(db, 'users', otherUserId));
                                if (userSnap.exists()) {
                                    userData = { id: otherUserId, ...userSnap.data() };
                                }
                            } catch (e) { }
                        }

                        return {
                            id: `hotspot_${chatDoc.id}`,
                            chatRoomId: chatDoc.id,
                            chatType: 'hotspot',
                            hotSpotId: chatData.eventId,
                            user: userData,
                            lastMessage: {
                                text: chatData.lastMessage || '',
                                lastMessageTime: chatData.lastMessageTime,
                            },
                            unreadCount: 0,
                            updatedAt: chatData.lastMessageTime,
                            endTime: chatData.endTime
                        };
                    })
                );
                moreChats.push(...hotspotChats.filter(c => c !== null));
            }

            const validChats = moreChats.filter(isValidChat);

            if (validChats.length === 0) {
                setHasMore(false);
            } else {
                setSortedChats(prev => {
                    const combined = [...prev, ...validChats];
                    combined.sort((a, b) => {
                        const timeA = a.lastMessage?.createdAt?.seconds || a.updatedAt?.seconds || 0;
                        const timeB = b.lastMessage?.createdAt?.seconds || b.updatedAt?.seconds || 0;
                        return timeB - timeA;
                    });
                    return combined;
                });
            }
        } catch (error) {
            console.error('Error loading more chats:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, currenUser?.uid]);

    // Initial load on mount
    useEffect(() => {
        loadInitialChats();
    }, [loadInitialChats]);

    const handleRefresh = useCallback(async () => {
        if (onRefresh) {
            setRefreshing(true);
            await onRefresh();
        }
        lastRoomDocRef.current = null;
        lastHotspotDocRef.current = null;
        setHasMore(true);
        await loadInitialChats();
        setRefreshing(false);
    }, [onRefresh, loadInitialChats]);

    const keyExtractor = useCallback((item: any) => item.id, []);

    const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
        <MemoizedChatItem
            item={item.user}
            currenUser={currenUser}
            noBorder={index === sortedChats.length - 1}
            chatType={item.chatType}
            chatRoomId={item.chatRoomId}
            hotSpotId={item.hotSpotId}
            lastMessage={item.lastMessage}
            unreadCount={item.unreadCount}
        />
    ), [currenUser, sortedChats.length]);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    const refreshControl = useMemo(() => (
        <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#667eea"
            colors={['#667eea']}
        />
    ), [refreshing, handleRefresh]);

    const contentContainerStyle = useMemo(() => [
        styles.listContainer,
        { backgroundColor: currentThemeColors.background }
    ], [currentThemeColors.background]);

    if (sortedChats.length === 0 && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
                <EmptyState currentThemeColors={currentThemeColors} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            <FlatList
                data={sortedChats}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={contentContainerStyle}
                refreshControl={refreshControl}
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={4}
                windowSize={7}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={100}
                getItemLayout={getItemLayout}
                scrollEventThrottle={16}
                onEndReached={loadMoreChats}
                onEndReachedThreshold={0.3}
                ListFooterComponent={<ListFooter loading={loadingMore} currentThemeColors={currentThemeColors} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        paddingTop: 8,
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyCard: {
        alignItems: 'center',
        padding: 40,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default memo(ChatList);