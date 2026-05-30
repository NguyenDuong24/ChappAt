import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import React, { useState, useContext, useMemo } from 'react';
import { Image } from 'expo-image';
import { formatTime, getRoomId } from '../../utils/common';
import CustomImage from '../common/CustomImage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeContext } from '@/context/ThemeContext';
import GiftMessage from './GiftMessage';
import AudioMessage from './AudioMessage';
import MessageActionSheet from './MessageActionSheet';
import MessageReactions from './MessageReactions';
import EditMessageModal from './EditMessageModal';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatTheme } from '@/context/ChatThemeContext';
import VibeAvatar from '../vibe/VibeAvatar';
import { useThemedColors } from '@/hooks/useThemedColors';

interface MessageItemProps {
    message: any;
    currentUser: any;
    otherUser?: any;
    onReply?: (message: any) => void;
    onMessageLayout?: (messageId: string, y: number) => void;
    isHighlighted?: boolean;
    onReport?: (message: any) => void;
    isFirstInSequence?: boolean;
    isLastInSequence?: boolean;
    isSameSenderAsPrev?: boolean;
    isSameSenderAsNext?: boolean;
}

const IMAGE_BUBBLE_WIDTH = Math.min(Dimensions.get('window').width * 0.62, 260);

export default function MessageItem({
    message,
    currentUser,
    otherUser,
    onReply,
    onMessageLayout,
    isHighlighted,
    onReport,
}: MessageItemProps) {
    const router = useRouter();
    const isCurrentUser = message?.uid === currentUser?.uid;
    const [showTime, setShowTime] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const themeCtx = useContext(ThemeContext);
    const theme = themeCtx?.theme || 'light';
    const currentThemeColors = useThemedColors();
    const { id: routePeerId } = useLocalSearchParams<{ id?: string }>();
    const currentUid = currentUser?.uid ?? currentUser?.id ?? currentUser?.userId;
    const otherUid = otherUser?.uid ?? otherUser?.id ?? otherUser?.userId ?? (routePeerId as string | undefined);
    const computedRoomId = useMemo(
        () => currentUid && otherUid ? getRoomId(currentUid, otherUid) : undefined,
        [currentUid, otherUid]
    );
    const roomId = computedRoomId || (message?.roomId as string | undefined) || (message?.chatId as string | undefined) || '';

    // Messenger-style colors using chat theme — memoized to avoid recalc per render
    const { currentTheme: selectedChatTheme } = useChatTheme();
    const chatTheme = useMemo<any>(() => {
        const fallback = selectedChatTheme || {
            id: 'default',
            sentMessageColor: currentThemeColors.primary,
            receivedMessageColor: currentThemeColors.inputBackground || currentThemeColors.surface,
            textColor: currentThemeColors.text,
        };
        if (fallback.id === 'default') {
            return {
                ...fallback,
                sentMessageColor: currentThemeColors.primary,
                receivedMessageColor: currentThemeColors.inputBackground || currentThemeColors.surface,
                textColor: currentThemeColors.text,
            };
        }
        return fallback;
    }, [selectedChatTheme?.id, currentThemeColors.primary, currentThemeColors.inputBackground, currentThemeColors.surface, currentThemeColors.text]);

    const bubbleColors = useMemo<readonly [string, string]>(() => {
        const sent = chatTheme.sentMessageColor;
        const recv = chatTheme.receivedMessageColor;
        return isCurrentUser ? [sent, sent] : [recv, recv];
    }, [isCurrentUser, chatTheme.sentMessageColor, chatTheme.receivedMessageColor]);

    const {
        toggleReaction,
        pinMessage,
        deleteMessage,
        editMessage,
        copyToClipboard,
        showDeleteConfirm,
        isLoading,
    } = useMessageActions();

    const handlePress = () => {
        setShowTime(prev => !prev);
    };

    const handleLongPress = () => {
        setShowActionSheet(true);
    };

    const handleReply = () => {
        onReply?.(message);
    };

    const handleEdit = () => {
        setShowEditModal(true);
    };

    const handleEditSave = async (newText: string) => {
        const msgId = (message?.id || message?.messageId) as string | undefined;
        if (!roomId || !msgId) return;
        await editMessage(roomId, msgId, newText);
        setShowEditModal(false);
    };

    const handleDelete = () => {
        const msgId = (message?.id || message?.messageId) as string | undefined;
        if (!roomId || !msgId) return;

        showDeleteConfirm(
            () => {
                deleteMessage(roomId, msgId, isCurrentUser);
            },
            isCurrentUser
        );
    };

    const handlePin = () => {
        const msgId = (message?.id || message?.messageId) as string | undefined;
        if (!roomId || !msgId) return;
        pinMessage(roomId, msgId, !message?.isPinned);
    };

    const handleReaction = (emoji: string) => {
        const msgId = (message?.id || message?.messageId) as string | undefined;
        const currentUid = currentUser?.uid ?? currentUser?.id;
        if (!roomId || !msgId || !currentUid) return;
        toggleReaction(roomId, msgId, emoji, currentUid);
    };

    const handleReactionPress = (emoji: string) => {
        const msgId = (message?.id || message?.messageId) as string | undefined;
        const currentUid = currentUser?.uid ?? currentUser?.id;
        if (!roomId || !msgId || !currentUid) return;
        toggleReaction(roomId, msgId, emoji, currentUid);
    };

    const handleCopy = () => {
        if (message?.text) {
            copyToClipboard(message.text);
        }
    };

    const formattedTime = useMemo(() => {
        if (!message?.createdAt) return '';
        return formatTime(message.createdAt);
    }, [message?.createdAt]);

    const onContainerLayout = (e: any) => {
        const y = e?.nativeEvent?.layout?.y;
        const msgId = (message?.id || message?.messageId) as string | undefined;
        if (typeof y === 'number' && msgId && onMessageLayout) {
            onMessageLayout(msgId, y);
        }
    };

    const isReplyingToVibe = message?.replyTo?.type === 'vibe';
    const isImageMessage = useMemo(() => !!message?.imageUrl && !message?.text, [message?.imageUrl, message?.text]);
    const isGiftMessage = useMemo(() => message?.type === 'gift' && !!message?.gift, [message?.type, message?.gift]);
    const isAudioMessage = useMemo(() => message?.type === 'audio' && !!message?.audioUrl, [message?.type, message?.audioUrl]);
    const isSharedPost = message?.type === 'shared_post';
    const isSystemMessage = message?.type === 'system' || message?.uid === 'system';

    if (isSystemMessage) {
        return (
            <View style={styles.systemMessageContainer}>
                <View style={[styles.systemMessageBadge, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.systemMessageText, { color: currentThemeColors.subtleText }]}>
                        {message.text}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <>
            <TouchableOpacity
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={300}
                activeOpacity={0.95}
                style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage]}
                onLayout={onContainerLayout}
            >
                {!isCurrentUser && (
                    <VibeAvatar
                        avatarUrl={message.profileUrl}
                        size={32}
                        frameType={message.activeFrame}
                        showVibeIcon={false}
                        showAddButton={false}
                    />
                )}
                <View style={[styles.messageContent, { maxWidth: '80%' }]}>

                    {/* Reply Preview - Attached to top (Messenger Style) */}
                    {message?.replyTo && !isReplyingToVibe && (
                        <View style={[
                            styles.replyContainer,
                            {
                                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.15)' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                                borderTopLeftRadius: 12,
                                borderTopRightRadius: 12,
                                borderBottomLeftRadius: isCurrentUser ? 12 : 4,
                                borderBottomRightRadius: isCurrentUser ? 4 : 12,
                                marginBottom: -4,
                                zIndex: -1,
                                paddingBottom: 12,
                                opacity: 0.9,
                                transform: [{ scale: 0.95 }, { translateY: 4 }],
                                borderLeftWidth: isCurrentUser ? 0 : 3,
                                borderRightWidth: isCurrentUser ? 3 : 0,
                                borderLeftColor: chatTheme.sentMessageColor,
                                borderRightColor: chatTheme.sentMessageColor,
                            }
                        ]}>
                            <View style={styles.replyContent}>
                                <Text style={[
                                    styles.replySender,
                                    { color: isCurrentUser ? '#FFFFFF' : chatTheme.sentMessageColor, fontSize: 12, fontWeight: '700' }
                                ]}>
                                    {message.replyTo.senderName}
                                </Text>
                                <Text
                                    style={[
                                        styles.replyText,
                                        { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : currentThemeColors.subtleText, fontSize: 12 }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {message.replyTo.imageUrl ? '📷 Hình ảnh' : message.replyTo.text}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Vibe Reply - Attached to top */}
                    {isReplyingToVibe && (
                        <View style={[
                            styles.replyContainer,
                            {
                                backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.15)' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                                borderTopLeftRadius: 12,
                                borderTopRightRadius: 12,
                                borderBottomLeftRadius: isCurrentUser ? 12 : 4,
                                borderBottomRightRadius: isCurrentUser ? 4 : 12,
                                marginBottom: -4,
                                zIndex: -1,
                                paddingBottom: 12,
                                opacity: 0.9,
                                transform: [{ scale: 0.95 }, { translateY: 4 }],
                                borderLeftWidth: isCurrentUser ? 0 : 3,
                                borderRightWidth: isCurrentUser ? 3 : 0,
                                borderLeftColor: chatTheme.sentMessageColor,
                                borderRightColor: chatTheme.sentMessageColor,
                            }
                        ]}>
                            <View style={styles.replyContent}>
                                <Text style={[
                                    styles.replySender,
                                    { color: isCurrentUser ? '#FFFFFF' : chatTheme.sentMessageColor, fontSize: 12, fontWeight: '700' }
                                ]}>
                                    Trả lời Vibe
                                </Text>
                                <Text
                                    style={[
                                        styles.replyText,
                                        { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : currentThemeColors.subtleText, fontSize: 12 }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {message?.replyTo?.vibeEmoji || '✨'} {message?.replyTo?.vibeName || ''}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Message Bubble */}
                    <View style={[styles.bubbleContainer, isCurrentUser ? styles.bubbleContainerRight : styles.bubbleContainerLeft]}>
                        <View style={[
                            styles.bubble,
                            isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
                            isHighlighted && styles.highlightedBubble,
                            isImageMessage && styles.imageBubble,
                        ]}>
                            <View
                                style={[
                                    styles.bubbleContent,
                                    { backgroundColor: isImageMessage || isGiftMessage ? 'transparent' : bubbleColors[0] },
                                    isCurrentUser ? styles.currentUserBubbleShadow : styles.otherUserBubbleShadow,
                                    isImageMessage && { padding: 0 },
                                    isGiftMessage && { padding: 0 },
                                    isAudioMessage && { minWidth: 180 },
                                ]}
                            >
                                {isGiftMessage ? (
                                    <GiftMessage
                                        gift={message.gift}
                                        senderName={message?.senderName}
                                        isCurrentUser={isCurrentUser}
                                    themeColors={currentThemeColors}
                                />
                            ) : isSharedPost ? (
                                <View style={styles.sharedPostContainer}>
                                    <View style={styles.sharedPostHeader}>
                                        <MaterialIcons name="share" size={14} color={isCurrentUser ? "#FFF" : chatTheme.sentMessageColor} />
                                        <Text style={[styles.sharedPostHeaderText, { color: isCurrentUser ? "#FFF" : chatTheme.sentMessageColor }]}>
                                            Bài post được chia sẻ
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.sharedPostContent}>
                                        {message.postImage ? (
                                            <Image source={{ uri: message.postImage }} style={styles.sharedPostImage} contentFit="cover" />
                                        ) : (
                                            <View style={[styles.sharedPostImage, { backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                                                <MaterialIcons name="article" size={30} color="#999" />
                                            </View>
                                        )}
                                        <View style={styles.sharedPostTextContainer}>
                                            <Text style={[styles.sharedPostTitle, { color: isCurrentUser ? "#FFF" : currentThemeColors.text }]} numberOfLines={1}>
                                                Bài post từ {message.postOwnerName || 'Người dùng'}
                                            </Text>
                                            <Text style={[styles.sharedPostDesc, { color: isCurrentUser ? "rgba(255,255,255,0.8)" : currentThemeColors.subtleText }]} numberOfLines={2}>
                                                {message.postContent || ''}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity 
                                        style={styles.viewPostButton}
                                        onPress={() => {
                                            // Điều hướng đến chi tiết bài viết
                                            const routePeId = message.postId;
                                            if (routePeId) {
                                                const path = `/(screens)/social/PostDetailScreen` as any;
                                                // @ts-ignore
                                                router.push({ pathname: path, params: { postId: routePeId } });
                                            }
                                        }}
                                    >
                                        <Text style={[styles.viewPostText, { color: isCurrentUser ? "#FFF" : chatTheme.sentMessageColor }]}>
                                            Xem post gốc
                                        </Text>
                                        <MaterialIcons name="open-in-new" size={14} color={isCurrentUser ? "#FFF" : chatTheme.sentMessageColor} />
                                    </TouchableOpacity>

                                    {message?.text ? (
                                        <View style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
                                            <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : chatTheme.textColor }]}>
                                                {message.text}
                                            </Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.timeStatusRow}>
                                        <Text style={[styles.timeText, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : currentThemeColors.subtleText }]}>
                                            {formattedTime}
                                        </Text>
                                        {isCurrentUser && (
                                            (() => {
                                                switch (message?.status) {
                                                    case 'read':
                                                        return <MaterialIcons name="visibility" size={14} color="#FFF" />;
                                                    case 'sent':
                                                    case 'delivered':
                                                        return <MaterialIcons name="done" size={14} color="rgba(255,255,255,0.7)" />;
                                                    default:
                                                        return <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.7)" />;
                                                }
                                            })()
                                        )}
                                    </View>
                                </View>
                            ) : isAudioMessage ? (
                                    <AudioMessage
                                        uri={message.audioUrl}
                                        duration={message.duration}
                                        isCurrentUser={isCurrentUser}
                                        themeColors={currentThemeColors}
                                    />
                                ) : message?.imageUrl ? (
                                    <View style={styles.imageMessageContainer}>
                                        <View
                                            style={[
                                                styles.imageWrapper,
                                                {
                                                    borderColor: isCurrentUser ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.1)',
                                                    backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
                                                },
                                            ]}
                                        >
                                            <CustomImage
                                                source={message.imageUrl}
                                                style={styles.messageImage}
                                                onLongPress={handleLongPress}
                                            />
                                            <LinearGradient
                                                colors={['transparent', 'rgba(0,0,0,0.5)']}
                                                style={styles.imageOverlay}
                                            >
                                                <View style={styles.imageMetaPill}>
                                                    <Text style={[styles.timeText, { color: '#FFFFFF' }]}>
                                                        {formattedTime}
                                                    </Text>
                                                    {isCurrentUser && (
                                                        (() => {
                                                            switch (message?.status) {
                                                                case 'read':
                                                                    return <MaterialIcons name="visibility" size={14} color="#FFF" />;
                                                                case 'sent':
                                                                case 'delivered':
                                                                    return <MaterialIcons name="done" size={14} color="#FFF" />;
                                                                default:
                                                                    return <MaterialIcons name="schedule" size={14} color="#FFF" />;
                                                            }
                                                        })()
                                                    )}
                                                </View>
                                            </LinearGradient>
                                        </View>
                                        {message.text ? (
                                            <View
                                                style={[
                                                    styles.imageCaptionContainer,
                                                    {
                                                        backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.06)',
                                                        borderColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.1)',
                                                    },
                                                ]}
                                            >
                                                <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : chatTheme.textColor }]}>
                                                    {message.text}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                ) : (
                                    <View style={{ width: '100%' }}>
                                        {isCurrentUser && chatTheme.sentMessageGradient ? (
                                            <LinearGradient
                                                colors={chatTheme.sentMessageGradient as [string, string, ...string[]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={[styles.bubbleContent, { padding: 0 }]}
                                            >
                                                <View style={{ padding: 12, paddingHorizontal: 16 }}>
                                                    <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
                                                        {message?.text}
                                                    </Text>
                                                    <View style={styles.timeStatusRow}>
                                                        <Text style={[styles.timeText, { color: 'rgba(255,255,255,0.8)' }]}>
                                                            {formattedTime}
                                                        </Text>
                                                        {(() => {
                                                            switch (message?.status) {
                                                                case 'read':
                                                                    return <MaterialIcons name="visibility" size={14} color="#FFF" />;
                                                                case 'sent':
                                                                case 'delivered':
                                                                    return <MaterialIcons name="done" size={14} color="rgba(255,255,255,0.7)" />;
                                                                default:
                                                                    return <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.7)" />;
                                                            }
                                                        })()}
                                                    </View>
                                                </View>
                                            </LinearGradient>
                                        ) : (
                                            <View style={{ paddingVertical: 2 }}>
                                                <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : chatTheme.textColor }]}>
                                                    {message?.text}
                                                </Text>
                                                <View style={styles.timeStatusRow}>
                                                    <Text style={[styles.timeText, { color: isCurrentUser ? 'rgba(255,255,255,0.8)' : currentThemeColors.subtleText }]}>
                                                        {formattedTime}
                                                    </Text>
                                                    {isCurrentUser && (
                                                        (() => {
                                                            switch (message?.status) {
                                                                case 'read':
                                                                    return <MaterialIcons name="visibility" size={14} color="#FFF" />;
                                                                case 'sent':
                                                                case 'delivered':
                                                                    return <MaterialIcons name="done" size={14} color="rgba(255,255,255,0.7)" />;
                                                                default:
                                                                    return <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.7)" />;
                                                            }
                                                        })()
                                                    )}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                                {message.isEdited && (
                                    <Text style={[styles.editedLabel, { color: isCurrentUser ? 'rgba(255,255,255,0.6)' : currentThemeColors.subtleText }]}>
                                        đã chỉnh sửa
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Reactions Overlay */}
                        {message?.reactions && Object.keys(message.reactions).length > 0 && (
                            <View style={[styles.reactionsOverlay, isCurrentUser ? { left: -10 } : { right: -10 }]}>
                                <MessageReactions
                                    reactions={message.reactions}
                                    onReactionPress={handleReactionPress}
                                    currentUserId={currentUser?.uid}
                                />
                            </View>
                        )}
                    </View>

                    {/* Gift Badge */}
                    {isGiftMessage && (
                        <View style={[styles.giftBadge, { alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }]}>
                            <Text style={[styles.giftBadgeText, { color: currentThemeColors.tint }]}>
                                🎉 Cám ơn vì món quà!
                            </Text>
                        </View>
                    )}

                    {showTime && (
                        <View style={[styles.detailedTimeContainer, { alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }]}>
                            <Text style={[styles.detailedTimeText, { color: currentThemeColors.subtleText }]}>
                                {message?.createdAt?.toDate?.().toLocaleString('vi-VN') || 'N/A'}
                            </Text>
                        </View>
                    )}
                </View>
                {isCurrentUser && (
                    <VibeAvatar
                        avatarUrl={currentUser?.profileUrl}
                        size={32}
                        frameType={currentUser?.activeFrame}
                        showVibeIcon={false}
                        showAddButton={false}
                    />
                )}
            </TouchableOpacity>

            <MessageActionSheet
                visible={showActionSheet}
                onClose={() => setShowActionSheet(false)}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                onCopy={handleCopy}
                onReaction={handleReaction}
                isCurrentUser={isCurrentUser}
                isPinned={message?.isPinned}
                message={message}
                onReport={() => onReport?.(message)}
            />

            <EditMessageModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSave={handleEditSave}
                originalText={message?.text || ''}
                loading={isLoading}
            />
        </>
    );
}

