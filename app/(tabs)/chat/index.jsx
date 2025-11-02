import { View, Text, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import ChatList from '@/components/chat/ChatList';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

// Simple in-memory cache for users
let USERS_CACHE = { items: [], ts: 0 };
const USERS_TTL_MS = 2 * 60 * 1000; // 2 minutes

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

  const getUsers = async (force = false) => {
    try {
      setLoading(true);
      if (!user?.uid) {
        setUsers([]);
        return;
      }

      const now = Date.now();
      if (!force && USERS_CACHE.items.length > 0 && now - USERS_CACHE.ts < USERS_TTL_MS) {
        setUsers(USERS_CACHE.items);
        return;
      }
      
      const querySnapshot = await getDocs(userRef);
      const data = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(docUser => docUser.id !== user?.uid);
      const items = data || [];
      setUsers(items);
      USERS_CACHE = { items, ts: now };
    } catch (error) {
      console.error("Error fetching users: ", error);
      setUsers([]);
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
          <ChatList currenUser={user} users={users || []} onRefresh={() => getUsers(true)} />
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
