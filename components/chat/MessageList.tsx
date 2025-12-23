// components/MessageList.tsx
import React, { useContext, useMemo, useEffect, useRef, useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, ListRenderItemInfo } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import MessageItem from './MessageItem';

// Performance: Enable/disable debug logging
const DEBUG_MODE = false;
const log = DEBUG_MODE ? console.log : () => { };

interface MessageListProps {
  messages: any[];
  currentUser: any;
  otherUser?: any;
  scrollViewRef?: any;
  onReply?: (message: any) => void;
  onMessageLayout?: (messageId: string, y: number) => void;
  highlightedMessageId?: string;
  onReport?: (message: any) => void;
  backgroundColor?: string;
  // Load more props
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  isLoadingMore?: boolean;
  isInitialLoadComplete?: boolean;
  // Scroll control
  scrollToEndTrigger?: number; // Increment this to trigger scroll to end
  scrollToMessageId?: string; // Message ID to scroll to
  themeColors?: any;
}

function getDateFromCreatedAt(createdAt: any): Date | null {
  if (!createdAt) return null;
  // Firestore Timestamp
  if (createdAt?.seconds) return new Date(createdAt.seconds * 1000);
  // Date instance
  if (createdAt instanceof Date) return createdAt;
  // millis
  if (typeof createdAt === 'number') return new Date(createdAt);
  // ISO string
  if (typeof createdAt === 'string') return new Date(createdAt);
  return null;
}

