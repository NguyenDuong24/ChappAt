// components/MessageList.js
import React, { useRef, useEffect, useContext, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { formatTime } from '@/utils/common';
import GroupMessageItem from './GroupMessageItem';

const { height: screenHeight } = Dimensions.get('window');

interface GroupMessageListProps {
  messages: any[];
  currentUser: any;
  groupId?: string;
  scrollViewRef?: React.RefObject<FlatList>;
  onReply?: (message: any) => void;
  highlightedMessageId?: string | null;
  onClearHighlight?: () => void;
  // NEW: forward report handler like chat
  onReport?: (message: any) => void;
  onUserPress?: (userId: string) => void;
  loading?: boolean; // Add loading prop
}

// Day separator component
const DaySeparator = ({ date }: { date: string }) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  return (
    <View style={styles.daySeparatorContainer}>
      <View style={[styles.daySeparatorLine, { backgroundColor: currentThemeColors.border }]} />
      <Text style={[styles.daySeparatorText, { color: currentThemeColors.subtleText }]}>
        {date}
      </Text>
      <View style={[styles.daySeparatorLine, { backgroundColor: currentThemeColors.border }]} />
    </View>
  );
};

// Scroll to bottom button
const ScrollToBottomButton = ({ onPress, visible }: { onPress: () => void, visible: boolean }) => {
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
};

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
  loading = false, // Add loading prop
}: GroupMessageListProps) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messagePositions, setMessagePositions] = useState<{ [key: string]: number }>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      const timeout = isInitialLoad ? 1000 : 100; // Increase timeout for initial load to ensure rendering
      setTimeout(() => {
        (scrollViewRef?.current || flatListRef.current)?.scrollToEnd({ animated: !isInitialLoad });
        if (isInitialLoad) setIsInitialLoad(false);
      }, timeout);
    }
  }, [messages, isInitialLoad, scrollViewRef, loading]);

  // Handle scroll events
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y > contentSize.height - layoutMeasurement.height - 100;
    setShowScrollButton(!isNearBottom);
  };

  // Scroll to specific message
  const scrollToMessage = (messageId: string) => {
    const messageIndex = processedData.findIndex(item => 
      item.type === 'message' && (item.data.id === messageId || item.data.messageId === messageId)
    );
    if (messageIndex !== -1) {
      flatListRef.current?.scrollToIndex({ 
        index: messageIndex, 
        animated: true,
        viewPosition: 0.5 
      });
    }
  };

  // Handle message layout for positioning
  const handleMessageLayout = (messageId: string, y: number) => {
    setMessagePositions(prev => ({ ...prev, [messageId]: y }));
  };

  // Process messages with day separators
  const processedData = React.useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    const result: any[] = [];
    let lastDate = '';
    
    messages.forEach((message, index) => {
      // Get message date
      let messageDate = '';
      if (message.createdAt) {
        const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
          messageDate = 'Hôm nay';
        } else if (date.toDateString() === yesterday.toDateString()) {
          messageDate = 'Hôm qua';
        } else {
          messageDate = date.toLocaleDateString('vi-VN');
        }
      }
      
      // Add day separator if date changed
      if (messageDate && messageDate !== lastDate) {
        result.push({
          id: `separator-${messageDate}`,
          type: 'separator',
          date: messageDate
        });
        lastDate = messageDate;
      }
      
      // Add message
      result.push({
        id: message.id || message.messageId || `msg-${index}`,
        type: 'message',
        data: message
      });
    });
    
    return result;
  }, [messages]);

  const renderItem = ({ item, index }: { item: any, index: number }) => {
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
          onMessageLayout={handleMessageLayout}
          isHighlighted={isHighlighted}
          // Pass through report handler to show Report action like chat
          onReport={onReport}
          onUserPress={onUserPress} // Pass down onUserPress prop
        />
      );
    }
    
    return null;
  };

  const keyExtractor = (item: any, index: number) => {
    return item.id || `item-${index}`;
  };

  const scrollToBottom = () => {
    (scrollViewRef?.current || flatListRef.current)?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <FlatList
        ref={scrollViewRef || flatListRef}
        data={processedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        getItemLayout={undefined} // Disable for dynamic content
        onLayout={() => {
          if (isInitialLoad && messages.length > 0 && !loading) {
            setTimeout(() => {
              (scrollViewRef?.current || flatListRef.current)?.scrollToEnd({ animated: false });
            }, 100);
          }
        }}
        onContentSizeChange={() => {
          if (isInitialLoad && messages.length > 0 && !loading) {
            setTimeout(() => {
              (scrollViewRef?.current || flatListRef.current)?.scrollToEnd({ animated: false });
              setIsInitialLoad(false);
            }, 200); // Small delay to ensure layout is complete
          }
        }}
        onScrollToIndexFailed={() => {
          // Handle scroll to index failures gracefully
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
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
});
