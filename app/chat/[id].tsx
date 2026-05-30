import React, { useEffect, useRef, useState, useContext, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Text, Modal, ActivityIndicator, ImageBackground, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { TextInput, Appbar } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { useChatPermission } from '@/hooks/useChatPermission';
import { BlockedChatView } from '@/components/common/BlockedChatView';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    setDoc,
    Timestamp,
    updateDoc,
    query,
    orderBy,
    onSnapshot,
    getDocs,
    where,
    increment,
    runTransaction,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

import * as ImagePicker from 'expo-image-picker';
import { uploadLocalFileToStorage } from '@/utils/storageUpload';

import { Colors } from '@/constants/Colors';
import ChatRoomHeader from '@/components/chat/ChatRoomHeader';
import { getRoomId } from '@/utils/common';
import MessageList from '@/components/chat/MessageList';
import { ThemeContext } from '@/context/ThemeContext';
import ReplyPreview from '@/components/chat/ReplyPreview';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useContentModeration } from '@/hooks/useContentModeration';
import { useOptimizedChatMessages } from '@/hooks/useOptimizedChatMessages';
import { useChat } from '@/context/OptimizedChatContext';
import messageBatchService from '@/services/messageBatchService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { giftService } from '@/services/giftService';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import ExpoPushNotificationService from '@/services/expoPushNotificationService';
import { useSound } from '@/hooks/useSound';
import { ChatThemeProvider, useChatTheme } from '@/context/ChatThemeContext';
import ChatThemePicker from '@/components/chat/ChatThemePicker';
import UnifiedChatInput from '@/components/chat/UnifiedChatInput';
import ChatBackgroundEffects from '@/components/chat/ChatBackgroundEffects';
import GiftPicker from '@/components/chat/GiftPicker';
import GiftBurst from '@/components/chat/GiftBurst';
import { useThemedColors } from '@/hooks/useThemedColors';
import { CHAT_COST_LIMITS } from '@/config/costControls';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { coinServerApi } from '@/src/services/coinServerApi';
import { getSensitiveImageBlockMessage, moderateImageBeforePublish } from '@/services/imageModerationGuard';

