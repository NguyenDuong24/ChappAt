import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
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

const storage = getStorage();

export default function GroupChatScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const scrollViewRef = useRef<any>(null);

  const [group, setGroup] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // NEW: simple report modal state
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [scrollToEndTrigger, setScrollToEndTrigger] = useState(0);

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

    console.log(`[DEBUG] Setting up listener for group ID: ${id}`);

    const unsubscribe = onSnapshot(doc(db, 'groups', id as string),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const groupData = { id: docSnapshot.id, ...docSnapshot.data() } as any;

          // Check membership
          if (!groupData.members || !Array.isArray(groupData.members) || !groupData.members.includes(user.uid)) {
            console.warn(`[WARN] User ${user.uid} no longer a member.`);
            setError(t('groups.not_member'));
            setGroup(null);
          } else {
            setGroup(groupData);
            setError(null);
          }
        } else {
          console.error(`[ERROR] Group ${id} not found`);
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

    return () => {
      console.log('[DEBUG] Unsubscribing from group listener');
      unsubscribe();
    };
  }, [id, user?.uid]);

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
  }, [loading, group]);

  // Auto-clear highlight after 2 seconds
  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => setHighlightedMessageId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const handleSend = async () => {
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
      };

      // Add reply data if replying to a message
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
      setReplyTo(null); // Clear reply after sending
      setHighlightedMessageId(null);
      // Trigger scroll to end after sending
      setScrollToEndTrigger(prev => prev + 1);
    } catch (error) {
      console.error('[ERROR] Send message failed:', (error as any).message);
      setError(`${t('groups.send_error')}: ${(error as any).message}`);
    }
  };

  const handleReply = (message: any) => {
    setReplyTo(message);
    setHighlightedMessageId(message.id);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setHighlightedMessageId(null);
  };

  // Handle user press to navigate to profile
  const handleUserPress = (userId: string) => {
    router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId } });
  };

  // NEW: open report modal for a message
  const openReportForMessage = (message: any) => {
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
  };

  const submitMessageReport = async (data: any) => {
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
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;

        // Check image content with NSFW model via service
        const checkResult = await nsfwService.classifyImage(uri);
        if (checkResult.isInappropriate) {
          console.log('⚠️ [uploadImage] NSFW detected, will log to flagged_content');
          // Image will still be sent, logged to flagged_content below
          // Continue with upload - will log to flagged_content after getting downloadURL
        }
        console.log('✅ [uploadImage] Image passed NSFW check');

        const response = await fetch(uri);
        const blob = await response.blob();
        const imgRef = ref(storage, `groups/${id}/messages/${Date.now()}`);
        await uploadBytes(imgRef, blob);
        const downloadURL = await getDownloadURL(imgRef);
        // Gửi message dạng ảnh
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
        });


        // Log NSFW flagged images to flagged_content collection for admin review
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
            console.log('📋 [uploadImage] Flagged content logged');
          } catch (flagErr) {
            console.warn('⚠️ [uploadImage] Failed to log flagged content:', flagErr);
          }
        }

      }

    } catch (error) {
      console.error('[ERROR] Send image failed:', (error as any).message);
      setError(`${t('groups.send_image_error')}: ${(error as any).message}`);
    }
  };

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <GroupChatHeader group={group} onBack={() => router.back()} />
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
          />
        </View>

        {/* Reply Preview */}
        {replyTo && (
          <View style={[styles.replyContainer, {
            backgroundColor: currentThemeColors.surface,
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