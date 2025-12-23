import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState, useContext, useCallback, useMemo, useRef, memo } from 'react';
import { doc, collection, query, orderBy, onSnapshot, limit, getDoc } from 'firebase/firestore';
import EnhancedGroupItem from './EnhancedGroupItem';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

// Constants for FlatList optimization
const ITEM_HEIGHT = 80;

interface GroupListProps {
  groups?: any[];
  currentUser: any;
  onRefresh: () => void;
  listHeader?: React.ReactNode;
  onJoinGroup?: (groupId: string) => void;
  isSearchMode?: boolean;
}

// Memoized Empty State Component
const EmptyState = memo(({ currentThemeColors }: { currentThemeColors: any }) => (
  <Animated.View entering={FadeIn} style={styles.emptyContainer}>
    <Text style={[styles.emptyText, { color: currentThemeColors.subtleText }]}>
      Bạn chưa tham gia nhóm chat nào
    </Text>
    <Text style={[styles.emptySubtext, { color: currentThemeColors.subtleText }]}>
      Tạo nhóm mới hoặc được mời vào nhóm để bắt đầu
    </Text>
  </Animated.View>
));

// Memoized Group Item wrapper
const MemoizedGroupItem = memo(EnhancedGroupItem, (prevProps, nextProps) => {
  return (
    prevProps.item?.id === nextProps.item?.id &&
    prevProps.lastMessage?.text === nextProps.lastMessage?.text &&
    prevProps.lastMessage?.createdAt?.seconds === nextProps.lastMessage?.createdAt?.seconds &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.isTyping === nextProps.isTyping &&
    prevProps.onlineMembers?.length === nextProps.onlineMembers?.length &&
    prevProps.isVoiceCallActive === nextProps.isVoiceCallActive &&
    prevProps.isJoined === nextProps.isJoined
  );
});

