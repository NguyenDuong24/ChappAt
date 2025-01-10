import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import { doc, collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import ChatItem from './ChatItem';
import { getRoomId } from '@/utils/common';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext'; 
import { Colors } from '@/constants/Colors';

const ChatList = ({ users, currenUser, onRefresh }) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const [sortedUsers, setSortedUsers] = useState([]);

  useEffect(() => {
    let usersWithMessages = [];
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
        }
      });

      return unsubscribe;
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [users, currenUser]);

  const renderEmptyList = () => (
    <View style={[styles.emptyList, { backgroundColor: currentThemeColors.background }]}>
      <Text style={[styles.emptyText, { color: currentThemeColors.text }]}>No users available</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <FlatList
        data={sortedUsers}
        contentContainerStyle={styles.listContainer}
        keyExtractor={(item) => item.user.id.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ChatItem
            item={item.user}
            lastMessage={item.lastMessage}
            noBorder={index + 1 === sortedUsers.length}
            currenUser={currenUser}
          />
        )}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={currentThemeColors.text}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 5,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888', 
  },
});

export default ChatList;
