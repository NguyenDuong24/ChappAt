import React, { useEffect, useRef, useState, useContext, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Text, Modal, ActivityIndicator } from 'react-native';
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
    runTransaction
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
import { MaterialIcons } from '@expo/vector-icons';
import { giftService } from '@/services/giftService';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import ExpoPushNotificationService from '@/services/expoPushNotificationService';
import { useSound } from '@/hooks/useSound';
import { ChatThemeProvider, useChatTheme } from '@/context/ChatThemeContext';
import ChatThemePicker from '@/components/chat/ChatThemePicker';
import { useNSFWDetection } from '@/hooks/useNSFWDetection';
import OptimizedChatInput from '@/components/chat/OptimizedChatInput';
import ChatBackgroundEffects from '@/components/chat/ChatBackgroundEffects';

const storage = getStorage();

function ChatRoomContent() {
    const { t } = useTranslation();
    const { id, messageId } = useLocalSearchParams();
    const router = useRouter();
    const { user, coins, /* optional */ topupCoins } = useAuth();

    // Route param can be a peer user id OR a roomId (uidA-uidB). Normalize to peerId.
    const routeId: string = Array.isArray(id) ? id[0] : (id as string);
    const peerId: string = useMemo(() => {
        if (!routeId) return '';
        if (routeId.includes('-')) {
            const parts = routeId.split('-');
            // If current user known, pick the other id; else fallback to first part
            if (user?.uid) return parts.find(p => p !== user.uid) || parts[0];
            return parts[0];
        }
        return routeId;
    }, [routeId, user?.uid]);

    // Use optimized room ID calculation
    const roomId = useMemo(() => getRoomId(user?.uid as string, peerId), [user?.uid, peerId]);

    // Check if chat is allowed (block status)
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
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [scrollToEndTrigger, setScrollToEndTrigger] = useState(0);
    const scrollViewRef = useRef<any>(null);
    const messagePositionsRef = useRef<Record<string, number>>({});
    const { playMessageReceivedSound, playMessageSentSound } = useSound();
    const { classifyImage } = useNSFWDetection();
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
        pageSize: 30, // Fast initial load
        enableRealtime: true
    });

    // Messages are already sorted in the hook
    const displayMessages = useMemo(() => messages, [messages]);

    // Note: Scroll to message is now handled by MessageList via scrollToMessageId prop

    // Simple listener for new message sound ONLY (hook handles data)
    const prevMessageCountRef = useRef(0);
    useEffect(() => {
        if (messages.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
            // New messages arrived
            const newMessages = messages.slice(prevMessageCountRef.current);
            const hasMessageFromOther = newMessages.some((msg: any) => msg.uid !== user?.uid);

            if (hasMessageFromOther) {
                playMessageReceivedSound();
            }
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length, user?.uid, playMessageReceivedSound]);

    // Hook already handles real-time updates, no need for extra listeners

    const { currentTheme, currentEffect, loadTheme, loadEffect } = useChatTheme();
    const chatThemeForUI = useMemo(() => currentTheme?.id === 'default' ? undefined : currentTheme, [currentTheme]);

    // Load theme and effect when entering room
    useEffect(() => {
        if (roomId) {
            loadTheme(roomId);
            loadEffect(roomId);
        }
    }, [roomId]);
    const themeContext = useContext(ThemeContext);
    const theme = themeContext?.theme || 'light'; // Safely access theme with fallback

    // Memoize theme colors to prevent unnecessary re-calculations
    const currentThemeColors = useMemo(() => {
        const baseColors = (theme === 'dark' ? Colors.dark : Colors.light) || Colors.light;

        if (!baseColors) {
            console.error('Colors.light or Colors.dark is undefined!', { theme, Colors });
            return {
                background: '#FFFFFF',
                text: '#000000',
                tint: '#6366F1',
                surface: '#F8FAFC',
                subtleText: '#64748B',
                border: '#E2E8F0',
                separator: '#E2E8F0',
                mode: 'light',
                // Add other necessary fallbacks if needed
            };
        }

        if (!chatThemeForUI) {
            return baseColors;
        }

        return {
            ...baseColors,
            background: chatThemeForUI.backgroundColor,
            text: chatThemeForUI.textColor,
            tint: chatThemeForUI.sentMessageColor,
        };
    }, [theme, chatThemeForUI]);
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

    // Ensure room document exists as soon as we know roomId
    useEffect(() => {
        if (roomId) {
            createRoomIfNotExists();
        }
    }, [roomId]);

    const handleImagePicker = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8, // Reduced quality for faster upload
        });

        if (!result.canceled) {
            const imageUri = result.assets[0].uri;
            await uploadImage(imageUri);
        }
    }, []);



    const uploadImage = useCallback(async (uri: string) => {
        try {
            console.log('ðŸ“¤ [uploadImage] Start with URI:', uri);
            // Check image content with NSFW model
            const checkResult = await classifyImage(uri);
            if (checkResult.isInappropriate) {
                console.log('âš ï¸  [uploadImage] NSFW detected, will log to flagged_content');
                // Image will still be sent, logged to flagged_content below
                // Continue with upload - will log to flagged_content after getting downloadURL
            }
            console.log('âœ… [uploadImage] Image passed NSFW check');

            const blob = await (await fetch(uri)).blob();
            const storageRef = ref(storage, `chat-images/${roomId}/${Date.now()}`);

            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            console.log('âœ… [uploadImage] Uploaded to storage, URL:', downloadURL);

            // Gá»­i tin nháº¯n vá»›i URL áº£nh
            const docRef = doc(db, 'rooms', roomId);
            const messageRef = collection(docRef, 'messages');
            const nowTs = Timestamp.fromDate(new Date());
            await addDoc(messageRef, {
                uid: user?.uid,
                imageUrl: downloadURL,
                profileUrl: user?.profileUrl,
                senderName: user?.username,
                createdAt: nowTs,
                status: 'sent', // sent, delivered, read
                readBy: [], // array of user IDs who have read this message
            });
            console.log('ðŸ“¨ [uploadImage] Message document created');

            // Ensure room exists then update room metadata
            await createRoomIfNotExists();

            // Use updateDoc with increment for atomic unread count update; fallback to setDoc if doc missing
            try {
                await updateDoc(
                    docRef,
                    {
                        updatedAt: nowTs,
                        lastMessage: { imageUrl: downloadURL, createdAt: nowTs, uid: user?.uid, status: 'sent' },
                        [`unreadCounts.${peerId}`]: increment(1),
                    }
                );
                console.log(`ðŸ§¾ [uploadImage] Room metadata updated, unreadCount incremented for ${peerId} via updateDoc`);
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
                    console.log(`ðŸ§¾ [uploadImage] Transactionally updated unreadCounts for ${peerId}`);
                } catch (txErr) {
                    console.error('[uploadImage] Failed to update room in transaction:', txErr);
                }
            }

            // NEW: Gá»­i push notification qua Expo (FCM/APNs) cho ngÆ°á» i nháº­n khi cÃ³ áº£nh má»›i
            try {
                await ExpoPushNotificationService.sendPushToUser(peerId, {
                    title: user?.username || user?.displayName || 'Tin nháº¯n má»›i',
                    body: 'ðŸ“· Ä Ã£ gá»­i má»™t hÃ¬nh áº£nh',
                    data: { type: 'message', chatId: roomId, senderId: user?.uid, receiverId: peerId },
                });
                console.log('ðŸ“¬ [uploadImage] Push sent to peer');
            } catch (e) {
                console.warn('âš ï¸  [uploadImage] Cannot send push:', e);
            }

            // Log NSFW flagged images to flagged_content collection for admin review
            if (checkResult.isInappropriate) {
                try {
                    await addDoc(collection(db, 'flagged_content'), {
                        context: 'private_chat',
                        createdAt: nowTs,
                        imageUrl: downloadURL,
                        reason: checkResult.reason || 'NSFW detected',
                        roomId: roomId,
                        senderId: user?.uid,
                        senderName: user?.username || user?.displayName || '',
                        scores: checkResult.scores || {},
                        status: 'pending',
                        type: 'image',
                    });
                    console.log('ðŸ“‹ [uploadImage] Flagged content logged');
                } catch (flagErr) {
                    console.warn('âš ï¸  [uploadImage] Failed to log flagged content:', flagErr);
                }
            }
        } catch (error: any) {
            console.error('â Œ [uploadImage] Error:', error);
            Alert.alert('Image Upload', error.message);
        }
    }, [classifyImage, roomId, peerId, user?.uid, user?.profileUrl, user?.username, user?.displayName, createRoomIfNotExists]);

    const handleAudioSend = useCallback(async (uri: string, duration: number) => {
        try {
            console.log('ðŸŽ¤ [handleAudioSend] Start with URI:', uri);
            const blob = await (await fetch(uri)).blob();
            const storageRef = ref(storage, `chat-audio/${roomId}/${Date.now()}.m4a`);

            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            console.log('âœ… [handleAudioSend] Uploaded audio, URL:', downloadURL);

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
                } : null
            });

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
            Alert.alert('Error', 'Failed to send audio message');
        }
    }, [roomId, user?.uid, replyTo, peerId, createRoomIfNotExists]);

    const fetchUserInfo = useCallback(async () => {
        if (!peerId) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', peerId));
            if (userDoc.exists()) {
                setUserInfo(userDoc.data());
            } else {
                console.log('User not found');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }, [peerId]);

    // Mark messages as delivered when user enters chat room - update actual message status
    const markMessagesAsDelivered = useCallback(async (rId: string) => {
        if (!user?.uid) return;
        try {
            const roomRef = doc(db, 'rooms', rId);
            const messagesRef = collection(roomRef, 'messages');

            // Query messages with 'sent' status (can't use != with other where, so filter in JS)
            const q = query(
                messagesRef,
                where('status', '==', 'sent')
            );

            const snapshot = await getDocs(q);

            // Filter messages from other user and update status to 'delivered'
            const messagesToUpdate = snapshot.docs.filter(msgDoc => msgDoc.data().uid !== user.uid);
            const updatePromises = messagesToUpdate.map(async (msgDoc) => {
                try {
                    await updateDoc(msgDoc.ref, {
                        status: 'delivered',
                        deliveredAt: Timestamp.fromDate(new Date()),
                    });
                } catch (e) {
                    console.warn('Failed to update message status to delivered:', e);
                }
            });

            await Promise.all(updatePromises);

            if (messagesToUpdate.length > 0) {
                console.log(`[markMessagesAsDelivered] Updated ${messagesToUpdate.length} messages to 'delivered'`);

                // Also update lastMessage.status in room document if it's from other user
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

    // Mark messages as read - update actual message status and reset unreadCounts
    const markMessagesAsRead = useCallback(async () => {
        if (!user?.uid || !roomId) return;

        // Use ref to prevent concurrent calls
        if (isMarkingAsReadRef.current) return;
        isMarkingAsReadRef.current = true;

        try {
            const roomRef = doc(db, 'rooms', roomId);
            const messagesRef = collection(roomRef, 'messages');

            // Query messages with 'sent' or 'delivered' status (filter by uid in JS)
            const q = query(
                messagesRef,
                where('status', 'in', ['sent', 'delivered'])
            );

            const snapshot = await getDocs(q);

            // Filter messages from other user and update status to 'read'
            const messagesToUpdate = snapshot.docs.filter(msgDoc => msgDoc.data().uid !== user.uid);

            if (messagesToUpdate.length > 0) {
                const updatePromises = messagesToUpdate.map(async (msgDoc) => {
                    try {
                        await updateDoc(msgDoc.ref, {
                            status: 'read',
                            readAt: Timestamp.fromDate(new Date()),
                        });
                    } catch (e) {
                        console.warn('Failed to update message status to read:', e);
                    }
                });

                await Promise.all(updatePromises);
                console.log(`âœ… [markMessagesAsRead] Updated ${messagesToUpdate.length} messages to 'read'`);
            }

            // Also reset unreadCounts and update lastMessage.status to 'read' if sender is other user
            try {
                const roomSnap = await getDoc(roomRef);
                const roomData = roomSnap.data();
                const lastMsg = roomData?.lastMessage;

                const updatePayload: any = {
                    [`unreadCounts.${user.uid}`]: 0,
                    [`lastReadAt.${user.uid}`]: Timestamp.fromDate(new Date()),
                };

                // If lastMessage was from other user, update its status to 'read'
                if (lastMsg && lastMsg.uid && lastMsg.uid !== user.uid && lastMsg.status !== 'read') {
                    updatePayload['lastMessage.status'] = 'read';
                    console.log(`âœ… [markMessagesAsRead] Updating lastMessage.status to 'read'`);
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

    // Listen to pinnedIds via room doc only
    useEffect(() => {
        const docRef = doc(db, 'rooms', roomId);
        const unsubRoom = onSnapshot(docRef, (roomSnap) => {
            const roomData = roomSnap.data() as any;
            const ids = Array.isArray(roomData?.pinnedMessages) ? roomData.pinnedMessages : [];
            setPinnedIds(ids);
        });

        // Remove keyboard listener for scroll - MessageList handles scroll behavior

        return () => {
            unsubRoom();
        };
    }, [roomId]);

    // Mark messages as read when entering room and when messages change
    useEffect(() => {
        if (displayMessages.length > 0 && user?.uid && roomId) {
            const timeoutId = setTimeout(() => {
                markMessagesAsRead();
                markMessagesAsDelivered(roomId);
            }, 300); // Debounce to avoid excessive calls
            return () => clearTimeout(timeoutId);
        }
    }, [displayMessages.length, roomId, user?.uid, markMessagesAsRead, markMessagesAsDelivered]);

    // Remove auto-scroll effect - let MessageList handle scroll behavior

    const openReportForMessage = (message: any) => {
        try {
            const messageType = message?.imageUrl ? 'image' : 'text';
            setReportTarget({
                id: message?.id || message?.messageId,
                name: message?.senderName || 'NgÆ°á» i dÃ¹ng',
                content: message?.text || (message?.imageUrl ? 'HÃ¬nh áº£nh' : ''),
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
                // Include original message snapshot
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

    const handleSend = useCallback(async () => {
        const raw = newMessage;
        const message = raw.trim();
        if (!message) return;

        // Optimistic clear for smooth UX
        setNewMessage('');

        try {
            const isContentAllowed = await checkContent(message);
            if (!isContentAllowed) {
                // Restore input if blocked by moderation
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
                } : null
            });

            // Ensure room exists then update room metadata: lastMessage, updatedAt, increment peer unread
            const peerUid = peerId;
            await createRoomIfNotExists();

            // Use updateDoc with increment for atomic unread count update; fallback to transaction if updateDoc fails
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

            // NEW: Gá»­i push notification qua Expo (FCM/APNs) cho ngÆ°á» i nháº­n khi cÃ³ tin nháº¯n má»›i
            try {
                await ExpoPushNotificationService.sendPushToUser(peerUid, {
                    title: user?.username || user?.displayName || 'Tin nháº¯n má»›i',
                    body: message,
                    data: { type: 'message', chatId: roomId, senderId: user?.uid, receiverId: peerUid },
                });
                console.log('ðŸ“¬ [handleSend] Push sent to peer');
            } catch (e) {
                console.warn('âš ï¸  [handleSend] Cannot send push:', e);
            }

            playMessageSentSound();
            setReplyTo(null);
            // Trigger scroll to end after sending message
            setScrollToEndTrigger(prev => prev + 1);
        } catch (error: any) {
            // Restore input so user can retry
            setNewMessage(raw);
            Alert.alert('Message', error.message);
        }
    }, [newMessage, checkContent, roomId, user?.uid, user?.profileUrl, user?.username, user?.displayName, peerId, createRoomIfNotExists, playMessageSentSound]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            markMessagesAsRead();
        }, 800);
        return () => clearTimeout(timeoutId);
    }, [messages]);

    // Remove updateScrollView - scroll behavior is now handled by MessageList component

    const handleMessageLayout = (messageId: string, y: number) => {
        messagePositionsRef.current[messageId] = y;
    };

    const scrollToPinnedMessage = (targetMessageId: string) => {
        // For FlatList, we need to find the index and scroll to it
        const targetIndex = displayMessages.findIndex(msg => msg.id === targetMessageId);
        if (targetIndex !== -1 && scrollViewRef.current) {
            try {
                scrollViewRef.current.scrollToIndex({
                    index: displayMessages.length - 1 - targetIndex, // Reversed for inverted list
                    animated: true,
                    viewPosition: 0.5,
                });
            } catch (error) {
                console.warn('Failed to scroll to pinned message:', error);
            }
        }
        // Highlight briefly
        setHighlightedMessageId(targetMessageId);
        setTimeout(() => setHighlightedMessageId(null), 2000);
    };

    const handleReplySelect = (message: any) => {
        try {
            setReplyTo({
                text: message?.text,
                imageUrl: message?.imageUrl,
                senderName: message?.senderName || 'NgÆ°á» i dÃ¹ng',
                uid: message?.uid,
                messageId: message?.id || message?.messageId,
            });
        } catch (e) {
            console.warn('Failed to set reply target', e);
        }
    };

    // Build otherUser object to help MessageItem compute roomId when needed
    const otherUser = useMemo(() => {
        return userInfo ? { uid: peerId, id: peerId, ...userInfo } : undefined;
    }, [userInfo, peerId]);

    // Derive pinned messages from pinnedIds and messages list
    const pinnedMessages = useMemo(() => {
        return displayMessages.filter((m) => m && pinnedIds.includes(m.id));
    }, [displayMessages, pinnedIds]);

    // Disable send when no text or moderation running
    const sendDisabled = useMemo(() => {
        return newMessage.trim().length === 0 || isChecking;
    }, [newMessage, isChecking]);

    // Lazy load gift catalog only when gift modal is opened
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
        loadGiftCatalog(); // Load gifts only when needed
    }, [loadGiftCatalog]);

    const handleSendGift = async (giftId: string) => {
        if (!user?.uid) return;
        try {
            await giftService.sendGift({
                senderUid: user.uid,
                senderName: user?.username || user?.displayName || t('common.you'),
                receiverUid: peerId,
                roomId,
                giftId,
            });
            refreshMessages?.();
            Alert.alert(t('common.success'), t('chat.gift_sent'));
        } catch (e: any) {
            const msg = String(e?.message || 'UNKNOWN');
            if (msg.includes('INSUFFICIENT_FUNDS')) {
                Alert.alert(
                    t('chat.gift_insufficient'),
                    t('chat.gift_insufficient_desc'),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: t('chat.quick_topup'),
                            onPress: async () => {
                                try {
                                    if (typeof topupCoins === 'function') {
                                        await topupCoins(50, { reason: 'quick_topup_gift' });
                                    }
                                } catch (err) {
                                    Alert.alert(t('common.error'), t('chat.topup_error'));
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(t('common.error'), t('chat.gift_error') + ': ' + msg);
            }
        }
        setShowGifts(false);
    };

    useEffect(() => {
        if (peerId) {
            fetchUserInfo();
        }
    }, [peerId, fetchUserInfo]);

    // If still loading permission or messages, show loading
    if (chatPermissionLoading || !isInitialLoadComplete) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!canChat) {
        return <BlockedChatView reason={reason} onBack={() => router.back()} />;
    }

    return (

        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            {/* Header */}
            <ChatRoomHeader
                user={userInfo || { uid: peerId, username: 'Loading...' }}
                router={router}
                userId={peerId}
                onBack={() => router.back()}
                onThemePress={() => setShowThemePicker(true)}
                chatTheme={chatThemeForUI}
            />

            {/* Pinned Messages */}
            {pinnedMessages.length > 0 && (
                <View style={[styles.pinnedContainer, { backgroundColor: currentThemeColors.surface }]}>
                    <TouchableOpacity
                        style={styles.pinnedContent}
                        onPress={() => scrollToPinnedMessage(pinnedMessages[0].id)}
                    >
                        <MaterialIcons name="push-pin" size={16} color={currentThemeColors.tint} />
                        <View style={styles.pinnedTextContainer}>
                            <Text style={[styles.pinnedTitle, { color: currentThemeColors.tint }]}>{t('chat.pinned_messages')}</Text>
                            <Text style={[styles.pinnedText, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                                {pinnedMessages[0].text || (pinnedMessages[0].imageUrl ? t('chat.image') : t('chat.message'))}
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
            >
                <OptimizedChatInput
                    newMessage={newMessage}
                    onChangeText={setNewMessage}
                    onSend={handleSend}
                    onImagePress={handleImagePicker}
                    onAudioSend={handleAudioSend}
                    onGiftPress={handleGiftPress}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    sendDisabled={sendDisabled}
                    currentThemeColors={currentThemeColors}
                />
            </KeyboardAvoidingView>

            {/* Modals */}
            <Modal
                visible={showGifts}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGifts(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.giftModalContent, { backgroundColor: currentThemeColors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: currentThemeColors.text }]}>{t('chat.send_gift')}</Text>
                            <TouchableOpacity onPress={() => setShowGifts(false)}>
                                <MaterialIcons name="close" size={24} color={currentThemeColors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal contentContainerStyle={styles.giftList}>
                            {giftCatalog.map((gift) => (
                                <TouchableOpacity
                                    key={gift.id}
                                    style={styles.giftItem}
                                    onPress={() => handleSendGift(gift.id)}
                                >
                                    <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                                    <Text style={[styles.giftName, { color: currentThemeColors.text }]}>{gift.name}</Text>
                                    <Text style={[styles.giftPrice, { color: currentThemeColors.tint }]}>{gift.price} {t('chat.bread')}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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
            />

            {/* Background Effects */}
            <ChatBackgroundEffects
                effect={currentEffect}
                themeColor={currentThemeColors.tint}
                backgroundColor={currentThemeColors.background}
            />
        </View>

    );
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
