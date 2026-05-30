// components/groups/GroupMessageList.tsx
import React, { useRef, useEffect, useContext, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import GroupMessageItem from './GroupMessageItem';
import { useTranslation } from 'react-i18next';

interface GroupMessageListProps {
  messages: any[];
  currentUser: any;
  groupId?: string;
  scrollViewRef?: React.RefObject<FlatList>;
  onReply?: (message: any) => void;
  highlightedMessageId?: string | null;
  onClearHighlight?: () => void;
  onReport?: (message: any) => void;
  onUserPress?: (userId: string) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  isLoadingMore?: boolean;
  isInitialLoadComplete?: boolean;
  scrollToEndTrigger?: number;
  currentThemeColors?: any;
}

const getMsgUid = (m: any) => m?.uid || m?.userId || m?.senderId || m?.from || '';
const getMsgTime = (m: any) => {
  if (!m?.createdAt) return 0;
  if (typeof m.createdAt === 'number') return m.createdAt;
  if (m.createdAt.toMillis) return m.createdAt.toMillis();
  if (m.createdAt.seconds) return m.createdAt.seconds * 1000;
  if (m.createdAt.getTime) return m.createdAt.getTime();
  return new Date(m.createdAt).getTime() || 0;
};

const DaySeparator = React.memo(({ date, currentThemeColors: chatThemeColors }: { date: string, currentThemeColors?: any }) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = chatThemeColors || (Colors[theme] || Colors.light);
  return (
    <View style={styles.daySeparatorContainer}>
      <Text style={[styles.daySeparatorText, {
        color: currentThemeColors.subtleText,
        backgroundColor: currentThemeColors.surface,
        borderColor: currentThemeColors.border,
      }]}>
        {date}
      </Text>
    </View>
  );
});

const ScrollToBottomButton = React.memo(({ onPress, visible, currentThemeColors: chatThemeColors }: { onPress: () => void, visible: boolean, currentThemeColors?: any }) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = chatThemeColors || (Colors[theme] || Colors.light);
  if (!visible) return null;
  return (
    <TouchableOpacity
      style={[styles.scrollToBottomButton, { backgroundColor: currentThemeColors.surface, borderWidth: 1, borderColor: currentThemeColors.border }]}
      onPress={onPress}
    >
      <Ionicons name="chevron-down" size={22} color={currentThemeColors.tint} />
    </TouchableOpacity>
  );
});

