import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
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
    DocumentSnapshot,
    updateDoc
} from 'firebase/firestore';
import ChatItem from './ChatItem';
import { db } from '@/firebaseConfig';
import { useRefresh } from '@/context/RefreshContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { roomsService } from '@/services/roomsService';
import ConversationOptionsModal, { ConversationOption } from '@/components/common/ConversationOptionsModal';
import { useTranslation } from 'react-i18next';
import { normalizeDisplayText } from '@/utils/textEncoding';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useRouter } from 'expo-router';

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
        prevProps.noBorder === nextProps.noBorder &&
        prevProps.isPinned === nextProps.isPinned &&
        prevProps.roomType === nextProps.roomType &&
        prevProps.eventId === nextProps.eventId &&
        prevProps.item?.activeFrame === nextProps.item?.activeFrame
    );
});

// Empty State Component (nhận tf thay vì t)
const EmptyState = memo(({ tf, currentThemeColors }: { tf: (key: string, fallback: string) => string; currentThemeColors: any }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 80 }}>
        <Text style={{ fontSize: 16, color: currentThemeColors.text, textAlign: 'center', marginBottom: 10 }}>
            {tf('chat.no_chats', 'Chưa có cuộc trò chuyện nào')}
        </Text>
        <Text style={{ fontSize: 13, textAlign: 'center', color: currentThemeColors.textSecondary, maxWidth: 300 }}>
            {tf('chat.no_chats_desc', 'Bắt đầu kết nối để trò chuyện ngay')}
        </Text>
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
    const hasCreatedAt = chat.lastMessage.createdAt;
    if (!hasCreatedAt) return false;

    const hasText = chat.lastMessage.text?.trim().length > 0;
    const hasImage = !!chat.lastMessage.imageUrl;
    const hasAudio = chat.lastMessage.type === 'audio' || !!chat.lastMessage.audioUrl;
    const hasFile = !!chat.lastMessage.fileUrl;

    return hasText || hasImage || hasAudio || hasFile;
};

const sortChats = (chats: any[], pinnedIds: string[] = []) => {
    return chats.sort((a, b) => {
        const isPinnedA = pinnedIds.includes(a.chatRoomId);
        const isPinnedB = pinnedIds.includes(b.chatRoomId);

        if (isPinnedA !== isPinnedB) {
            return isPinnedA ? -1 : 1;
        }

        const timeA = a?.lastMessage?.createdAt?.seconds || a?.updatedAt?.seconds || 0;
        const timeB = b?.lastMessage?.createdAt?.seconds || b?.updatedAt?.seconds || 0;
        return timeB - timeA;
    });
};

