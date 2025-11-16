import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import { doc, collection, query, orderBy, onSnapshot, limit, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import ChatItem from './ChatItem';
import { getRoomId } from '@/utils/common';
import { db } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext'; 
import { Colors } from '@/constants/Colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const ChatList = ({ users = [], currenUser, onRefresh }: { users?: any[], currenUser: any, onRefresh: () => void }) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [sortedUsers, setSortedUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Safety check for users array and current user
    if (!currenUser?.uid) {
      setSortedUsers([]);
      return;
    }

    // Store unsubscribe functions for cleanup
    const unsubscribes: (() => void)[] = [];
    
    // Track users with messages using Map for better performance
    const usersWithMessagesMap = new Map();
    // Track lastReadAt for each room
    const lastReadAtMap = new Map();

    const updateUsersList = () => {
      const usersList = Array.from(usersWithMessagesMap.values()).map(userData => {
        const roomId = getRoomId(currenUser.uid, userData.user.id);
        const lastReadAt = lastReadAtMap.get(roomId);
        // Recalculate unreadCount with current lastReadAt
        let unreadCount = 0;
        if (userData.messagesSnapshot) {
          unreadCount = userData.messagesSnapshot.docs.reduce((acc: number, d: any) => {
            const data = d.data();
            const createdAt = data?.createdAt;
            const isOwn = data?.uid === currenUser.uid;
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
        return { ...userData, unreadCount };
      });
      const sorted = usersList.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt?.seconds || a.lastMessage?.lastMessageTime?.seconds || 0;
        const bTime = b.lastMessage?.createdAt?.seconds || b.lastMessage?.lastMessageTime?.seconds || 0;
        return bTime - aTime;
      });
      setSortedUsers(sorted);
    };

    // 1. Set up listeners for regular chat (rooms collection)
    if (users && Array.isArray(users) && users.length > 0) {
      users.forEach((user) => {
        if (!user?.id) return;
        try {
          // Wrap per-user logic in async IIFE to allow awaiting read status
          (async () => {
            const roomId = getRoomId(currenUser.uid, user.id);
            const roomRef = doc(db, 'rooms', roomId);
            const messagesRef = collection(roomRef, 'messages');
            // Fetch initial last read timestamp for current user
            let initialLastReadAt: any = null;
            try {
              const readStatusRef = doc(db, 'rooms', roomId, 'readStatus', currenUser.uid);
              const readSnap = await getDoc(readStatusRef);
              if (readSnap.exists()) {
                initialLastReadAt = readSnap.data()?.lastReadAt || null;
              }
            } catch (e) {
              console.warn('Could not fetch read status for room', roomId, e);
            }
            lastReadAtMap.set(roomId, initialLastReadAt);

            // Listen to readStatus changes
            const readStatusRef = doc(db, 'rooms', roomId, 'readStatus', currenUser.uid);
            const unsubscribeReadStatus = onSnapshot(
              readStatusRef,
              (readSnap) => {
                const lastReadAt = readSnap.exists() ? readSnap.data()?.lastReadAt || null : null;
                lastReadAtMap.set(roomId, lastReadAt);
                updateUsersList(); // Recalculate unreadCount when lastReadAt changes
              },
              (error) => {
                console.warn('Error listening to read status:', error);
              }
            );
            unsubscribes.push(unsubscribeReadStatus);

            // Listen latest batch of messages (limit to reduce cost)
            const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(100));
            const unsubscribeMessages = onSnapshot(
              messagesQuery,
              (snapshot) => {
                try {
                  let lastMessageDoc = snapshot.docs[0];
                  let lastMessage = lastMessageDoc ? lastMessageDoc.data() : null;

                  usersWithMessagesMap.set(user.id, {
                    user,
                    lastMessage,
                    chatType: 'regular',
                    messagesSnapshot: snapshot,
                  });
                  updateUsersList();
                } catch (error) {
                  console.error('Error processing direct chat snapshot:', error);
                }
              },
              (error) => {
                console.error('Error listening to direct chat messages:', error);
              }
            );
            unsubscribes.push(unsubscribeMessages);
          })();
        } catch (error) {
          console.error('Error setting up message listener for user:', user.id, error);
        }
      });
    }

    // 2. Set up listener for Hot Spot chats (hotSpotChats collection)
    try {
      const hotSpotChatsRef = collection(db, 'hotSpotChats');
      
      const unsubscribeHotSpotChats = onSnapshot(
        hotSpotChatsRef,
        async (snapshot) => {
          try {
            for (const chatDoc of snapshot.docs) {
              const chatData = chatDoc.data();
              const participants = chatData.participants || [];
              
              // Check if current user is a participant
              if (participants.includes(currenUser.uid)) {
                const otherUserId = participants.find((id: string) => id !== currenUser.uid);
                
                if (otherUserId) {
                  // Fetch other user's profile
                  const userDoc = await doc(db, 'users', otherUserId);
                  const userSnap = await getDoc(userDoc);
                  
                  if (userSnap.exists()) {
                    const userData = userSnap.data();
                    
                    usersWithMessagesMap.set(`hotspot_${otherUserId}`, {
                      user: {
                        id: otherUserId,
                        ...userData,
                      },
                      lastMessage: {
                        text: chatData.lastMessage || '',
                        lastMessageTime: chatData.lastMessageTime,
                      },
                      chatType: 'hotspot',
                      chatRoomId: chatDoc.id,
                      hotSpotId: chatData.eventId,
                      unreadCount: 0,
                    });
                    
                    updateUsersList();
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error processing hot spot chats:', error);
          }
        },
        (error) => {
          console.error('Error listening to hot spot chats:', error);
        }
      );

      unsubscribes.push(unsubscribeHotSpotChats);
    } catch (error) {
      console.error('Error setting up hot spot chat listener:', error);
    }

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
    };
  }, [users, currenUser?.uid]);

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
          keyExtractor={(item) => `${item.user.id}_${item.chatType}`}
          renderItem={({ item, index }) => {
            // Safety check for item structure
            if (!item?.user?.id) {
              return null;
            }
            
            return (
              <ChatItem 
                item={item.user} 
                currenUser={currenUser}
                noBorder={index === sortedUsers.length - 1}
                chatType={item.chatType}
                chatRoomId={item.chatRoomId}
                hotSpotId={item.hotSpotId}
                lastMessage={item.lastMessage}
                unreadCount={item.unreadCount}
              />
            );
          }}
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
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
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
