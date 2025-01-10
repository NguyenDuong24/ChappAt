import { View, Text, StatusBar, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import ChatList from '@/components/chat/ChatList';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';

export default function Chat() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      getUsers();
    }
  }, [user]);

  const getUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(userRef);
      const data = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(docUser => docUser.id !== user?.uid);
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ChatList currenUser={user} users={users} onRefresh={getUsers} />
      )}
    </View>
  );
}
