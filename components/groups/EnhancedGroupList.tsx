import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { doc, collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
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
}

const EnhancedGroupList = ({ groups = [], currentUser, onRefresh, listHeader }: GroupListProps) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [sortedGroups, setSortedGroups] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!groups || !Array.isArray(groups) || groups.length === 0 || !currentUser?.uid) {
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

    groups.forEach((group) => {
      if (!group?.id) return;
      
      try {
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

        // Typing status listener
        const typingRef = collection(groupDocRef, 'typing');
        const typingUnsubscribe = onSnapshot(typingRef, (snapshot) => {
          const typingUserIds = snapshot.docs
            .map(doc => doc.id)
            .filter(id => id !== currentUser.uid);
          
          setTypingUsers(prev => ({
            ...prev,
            [group.id]: typingUserIds
          }));
        });

        // Online status listener
        const onlineRef = collection(groupDocRef, 'presence');
        const onlineUnsubscribe = onSnapshot(onlineRef, (snapshot) => {
          const onlineUserIds = snapshot.docs
            .map(doc => doc.id)
            .filter(id => id !== currentUser.uid);
          
          setOnlineUsers(prev => ({
            ...prev,
            [group.id]: onlineUserIds
          }));
        });

        // Unread messages counter
        const unreadRef = collection(groupDocRef, `unread/${currentUser.uid}/messages`);
        const unreadUnsubscribe = onSnapshot(unreadRef, (snapshot) => {
          setUnreadCounts(prev => ({
            ...prev,
            [group.id]: snapshot.size
          }));
        });

        unsubscribes.push(unsubscribe, typingUnsubscribe, onlineUnsubscribe, unreadUnsubscribe);
      } catch (error) {
        console.error('Error setting up group listeners:', error);
      }
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [groups, currentUser?.uid]);

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
    return (
      <EnhancedGroupItem
        item={item.group}
        lastMessage={item.lastMessage}
        currentUser={currentUser}
        unreadCount={unreadCounts[groupId] || 0}
        isTyping={typingUsers[groupId]?.length > 0}
        onlineMembers={onlineUsers[groupId] || []}
      />
    );
  }, [currentUser, typingUsers, onlineUsers, unreadCounts]);

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
