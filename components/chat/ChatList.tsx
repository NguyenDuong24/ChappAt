import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState } from 'react';
import { doc, collection, query, orderBy, onSnapshot } from 'firebase/firestore'; // Import Firestore methods
import ChatItem from './ChatItem';
import { getRoomId } from '@/utils/common';
import { db } from '@/firebaseConfig';

const ChatList = ({ users, currenUser, onRefresh }: any) => {
  const [lastMessages, setLastMessages] = useState<{ [key: string]: any }>({});
  const [sortedUsers, setSortedUsers] = useState(users); // State to hold sorted users

  useEffect(() => {
    const unsubscribe = users.map((user) => {
      const roomId = getRoomId(currenUser?.uid, user.uid);
      const messagesRef = collection(doc(db, "rooms", roomId), "messages");
      const q = query(messagesRef, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const allMessages = snapshot.docs.map((doc) => doc.data());
        const lastMessage = allMessages[0] || null; // Get the last message if it exists

        // Update lastMessages state
        setLastMessages((prev) => ({
          ...prev,
          [user.uid]: lastMessage,
        }));
      });
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribe.forEach((unsub) => unsub());
    };
  }, [users, currenUser]);

  useEffect(() => {
    // Sort users based on the last message timestamps
    const sorted = [...users].sort((a, b) => {
      const lastMessageA = lastMessages[a.uid];
      const lastMessageB = lastMessages[b.uid];

      if (lastMessageA && lastMessageB) {
        return lastMessageB.createdAt - lastMessageA.createdAt; // Sort in descending order
      } else if (lastMessageA) {
        return -1; // A has a last message, B does not
      } else if (lastMessageB) {
        return 1; // B has a last message, A does not
      }
      return 0; // Both have no last messages
    });

    setSortedUsers(sorted);
  }, [lastMessages, users]);

  const renderEmptyList = () => (
    <View style={styles.emptyList}>
      <Text style={styles.emptyText}>No users available</Text>
    </View>
  );

  return (
    <View>
      <FlatList
        data={sortedUsers} // Use sorted users
        contentContainerStyle={styles.listContainer}
        keyExtractor={(item) => item.id.toString()} // Use userId for better uniqueness
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ChatItem
            item={item}
            lastMessage={lastMessages[item.uid]} // Pass last message to ChatItem
            noBorder={index + 1 === sortedUsers.length}
            currenUser={currenUser}
          />
        )}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={false} // Bạn có thể thêm state để quản lý trạng thái loading khi refresh
            onRefresh={onRefresh} // Gọi hàm tải lại người dùng
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
