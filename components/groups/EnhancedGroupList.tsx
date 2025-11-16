import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { doc, collection, query, orderBy, onSnapshot, limit, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import EnhancedGroupItem from './EnhancedGroupItem';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext'; 
import { Colors } from '@/constants/Colors';
import { Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

interface GroupListProps {
  groups?: any[];
  currentUser: any;
  onRefresh: () => void;
  // Optional header to avoid wrapping FlatList in a ScrollView
  listHeader?: React.ReactNode;
  onJoinGroup?: (groupId: string) => void; // NEW: callback to join a group from the list
  isSearchMode?: boolean; // NEW: indicate if showing search results
}

const EnhancedGroupList = ({ groups = [], currentUser, onRefresh, listHeader, onJoinGroup, isSearchMode = false }: GroupListProps) => {
  const themeContext = useContext(ThemeContext);
  const theme = (themeContext && typeof themeContext === 'object' && 'theme' in themeContext) ? themeContext.theme : 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [sortedGroups, setSortedGroups] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Only show joined groups (unless in search mode)
  const displayGroups = React.useMemo(() => {
    if (isSearchMode) return groups;
    return (groups || []).filter(g => g?.isJoined || (g?.members && g.members.includes(currentUser.uid)));
  }, [groups, isSearchMode, currentUser?.uid]);

  useEffect(() => {
    if (!displayGroups || !Array.isArray(displayGroups) || displayGroups.length === 0 || !currentUser?.uid) {
      setSortedGroups([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const groupsWithMessagesMap = new Map();

    const updateGroupsList = () => {
      const groupsList = Array.from(groupsWithMessagesMap.values());
      const sorted = groupsList.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt?.seconds || a.group.updatedAt?.seconds || 0;
        const bTime = b.lastMessage?.createdAt?.seconds || b.group.updatedAt?.seconds || 0;
        return bTime - aTime;
      });
      setSortedGroups(sorted);
    };

    displayGroups.forEach((group) => {
      if (!group?.id) return;

      try {
        const isJoined = !!(group.isJoined || (Array.isArray(group.members) && group.members.includes(currentUser.uid)));
        const shouldListen = (group.type === 'public') || isJoined;

        // set up default value in the map so UI renders immediately
        groupsWithMessagesMap.set(group.id, { group, lastMessage: null });
        updateGroupsList();

        // Only attach listeners when allowed (public groups & joined groups)
        if (!shouldListen) return;

        // Last message listener
        const groupDocRef = doc(db, 'groups', group.id);
        const messagesRef = collection(groupDocRef, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const lastMessage = snapshot.docs[0]?.data();
          groupsWithMessagesMap.set(group.id, {
            group,
            lastMessage: lastMessage || null
          });
          updateGroupsList();
        });

        // Typing status listener (only for joined groups)
        let typingUnsubscribe = () => {};
        if (isJoined) {
          const typingRef = collection(groupDocRef, 'typing');
          typingUnsubscribe = onSnapshot(typingRef, (snapshot) => {
            const typingUserIds = snapshot.docs
              .map(doc => doc.id)
              .filter(id => id !== currentUser.uid);

            // Debounce typing updates to reduce re-renders
            setTimeout(() => {
              setTypingUsers(prev => ({
                ...prev,
                [group.id]: typingUserIds
              }));
            }, 100);
          });
        }

        // Online status listener (only for joined groups)
        let onlineUnsubscribe = () => {};
        if (isJoined) {
          const onlineRef = collection(groupDocRef, 'presence');
          onlineUnsubscribe = onSnapshot(onlineRef, (snapshot) => {
            const onlineUserIds = snapshot.docs
              .map(doc => doc.id)
              .filter(id => id !== currentUser.uid);

            // Debounce online updates
            setTimeout(() => {
              setOnlineUsers(prev => ({
                ...prev,
                [group.id]: onlineUserIds
              }));
            }, 200);
          });
        }

        // Combined last message + unread counter (only for joined groups)
        let combinedUnsubscribe = () => {};
        if (isJoined) {
          const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(30));
          combinedUnsubscribe = onSnapshot(messagesQuery, async (msgSnapshot) => {
            const lastMessage = msgSnapshot.docs[0]?.data() || null;

            // Calculate unread count
            let unreadCount = 0;
            let lastReadAt: any = null;

            try {
              const readStatusRef = doc(groupDocRef, 'readStatus', currentUser.uid);
              const readSnap = await getDoc(readStatusRef);
              if (readSnap.exists()) {
                lastReadAt = readSnap.data()?.lastReadAt || null;
              }
            } catch (e) {
              console.warn('Could not fetch read status for group', group.id, e);
            }

            if (msgSnapshot.size > 0) {
              unreadCount = msgSnapshot.docs.reduce((acc, doc) => {
                const data = doc.data();
                const createdAt = data?.createdAt;
                const isOwn = data?.uid === currentUser.uid;
                if (isOwn) return acc;
                if (!lastReadAt) return acc + 1;
                try {
                  const msgSec = createdAt?.seconds || 0;
                  const readSec = lastReadAt?.seconds || (lastReadAt?.toMillis ? Math.floor(lastReadAt.toMillis() / 1000) : 0);
                  if (msgSec > readSec) return acc + 1;
                } catch {}
                return acc;
              }, 0);
            }

            groupsWithMessagesMap.set(group.id, {
              group,
              lastMessage
            });
            setUnreadCounts(prev => ({
              ...prev,
              [group.id]: unreadCount
            }));
            updateGroupsList();
          });
        }

        unsubscribes.push(unsubscribe, typingUnsubscribe, onlineUnsubscribe, combinedUnsubscribe);
      } catch (error) {
        console.error('Error setting up group listeners:', error);
      }
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
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

  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeIn} 
      style={styles.emptyContainer}
    >
      <Text style={[styles.emptyText, { color: currentThemeColors.subtleText }]}>
        Bạn chưa tham gia nhóm chat nào
      </Text>
      <Text style={[styles.emptySubtext, { color: currentThemeColors.subtleText }]}>
        Tạo nhóm mới hoặc được mời vào nhóm để bắt đầu
      </Text>
    </Animated.View>
  );

  const renderItem = useCallback(({ item }: { item: any }) => {
    const groupId = item.group.id;
    // Check if voice call is active
    const isVoiceCallActive = item.group?.voiceRoomActive && 
                               item.group?.voiceRoomParticipants?.length > 0;
    const voiceCallParticipantsCount = item.group?.voiceRoomParticipants?.length || 0;
    
    // Debug logging
    if (isVoiceCallActive) {
      console.log(`🟢 Group "${item.group.name}" has active call:`, {
        voiceRoomActive: item.group.voiceRoomActive,
        participantsCount: voiceCallParticipantsCount,
        participants: item.group.voiceRoomParticipants
      });
    }
    
    return (
      <EnhancedGroupItem
        item={item.group}
        lastMessage={item.lastMessage}
        currentUser={currentUser}
        unreadCount={unreadCounts[groupId] || 0}
        isTyping={typingUsers[groupId]?.length > 0}
        onlineMembers={onlineUsers[groupId] || []}
        isVoiceCallActive={isVoiceCallActive}
        voiceCallParticipantsCount={voiceCallParticipantsCount}
        isJoined={!!item.group.isJoined} // forward joined state
        onJoinGroup={() => onJoinGroup?.(groupId)} // forward join handler
        isSearchResult={isSearchMode} // show as search result
      />
    );
  }, [currentUser, typingUsers, onlineUsers, unreadCounts, onJoinGroup, isSearchMode]);

  const keyExtractor = useCallback((item: any) => item.group.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedGroups}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#667eea']}
            tintColor={currentThemeColors.text}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={listHeader as any}
        contentContainerStyle={styles.listContent}
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

export default EnhancedGroupList;