function ChatRoomContent() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const { id, messageId, postId } = useLocalSearchParams();
    const post_id = Array.isArray(postId) ? postId[0] : (postId as string);
    const router = useRouter();
    const { user, coins, banhMi = 0, refreshBalance, topupCoins } = useAuth();

    // Fallback helper
    const tf = useCallback((key: string, fallback: string) => {
        const translated = t(key);
        return translated !== key ? translated : fallback;
    }, [t]);

    const routeId: string = Array.isArray(id) ? id[0] : (id as string);
    const peerId: string = useMemo(() => {
        if (!routeId) return '';
        if (!routeId.includes('-')) return routeId;
        const parts = routeId.split('-');
        if (parts.length === 2) {
            if (user?.uid) {
                return parts.find(p => p !== user.uid) || routeId;
            }
            return routeId;
        }
        return routeId;
    }, [routeId, user?.uid]);

    const [sharedPost, setSharedPost] = useState<any>(null);
    const [dismissedSharedPost, setDismissedSharedPost] = useState(false);

    const getSharedPostImage = useCallback((post: any) => {
        if (!post) return null;
        if (Array.isArray(post.images) && post.images.length > 0) return post.images[0];
        if (Array.isArray(post.imageUrls) && post.imageUrls.length > 0) return post.imageUrls[0];
        if (Array.isArray(post.media) && post.media.length > 0) return post.media[0]?.url || post.media[0];
        return post.imageUrl || post.photoURL || post.photoUrl || post.coverImage || post.thumbnailUrl || null;
    }, []);

    const roomId = useMemo(() => {
        if (!user?.uid || !peerId) return '';
        return getRoomId(user.uid, peerId);
    }, [user?.uid, peerId]);

    useEffect(() => {
        if (post_id && !sharedPost && !dismissedSharedPost) {
            const loadPost = async () => {
                try {
                    const postRef = doc(db, 'posts', post_id);
                    const postSnap = await getDoc(postRef);
                    if (postSnap.exists()) {
                        setSharedPost({ id: postSnap.id, ...postSnap.data() });
                    }
                } catch (error) {
                    console.error('Error loading shared post:', error);
                }
            };
            loadPost();
        }
    }, [post_id, sharedPost, dismissedSharedPost]);

    const { canChat, reason, loading: chatPermissionLoading } = useChatPermission(
        user?.uid,
        peerId
    );

    const [newMessage, setNewMessage] = useState('');
    const [userInfo, setUserInfo] = useState<any>(null);
    const isMarkingAsReadRef = useRef(false);
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [replyTo, setReplyTo] = useState<{
        text?: string;
        imageUrl?: string;
        senderName: string;
        uid: string;
        messageId: string;
    } | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [giftCatalog, setGiftCatalog] = useState<any[]>([]);
    const [showGifts, setShowGifts] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [reportTarget, setReportTarget] = useState<any>(null);
    const [paywallData, setPaywallData] = useState<any>(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [scrollToEndTrigger, setScrollToEndTrigger] = useState(0);
    const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
    const scrollViewRef = useRef<any>(null);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagePositionsRef = useRef<Record<string, number>>({});
    const lastMarkStatusAtRef = useRef(0);
    const lastSendTimeRef = useRef(0);
    const recentSendTimesRef = useRef<number[]>([]);
    const mutedUntilRef = useRef(0);
    const [enableBackgroundEffects, setEnableBackgroundEffects] = useState(false);
    const { playMessageReceivedSound, playMessageSentSound } = useSound();
    const {
        messages,
        loading: messagesLoading,
        hasMore,
        loadMoreMessages,
        refreshMessages,
        isLoadingMore,
        isInitialLoadComplete
    } = useOptimizedChatMessages({
        roomId,
        pageSize: 30,
        enableRealtime: true
    });

    const displayMessages = useMemo(() => messages, [messages]);

    const prevMessageCountRef = useRef(0);
    useEffect(() => {
        if (messages.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
            const newMessages = messages.slice(prevMessageCountRef.current);
            const hasMessageFromOther = newMessages.some((msg: any) => msg.uid !== user?.uid);
            if (hasMessageFromOther) {
                playMessageReceivedSound();
            }
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length, user?.uid, playMessageReceivedSound]);

    const { currentTheme, currentEffect, loadTheme, loadEffect } = useChatTheme();
    const chatThemeForUI = useMemo(() => currentTheme?.id === 'default' ? undefined : currentTheme, [currentTheme]);
    const effectiveEffect = useMemo(() => {
        if (showThemePicker || showGifts) return 'none';
        return currentEffect;
    }, [currentEffect, showThemePicker, showGifts]);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setEnableBackgroundEffects(true);
        });
        return () => {
            task.cancel();
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
                highlightTimeoutRef.current = null;
            }
            setEnableBackgroundEffects(false);
        };
    }, [roomId]);

    useEffect(() => {
        if (roomId) {
            const unsubTheme = loadTheme(roomId);
            const unsubEffect = loadEffect(roomId);
            return () => {
                unsubTheme();
                unsubEffect();
            };
        }
    }, [roomId]);

    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light';
    const appThemeColors = useThemedColors();
    const hasCustomRoomBackdrop = Boolean(currentTheme?.backgroundImage || (currentTheme?.gradientColors && currentTheme.gradientColors.length > 0));

    const currentThemeColors = useMemo(() => {
        const baseColors = {
            ...((Colors[theme] || Colors.light) || Colors.light),
            ...appThemeColors,
        };
        if (!baseColors) {
            return {
                background: '#FFFFFF',
                text: '#000000',
                tint: '#6366F1',
                surface: '#F8FAFC',
                subtleText: '#64748B',
                border: '#E2E8F0',
                separator: '#E2E8F0',
                mode: 'light',
            };
        }
        if (!chatThemeForUI) {
            return baseColors;
        }
        return {
            ...baseColors,
            background: hasCustomRoomBackdrop ? 'transparent' : chatThemeForUI.backgroundColor,
            text: chatThemeForUI.textColor,
            tint: chatThemeForUI.sentMessageColor,
            surface: themeContext?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
            cardBackground: themeContext?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
            inputBackground: themeContext?.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.78)',
            border: themeContext?.palette?.menuBorder || baseColors.border || 'rgba(148,163,184,0.24)',
            separator: themeContext?.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)',
        };
    }, [theme, appThemeColors, chatThemeForUI, hasCustomRoomBackdrop, themeContext?.isDark, themeContext?.palette?.menuBorder]);

    const { addReply, isLoading } = useMessageActions();
    const { checkContent, isChecking } = useContentModeration({
        autoBlock: true,
        showWarning: true,
        onViolation: (result) => {
            console.log('Content violation detected:', result);
        }
    });

    const createRoomIfNotExists = useCallback(async () => {
        const myUid = user?.uid as string;
        if (!myUid || !peerId) return;
        const rId = getRoomId(myUid, peerId);
        const roomRef = doc(db, 'rooms', rId);

        try {
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) {
                const accessRes = await coinServerApi.requestNewChatAccess(peerId);
                if (!accessRes.allowed) {
                    setPaywallData(accessRes);
                    return;
                }
            }
            await runTransaction(db, async (transaction) => {
                const roomSnapshot = await transaction.get(roomRef);
                if (!roomSnapshot.exists()) {
                    transaction.set(roomRef, {
                        roomId: rId,
                        participants: [myUid, peerId],
                        createdAt: Timestamp.fromDate(new Date()),
                        updatedAt: Timestamp.fromDate(new Date()),
                        lastMessage: null,
                        unreadCounts: { [myUid]: 0, [peerId]: 0 },
                    });
                } else {
                    const data = roomSnapshot.data() as any;
                    const parts: string[] = Array.isArray(data?.participants) ? data.participants : [];
                    const missing: string[] = [];
                    if (!parts.includes(myUid)) missing.push(myUid);
                    if (!parts.includes(peerId)) missing.push(peerId);
                    if (missing.length > 0) {
                        transaction.update(roomRef, { participants: [...parts, ...missing], updatedAt: Timestamp.fromDate(new Date()) });
                    }
                }
            });
        } catch (e) {
            console.warn('createRoomIfNotExists failed', e);
        }
    }, [user?.uid, peerId]);

    useEffect(() => {
        if (!roomId || paywallData) return;
        const task = InteractionManager.runAfterInteractions(() => {
            createRoomIfNotExists();
        });
        return () => task.cancel();
    }, [roomId, createRoomIfNotExists]);

    const handleImagePicker = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) {
            const imageUri = result.assets[0].uri;
            await uploadImage(imageUri);
        }
    }, []);

    const uploadImage = useCallback(async (uri: string) => {
        try {
            console.log('[uploadImage] Start with URI:', uri);
            const moderation = await moderateImageBeforePublish(uri, {
                context: 'private_chat',
                actorId: user?.uid,
                actorName: user?.username || user?.displayName || '',
                roomId,
                peerId,
                source: 'private_chat_image',
            });

            if (!moderation.allowed) {
                Alert.alert(
                    tf('moderation.sensitive_image_title', 'Anh nhay cam'),
                    getSensitiveImageBlockMessage(moderation.reason),
                );
                return;
            }
            console.log('[uploadImage] Image passed NSFW check');

            const downloadURL = await uploadLocalFileToStorage({
                uri,
                path: `chat-images/${user?.uid}/${Date.now()}.jpg`,
                contentType: 'image/jpeg',
            });
            console.log('[uploadImage] Uploaded to storage, URL:', downloadURL);

            const docRef = doc(db, 'rooms', roomId);
            const messageRef = collection(docRef, 'messages');
            const nowTs = Timestamp.fromDate(new Date());
            await addDoc(messageRef, {
                uid: user?.uid,
                imageUrl: downloadURL,
                profileUrl: user?.profileUrl,
                senderName: user?.username,
                createdAt: nowTs,
                status: 'sent',
                readBy: [],
                activeFrame: user?.activeFrame || null
            });
            console.log('[uploadImage] Message document created');

            await createRoomIfNotExists();

            try {
                await updateDoc(
                    docRef,
                    {
                        updatedAt: nowTs,
                        lastMessage: { imageUrl: downloadURL, createdAt: nowTs, uid: user?.uid, status: 'sent' },
                        [`unreadCounts.${peerId}`]: increment(1),
                    }
                );
                console.log(`[uploadImage] Room metadata updated, unreadCount incremented for ${peerId} via updateDoc`);
            } catch (updateErr) {
                console.warn('[uploadImage] updateDoc failed, attempting runTransaction', updateErr);
                try {
                    await runTransaction(db, async (tx) => {
                        const rSnap = await tx.get(docRef);
                        const payload = { imageUrl: downloadURL, createdAt: nowTs, uid: user?.uid, status: 'sent' } as any;
                        if (!rSnap.exists()) {
                            tx.set(docRef, {
                                roomId,
                                participants: [user?.uid, peerId],
                                createdAt: nowTs,
                                updatedAt: nowTs,
                                lastMessage: payload,
                                unreadCounts: { [peerId]: 1, [user?.uid as string]: 0 },
                            });
                        } else {
                            tx.update(docRef, {
                                lastMessage: payload,
                                updatedAt: nowTs,
                                [`unreadCounts.${peerId}`]: increment(1),
                            });
                        }
                    });
                    console.log(`[uploadImage] Transactionally updated unreadCounts for ${peerId}`);
                } catch (txErr) {
                    console.error('[uploadImage] Failed to update room in transaction:', txErr);
                }
            }

            try {
                await ExpoPushNotificationService.sendPushToUser(peerId, {
                    title: user?.username || user?.displayName || tf('chat.new_message', 'Tin nhắn mới'),
                    body: tf('chat.sent_image', 'Đã gửi ảnh'),
                    data: { type: 'message', chatId: roomId, senderId: user?.uid, receiverId: peerId },
                });
                console.log('[uploadImage] Push sent to peer');
            } catch (e) {
                console.warn('[uploadImage] Cannot send push:', e);
            }
        } catch (error: any) {
            console.error('[uploadImage] Error:', error);
            Alert.alert('Image Upload', error.message);
        }
    }, [roomId, peerId, user?.uid, user?.profileUrl, user?.username, user?.displayName, createRoomIfNotExists, tf]);

    const handleAudioSend = useCallback(async (uri: string, duration: number) => {
        try {
            console.log('[handleAudioSend] Start with URI:', uri);
            const downloadURL = await uploadLocalFileToStorage({
                uri,
                path: `chat-audio/${user?.uid}/${Date.now()}.m4a`,
                contentType: 'audio/m4a',
            });
            console.log('[handleAudioSend] Uploaded audio, URL:', downloadURL);

            const docRef = doc(db, 'rooms', roomId);
            const messageRef = collection(docRef, 'messages');
            const nowTs = Timestamp.fromDate(new Date());

            await addDoc(messageRef, {
                uid: user?.uid,
                audioUrl: downloadURL,
                duration: duration,
                type: 'audio',
                profileUrl: user?.profileUrl,
                senderName: user?.username,
                createdAt: nowTs,
                status: 'sent',
                readBy: [],
                replyTo: replyTo ? {
                    text: replyTo.text || null,
                    imageUrl: replyTo.imageUrl || null,
                    senderName: replyTo.senderName,
                    uid: replyTo.uid,
                    messageId: replyTo.messageId
                } : null,
                activeFrame: user?.activeFrame || null,
                ...(sharedPost ? {
                    type: 'shared_post',
                    postId: sharedPost.id,
                    postOwnerName: sharedPost.username || 'Người dùng',
                    postContent: sharedPost.content || '',
                    postImage: getSharedPostImage(sharedPost),
                } : {})
            });
            if (sharedPost) {
                setSharedPost(null);
                setDismissedSharedPost(true);
            }

            await createRoomIfNotExists();

            try {
                await updateDoc(
                    docRef,
                    {
                        updatedAt: nowTs,
                        lastMessage: { type: 'audio', createdAt: nowTs, uid: user?.uid, status: 'sent' },
                        [`unreadCounts.${peerId}`]: increment(1),
                    }
                );
            } catch (e) {
                console.warn('Failed to update room for audio', e);
            }

            setReplyTo(null);
            setScrollToEndTrigger(prev => prev + 1);
        } catch (error: any) {
            console.error('Error sending audio:', error);
            Alert.alert(tf('common.error', 'Lỗi'), tf('chat.error_send_audio', 'Lỗi gửi âm thanh'));
        }
    }, [roomId, user?.uid, replyTo, peerId, createRoomIfNotExists, sharedPost, getSharedPostImage, tf]);

    const fetchUserInfo = useCallback(async () => {
        if (!peerId) return;
        try {
            const fallbackUser = { uid: peerId, username: tf('chat.unknown_user', 'Người dùng') };

            const userDoc = await getDoc(doc(db, 'users', peerId));
            if (userDoc.exists()) {
                const data = userDoc.data() as any;
                setUserInfo({
                    ...data,
                    uid: peerId,
                    username: data?.username || data?.displayName || data?.name || tf('chat.unknown_user', 'Người dùng'),
                });
                return;
            }

            const roomDoc = await getDoc(doc(db, 'rooms', roomId));
            if (roomDoc.exists()) {
                const roomData = roomDoc.data() as any;
                const participantData = roomData?.participantsData?.[peerId];
                if (participantData) {
                    setUserInfo({
                        ...participantData,
                        uid: peerId,
                        username:
                            participantData?.username ||
                            participantData?.displayName ||
                            participantData?.name ||
                            tf('chat.unknown_user', 'Người dùng'),
                    });
                    return;
                }
            }

            setUserInfo(fallbackUser);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setUserInfo({ uid: peerId, username: tf('chat.unknown_user', 'Người dùng') });
        }
    }, [peerId, roomId, tf]);

    const markMessagesAsDelivered = useCallback(async (rId: string) => {
        if (!user?.uid) return;
        try {
            const roomRef = doc(db, 'rooms', rId);
            const messagesRef = collection(roomRef, 'messages');
            const q = query(
                messagesRef,
                where('status', '==', 'sent')
            );
            const snapshot = await getDocs(q);
            const messagesToUpdate = snapshot.docs.filter(msgDoc => msgDoc.data().uid !== user.uid);
            if (messagesToUpdate.length > 0) {
                const batch = writeBatch(db);
                messagesToUpdate.forEach((msgDoc) => {
                    batch.update(msgDoc.ref, {
                        status: 'delivered',
                        deliveredAt: Timestamp.fromDate(new Date()),
                    });
                });
                try {
                    await batch.commit();
                    console.log(`[markMessagesAsDelivered] Updated ${messagesToUpdate.length} messages to 'delivered'`);
                } catch (e) {
                    console.warn('Failed to batch update message status to delivered:', e);
                }
                try {
                    const roomSnap = await getDoc(roomRef);
                    const roomData = roomSnap.data();
                    const lastMsg = roomData?.lastMessage;
                    if (lastMsg && lastMsg.uid && lastMsg.uid !== user.uid && lastMsg.status === 'sent') {
                        await updateDoc(roomRef, {
                            'lastMessage.status': 'delivered',
                        });
                    }
                } catch (e) {
                    console.warn('Failed to update lastMessage status:', e);
                }
            }
        } catch (error) {
            console.error('Error marking messages as delivered:', error);
        }
    }, [user?.uid]);

    const markMessagesAsRead = useCallback(async () => {
        if (!user?.uid || !roomId) return;
        if (isMarkingAsReadRef.current) return;
        isMarkingAsReadRef.current = true;
        try {
            const roomRef = doc(db, 'rooms', roomId);
            const messagesRef = collection(roomRef, 'messages');
            const q = query(
                messagesRef,
                where('status', 'in', ['sent', 'delivered'])
            );
            const snapshot = await getDocs(q);
            const messagesToUpdate = snapshot.docs.filter(msgDoc => msgDoc.data().uid !== user.uid);
            if (messagesToUpdate.length > 0) {
                const batch = writeBatch(db);
                messagesToUpdate.forEach((msgDoc) => {
                    batch.update(msgDoc.ref, {
                        status: 'read',
                        readAt: Timestamp.fromDate(new Date()),
                    });
                });
                try {
                    await batch.commit();
                    console.log(`[markMessagesAsRead] Updated ${messagesToUpdate.length} messages to 'read'`);
                } catch (e) {
                    console.warn('Failed to batch update message status to read:', e);
                }
            }
            try {
                const roomSnap = await getDoc(roomRef);
                const roomData = roomSnap.data();
                const lastMsg = roomData?.lastMessage;
                const updatePayload: any = {
                    [`unreadCounts.${user.uid}`]: 0,
                    [`lastReadAt.${user.uid}`]: Timestamp.fromDate(new Date()),
                };
                if (lastMsg && lastMsg.uid && lastMsg.uid !== user.uid && lastMsg.status !== 'read') {
                    updatePayload['lastMessage.status'] = 'read';
                    console.log(`[markMessagesAsRead] Updating lastMessage.status to 'read'`);
                }
                await updateDoc(roomRef, updatePayload);
            } catch (e) {
                await setDoc(roomRef, {
                    unreadCounts: { [user.uid]: 0 },
                    lastReadAt: { [user.uid]: Timestamp.fromDate(new Date()) },
                }, { merge: true });
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        } finally {
            isMarkingAsReadRef.current = false;
        }
    }, [user?.uid, roomId]);

    useEffect(() => {
        const docRef = doc(db, 'rooms', roomId);
        const unsubRoom = onSnapshot(docRef, (roomSnap) => {
            const roomData = roomSnap.data() as any;
            const ids = Array.isArray(roomData?.pinnedMessages) ? roomData.pinnedMessages : [];
            setPinnedIds(ids);
        }, (error) => {
            const errorStr = String(error?.message || error?.code || error);
            if (!errorStr.includes('permission-denied') && !errorStr.includes('Missing or insufficient permissions')) {
                console.error('Error listening to room pinned messages:', error);
            }
        });
        return () => {
            unsubRoom();
        };
    }, [roomId]);

    useEffect(() => {
        if (displayMessages.length === 0 || !user?.uid || !roomId) return;
        const now = Date.now();
        if (now - lastMarkStatusAtRef.current < 1200) return;
        lastMarkStatusAtRef.current = now;
        let task: { cancel: () => void } | null = null;
        const timeoutId = setTimeout(() => {
            task = InteractionManager.runAfterInteractions(() => {
                markMessagesAsRead();
                markMessagesAsDelivered(roomId);
            });
        }, 220);
        return () => {
            clearTimeout(timeoutId);
            task?.cancel();
        };
    }, [displayMessages.length, roomId, user?.uid, markMessagesAsRead, markMessagesAsDelivered]);

    const openReportForMessage = (message: any) => {
        try {
            const messageType = message?.imageUrl ? 'image' : 'text';
            setReportTarget({
                id: message?.id || message?.messageId,
                name: message?.senderName || tf('chat.unknown_user', 'Người dùng'),
                content: message?.text || (message?.imageUrl ? tf('chat.image', 'Hình ảnh') : ''),
                messageType,
                messageText: messageType === 'text' ? (message?.text || '') : '',
                messageImageUrl: messageType === 'image' ? (message?.imageUrl || '') : '',
            });
            setReportVisible(true);
        } catch (e) {
            console.warn('openReportForMessage failed', e);
        }
    };

    const submitMessageReport = async (data: any) => {
        try {
            const sanitized = {
                ...data,
                images: Array.isArray(data?.images) ? data.images : [],
            };
            await addDoc(collection(db, 'reports'), {
                ...sanitized,
                context: 'private_chat',
                roomId,
                reportedMessageId: reportTarget?.id || null,
                reportedMessageType: reportTarget?.messageType || null,
                reportedMessageText: reportTarget?.messageType === 'text' ? (reportTarget?.messageText || '') : '',
                reportedMessageImageUrl: reportTarget?.messageType === 'image' ? (reportTarget?.messageImageUrl || '') : '',
                createdAt: Timestamp.fromDate(new Date()),
            });
        } catch (e) {
            console.error('submitMessageReport error', e);
            throw e;
        }
    };

    const handleSend = useCallback(async (textOverride?: string) => {
        const raw = typeof textOverride === 'string' ? textOverride : newMessage;
        const message = raw.trim();
        if (!message) return;

        const now = Date.now();

        if (now < mutedUntilRef.current) {
            const remainSec = Math.ceil((mutedUntilRef.current - now) / 1000);
            Alert.alert(
                tf('chat.spam_detected', 'Phát hiện spam'),
                tf('chat.spam_wait', 'Vui lòng đợi {{seconds}}s').replace('{{seconds}}', String(remainSec)),
            );
            return;
        }

        if (now - lastSendTimeRef.current < CHAT_COST_LIMITS.minSendIntervalMs) {
            return;
        }

        recentSendTimesRef.current.push(now);
        recentSendTimesRef.current = recentSendTimesRef.current.filter(
            ts => now - ts < CHAT_COST_LIMITS.rapidMessageWindowMs
        );
        if (recentSendTimesRef.current.length >= CHAT_COST_LIMITS.rapidMessageThreshold) {
            mutedUntilRef.current = now + CHAT_COST_LIMITS.rapidMessageMuteMs;
            recentSendTimesRef.current = [];
            Alert.alert(
                tf('chat.spam_detected', 'Phát hiện spam'),
                tf('chat.spam_muted', 'Bạn đang gửi quá nhanh'),
            );
            return;
        }

        lastSendTimeRef.current = now;

        setNewMessage('');

        try {
            const isContentAllowed = await checkContent(message);
            if (!isContentAllowed) {
                setNewMessage(raw);
                return;
            }

            const roomDocRef = doc(db, 'rooms', roomId);
            const messageRef = collection(roomDocRef, 'messages');

            const nowTs = Timestamp.fromDate(new Date());
            const newDoc = await addDoc(messageRef, {
                uid: user?.uid,
                text: message,
                profileUrl: user?.profileUrl,
                senderName: user?.username,
                createdAt: nowTs,
                status: 'sent',
                readBy: [],
                replyTo: replyTo ? {
                    text: replyTo.text || null,
                    imageUrl: replyTo.imageUrl || null,
                    senderName: replyTo.senderName,
                    uid: replyTo.uid,
                    messageId: replyTo.messageId
                } : null,
                activeFrame: user?.activeFrame || null,
                ...(sharedPost ? {
                    type: 'shared_post',
                    postId: sharedPost.id,
                    postOwnerName: sharedPost.username || 'Người dùng',
                    postContent: sharedPost.content || '',
                    postImage: getSharedPostImage(sharedPost),
                } : {})
            });
            if (sharedPost) {
                setSharedPost(null);
                setDismissedSharedPost(true);
            }

            const peerUid = peerId;
            await createRoomIfNotExists();

            try {
                await updateDoc(
                    roomDocRef,
                    {
                        lastMessage: { text: message, createdAt: nowTs, uid: user?.uid, status: 'sent' },
                        updatedAt: nowTs,
                        [`unreadCounts.${peerUid}`]: increment(1),
                    }
                );
                console.log(`[handleSend] Incremented unreadCounts for ${peerUid} via updateDoc`);
            } catch (updateErr) {
                console.warn('[handleSend] updateDoc failed, attempting runTransaction', updateErr);
                try {
                    await runTransaction(db, async (tx) => {
                        const rSnap = await tx.get(roomDocRef);
                        const payload = { text: message, createdAt: nowTs, uid: user?.uid, status: 'sent' } as any;
                        if (!rSnap.exists()) {
                            tx.set(roomDocRef, {
                                roomId,
                                participants: [user?.uid, peerUid],
                                createdAt: nowTs,
                                updatedAt: nowTs,
                                lastMessage: payload,
                                unreadCounts: { [peerUid]: 1, [user?.uid as string]: 0 },
                            });
                        } else {
                            tx.update(roomDocRef, {
                                lastMessage: payload,
                                updatedAt: nowTs,
                                [`unreadCounts.${peerUid}`]: increment(1),
                            });
                        }
                    });
                    console.log(`[handleSend] Transactionally updated unreadCounts for ${peerUid}`);
                } catch (txErr) {
                    console.error('[handleSend] Failed to update room in transaction:', txErr);
                }
            }

            try {
                await ExpoPushNotificationService.sendPushToUser(peerUid, {
                    title: user?.username || user?.displayName || tf('chat.new_message', 'Tin nhắn mới'),
                    body: message,
                    data: { type: 'message', chatId: roomId, senderId: user?.uid, receiverId: peerUid },
                });
                console.log('[handleSend] Push sent to peer');
            } catch (e) {
                console.warn('[handleSend] Cannot send push:', e);
            }

            playMessageSentSound();
            setReplyTo(null);
            setScrollToEndTrigger(prev => prev + 1);
        } catch (error: any) {
            setNewMessage(raw);
            Alert.alert('Message', error.message);
        }
    }, [newMessage, checkContent, roomId, user?.uid, user?.profileUrl, user?.username, user?.displayName, peerId, createRoomIfNotExists, playMessageSentSound, replyTo, sharedPost, getSharedPostImage, tf]);

    const handleMessageLayout = (messageId: string, y: number) => {
        messagePositionsRef.current[messageId] = y;
    };

    const scrollToPinnedMessage = (targetMessageId: string) => {
        const targetIndex = displayMessages.findIndex(msg => msg.id === targetMessageId);
        if (targetIndex !== -1 && scrollViewRef.current) {
            try {
                scrollViewRef.current.scrollToIndex({
                    index: displayMessages.length - 1 - targetIndex,
                    animated: true,
                    viewPosition: 0.5,
                });
            } catch (error) {
                console.warn('Failed to scroll to pinned message:', error);
            }
        }
        setHighlightedMessageId(targetMessageId);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => {
            setHighlightedMessageId(null);
            highlightTimeoutRef.current = null;
        }, 2000);
    };

    const handleReplySelect = (message: any) => {
        try {
            setReplyTo({
                text: message?.text,
                imageUrl: message?.imageUrl,
                senderName: message?.senderName || tf('chat.unknown_user', 'Người dùng'),
                uid: message?.uid,
                messageId: message?.id || message?.messageId,
            });
        } catch (e) {
            console.warn('Failed to set reply target', e);
        }
    };

    const otherUser = useMemo(() => {
        return userInfo ? { uid: peerId, id: peerId, ...userInfo } : undefined;
    }, [userInfo, peerId]);

    const pinnedMessages = useMemo(() => {
        return displayMessages.filter((m) => m && pinnedIds.includes(m.id));
    }, [displayMessages, pinnedIds]);

    const sendDisabled = useMemo(() => {
        return newMessage.trim().length === 0 || isChecking;
    }, [newMessage, isChecking]);

    const loadGiftCatalog = useCallback(async () => {
        if (giftCatalog.length === 0) {
            try {
                const items = await giftService.getGiftCatalog();
                setGiftCatalog(items);
            } catch (e) {
                console.warn('Failed to load gifts', e);
            }
        }
    }, [giftCatalog.length]);

    const handleGiftPress = useCallback(() => {
        setShowGifts(true);
        loadGiftCatalog();
    }, [loadGiftCatalog]);

    const handleSendGift = async (giftId: string) => {
        if (!user?.uid) return;
        try {
            await giftService.sendGift({
                senderUid: user.uid,
                senderName: user?.username || user?.displayName || tf('common.you', 'Bạn'),
                receiverUid: peerId,
                roomId,
                giftId,
            });
            const gift = giftCatalog.find(g => g.id === giftId);
            if (gift) {
                setBurstEmoji(gift.icon || '\uD83C\uDF81');
            }
            refreshMessages?.();
            Alert.alert(tf('common.success', 'Thành công'), tf('chat.gift_sent', 'Quà đã gửi'));
        } catch (e: any) {
            const msg = String(e?.message || 'UNKNOWN');
            if (msg.includes('INSUFFICIENT_FUNDS')) {
                Alert.alert(
                    tf('chat.gift_insufficient', 'Không đủ xu'),
                    tf('chat.gift_insufficient_desc', 'Bạn không đủ xu để gửi quà này'),
                    [
                        { text: tf('common.cancel', 'Hủy'), style: 'cancel' },
                        {
                            text: tf('chat.quick_topup', 'Nạp nhanh'),
                            onPress: async () => {
                                try {
                                    if (typeof topupCoins === 'function') {
                                        await topupCoins(50, { reason: 'quick_topup_gift' });
                                    }
                                } catch (err) {
                                    Alert.alert(tf('common.error', 'Lỗi'), tf('chat.topup_error', 'Lỗi nạp'));
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(tf('common.error', 'Lỗi'), tf('chat.gift_error', 'Lỗi gửi quà') + ': ' + msg);
            }
        }
        setShowGifts(false);
    };

    useEffect(() => {
        if (!peerId) return;
        const task = InteractionManager.runAfterInteractions(() => {
            fetchUserInfo();
        });
        return () => task.cancel();
    }, [peerId, fetchUserInfo]);

    const handleBack = useCallback(() => {
        Keyboard.dismiss();
        requestAnimationFrame(() => {
            router.back();
        });
    }, [router]);

    const handlePayUnlock = async (currency: 'banhMi' | 'coins') => {
        try {
            setProcessingPayment(true);
            const res = await coinServerApi.requestNewChatAccess(peerId, currency);
            if (res.allowed) {
                setPaywallData(null);
                refreshBalance?.();
                await createRoomIfNotExists();
            } else {
                Alert.alert(tf('store.insufficient_coins', 'Không đủ xu'));
            }
        } catch (e: any) {
            Alert.alert(tf('common.error', 'Lỗi'), e.message || 'Payment failed');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Loading skeleton (giữ nguyên, không cần thay đổi)

    if (chatPermissionLoading || !isInitialLoadComplete) {
        return (
            <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
                {/* Header Skeleton */}
                <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: currentThemeColors.border, marginRight: 12, opacity: 0.3 }} />
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: currentThemeColors.border, marginRight: 12, opacity: 0.3 }} />
                    <View>
                        <View style={{ width: 100, height: 16, borderRadius: 8, backgroundColor: currentThemeColors.border, marginBottom: 6, opacity: 0.3 }} />
                        <View style={{ width: 60, height: 12, borderRadius: 6, backgroundColor: currentThemeColors.border, opacity: 0.2 }} />
                    </View>
                </View>

                {/* Chat Bubbles Skeleton */}
                <View style={{ flex: 1, padding: 16, justifyContent: 'flex-end', paddingBottom: 80 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={{
                            alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
                            width: i % 2 === 0 ? '60%' : '50%',
                            height: i % 3 === 0 ? 80 : 50,
                            borderRadius: 16,
                            backgroundColor: currentThemeColors.border,
                            opacity: i % 2 === 0 ? 0.15 : 0.1,
                            marginBottom: 16,
                            borderBottomRightRadius: i % 2 === 0 ? 4 : 16,
                            borderBottomLeftRadius: i % 2 !== 0 ? 4 : 16
                        }} />
                    ))}
                </View>

                {/* Input Skeleton */}
                <View style={{ height: 60, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                    <View style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: currentThemeColors.border, opacity: 0.15 }} />
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: currentThemeColors.border, marginLeft: 10, opacity: 0.15 }} />
                </View>
            </View>
        );
    }

    if (!canChat) {
        return <BlockedChatView reason={reason} onBack={handleBack} />;
    }

    if (paywallData) {
        return (
            <View style={[styles.container, { backgroundColor: currentThemeColors.background, justifyContent: 'center', padding: 20 }]}>
                <ChatRoomHeader user={userInfo || { uid: peerId, username: tf('chat.unknown_user', 'Người dùng') }} router={router} userId={peerId} onBack={handleBack} onThemePress={() => setShowThemePicker(true)} chatTheme={chatThemeForUI} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialIcons name="lock-clock" size={80} color={currentThemeColors.tint} style={{ marginBottom: 20 }} />
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentThemeColors.text, textAlign: 'center', marginBottom: 10 }}>
                        {tf('chat.new_chat_limit_reached', 'Đã đạt giới hạn chat mới')}
                    </Text>
                    <Text style={{ fontSize: 14, color: currentThemeColors.subtleText, textAlign: 'center', marginBottom: 30 }}>
                        {tf('chat.new_chat_limit_desc', 'Bạn đã đạt giới hạn chat mới hàng ngày. Mở khóa bằng Bánh Mì hoặc Xu.')}
                    </Text>
                    
                    <TouchableOpacity 
                        style={{ width: '100%', backgroundColor: currentThemeColors.tint, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}
                        onPress={() => handlePayUnlock('banhMi')}
                        disabled={processingPayment}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
                            {tf('chat.unlock_with', 'Mở khóa với')} {paywallData.cost?.banhMi || 1} 🥖
                        </Text>
                        {processingPayment && <ActivityIndicator color="#fff" size="small" />}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ width: '100%', backgroundColor: '#F59E0B', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}
                        onPress={() => handlePayUnlock('coins')}
                        disabled={processingPayment}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
                            {tf('chat.unlock_with', 'Mở khóa với')} {paywallData.cost?.coins || 10} 🪙
                        </Text>
                        {processingPayment && <ActivityIndicator color="#fff" size="small" />}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const renderContent = () => (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            {/* Header */}
            <ChatRoomHeader
                user={userInfo || { uid: peerId, username: tf('chat.unknown_user', 'Người dùng') }}
                router={router}
                userId={peerId}
                onBack={handleBack}
                onThemePress={() => setShowThemePicker(true)}
                chatTheme={chatThemeForUI}
            />

            {/* Pinned Messages */}
            {pinnedMessages.length > 0 && (
                <View style={[styles.pinnedContainer, { backgroundColor: currentThemeColors.surface, borderBottomColor: currentThemeColors.separator || currentThemeColors.border }]}>
                    <TouchableOpacity
                        style={[styles.pinnedContent, { backgroundColor: currentThemeColors.inputBackground || 'rgba(0,0,0,0.03)', borderColor: currentThemeColors.border }]}
                        onPress={() => scrollToPinnedMessage(pinnedMessages[0].id)}
                    >
                        <MaterialIcons name="push-pin" size={16} color={currentThemeColors.tint} />
                        <View style={styles.pinnedTextContainer}>
                            <Text style={[styles.pinnedTitle, { color: currentThemeColors.tint }]}>{tf('chat.pinned_messages', 'Tin nhắn ghim')}</Text>
                            <Text style={[styles.pinnedText, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                                {pinnedMessages[0].text || (pinnedMessages[0].imageUrl ? tf('chat.image', 'Hình ảnh') : tf('chat.message', 'Tin nhắn'))}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Message List */}
            <MessageList
                messages={displayMessages}
                currentUser={user}
                otherUser={otherUser}
                scrollViewRef={scrollViewRef}
                onReply={handleReplySelect}
                onMessageLayout={handleMessageLayout}
                highlightedMessageId={highlightedMessageId || undefined}
                onReport={openReportForMessage}
                backgroundColor={currentThemeColors.background}
                onLoadMore={loadMoreMessages}
                hasMore={hasMore}
                loadingMore={isLoadingMore}
                isLoadingMore={isLoadingMore}
                isInitialLoadComplete={isInitialLoadComplete}
                scrollToEndTrigger={scrollToEndTrigger}
                scrollToMessageId={typeof messageId === 'string' ? messageId : undefined}
                themeColors={currentThemeColors}
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={{ paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) + keyboardHeight : 0 }}
            >
                <UnifiedChatInput
                    value={newMessage}
                    attachedPost={sharedPost}
                    onCancelAttachedPost={() => {
                        setSharedPost(null);
                        setDismissedSharedPost(true);
                    }}
                    onChangeText={setNewMessage}
                    onSend={handleSend}
                    onQuickSend={handleSend}
                    onImagePress={handleImagePicker}
                    onAudioSend={handleAudioSend}
                    onGiftPress={handleGiftPress}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    sendDisabled={sendDisabled}
                    showImage
                    showGift
                    showAudio
                    chatTheme={chatThemeForUI}
                    themeColors={currentThemeColors}
                />
            </KeyboardAvoidingView>

            {/* Modals */}
            <GiftPicker
                visible={showGifts}
                onClose={() => setShowGifts(false)}
                onSend={handleSendGift}
                gifts={giftCatalog}
                coins={coins || 0}
                banhMi={banhMi || 0}
                themeColors={currentThemeColors}
                loading={giftCatalog.length === 0}
            />

            <ReportModalSimple
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                onSubmit={submitMessageReport}
                targetType="message"
                targetInfo={{
                    id: reportTarget?.id || '',
                    name: reportTarget?.name,
                    content: reportTarget?.content,
                }}
                currentUser={user}
            />

            <ChatThemePicker
                visible={showThemePicker}
                onClose={() => setShowThemePicker(false)}
                roomId={roomId}
                currentUser={user}
            />

            {/* Background Effects */}
            <ChatBackgroundEffects
                effect={enableBackgroundEffects ? effectiveEffect : 'none'}
                themeId={currentTheme.id}
                themeColor={currentThemeColors.tint}
                backgroundColor={chatThemeForUI?.backgroundColor || currentThemeColors.appBackground || currentThemeColors.background}
            />

            <GiftBurst
                visible={!!burstEmoji}
                emoji={burstEmoji || '\uD83C\uDF81'}
                onComplete={() => setBurstEmoji(null)}
            />
        </View>
    );

    if (currentTheme.backgroundImage) {
        return (
            <ImageBackground
                source={{ uri: currentTheme.backgroundImage }}
                style={styles.container}
                resizeMode="cover"
            >
                {currentTheme.gradientColors && currentTheme.gradientColors.length > 0 ? (
                    <LinearGradient
                        colors={currentTheme.gradientColors as [string, string, ...string[]]}
                        style={[styles.container, { backgroundColor: 'transparent' }]}
                    >
                        <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                            {renderContent()}
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                        {renderContent()}
                    </View>
                )}
            </ImageBackground>
        );
    }

    if (currentTheme.gradientColors && currentTheme.gradientColors.length > 0) {
        return (
            <LinearGradient
                colors={currentTheme.gradientColors as [string, string, ...string[]]}
                style={styles.container}
            >
                {renderContent()}
            </LinearGradient>
        );
    }

    return renderContent();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinnedContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    pinnedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderWidth: 1,
    },
    pinnedTextContainer: {
        marginLeft: 8,
        flex: 1,
    },
    pinnedTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    pinnedText: {
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    giftModalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    giftList: {
        paddingBottom: 20,
    },
    giftItem: {
        alignItems: 'center',
        marginRight: 20,
        width: 80,
    },
    giftEmoji: {
        fontSize: 40,
        marginBottom: 8,
    },
    giftName: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 4,
    },
    giftPrice: {
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default function ChatRoomScreen() {
    return (
        <ChatThemeProvider>
            <ChatRoomContent />
        </ChatThemeProvider>
    );
}
