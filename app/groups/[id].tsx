import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, TouchableOpacity, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import GroupChatHeader from '@/components/groups/GroupChatHeader';
import GroupMessageList from '@/components/groups/GroupMessageList';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import { useOptimizedGroupMessages } from '@/hooks/useOptimizedGroupMessages';
import { nsfwService } from '@/services/nsfwService';
import OptimizedGroupInput from '@/components/groups/OptimizedGroupInput';
import { useTranslation } from 'react-i18next';
import { ChatThemeProvider, useChatTheme } from '@/context/ChatThemeContext';
import ChatBackgroundEffects from '@/components/chat/ChatBackgroundEffects';
import GiftBurst from '@/components/chat/GiftBurst';
import { LinearGradient } from 'expo-linear-gradient';

const storage = getStorage();

export default function GroupChatScreen() {
  return (
    <ChatThemeProvider>
      <GroupChatContent />
    </ChatThemeProvider>
  );
}

function GroupChatContent() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const router = useRouter();
  const scrollViewRef = useRef<any>(null);

  const [group, setGroup] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [scrollToEndTrigger, setScrollToEndTrigger] = useState(0);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);

  const { currentTheme, currentEffect, loadTheme, loadEffect } = useChatTheme();
  const chatThemeForUI = useMemo(() => currentTheme?.id === 'default' ? undefined : currentTheme, [currentTheme]);

  // Load theme and effect when entering room
  useEffect(() => {
    if (id) {
      const unsubTheme = loadTheme(id as string);
      const unsubEffect = loadEffect(id as string);
      return () => {
        unsubTheme();
        unsubEffect();
      };
    }
  }, [id, loadTheme, loadEffect]);

  const currentThemeColors = useMemo(() => {
    const baseColors = (theme === 'dark' ? Colors.dark : Colors.light) || Colors.light;

    if (!chatThemeForUI) {
      return baseColors;
    }

    // Determine if the chat theme is "dark" based on text color or ID
    const isDarkChatTheme = chatThemeForUI.textColor === '#FFFFFF' ||
      chatThemeForUI.textColor === '#E4E6EB' ||
      ['dark', 'messenger_dark', 'galaxy_premium', 'cyberpunk', 'underwater', 'ocean', 'neon_night'].includes(chatThemeForUI.id);

    const hasBgImage = !!chatThemeForUI.backgroundImage;

    return {
      ...baseColors,
      background: chatThemeForUI.backgroundColor,
      backgroundHeader: hasBgImage ? 'rgba(0,0,0,0.1)' : chatThemeForUI.backgroundColor,
      surface: hasBgImage
        ? (isDarkChatTheme ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)')
        : (isDarkChatTheme ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)'),
      text: chatThemeForUI.textColor,
      tint: chatThemeForUI.sentMessageColor,
      sentMessageGradient: chatThemeForUI.sentMessageGradient,
      receivedMessageColor: chatThemeForUI.receivedMessageColor,
      border: isDarkChatTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      subtleText: isDarkChatTheme ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
      isDarkChatTheme,
    };
  }, [theme, chatThemeForUI]);

  // Use optimized group messages hook
  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadMore,
    refresh,
    isLoadingMore,
    isInitialLoadComplete
  } = useOptimizedGroupMessages({
    groupId: id as string,
    currentUserId: user?.uid || '',
    pageSize: 30,
    enabled: true
  });

  // Real-time group listener
  useEffect(() => {
    if (!id) {
      setError(t('groups.invalid_id'));
      setLoading(false);
      return;
    }

    if (!user?.uid) {
      console.warn('[WARN] User not authenticated, redirecting to signin');
      setError(t('groups.login_required'));
      router.replace('/signin');
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'groups', id as string),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const groupData = { id: docSnapshot.id, ...docSnapshot.data() } as any;

          // Check membership
          if (!groupData.members || !Array.isArray(groupData.members) || !groupData.members.includes(user.uid)) {
            setError(t('groups.not_member'));
            setGroup(null);
          } else {
            setGroup(groupData);
            setError(null);
          }
        } else {
          setError(t('groups.not_found'));
          setGroup(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ERROR] Group snapshot error:', err);
        setError(t('groups.connection_error'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, user?.uid, t, router]);

  // Timeout effect
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      if (loading && !group) {
        setLoading(false);
        setError(t('groups.load_timeout'));
      }
    }, 20000);
    return () => clearTimeout(timeout);
  }, [loading, group, t]);

  // Auto-clear highlight after 2 seconds
  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => setHighlightedMessageId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim()) return;
    try {
      const messagesRef = collection(doc(db, 'groups', id as string), 'messages');
      const messageData: any = {
        text: newMessage,
        createdAt: serverTimestamp(),
        uid: user.uid,
        profileUrl: user.photoURL || user.profileUrl || '',
        senderName: user.displayName || user.username || '',
        status: 'sent',
        reactions: {},
        isPinned: false,
        isEdited: false,
        isRecalled: false,
        activeFrame: user.activeFrame || null,
      };

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text || '',
          senderName: replyTo.senderName || '',
          imageUrl: replyTo.imageUrl || null,
        };
      }

      await addDoc(messagesRef, messageData);
      setNewMessage('');
      setReplyTo(null);
      setHighlightedMessageId(null);
      setScrollToEndTrigger(prev => prev + 1);
    } catch (error) {
      console.error('[ERROR] Send message failed:', (error as any).message);
      setError(`${t('groups.send_error')}: ${(error as any).message}`);
    }
  }, [newMessage, id, user, replyTo, t]);

  const handleReply = useCallback((message: any) => {
    setReplyTo(message);
    setHighlightedMessageId(message.id);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setHighlightedMessageId(null);
  }, []);

  const handleUserPress = useCallback((userId: string) => {
    router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId } });
  }, [router]);

  const openReportForMessage = useCallback((message: any) => {
    try {
      const messageType = message?.imageUrl ? 'image' : 'text';
      setReportTarget({
        id: message?.id || message?.messageId,
        name: message?.senderName || t('groups.user'),
        content: message?.text || (message?.imageUrl ? t('groups.image') : ''),
        messageType,
        messageText: messageType === 'text' ? (message?.text || '') : '',
        messageImageUrl: messageType === 'image' ? (message?.imageUrl || '') : '',
      });
      setReportVisible(true);
    } catch (e) {
      console.warn('openReportForMessage failed', e);
    }
  }, [t]);

  const submitMessageReport = useCallback(async (data: any) => {
    try {
      const sanitized = {
        ...data,
        images: Array.isArray(data?.images) ? data.images : [],
      };
      await addDoc(collection(db, 'reports'), {
        ...sanitized,
        context: 'group_chat',
        groupId: id,
        reportedMessageId: reportTarget?.id || null,
        reportedMessageType: reportTarget?.messageType || null,
        reportedMessageText: reportTarget?.messageType === 'text' ? (reportTarget?.messageText || '') : '',
        reportedMessageImageUrl: reportTarget?.messageType === 'image' ? (reportTarget?.messageImageUrl || '') : '',
        createdAt: new Date(),
      });
    } catch (e) {
      console.error('submitMessageReport error', e);
      throw e;
    }
  }, [id, reportTarget]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const checkResult = await nsfwService.classifyImage(uri);

        const response = await fetch(uri);
        const blob = await response.blob();
        const imgRef = ref(storage, `groups/${id}/messages/${Date.now()}`);
        await uploadBytes(imgRef, blob);
        const downloadURL = await getDownloadURL(imgRef);

        const messagesRef = collection(doc(db, 'groups', id as string), 'messages');
        await addDoc(messagesRef, {
          imageUrl: downloadURL,
          url: downloadURL,
          createdAt: serverTimestamp(),
          uid: user.uid,
          profileUrl: user.photoURL || user.profileUrl || '',
          senderName: user.displayName || user.username || '',
          status: 'sent',
          type: 'image',
          activeFrame: user.activeFrame || null,
        });

        if (checkResult.isInappropriate) {
          try {
            await addDoc(collection(db, 'flagged_content'), {
              context: 'group_chat',
              createdAt: serverTimestamp(),
              imageUrl: downloadURL,
              reason: checkResult.reason || 'NSFW detected',
              groupId: id,
              senderId: user.uid,
              senderName: user.displayName || user.username || '',
              scores: checkResult.scores || {},
              status: 'pending',
              type: 'image',
            });
          } catch (flagErr) {
            console.warn('⚠️ [uploadImage] Failed to log flagged content:', flagErr);
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] Send image failed:', (error as any).message);
      setError(`${t('groups.send_image_error')}: ${(error as any).message}`);
    }
  }, [id, user, t]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentThemeColors.background }]}>
        <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
          {t('groups.loading')}
        </Text>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: currentThemeColors.background }]}>
        <Text style={[styles.errorText, { color: currentThemeColors.text }]}>
          {error || t('groups.not_found')}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            setRetryKey(prev => prev + 1);
          }}
        >
          <Text style={[styles.buttonText, { color: currentThemeColors.tint }]}>
            {t('common.retry')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, { color: currentThemeColors.tint }]}>
            {t('common.back')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderContent = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: chatThemeForUI ? 'transparent' : currentThemeColors.background }]}>
        <GroupChatHeader
          group={group}
          onBack={() => router.back()}
          currentThemeColors={currentThemeColors}
        />
        <View style={styles.messagesContainer}>
          <GroupMessageList
            scrollViewRef={scrollViewRef}
            messages={messages}
            currentUser={user}
            groupId={id as string}
            onReply={handleReply}
            highlightedMessageId={highlightedMessageId}
            onClearHighlight={() => setHighlightedMessageId(null)}
            onReport={openReportForMessage}
            onUserPress={handleUserPress}
            loading={messagesLoading}
            onLoadMore={loadMore}
            hasMore={hasMore}
            loadingMore={isLoadingMore}
            isLoadingMore={isLoadingMore}
            isInitialLoadComplete={isInitialLoadComplete}
            scrollToEndTrigger={scrollToEndTrigger}
            currentThemeColors={currentThemeColors}
          />
        </View>

        {replyTo && (
          <View style={[styles.replyContainer, {
            backgroundColor: currentThemeColors.surface || currentThemeColors.background,
            borderTopColor: currentThemeColors.border,
            borderLeftColor: currentThemeColors.tint
          }]}>
            <View style={[styles.replyBar, { backgroundColor: currentThemeColors.tint }]} />
            <View style={styles.replyContent}>
              <Text style={[styles.replyLabel, { color: currentThemeColors.tint }]}>
                ↩ {t('groups.reply_to', { name: replyTo.senderName })}
              </Text>
              <Text style={[styles.replyText, { color: currentThemeColors.text }]} numberOfLines={1}>
                {replyTo.imageUrl ? `📷 ${t('groups.image')}` : replyTo.text}
              </Text>
            </View>
            <TouchableOpacity
              onPress={cancelReply}
              style={[styles.cancelReply, { backgroundColor: currentThemeColors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: currentThemeColors.subtleText }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <OptimizedGroupInput
          newMessage={newMessage}
          onChangeText={setNewMessage}
          onSend={handleSend}
          onImagePress={handlePickImage}
          sendDisabled={newMessage.trim().length === 0}
          currentThemeColors={currentThemeColors}
        />

        <ChatBackgroundEffects
          effect={currentEffect}
          themeId={currentTheme.id}
          themeColor={currentThemeColors.tint}
          backgroundColor={currentThemeColors.background}
        />

        <GiftBurst
          visible={!!burstEmoji}
          emoji={burstEmoji || '🎁'}
          onComplete={() => setBurstEmoji(null)}
        />
      </View>

      <ReportModalSimple
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={submitMessageReport}
        targetType="message"
        currentUser={{ uid: user?.uid || '' }}
        targetInfo={{
          id: reportTarget?.id || '',
          name: reportTarget?.name || '',
          content: reportTarget?.content || '',
        }}
      />
    </KeyboardAvoidingView>
  );

  if (currentTheme.backgroundImage) {
    return (
      <ImageBackground
        source={{ uri: currentTheme.backgroundImage }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {currentTheme.gradientColors && currentTheme.gradientColors.length > 0 ? (
          <LinearGradient
            colors={currentTheme.gradientColors as [string, string, ...string[]]}
            style={{ flex: 1 }}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}>
              {renderContent()}
            </View>
          </LinearGradient>
        ) : (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}>
            {renderContent()}
          </View>
        )}
      </ImageBackground>
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
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  replyBar: {
    width: 4,
    height: '100%',
    minHeight: 36,
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
    gap: 2,
  },
  replyLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyText: {
    fontSize: 14,
    opacity: 0.8,
  },
  cancelReply: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});