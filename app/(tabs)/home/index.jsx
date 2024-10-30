import React, { useEffect, useState } from 'react';
import { View, StatusBar, ActivityIndicator } from 'react-native';
import ListUser from '@/components/home/ListUser';
import { useAuth } from '@/context/authContext';
import { useAppState } from '@/context/AppStateContext';
import { getDocs } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';

export default function Home() {
  const appState = useAppState();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getUsers();
    }
  }, [user]);

  const getUsers = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(userRef);
    const data = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(docUser => docUser.id !== user?.uid);
    const sortedUsers = data.sort((a, b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1));
    setUsers(sortedUsers);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await getUsers();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ListUser users={users} refreshing={refreshing} onRefresh={handleRefresh} />
      )}
    </View>
  );
}
