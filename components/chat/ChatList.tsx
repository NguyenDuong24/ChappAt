import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import { doc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import ChatItem from './ChatItem';
import { getRoomId } from '@/utils/common';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext'; // Import ThemeContext
import { Colors } from '@/constants/Colors'; // Assuming you have a Colors file for theme management

const ChatList = ({ users, currenUser, onRefresh }: any) => {
  const { theme } = useContext(ThemeContext); // Get the theme from ThemeContext
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light; // Use theme-specific colors

  const [sortedUsers, setSortedUsers] = useState<any[]>([]);

  useEffect(() => {
    let usersLastMessage: any[] = [];
    const unsubscribes = users.map((user) => {
      const roomId = getRoomId(currenUser?.uid, user?.id);
      const docRef = doc(db, 'rooms', roomId);
      const messagesRef = collection(docRef, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allMessages = snapshot.docs.map((doc) => doc.data());
        const lastMessage = allMessages[0] || null;

        const updatedUser = {
          user,
          lastMessage,
        };

        const userIndex = usersLastMessage.findIndex(u => u.user.id === user.id);

        if (userIndex >= 0) {
          usersLastMessage[userIndex] = updatedUser;
        } else {
          usersLastMessage.push(updatedUser);
        }

        usersLastMessage = [...usersLastMessage].sort((a, b) => {
          const aTime = a.lastMessage?.createdAt?.seconds || 0;
          const bTime = b.lastMessage?.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setSortedUsers(usersLastMessage);
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
        keyExtractor={(item, index) => (item.user?.id ? item.user.id.toString() : index.toString())}
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
            tintColor={currentThemeColors.text} // Customize the refresh control color
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
