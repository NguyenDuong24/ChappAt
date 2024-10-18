import { View, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where, collection, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { userRef, db } from '@/firebaseConfig';
import ChatList from '@/components/chat/ChatList';
import { getRoomId } from '@/utils/common';

export default function Index() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    if (user?.userId) {
      getUsers();
    }
  }, [user]);

  const getUsers = async () => {
    const q = query(userRef, where('userId', '!=', user?.userId));
    const querySnapshot = await getDocs(q);
    let data = [];

    for (const docSnap of querySnapshot.docs) {
      const userData = { ...docSnap.data() };
      const roomId = getRoomId(user.userId, userData.userId);

      // Lấy tin nhắn cuối cùng cho từng user
      const messagesRef = collection(doc(db, "rooms", roomId), "messages");
      const lastMessageQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));

      const unsub = onSnapshot(lastMessageQuery, (snapshot) => {
        const lastMessageData = snapshot.docs[0]?.data() || null;
        data.push({ ...userData, lastMessage: lastMessageData });

        // Sắp xếp user theo `lastMessage.createdAt`
        const sortedUsers = data.sort((a, b) => {
          const timeA = a.lastMessage?.createdAt?.toDate();
          const timeB = b.lastMessage?.createdAt?.toDate();
          return timeB - timeA; // Sắp xếp giảm dần
        });

        setUsers(sortedUsers);
      });
    }
  };

  return (
    <View>
      {users.length > 0 ? (
        <ChatList currenUser={user} users={users} />
      ) : (
        <View>
          <ActivityIndicator size='large' />
        </View>
      )}
    </View>
  );
}
