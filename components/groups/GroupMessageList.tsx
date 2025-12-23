// components/MessageList.js
import React, { useRef, useEffect, useContext, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime } from '@/utils/common';
import GroupMessageItem from './GroupMessageItem';
import { useTranslation } from 'react-i18next';

const { height: screenHeight } = Dimensions.get('window');

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
  // Pagination props
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  isLoadingMore?: boolean;
  isInitialLoadComplete?: boolean;
  // Scroll control
  scrollToEndTrigger?: number;
}

// Day separator component - Memoized
const DaySeparator = React.memo(({ date }: { date: string }) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.daySeparatorContainer}>
      <View style={[styles.daySeparatorLine, { backgroundColor: currentThemeColors.border }]} />
      <Text style={[styles.daySeparatorText, { color: currentThemeColors.subtleText }]}
      >
        {date}
      </Text>
      <View style={[styles.daySeparatorLine, { backgroundColor: currentThemeColors.border }]} />
    </View>
  );
});

// Scroll to bottom button - Memoized
const ScrollToBottomButton = React.memo(({ onPress, visible }: { onPress: () => void, visible: boolean }) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  if (!visible) return null;

  return (
    <TouchableOpacity
      style={[styles.scrollToBottomButton, { backgroundColor: currentThemeColors.tint }]}
      onPress={onPress}
    >
      <Ionicons name="chevron-down" size={24} color="white" />
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
  isInitialLoadComplete = false,
  scrollToEndTrigger = 0,
}: GroupMessageListProps) {
  const { t } = useTranslation();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom (offset 0) when trigger changes
  useEffect(() => {
    if (scrollToEndTrigger && scrollToEndTrigger > 0) {
      (scrollViewRef?.current || flatListRef.current)?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToEndTrigger, scrollViewRef]);
  // Process messages with day separators - Memoized
  const processedData = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const result: any[] = [];
    let lastDate = '';

    messages.forEach((message, index) => {
      let messageDate = '';
      if (message.createdAt) {
        const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
          messageDate = t('common.time.today');
        } else if (date.toDateString() === yesterday.toDateString()) {
          messageDate = t('common.time.yesterday');
        } else {
          messageDate = date.toLocaleDateString(t('common.locale') === 'vi' ? 'vi-VN' : 'en-US');
        }
      }

      if (messageDate && messageDate !== lastDate) {
        result.push({
          id: `separator-${messageDate}-${index}`,
          type: 'separator',
          date: messageDate
        });
        lastDate = messageDate;
      }

      result.push({
        id: message.id || message.messageId || `msg-${index}`,
        type: 'message',
        data: message
      });
    });

    return result;
  }, [messages]);

  // Reverse data for inverted list
  const reversedData = useMemo(() => {
    return [...processedData].reverse();
  }, [processedData]);

  // Handle scroll events - Memoized
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    const scrollY = contentOffset.y;

    // In inverted list, scrollY > 0 means we are scrolling "up" (visually) into history
    // So show scroll-to-bottom button if we are far from offset 0
    setShowScrollButton(scrollY > 200);
  }, []);

  // Render item - Memoized
  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'separator') {
      return <DaySeparator date={item.date} />;
    }

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
        />
      );
    }

    return null;
  }, [currentUser, groupId, onReply, highlightedMessageId, onReport, onUserPress]);

  const keyExtractor = useCallback((item: any, index: number) => {
    return item.id || `item-${index}`;
  }, []);

  const scrollToBottom = useCallback(() => {
    (scrollViewRef?.current || flatListRef.current)?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollButton(false);
  }, [scrollViewRef]);

  // List footer - loading more indicator (visually at top)
  const ListFooterComponent = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={currentThemeColors.tint} />
          <Text style={[styles.loadMoreText, { color: currentThemeColors.subtleText }]}>
            {t('chat.loading_more')}
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, currentThemeColors]);

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <FlatList
        ref={scrollViewRef || flatListRef}
        data={reversedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        inverted={true}
        ListFooterComponent={ListFooterComponent}
        onEndReached={() => {
          if (hasMore && !isLoadingMore && onLoadMore) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        keyboardDismissMode="interactive"
        automaticallyAdjustContentInsets={false}
      />

      <ScrollToBottomButton
        visible={showScrollButton}
        onPress={scrollToBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 24,
  },
  daySeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 24,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
  },
  daySeparatorText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadMoreText: {
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
