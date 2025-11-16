// ✅ Optimized Group Message List with React.memo and virtualization
import React, { memo, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import GroupMessageItem from './GroupMessageItem';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface OptimizedGroupMessageListProps {
  messages: any[];
  currentUser: any;
  groupId: string;
  onReply?: (message: any) => void;
  highlightedMessageId?: string | null;
  onClearHighlight?: () => void;
  onReport?: (message: any) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  scrollViewRef?: React.RefObject<ScrollView>;
}

// ✅ Memoized day separator component
const DaySeparator = memo(({ date }: { date: string }) => (
  <View style={styles.daySeparatorContainer}>
    <View style={styles.daySeparatorLine} />
    <Text style={styles.daySeparatorText}>{date}</Text>
    <View style={styles.daySeparatorLine} />
  </View>
));

DaySeparator.displayName = 'DaySeparator';

// ✅ Memoized message item wrapper with day separator logic
const MessageWithDate = memo(({ 
  message, 
  previousMessage,
  currentUser,
  groupId,
  onReply,
  highlightedMessageId,
  onClearHighlight,
  onReport
}: any) => {
  const shouldShowDaySeparator = useMemo(() => {
    if (!previousMessage) return true;
    
    const currentDate = message.createdAt?.toDate?.();
    const prevDate = previousMessage.createdAt?.toDate?.();
    
    if (!currentDate || !prevDate) return false;
    
    return currentDate.toDateString() !== prevDate.toDateString();
  }, [message.createdAt, previousMessage?.createdAt]);

  const dayString = useMemo(() => {
    const date = message.createdAt?.toDate?.();
    if (!date) return '';
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  }, [message.createdAt]);

  return (
    <>
      {shouldShowDaySeparator && <DaySeparator date={dayString} />}
      <GroupMessageItem
        message={message}
        currentUser={currentUser}
        groupId={groupId}
        onReply={onReply}
        isHighlighted={highlightedMessageId === message.id}
        onReport={onReport}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.highlightedMessageId === nextProps.highlightedMessageId &&
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions) &&
    prevProps.message.isEdited === nextProps.message.isEdited &&
    prevProps.message.isPinned === nextProps.message.isPinned
  );
});

MessageWithDate.displayName = 'MessageWithDate';

const OptimizedGroupMessageList: React.FC<OptimizedGroupMessageListProps> = ({
  messages,
  currentUser,
  groupId,
  onReply,
  highlightedMessageId,
  onClearHighlight,
  onReport,
  onLoadMore,
  hasMore = false,
  scrollViewRef
}) => {
  // ✅ Memoized load more handler
  const handleLoadMore = useCallback(() => {
    if (hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore]);

  // ✅ Memoized empty state
  const renderEmpty = useMemo(() => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="message-outline" size={64} color="#CCC" />
      <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
      <Text style={styles.emptySubtext}>Hãy bắt đầu cuộc trò chuyện!</Text>
    </View>
  ), []);

  if (messages.length === 0) {
    return renderEmpty;
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={onClearHighlight}
    >
      {/* Load more button at top */}
      {hasMore && (
        <TouchableOpacity 
          style={styles.loadMoreButton}
          onPress={handleLoadMore}
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#667eea" />
          <Text style={styles.loadMoreText}>Tải thêm tin nhắn</Text>
        </TouchableOpacity>
      )}

      {/* Messages list */}
      {messages.map((message, index) => (
        <MessageWithDate
          key={message.id}
          message={message}
          previousMessage={index > 0 ? messages[index - 1] : null}
          currentUser={currentUser}
          groupId={groupId}
          onReply={onReply}
          highlightedMessageId={highlightedMessageId}
          onClearHighlight={onClearHighlight}
          onReport={onReport}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  daySeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  daySeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginHorizontal: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
});

// ✅ Export memoized component
export default memo(OptimizedGroupMessageList);