const ChatList = ({ currenUser, onRefresh }: { currenUser: any, onRefresh?: () => void }) => {
    const { t } = useTranslation();
    const router = useRouter();
    const currentThemeColors = useThemedColors();

    // Hàm dịch thông minh với fallback
    const tf = useCallback((key: string, fallback: string) => {
        const translated = t(key);
        return translated !== key ? translated : fallback;
    }, [t]);

    const [sortedChats, setSortedChats] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const isFocused = useIsFocused();

    const isMountedRef = useRef(true);
    const lastRoomDocRef = useRef<DocumentSnapshot | null>(null);
    const lastHotspotDocRef = useRef<DocumentSnapshot | null>(null);
    const realtimeRoomIdsRef = useRef<Set<string>>(new Set());
    const realtimeHotspotIdsRef = useRef<Set<string>>(new Set());
    const unsubscribesRef = useRef<(() => void)[]>([]);
    const liveQueryUnsubsRef = useRef<(() => void)[]>([]);
    const liveReloadTimerRef = useRef<any>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            unsubscribesRef.current.forEach(unsub => unsub());
            liveQueryUnsubsRef.current.forEach(unsub => unsub());
            if (liveReloadTimerRef.current) {
                clearTimeout(liveReloadTimerRef.current);
                liveReloadTimerRef.current = null;
            }
        };
    }, []);

    // Initial load - Get first 30 rooms with realtime
    const loadInitialChats = useCallback(async () => {
        if (!currenUser?.uid) return;

        try {
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

            const roomChats = await Promise.all(
                roomsSnapshot.docs.map(async (roomDoc) => {
                    const roomData = roomDoc.data();
                    const otherUserId = roomData.participants?.find((uid: string) => uid !== currenUser.uid);
                    if (!otherUserId) return null;

                    let userData = roomData.participantsData?.[otherUserId] || { id: otherUserId, username: '', profileUrl: null, activeFrame: null };

                    userData = {
                        id: otherUserId,
                        ...userData,
                        username: userData?.username || userData?.displayName || userData?.name || '',
                    };

                    if (!userData.username || userData.username === 'Unknown') {
                        try {
                            const userSnap = await getDoc(doc(db, 'users', otherUserId));
                            if (userSnap.exists()) {
                                const data = userSnap.data();
                                userData = {
                                    id: otherUserId,
                                    username: data.username || data.displayName || data.name || '',
                                    profileUrl: data.profileUrl,
                                    activeFrame: data.activeFrame
                                };
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
                        updatedAt: roomData.updatedAt,
                        type: roomData.type,
                        eventId: roomData.eventId
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

                    if (chatData.endTime) {
                        const endTime = chatData.endTime.seconds
                            ? new Date(chatData.endTime.seconds * 1000)
                            : new Date(chatData.endTime);
                        if (endTime < new Date()) return null;
                    }

                    const otherUserId = chatData.participants?.find((id: string) => id !== currenUser.uid);
                    if (!otherUserId) return null;

                    let userData = chatData.participantsData?.[otherUserId] || { id: otherUserId, username: '', profileUrl: null, activeFrame: null };

                    userData = {
                        id: otherUserId,
                        ...userData,
                        username: userData?.username || userData?.displayName || userData?.name || '',
                    };

                    if (!userData.username || userData.username === 'Unknown') {
                        try {
                            const userSnap = await getDoc(doc(db, 'users', otherUserId));
                            if (userSnap.exists()) {
                                const data = userSnap.data();
                                userData = {
                                    id: otherUserId,
                                    username: normalizeDisplayText(data.username || data.displayName || data.name || ''),
                                    profileUrl: data.profileUrl,
                                    activeFrame: data.activeFrame
                                };
                            }
                        } catch (e) { }
                    }

                    realtimeHotspotIdsRef.current.add(chatDoc.id);

                    return {
                        id: `hotspot_${chatDoc.id}`,
                        chatRoomId: chatDoc.id,
                        chatType: 'hotspot',
                        hotSpotId: chatData.eventId,
                        hotSpotTitle: chatData.hotSpotTitle || '',
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

            const allChats = [...roomChats, ...hotspotChats].filter(c => c !== null && isValidChat(c));
            sortChats(allChats, currenUser?.pinnedChatIds);

            setSortedChats(allChats);
            setHasMore(roomsSnapshot.docs.length === INITIAL_LOAD_LIMIT || hotSpotsSnapshot.docs.length === INITIAL_LOAD_LIMIT);

            setupRealtimeListeners();

        } catch (error) {
            console.error('Error loading initial chats:', error);
        }
    }, [currenUser?.uid]);

    const setupRealtimeListeners = useCallback(() => {
        if (realtimeRoomIdsRef.current.size === 0 && realtimeHotspotIdsRef.current.size === 0) return;

        if (realtimeRoomIdsRef.current.size > 0) {
            const roomIds = Array.from(realtimeRoomIdsRef.current);
            for (let i = 0; i < roomIds.length; i += 10) {
                const batchIds = roomIds.slice(i, i + 10);
                const roomsQuery = query(collection(db, 'rooms'), where('__name__', 'in', batchIds));
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
                                    updatedAt: roomData.updatedAt,
                                    type: roomData.type,
                                    eventId: roomData.eventId
                                };
                            }
                        });
                        sortChats(updated, currenUser?.pinnedChatIds);
                        return updated;
                    });
                }, (error) => {
                    const errorStr = String(error?.message || error?.code || error);
                    if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                        console.error("Error in rooms realtime query:", error);
                    }
                });
                unsubscribesRef.current.push(unsubscribe);
            }
        }

        if (realtimeHotspotIdsRef.current.size > 0) {
            const hotspotIds = Array.from(realtimeHotspotIdsRef.current);
            for (let i = 0; i < hotspotIds.length; i += 10) {
                const batchIds = hotspotIds.slice(i, i + 10);
                const hotspotQuery = query(collection(db, 'hotSpotChats'), where('__name__', 'in', batchIds));
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
                        sortChats(updated, currenUser?.pinnedChatIds);
                        return updated;
                    });
                }, (error) => {
                    const errorStr = String(error?.message || error?.code || error);
                    if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                        console.error("Error in hotspot realtime query:", error);
                    }
                });
                unsubscribesRef.current.push(unsubscribe);
            }
        }
    }, [currenUser?.uid]);

    const loadMoreChats = useCallback(async () => {
        if (loadingMore || !hasMore || !currenUser?.uid) return;
        setLoadingMore(true);
        try {
            const moreChats: any[] = [];

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

                const roomChats = await Promise.all(roomsSnapshot.docs.map(async (roomDoc) => {
                    const roomData = roomDoc.data();
                    const otherUserId = roomData.participants?.find((uid: string) => uid !== currenUser.uid);
                    if (!otherUserId) return null;

                    let userData = roomData.participantsData?.[otherUserId] || { id: otherUserId, username: 'Unknown', profileUrl: null };
                    if (!userData.username || userData.username === 'Unknown') {
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
                        updatedAt: roomData.updatedAt,
                        type: roomData.type,
                        eventId: roomData.eventId
                    };
                }));
                moreChats.push(...roomChats.filter(c => c !== null));
            }

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

                const hotspotChats = await Promise.all(hotSpotsSnapshot.docs.map(async (chatDoc) => {
                    const chatData = chatDoc.data();
                    if (chatData.endTime) {
                        const endTime = chatData.endTime.seconds ? new Date(chatData.endTime.seconds * 1000) : new Date(chatData.endTime);
                        if (endTime < new Date()) return null;
                    }

                    const otherUserId = chatData.participants?.find((id: string) => id !== currenUser.uid);
                    if (!otherUserId) return null;

                    let userData = chatData.participantsData?.[otherUserId] || { id: otherUserId, username: 'Unknown' };
                    if (!userData.username || userData.username === 'Unknown') {
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
                        hotSpotTitle: chatData.hotSpotTitle || '',
                        user: userData,
                        lastMessage: {
                            text: chatData.lastMessage || '',
                            lastMessageTime: chatData.lastMessageTime,
                        },
                        unreadCount: 0,
                        updatedAt: chatData.lastMessageTime,
                        endTime: chatData.endTime
                    };
                }));
                moreChats.push(...hotspotChats.filter(c => c !== null));
            }

            const validChats = moreChats.filter(isValidChat);
            if (validChats.length === 0) {
                setHasMore(false);
            } else {
                setSortedChats(prev => {
                    const combined = [...prev, ...validChats];
                    sortChats(combined, currenUser?.pinnedChatIds);
                    return combined;
                });
            }
        } catch (error) {
            console.error('Error loading more chats:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, currenUser?.uid]);

    useEffect(() => {
        loadInitialChats();
    }, [loadInitialChats]);

    useEffect(() => {
        if (!currenUser?.uid || !isFocused) return;

        liveQueryUnsubsRef.current.forEach(unsub => unsub());
        liveQueryUnsubsRef.current = [];

        const scheduleReload = () => {
            if (liveReloadTimerRef.current) clearTimeout(liveReloadTimerRef.current);
            liveReloadTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) loadInitialChats();
            }, 250);
        };

        const roomsLiveQuery = query(
            collection(db, 'rooms'),
            where('participants', 'array-contains', currenUser.uid),
            orderBy('updatedAt', 'desc'),
            limit(INITIAL_LOAD_LIMIT)
        );

        const hotspotLiveQuery = query(
            collection(db, 'hotSpotChats'),
            where('participants', 'array-contains', currenUser.uid),
            orderBy('lastMessageTime', 'desc'),
            limit(INITIAL_LOAD_LIMIT)
        );

        const unsubRooms = onSnapshot(roomsLiveQuery, (snapshot) => {
            if (!snapshot.empty && snapshot.docChanges().length > 0) scheduleReload();
        }, (error) => {
            const errorStr = String(error?.message || error?.code || error);
            if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                console.error("Error in rooms live query:", error);
            }
        });

        const unsubHotspots = onSnapshot(hotspotLiveQuery, (snapshot) => {
            if (!snapshot.empty && snapshot.docChanges().length > 0) scheduleReload();
        }, (error) => {
            const errorStr = String(error?.message || error?.code || error);
            if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                console.error("Error in hotspots live query:", error);
            }
        });

        liveQueryUnsubsRef.current.push(unsubRooms, unsubHotspots);

        return () => {
            liveQueryUnsubsRef.current.forEach(unsub => unsub());
            liveQueryUnsubsRef.current = [];
            if (liveReloadTimerRef.current) {
                clearTimeout(liveReloadTimerRef.current);
                liveReloadTimerRef.current = null;
            }
        };
    }, [currenUser?.uid, isFocused, loadInitialChats]);

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

    const { registerRefreshHandler } = useRefresh();
    useEffect(() => {
        if (registerRefreshHandler) {
            registerRefreshHandler('chat', handleRefresh);
        }
    }, [registerRefreshHandler, handleRefresh]);

    useEffect(() => {
        setSortedChats(prev => {
            const newChats = [...prev];
            return sortChats(newChats, currenUser?.pinnedChatIds || []);
        });
    }, [currenUser?.pinnedChatIds]);

    const handleLongPress = useCallback((item: any) => {
        setSelectedChat(item);
        setShowOptionsModal(true);
    }, []);

    const chatOptions = useMemo<ConversationOption[]>(() => {
        if (!selectedChat?.chatRoomId || !currenUser?.uid) return [];

        const isPinned = currenUser?.pinnedChatIds?.includes(selectedChat.chatRoomId);

        return [
            {
                key: 'open',
                label: tf('chat.open_chat', 'Mở trò chuyện'),
                icon: 'message-text-outline',
                onPress: () => {
                    if (selectedChat.chatType === 'hotspot') {
                        router.push({
                            pathname: '/(screens)/hotspots/HotSpotChatScreen',
                            params: {
                                chatRoomId: selectedChat.chatRoomId,
                                hotSpotId: selectedChat.hotSpotId || '',
                                hotSpotTitle: selectedChat.hotSpotTitle || '',
                            },
                        });
                        return;
                    }
                    router.push(`/chat/${selectedChat.user?.id}` as any);
                }
            },
            ...(selectedChat.user?.id ? [{
                key: 'profile',
                label: tf('chat.view_profile', 'Xem hồ sơ'),
                icon: 'account-circle-outline' as const,
                onPress: () => {
                    router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: selectedChat.user.id } });
                }
            }] : []),
            ...(selectedChat.unreadCount > 0 && selectedChat.chatType === 'regular' ? [{
                key: 'mark_read',
                label: tf('chat.mark_read', 'Đánh dấu đã đọc'),
                icon: 'check-all' as const,
                onPress: async () => {
                    await updateDoc(doc(db, 'rooms', selectedChat.chatRoomId), {
                        [`unreadCounts.${currenUser.uid}`]: 0
                    });
                    setSortedChats(prev => prev.map(chat => (
                        chat.chatRoomId === selectedChat.chatRoomId
                            ? { ...chat, unreadCount: 0 }
                            : chat
                    )));
                }
            }] : []),
            {
                key: 'pin',
                label: isPinned ? tf('chat.list_options.unpin', 'Bỏ ghim') : tf('chat.list_options.pin', 'Ghim'),
                icon: isPinned ? 'pin-off-outline' : 'pin-outline',
                onPress: async () => {
                    try {
                        if (isPinned) {
                            await roomsService.unpinChat(currenUser.uid, selectedChat.chatRoomId);
                        } else {
                            await roomsService.pinChat(currenUser.uid, selectedChat.chatRoomId);
                        }
                    } catch (error) {
                        console.error('Failed to pin/unpin chat:', error);
                        Alert.alert(tf('common.error', 'Lỗi'), tf('chat.error_generic', 'Đã xảy ra lỗi'));
                    }
                }
            },
            {
                key: 'delete',
                label: tf('chat.list_options.delete', 'Xóa'),
                icon: 'trash-can-outline',
                variant: 'danger',
                onPress: async () => {
                    try {
                        if (selectedChat.chatType === 'regular') {
                            await roomsService.deleteChat(selectedChat.chatRoomId, currenUser.uid);
                            return;
                        }
                        console.warn('Delete not implemented for this chat type');
                        Alert.alert(tf('common.error', 'Lỗi'), tf('chat.list_options.type_not_supported', 'Loại chat này không hỗ trợ xóa'));
                    } catch (error) {
                        console.error('Failed to delete chat:', error);
                        Alert.alert(tf('common.error', 'Lỗi'), tf('chat.error_generic', 'Đã xảy ra lỗi'));
                    }
                }
            }
        ];
    }, [selectedChat, currenUser?.uid, currenUser?.pinnedChatIds, tf, router]);

    const keyExtractor = useCallback((item: any) => item.id, []);

    const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
        <MemoizedChatItem
            item={item.user}
            currenUser={currenUser}
            noBorder={index === sortedChats.length - 1}
            chatType={item.chatType}
            chatRoomId={item.chatRoomId}
            hotSpotId={item.hotSpotId}
            hotSpotTitle={item.hotSpotTitle}
            lastMessage={item.lastMessage}
            unreadCount={item.unreadCount}
            onLongPress={() => handleLongPress(item)}
            isPinned={currenUser?.pinnedChatIds?.includes(item.chatRoomId)}
            roomType={item.type}
            eventId={item.eventId}
        />
    ), [currenUser, sortedChats.length, handleLongPress]);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    const refreshControl = useMemo(() => (
        <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
        />
    ), [refreshing, handleRefresh]);

    const contentContainerStyle = useMemo(() => [
        styles.listContainer,
        { backgroundColor: 'transparent' }
    ], []);

    const listFooterComponent = useMemo(() => (
        <ListFooter loading={loadingMore} currentThemeColors={currentThemeColors} />
    ), [loadingMore, currentThemeColors]);

    const handleCloseOptionsModal = useCallback(() => {
        setShowOptionsModal(false);
        setSelectedChat(null);
    }, []);

    if (sortedChats.length === 0 && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: 'transparent' }]}>
                <EmptyState tf={tf} currentThemeColors={currentThemeColors} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
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
                ListFooterComponent={listFooterComponent}
            />

            <ConversationOptionsModal
                visible={showOptionsModal}
                onClose={handleCloseOptionsModal}
                title={tf('chat.list_options.title', 'Tùy chọn')}
                subtitle={selectedChat?.user?.username || selectedChat?.user?.name || tf('chat.list_options.subtitle', 'Chọn hành động')}
                options={chatOptions}
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
        paddingBottom: 110,
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default memo(ChatList);