export default function GroupMessageList({
  messages = [],
  currentUser,
  groupId = '',
  scrollViewRef,
  onReply,
  highlightedMessageId,
  onClearHighlight,
  onReport,
  onUserPress,
  loading = false,
  onLoadMore,
  hasMore,
  loadingMore,
  isLoadingMore = false,
  currentThemeColors: chatThemeColors,
  scrollToEndTrigger = 0,
}: GroupMessageListProps) {
  const { t } = useTranslation();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = chatThemeColors || (Colors[theme] || Colors.light);
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const showScrollButtonRef = useRef(false);

  // Dịch thông minh với fallback tiếng Việt
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  useEffect(() => {
    if (scrollToEndTrigger && scrollToEndTrigger > 0) {
      (scrollViewRef?.current || flatListRef.current)?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToEndTrigger, scrollViewRef]);

  const processedData = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const sortedMessages = [...messages].sort((a, b) => getMsgTime(a) - getMsgTime(b));
    const result: any[] = [];
    let lastDate = '';

    // Xác định locale an toàn – mặc định vi
    const localeKey = tf('common.locale', 'vi') === 'vi' ? 'vi-VN' : 'en-US';

    for (let i = 0; i < sortedMessages.length; i++) {
      const message = sortedMessages[i];
      const timeMs = getMsgTime(message);
      let messageDate = '';

      if (timeMs > 0) {
        const date = new Date(timeMs);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
          messageDate = tf('common.time.today', 'Hôm nay');
        } else if (date.toDateString() === yesterday.toDateString()) {
          messageDate = tf('common.time.yesterday', 'Hôm qua');
        } else {
          messageDate = date.toLocaleDateString(localeKey);
        }
      }

      if (messageDate && messageDate !== lastDate) {
        result.push({ id: `sep-${messageDate}-${i}`, type: 'separator', date: messageDate });
        lastDate = messageDate;
      }

      const prevMsg = sortedMessages[i - 1];
      const nextMsg = sortedMessages[i + 1];
      const currentUid = getMsgUid(message);

      const isSameSenderAsPrev = prevMsg ? getMsgUid(prevMsg) === currentUid : false;
      const isSameSenderAsNext = nextMsg ? getMsgUid(nextMsg) === currentUid : false;

      result.push({
        id: message.id || message.messageId || `msg-${i}-${currentUid}`,
        type: 'message',
        data: message,
        sequenceProps: {
          isFirstInSequence: !isSameSenderAsPrev,
          isLastInSequence: !isSameSenderAsNext,
          isSameSenderAsPrev,
          isSameSenderAsNext,
        }
      });
    }
    return result;
  }, [messages, tf]);

  const reversedData = useMemo(() => [...processedData].reverse(), [processedData]);

  const listFooterComponent = useMemo(() => isLoadingMore ? (
    <View style={styles.loadMoreContainer}>
      <ActivityIndicator size="small" color={currentThemeColors.tint} />
    </View>
  ) : null, [isLoadingMore, currentThemeColors.tint]);

  const listEmptyComponent = useMemo(() => (!loading && messages.length === 0) ? (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={40} color={currentThemeColors.subtleText} />
      <Text style={{ color: currentThemeColors.subtleText, marginTop: 8 }}>
        {tf('chat.no_messages', 'Chưa có tin nhắn')}
      </Text>
    </View>
  ) : null, [loading, messages.length, currentThemeColors.subtleText, tf]);

  const handleScroll = useCallback((event: any) => {
    const shouldShow = event.nativeEvent.contentOffset.y > 200;
    if (showScrollButtonRef.current !== shouldShow) {
      showScrollButtonRef.current = shouldShow;
      setShowScrollButton(shouldShow);
    }
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) onLoadMore?.();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const scrollToBottom = useCallback(() => {
    (scrollViewRef?.current || flatListRef.current)?.scrollToOffset({ offset: 0, animated: true });
  }, [scrollViewRef]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'separator') return <DaySeparator date={item.date} currentThemeColors={currentThemeColors} />;
    if (item.type === 'message') {
      const isHighlighted = highlightedMessageId === (item.data.id || item.data.messageId);
      return (
        <GroupMessageItem
          message={item.data}
          currentUser={currentUser}
          groupId={groupId}
          onReply={onReply}
          isHighlighted={isHighlighted}
          onReport={onReport}
          onUserPress={onUserPress}
          currentThemeColors={currentThemeColors}
          {...item.sequenceProps}
        />
      );
    }
    return null;
  }, [currentUser, groupId, onReply, highlightedMessageId, onReport, onUserPress, currentThemeColors]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={scrollViewRef || flatListRef}
        data={reversedData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
        inverted={true}
        ListFooterComponent={listFooterComponent}
        ListEmptyComponent={listEmptyComponent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={9}
        updateCellsBatchingPeriod={80}
      />
      <ScrollToBottomButton
        visible={showScrollButton}
        onPress={scrollToBottom}
        currentThemeColors={currentThemeColors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { paddingVertical: 12 },
  daySeparatorContainer: { alignItems: 'center', marginVertical: 12 },
  daySeparatorText: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
  },
  scrollToBottomButton: {
    position: 'absolute', bottom: 20, right: 16, width: 42, height: 42,
    borderRadius: 21, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  loadMoreContainer: { paddingVertical: 12, alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scaleY: -1 }], height: 300 },
});