const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 2,
        paddingHorizontal: 12,
        alignItems: 'flex-end',
    },
    currentUserMessage: {
        flexDirection: 'row-reverse',
    },
    otherUserMessage: {
        flexDirection: 'row',
    },
    avatar: {
        marginHorizontal: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    messageContent: {
        flexShrink: 1,
    },
    bubbleContainer: {
        position: 'relative',
        marginVertical: 1,
    },
    bubbleContainerRight: {
        alignItems: 'flex-end',
    },
    bubbleContainerLeft: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '100%',
    },
    bubbleGradient: {
        padding: 12,
        borderRadius: 20,
    },
    bubbleRight: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    bubbleLeft: {
        borderTopLeftRadius: 4,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    currentUserBubbleShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    otherUserBubbleShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    highlightedBubble: {
        borderWidth: 3,
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        shadowColor: '#6366F1',
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        letterSpacing: 0.1,
    },
    timeStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
        opacity: 0.8,
    },
    timeText: {
        fontSize: 10,
        fontWeight: '500',
    },
    editedLabel: {
        fontSize: 10,
        fontStyle: 'italic',
        marginTop: 2,
        opacity: 0.7,
    },
    detailedTimeContainer: {
        marginTop: 6,
    },
    detailedTimeText: {
        fontSize: 11,
        fontStyle: 'italic',
        opacity: 0.6,
    },
    replyContainer: {
        padding: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    replyContent: {
        gap: 2,
    },
    replySender: {
        fontSize: 12,
        fontWeight: '700',
    },
    replyText: {
        fontSize: 13,
        lineHeight: 18,
    },
    giftBadge: {
        marginTop: 4,
    },
    giftBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    imageBubble: {
        overflow: 'hidden',
        borderRadius: 24,
    },
    imageMessageContainer: {
        gap: 8,
    },
    imageWrapper: {
        position: 'relative',
        width: IMAGE_BUBBLE_WIDTH,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
    },
    messageImage: {
        width: '100%',
        aspectRatio: 4 / 5,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignItems: 'flex-end',
    },
    imageMetaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(2, 6, 23, 0.55)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    imageCaptionContainer: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    bubbleContent: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        maxWidth: '100%',
    },
    reactionsOverlay: {
        position: 'absolute',
        bottom: -12,
        zIndex: 10,
    },
    systemMessageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
        width: '100%',
    },
    systemMessageBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    systemMessageText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    sharedPostContainer: {
        width: 260,
    },
    sharedPostHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
    },
    sharedPostHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        opacity: 0.9,
    },
    sharedPostContent: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 12,
        marginHorizontal: 8,
        marginBottom: 10,
        overflow: 'hidden',
    },
    sharedPostImage: {
        width: '100%',
        height: 140,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    sharedPostTextContainer: {
        padding: 10,
    },
    sharedPostTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    sharedPostDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    viewPostButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.1)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    viewPostText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
