// components/MessageList.tsx
import React, { useContext, useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import MessageItem from './MessageItem';

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
  // Fallbacks for subtle colors
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

export default function MessageList({ messages, currentUser, otherUser, scrollViewRef, onReply, onMessageLayout, highlightedMessageId, onReport, backgroundColor }: MessageListProps) {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors: any = theme === 'dark' ? { ...Colors.dark, mode: 'dark' } : { ...Colors.light, mode: 'light' };
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const timeout = isInitialLoad ? 0 : 100;
      setTimeout(() => {
        scrollViewRef?.current?.scrollToEnd({ animated: !isInitialLoad });
      }, timeout);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [messages.length, isInitialLoad, scrollViewRef]);

  const content = useMemo(() => {
    if (!messages || messages.length === 0) return null;

    let lastKey: string | null = null;

    return messages.map((message: any, index: number) => {
      const dateKey = getDateKey(message?.createdAt);
      const showSeparator = dateKey !== lastKey;
      lastKey = dateKey;

      const msgKey = (message?.id || message?.messageId || `${index}`) as string;

      return (
        <React.Fragment key={`frag-${msgKey}`}> 
          {showSeparator && (
            <DaySeparator title={formatDayTitle(dateKey)} themeColors={currentThemeColors} />
          )}
          <MessageItem
            message={message}
            key={msgKey}
            currentUser={currentUser}
            otherUser={otherUser}
            onReply={onReply}
            onMessageLayout={onMessageLayout}
            isHighlighted={highlightedMessageId === message?.id}
            onReport={onReport}
          />
        </React.Fragment>
      );
    });
  }, [messages, currentUser, otherUser, onReply, onMessageLayout, currentThemeColors, highlightedMessageId, onReport]);

  if (!messages || messages.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: currentThemeColors?.background }]}> 
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
    <ScrollView
      ref={scrollViewRef}
      style={{ backgroundColor: backgroundColor || currentThemeColors?.background }}
      contentContainerStyle={[
        styles.contentContainer,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
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
});
