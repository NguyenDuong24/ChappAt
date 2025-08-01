import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import { doc, collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import ChatItem from './ChatItem';
import { getRoomId } from '@/utils/common';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext'; 
import { Colors } from '@/constants/Colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const ChatList = ({ users = [], currenUser, onRefresh }: { users?: any[], currenUser: any, onRefresh: () => void }) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [sortedUsers, setSortedUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Kiểm tra an toàn cho users array
    if (!users || !Array.isArray(users) || users.length === 0) {
      setSortedUsers([]);
      return;
    }

    let usersWithMessages: any[] = [];
    const unsubscribes = users.map((user) => {
      const roomId = getRoomId(currenUser?.uid, user?.id);
      const docRef = doc(db, 'rooms', roomId);
      const messagesRef = collection(docRef, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const lastMessageDoc = snapshot.docs[0];
        
        if (lastMessageDoc) {
          const lastMessage = lastMessageDoc.data();
          const updatedUser = {
            user,
            lastMessage,
          };

          const userIndex = usersWithMessages.findIndex(u => u.user.id === user.id);
          if (userIndex >= 0) {
            usersWithMessages[userIndex] = updatedUser;
          } else {
            usersWithMessages.push(updatedUser);
          }

          usersWithMessages = [...usersWithMessages].sort((a, b) => {
            const aTime = a.lastMessage?.createdAt?.seconds || 0;
            const bTime = b.lastMessage?.createdAt?.seconds || 0;
            return bTime - aTime;
          });

          setSortedUsers(usersWithMessages);
        } else {
          // No messages yet, add user without last message
          const userWithoutMessage = { user, lastMessage: null };
          if (!usersWithMessages.find(u => u.user.id === user.id)) {
            usersWithMessages.push(userWithoutMessage);
            setSortedUsers([...usersWithMessages]);
          }
        }
      });

      return unsubscribe;
    });

    return () => {
      if (unsubscribes && unsubscribes.length > 0) {
        unsubscribes.forEach(unsub => unsub());
      }
    };
  }, [users, currenUser]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCard}>
        <MaterialCommunityIcons name="chat-outline" size={64} color="#cbd5e1" />
        <Text style={[styles.emptyTitle, { color: currentThemeColors.text }]}>
          Chưa có cuộc trò chuyện nào
        </Text>
        <Text style={[styles.emptySubtitle, { color: currentThemeColors.subtleText }]}>
          Hãy bắt đầu trò chuyện với bạn bè của bạn!
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {sortedUsers.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={sortedUsers}
          keyExtractor={(item) => item.user.id}
          renderItem={({ item, index }) => (
            <ChatItem 
              item={item.user} 
              currenUser={currenUser}
              noBorder={index === sortedUsers.length - 1}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#667eea"
              colors={['#667eea']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ChatList;