const EnhancedGroupList = ({
  groups = [],
  currentUser,
  onRefresh,
  listHeader,
  onJoinGroup,
  isSearchMode = false
}: GroupListProps) => {
  const themeContext = useContext(ThemeContext);
  const theme = (themeContext && typeof themeContext === 'object' && 'theme' in themeContext)
    ? themeContext.theme
    : 'light';
  const currentThemeColors = useMemo(() =>
    theme === 'dark' ? Colors.dark : Colors.light,
    [theme]
  );

  const [sortedGroups, setSortedGroups] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Refs for optimization
  const isMountedRef = useRef(true);
  const groupsMapRef = useRef(new Map());
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const onlineTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up timeouts
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      Object.values(onlineTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  // Only show joined groups (unless in search mode)
  const displayGroups = useMemo(() => {
    if (isSearchMode) return groups;
    return (groups || []).filter(g =>
      g?.isJoined || (g?.members && g.members.includes(currentUser?.uid))
    );
  }, [groups, isSearchMode, currentUser?.uid]);

  useEffect(() => {
    if (!displayGroups || !Array.isArray(displayGroups) || displayGroups.length === 0 || !currentUser?.uid) {
      setSortedGroups([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const groupsWithMessagesMap = groupsMapRef.current;

    const updateGroupsList = () => {
      if (!isMountedRef.current) return;

      const groupsList = Array.from(groupsWithMessagesMap.values());
      const validGroups = groupsList.filter(item => item?.group?.id);

      const sorted = validGroups.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt?.seconds || a.group.updatedAt?.seconds || 0;
        const bTime = b.lastMessage?.createdAt?.seconds || b.group.updatedAt?.seconds || 0;
        return bTime - aTime;
      });

      setSortedGroups(sorted);
    };

    // Batch setup listeners
    const setupListenersForGroup = (group: any) => {
      if (!group?.id) return [];

      const groupUnsubscribes: (() => void)[] = [];

      try {
        const isJoined = !!(group.isJoined || (Array.isArray(group.members) && group.members.includes(currentUser.uid)));
        const shouldListen = (group.type === 'public') || isJoined;

        // Set up default value immediately
        groupsWithMessagesMap.set(group.id, { group, lastMessage: null });

        if (!shouldListen) return groupUnsubscribes;

        const groupDocRef = doc(db, 'groups', group.id);
        const messagesRef = collection(groupDocRef, 'messages');

        // Only listen to last message for all groups
        const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
        const unsubLastMsg = onSnapshot(lastMsgQuery, (snapshot) => {
          if (!isMountedRef.current) return;
          const lastMessage = snapshot.docs[0]?.data() || null;
          groupsWithMessagesMap.set(group.id, { group, lastMessage });
          updateGroupsList();
        });
        groupUnsubscribes.push(unsubLastMsg);

        // Only set up typing and online listeners for joined groups
        if (isJoined) {
          // Typing listener with debounce
          const typingRef = collection(groupDocRef, 'typing');
          const unsubTyping = onSnapshot(typingRef, (snapshot) => {
            if (!isMountedRef.current) return;
            const typingUserIds = snapshot.docs
              .map(d => d.id)
              .filter(id => id !== currentUser.uid);

            // Clear previous timeout
            if (typingTimeoutRef.current[group.id]) {
              clearTimeout(typingTimeoutRef.current[group.id]);
            }

            // Debounce typing updates
            typingTimeoutRef.current[group.id] = setTimeout(() => {
              if (isMountedRef.current) {
                setTypingUsers(prev => ({ ...prev, [group.id]: typingUserIds }));
              }
            }, 150);
          });
          groupUnsubscribes.push(unsubTyping);

          // Online listener with debounce
          const onlineRef = collection(groupDocRef, 'presence');
          const unsubOnline = onSnapshot(onlineRef, (snapshot) => {
            if (!isMountedRef.current) return;
            const onlineUserIds = snapshot.docs
              .map(d => d.id)
              .filter(id => id !== currentUser.uid);

            // Clear previous timeout
            if (onlineTimeoutRef.current[group.id]) {
              clearTimeout(onlineTimeoutRef.current[group.id]);
            }

            // Debounce online updates
            onlineTimeoutRef.current[group.id] = setTimeout(() => {
              if (isMountedRef.current) {
                setOnlineUsers(prev => ({ ...prev, [group.id]: onlineUserIds }));
              }
            }, 250);
          });
          groupUnsubscribes.push(unsubOnline);

          // Unread count listener
          const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(30));
          const unsubMessages = onSnapshot(messagesQuery, async (msgSnapshot) => {
            if (!isMountedRef.current) return;

            const lastMessage = msgSnapshot.docs[0]?.data() || null;
            let unreadCount = 0;
            let lastReadAt: any = null;

            try {
              const readStatusRef = doc(groupDocRef, 'readStatus', currentUser.uid);
              const readSnap = await getDoc(readStatusRef);
              if (readSnap.exists()) {
                lastReadAt = readSnap.data()?.lastReadAt || null;
              }
            } catch (e) { }

            if (msgSnapshot.size > 0) {
              unreadCount = msgSnapshot.docs.reduce((acc, docSnap) => {
                const data = docSnap.data();
                if (data?.uid === currentUser.uid) return acc;
                if (!lastReadAt) return acc + 1;
                try {
                  const msgSec = data?.createdAt?.seconds || 0;
                  const readSec = lastReadAt?.seconds || 0;
                  if (msgSec > readSec) return acc + 1;
                } catch { }
                return acc;
              }, 0);
            }

            groupsWithMessagesMap.set(group.id, { group, lastMessage });

            if (isMountedRef.current) {
              setUnreadCounts(prev => ({ ...prev, [group.id]: unreadCount }));
              updateGroupsList();
            }
          });
          groupUnsubscribes.push(unsubMessages);
        }
      } catch (error) {
        console.error('Error setting up group listeners:', error);
      }

      return groupUnsubscribes;
    };

    // Setup listeners for all groups
    displayGroups.forEach(group => {
      const groupUnsubs = setupListenersForGroup(group);
      unsubscribes.push(...groupUnsubs);
    });

    // Initial update
    updateGroupsList();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [displayGroups, currentUser?.uid]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (!item?.group?.id) return null;

    const groupId = item.group.id;
    const isVoiceCallActive = item.group?.voiceRoomActive &&
      item.group?.voiceRoomParticipants?.length > 0;
    const voiceCallParticipantsCount = item.group?.voiceRoomParticipants?.length || 0;

    return (
      <MemoizedGroupItem
        item={item.group}
        lastMessage={item.lastMessage}
        currentUser={currentUser}
        unreadCount={unreadCounts[groupId] || 0}
        isTyping={(typingUsers[groupId]?.length || 0) > 0}
        onlineMembers={onlineUsers[groupId] || []}
        isVoiceCallActive={isVoiceCallActive}
        voiceCallParticipantsCount={voiceCallParticipantsCount}
        isJoined={!!item.group.isJoined}
        onJoinGroup={() => onJoinGroup?.(groupId)}
        isSearchResult={isSearchMode}
      />
    );
  }, [currentUser, typingUsers, onlineUsers, unreadCounts, onJoinGroup, isSearchMode]);

  const keyExtractor = useCallback((item: any) => item.group?.id || Math.random().toString(), []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={['#667eea']}
      tintColor={currentThemeColors.text}
    />
  ), [refreshing, handleRefresh, currentThemeColors.text]);

  const renderEmptyState = useCallback(() => (
    <EmptyState currentThemeColors={currentThemeColors} />
  ), [currentThemeColors]);

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedGroups}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={refreshControl}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={listHeader as any}
        contentContainerStyle={styles.listContent}
        getItemLayout={getItemLayout}
        // Performance optimizations
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default memo(EnhancedGroupList);
