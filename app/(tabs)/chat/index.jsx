import { View, Text, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import ChatList from '@/components/chat/ChatList';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function Chat() {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
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
      if (!user?.uid) {
        setUsers([]);
        return;
      }
      
      const querySnapshot = await getDocs(userRef);
      const data = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(docUser => docUser.id !== user?.uid);
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users: ", error);
      setUsers([]); // Đảm bảo users luôn là array
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
              Đang tải cuộc trò chuyện...
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.chatContainer}>
          <ChatList currenUser={user} users={users || []} onRefresh={getUsers} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
    paddingTop: 8,
  },
});