function getDateKey(createdAt: any): string {
  const d = getDateFromCreatedAt(createdAt);
  if (!d || isNaN(d.getTime())) return 'unknown';
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`; // YYYY-MM-DD
}

function formatDayTitle(dateKey: string): string {
  if (dateKey === 'unknown') return '';
  const [y, m, d] = dateKey.split('-').map((v) => parseInt(v, 10));
  const date = new Date(y, (m || 1) - 1, d || 1);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSame = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSame(date, today)) return 'Hôm nay';
  if (isSame(date, yesterday)) return 'Hôm qua';

  try {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return `${d}/${m}/${y}`;
  }
}

function DaySeparator({ title, themeColors }: { title: string; themeColors: any }) {
  const lineColor = themeColors.separator || (themeColors.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb');
  const chipBg = themeColors.surface || (themeColors.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6');
  const chipText = themeColors.subtleText || (themeColors.mode === 'dark' ? '#e5e7eb' : '#6b7280');

  return (
    <View style={styles.separatorRow}>
      <View style={[styles.separatorLine, { backgroundColor: lineColor }]} />
      <View style={[styles.separatorChip, { backgroundColor: chipBg }]}>
        <Text style={[styles.separatorText, { color: chipText }]}>{title}</Text>
      </View>
      <View style={[styles.separatorLine, { backgroundColor: lineColor }]} />
    </View>
  );
}

// Memoized DaySeparator to prevent unnecessary re-renders
const MemoizedDaySeparator = memo(DaySeparator);

// Memoized message item wrapper
const MemoizedMessageItem = memo(MessageItem, (prevProps, nextProps) => {
  // Only re-render if these props change
  // Deep compare reactions to ensure updates trigger re-render
  const prevReactions = JSON.stringify(prevProps.message?.reactions || {});
  const nextReactions = JSON.stringify(nextProps.message?.reactions || {});

  return (
    prevProps.message?.id === nextProps.message?.id &&
    prevProps.message?.text === nextProps.message?.text &&
    prevProps.message?.status === nextProps.message?.status &&
    prevProps.message?.isEdited === nextProps.message?.isEdited &&
    prevReactions === nextReactions &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.currentUser?.uid === nextProps.currentUser?.uid
  );
});

export default function MessageList({
  messages,
  currentUser,
  otherUser,
  scrollViewRef,
  onReply,
  onMessageLayout,
  highlightedMessageId,
  onReport,
  backgroundColor,
  onLoadMore,
  hasMore,
  loadingMore,
  isLoadingMore,
  isInitialLoadComplete,
  scrollToEndTrigger,
  scrollToMessageId,
  themeColors: propThemeColors
}: MessageListProps) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const defaultThemeColors: any = theme === 'dark' ? { ...Colors.dark, mode: 'dark' } : { ...Colors.light, mode: 'light' };
  const currentThemeColors = propThemeColors || defaultThemeColors;
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Reset initial load state when messages change from empty to non-empty (new room)
  useEffect(() => {
    if (messages.length > 0 && !isInitialLoadComplete) {
      setIsInitialLoad(true);
    }
  }, [messages.length, isInitialLoadComplete]);

  const flatListRef = useRef<FlatList>(null);
  const hasScrolledToMessageRef = useRef(false);

  // Scroll to bottom (offset 0) when trigger changes
  useEffect(() => {
    if (scrollToEndTrigger && scrollToEndTrigger > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToEndTrigger]);

  // Process messages into sections with date separators
  const processedData = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    // Remove duplicates
    const uniqueMessages = messages.filter((message, index, arr) =>
      message && arr.findIndex(m => m && m.id === message.id) === index
    );

    const result: any[] = [];
    let lastKey: string | null = null;

    uniqueMessages.forEach((message, index) => {
      const dateKey = getDateKey(message?.createdAt);
      if (dateKey !== lastKey) {
        result.push({ type: 'separator', dateKey, id: `sep-${dateKey}-${index}` });
        lastKey = dateKey;
      }
      result.push({ type: 'message', data: message, id: message?.id || `msg-${index}` });
    });

    return result;
  }, [messages]);

  // Reverse data for inverted FlatList
  const reversedData = useMemo(() => {
    return [...processedData].reverse();
  }, [processedData]);

  // Scroll to specific message after data is ready
  useEffect(() => {
    if (scrollToMessageId && reversedData.length > 0 && !hasScrolledToMessageRef.current) {
      // Find the index of the message in reversedData
      const targetIndex = reversedData.findIndex(
        (item) => item.type === 'message' && item.data?.id === scrollToMessageId
      );

      if (targetIndex !== -1) {
        // Found the message - scroll to it
        const timer = setTimeout(() => {
          try {
            // Always use flatListRef for FlatList operations
            flatListRef.current?.scrollToIndex({
              index: targetIndex,
              animated: true,
              viewPosition: 0.5, // Center the item in the view
            });
            hasScrolledToMessageRef.current = true;
          } catch (error) {
            console.warn('Failed to scroll to message index:', error);
            // Fallback: scroll to offset estimation
            flatListRef.current?.scrollToOffset({
              offset: targetIndex * 80, // Estimated item height
              animated: true,
            });
            hasScrolledToMessageRef.current = true;
          }
        }, 1000);
        return () => clearTimeout(timer);
      } else if (hasMore && onLoadMore) {
        // Message not found yet, try loading more messages
        console.log('Target message not found, loading more...');
        onLoadMore();
      }
    }
  }, [scrollToMessageId, reversedData, hasMore, onLoadMore]);

  // Render item for FlatList
  const renderItem = useCallback(({ item }: ListRenderItemInfo<any>) => {
    if (item.type === 'separator') {
      return (
        <MemoizedDaySeparator
          key={item.id}
          title={formatDayTitle(item.dateKey)}
          themeColors={currentThemeColors}
        />
      );
    }

    return (
      <MemoizedMessageItem
        message={item.data}
        key={item.id}
        currentUser={currentUser}
        otherUser={otherUser}
        onReply={onReply}
        onMessageLayout={onMessageLayout}
        isHighlighted={highlightedMessageId === item.data?.id || scrollToMessageId === item.data?.id}
        onReport={onReport}
      />
    );
  }, [currentUser, otherUser, onReply, onMessageLayout, currentThemeColors, highlightedMessageId, onReport, scrollToMessageId]);

  // Key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // Get item layout for better performance (estimated)
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // estimated item height
    offset: 80 * index,
    index,
  }), []);

  // Handle scroll to index failure
  const onScrollToIndexFailed = useCallback((info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
    });
  }, []);

  // Footer component (loading indicator at top of list / end of data)
  const ListFooterComponent = useMemo(() => (
    <>
      {isLoadingMore && (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={currentThemeColors?.tint || '#6366F1'} />
          <Text style={[styles.loadMoreText, { color: currentThemeColors?.subtleText }]}>
            Đang tải thêm...
          </Text>
        </View>
      )}
      {hasMore && !isLoadingMore && (
        <View style={styles.loadMoreHint}>
          <Text style={[styles.loadMoreHintText, { color: currentThemeColors?.subtleText }]}>
          </Text>
        </View>
      )}
    </>
  ), [isLoadingMore, hasMore, currentThemeColors]);

  if (!messages || messages.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: backgroundColor || currentThemeColors?.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: currentThemeColors?.surface || '#fff' }]}>
          <MaterialCommunityIcons name="message-text-outline" size={56} color={currentThemeColors?.subtleText || '#94a3b8'} />
          <Text style={[styles.emptyTitle, { color: currentThemeColors?.text }]}>
            Chưa có tin nhắn
          </Text>
          <Text style={[styles.emptySubtitle, { color: currentThemeColors?.subtleText }]}>
            Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      ref={(ref) => {
        (flatListRef as React.MutableRefObject<FlatList | null>).current = ref;
        if (scrollViewRef) {
          (scrollViewRef as React.MutableRefObject<any>).current = ref;
        }
      }}
      data={reversedData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={{ backgroundColor: backgroundColor || currentThemeColors?.background, flex: 1 }}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      inverted={true}
      onEndReached={() => {
        if (hasMore && !isLoadingMore && onLoadMore) {
          onLoadMore();
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={ListFooterComponent}
      onScrollToIndexFailed={onScrollToIndexFailed}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={15}
      updateCellsBatchingPeriod={50}
      getItemLayout={getItemLayout}
      keyboardDismissMode="interactive"
      automaticallyAdjustContentInsets={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  // Day separator
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    borderRadius: 1,
  },
  separatorChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginHorizontal: 8,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  // Load more styles
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  loadMoreHint: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadMoreHintText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
