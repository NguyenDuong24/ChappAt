import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, TouchableOpacity, ImageBackground, BackHandler, useWindowDimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { doc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import GroupChatHeader from '@/components/groups/GroupChatHeader';
import GroupMessageList from '@/components/groups/GroupMessageList';
import * as ImagePicker from 'expo-image-picker';
import ReportModalSimple from '@/components/common/ReportModalSimple';
import { useOptimizedGroupMessages } from '@/hooks/useOptimizedGroupMessages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import UnifiedChatInput from '@/components/chat/UnifiedChatInput';
import { useTranslation } from 'react-i18next';
import { ChatThemeProvider, useChatTheme } from '@/context/ChatThemeContext';
import ChatBackgroundEffects from '@/components/chat/ChatBackgroundEffects';
import GiftBurst from '@/components/chat/GiftBurst';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadLocalFileToStorage } from '@/utils/storageUpload';
import AppDrawer, { type FeatureDrawerKey } from '@/components/drawer/AppDrawer';
import { RevealScalableView } from '@/components/reveal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getSensitiveImageBlockMessage, moderateImageBeforePublish } from '@/services/imageModerationGuard';
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
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { user } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<any>(null);

  const [group, setGroup] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [scrollToEndTrigger, setScrollToEndTrigger] = useState(0);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const [featureDrawer, setFeatureDrawer] = useState<FeatureDrawerKey | null>(null);
  const [pendingImageMessages, setPendingImageMessages] = useState<any[]>([]);

  const { currentTheme, currentEffect, loadTheme, loadEffect } = useChatTheme();
  const chatThemeForUI = useMemo(() => currentTheme?.id === 'default' ? undefined : currentTheme, [currentTheme]);

  const drawerOffset = useMemo(() => Math.min(width * 0.62, 250), [width]);
  const revealActive = !!featureDrawer;

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
    const baseColors = (Colors[theme] || Colors.light) || Colors.light;

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
      backgroundHeader: hasBgImage
        ? (isDarkChatTheme ? 'rgba(8,12,24,0.62)' : 'rgba(255,255,255,0.72)')
        : chatThemeForUI.backgroundColor,
      surface: hasBgImage
        ? (isDarkChatTheme ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.86)')
        : (isDarkChatTheme ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)'),
      text: chatThemeForUI.textColor,
      tint: chatThemeForUI.sentMessageColor,
      sentMessageGradient: chatThemeForUI.sentMessageGradient,
      receivedMessageColor: chatThemeForUI.receivedMessageColor,
      border: isDarkChatTheme ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.10)',
      subtleText: isDarkChatTheme ? 'rgba(255,255,255,0.68)' : 'rgba(15,23,42,0.58)',
      isDarkChatTheme,
    };
  }, [theme, chatThemeForUI]);

  // Use optimized group messages hook
  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadMore,
    isLoadingMore,
    isInitialLoadComplete
  } = useOptimizedGroupMessages({
    groupId: id as string,
    currentUserId: user?.uid || '',
    pageSize: 30,
    enabled: true
  });

  const displayMessages = useMemo(() => {
    if (pendingImageMessages.length === 0) return messages;
    const confirmedClientIds = new Set(messages.map((message: any) => message?.clientId).filter(Boolean));
    const visiblePending = pendingImageMessages.filter(message => !confirmedClientIds.has(message.clientId));
    return [...messages, ...visiblePending].sort((a: any, b: any) => {
      const toMs = (value: any) => {
        if (!value) return 0;
        if (typeof value.toMillis === 'function') return value.toMillis();
        if (typeof value.seconds === 'number') return value.seconds * 1000;
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'number') return value;
        return 0;
      };
      return toMs(a.createdAt) - toMs(b.createdAt);
    });
  }, [messages, pendingImageMessages]);

  useEffect(() => {
    setPendingImageMessages([]);
  }, [id]);

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
          const members = Array.isArray(groupData.members) ? groupData.members : [];
          const memberIds = Array.isArray(groupData.memberIds) ? groupData.memberIds : [];
          if (!members.includes(user.uid) && !memberIds.includes(user.uid)) {
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

  const handleSend = useCallback(async (textOverride?: string) => {
    const raw = typeof textOverride === 'string' ? textOverride : newMessage;
    const messageText = raw.trim();
    if (!messageText) return;
    try {
      const messagesRef = collection(doc(db, 'groups', id as string), 'messages');
      const messageData: any = {
        text: messageText,
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

  const openManagementDrawer = useCallback(() => {
    setFeatureDrawer('groupManagement');
  }, []);

  const closeFeatureDrawer = useCallback(() => {
    setFeatureDrawer(null);
  }, []);

  useEffect(() => {
    if (!featureDrawer) {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFeatureDrawer(null);
      return true;
    });
    return () => sub.remove();
  }, [featureDrawer]);

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
    let pendingClientId = '';
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('common.error'), t('groups.photo_permission_error'));
        return;
      }
      if (!user?.uid) {
        Alert.alert(t('common.error'), t('groups.login_required'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const moderation = await moderateImageBeforePublish(uri, {
          context: 'group_chat',
          actorId: user.uid,
          actorName: user.displayName || user.username || '',
          groupId: id as string,
          source: 'group_chat_image',
        });

        if (!moderation.allowed) {
          Alert.alert(
            t('moderation.sensitive_image_title', 'Anh nhay cam'),
            getSensitiveImageBlockMessage(moderation.reason),
          );
          return;
        }

        const clientId = `local-group-image-${Date.now()}`;
        pendingClientId = clientId;
        const pendingMessage = {
          id: clientId,
          clientId,
          imageUrl: uri,
          url: uri,
          createdAt: new Date(),
          uid: user.uid,
          profileUrl: user.photoURL || user.profileUrl || '',
          senderName: user.displayName || user.username || '',
          status: 'uploading',
          type: 'image',
          activeFrame: user.activeFrame || null,
          isLocalPending: true,
        };
        setPendingImageMessages(prev => [...prev, pendingMessage]);
        setScrollToEndTrigger(prev => prev + 1);

        const downloadURL = await uploadLocalFileToStorage({
          uri,
          path: `group-images/${id}/${user.uid}/${Date.now()}.jpg`,
          contentType: 'image/jpeg',
        });

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
          clientId,
          activeFrame: user.activeFrame || null,
        });
        setScrollToEndTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('[ERROR] Send image failed:', (error as any).message);
      setError(`${t('groups.send_image_error')}: ${(error as any).message}`);
      if (pendingClientId) {
        setPendingImageMessages(prev => prev.filter(message => message.clientId !== pendingClientId));
      }
    }
  }, [id, user, t]);

  const renderContent = () => (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, Platform.OS === 'android' && { paddingBottom: Math.max(insets.bottom, 8) + keyboardHeight }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: chatThemeForUI ? 'transparent' : currentThemeColors.background }]}>
        {!chatThemeForUI && (
          <LinearGradient
            colors={theme === 'dark'
              ? ['rgba(14,165,233,0.12)', 'transparent', 'rgba(244,63,94,0.08)']
              : ['rgba(14,165,233,0.10)', 'rgba(255,255,255,0)', 'rgba(244,63,94,0.08)']}
            style={styles.chatBackdrop}
            pointerEvents="none"
          />
        )}
        <GroupChatHeader
          group={group}
          onBack={() => router.back()}
          currentThemeColors={currentThemeColors}
          onOpenManagementDrawer={openManagementDrawer}
        />
        <View style={styles.messagesContainer}>
          <GroupMessageList
            scrollViewRef={scrollViewRef}
            messages={displayMessages}
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
                {t('groups.reply_to', { name: replyTo.senderName || t('groups.user') })}
              </Text>
              <View style={styles.replyPreviewRow}>
                {replyTo.imageUrl && (
                  <Ionicons name="image-outline" size={15} color={currentThemeColors.subtleText} />
                )}
                <Text style={[styles.replyText, { color: currentThemeColors.text }]} numberOfLines={1}>
                  {replyTo.imageUrl ? t('groups.image') : replyTo.text}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={cancelReply}
              style={[styles.cancelReply, { backgroundColor: currentThemeColors.border }]}
              activeOpacity={0.7}
              accessibilityLabel={t('groups.cancel_reply')}
            >
              <Ionicons name="close" size={18} color={currentThemeColors.subtleText} />
            </TouchableOpacity>
          </View>
        )}

        <UnifiedChatInput
          value={newMessage}
          onChangeText={setNewMessage}
          onSend={handleSend}
          onQuickSend={handleSend}
          onImagePress={handlePickImage}
          sendDisabled={newMessage.trim().length === 0}
          showImage
          showGift={false}
          showAudio={false}
          leftIconVariant="add"
          themeColors={currentThemeColors}
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

  const mainUi = (
    <RevealScalableView
      revealed={revealActive}
      side="left"
      scale={0.86}
      offset={drawerOffset}
      style={{ flex: 1 }}
    >
      {renderContent()}
    </RevealScalableView>
  );

  const drawers = (
    <AppDrawer
      visible={!!featureDrawer}
      drawerKey={featureDrawer}
      onClose={closeFeatureDrawer}
      paramsByKey={{
        groupManagement: { id: String(id || '') },
      }}
    />
  );

  if (currentTheme.backgroundImage) {
    return (
      <View style={{ flex: 1 }}>
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
                {mainUi}
              </View>
            </LinearGradient>
          ) : (
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}>
              {mainUi}
            </View>
          )}
        </ImageBackground>
        {drawers}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: currentThemeColors.background }}>
      {mainUi}
      {drawers}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: 'transparent',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderWidth: 1,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  replyBar: {
    width: 4,
    height: 38,
    minHeight: 36,
    borderRadius: 999,
  },
  replyContent: {
    flex: 1,
    gap: 2,
  },
  replyLabel: {
    fontSize: 12.5,
    fontWeight: '900',
  },
  replyText: {
    fontSize: 13.5,
    fontWeight: '600',
    opacity: 0.8,
    flexShrink: 1,
  },
  replyPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelReply: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

