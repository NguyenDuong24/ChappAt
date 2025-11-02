import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';

interface MessageResult {
  id: string;
  message: string;
  sender: string;
  timestamp: string;
  roomId: string;
}

const SearchMessageScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const searchMessages = async (queryText: string) => {
    if (!queryText.trim()) return [];
    
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    
    setIsLoading(true);
    try {
      // Get rooms where user is a member
      const roomsQuery = query(collection(db, 'rooms'), where('members', 'array-contains', userId));
      const roomsSnapshot = await getDocs(roomsQuery);
      
      const results: MessageResult[] = [];
      
      for (const roomDoc of roomsSnapshot.docs) {
        const roomId = roomDoc.id;
        
        // Get all messages in this room
        const messagesQuery = query(collection(db, 'rooms', roomId, 'messages'));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        messagesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.text && data.text.toLowerCase().includes(queryText.toLowerCase())) {
            results.push({
              id: doc.id,
              message: data.text,
              sender: data.senderId || 'Unknown',
              timestamp: data.createdAt?.toDate()?.toISOString().split('T')[0] || '',
              roomId
            });
          }
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const performSearch = async () => {
      const results = await searchMessages(searchQuery);
      setSearchResults(results);
    };
    
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const renderSearchResult = ({ item }: { item: MessageResult }) => (
    <TouchableOpacity style={styles.resultItem}>
      <View style={styles.resultContent}>
        <Text style={styles.sender}>{item.sender}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tin nhắn..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          ListEmptyComponent={
            searchQuery ? (
              <Text style={styles.emptyText}>Không tìm thấy tin nhắn nào</Text>
            ) : (
              <Text style={styles.emptyText}>Nhập từ khóa để tìm kiếm</Text>
            )
          }
          style={styles.resultsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
  },
  resultContent: {
    flex: 1,
  },
  sender: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginVertical: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default SearchMessageScreen;
