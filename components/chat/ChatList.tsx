import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState } from 'react';
import { doc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import ChatItem from './ChatItem';
import { getRoomId } from '@/utils/common';
import { db } from '@/firebaseConfig';

const ChatList = ({ users, currenUser, onRefresh }: any) => {
  const [lastMessages, setLastMessages] = useState<{ [key: string]: any }>({});
  const [sortedUsers, setSortedUsers] = useState(users);

  useEffect(() => {
    const unsubscribe = users.map((user) => {
      const roomId = getRoomId(currenUser?.uid, user.uid);
      const messagesRef = collection(doc(db, "rooms", roomId), "messages");
      const q = query(messagesRef, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const allMessages = snapshot.docs.map((doc) => doc.data());
        const lastMessage = allMessages[0] || null; 

        setLastMessages((prev) => ({
          ...prev,
          [user.uid]: lastMessage,
        }));
      });
    });

    return () => {
      unsubscribe.forEach((unsub) => unsub());
    };
  }, [users, currenUser]);

  useEffect(() => {
    const sorted = [...users].sort((a, b) => {
      const lastMessageA = lastMessages[a.uid];
      const lastMessageB = lastMessages[b.uid];

      if (lastMessageA && lastMessageB) {
        return lastMessageB.createdAt - lastMessageA.createdAt; 
      } else if (lastMessageA) {
        return -1;
      } else if (lastMessageB) {
        return 1; 
      }
      return 0;
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
        data={sortedUsers} 
        contentContainerStyle={styles.listContainer}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ChatItem
            item={item}
            lastMessage={lastMessages[item.uid]} 
            noBorder={index + 1 === sortedUsers.length}
            currenUser={currenUser}
          />
        )}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={false} 
            onRefresh={onRefresh}
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
