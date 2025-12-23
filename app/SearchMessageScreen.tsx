import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { Colors } from '@/constants/Colors';

interface MessageResult {
  id: string;
  message: string;
  sender: string;
  timestamp: string;
  roomId: string;
}

const BATCH_SIZE = 30;

const SearchMessageScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Refs to keep track of search progress across renders
  const roomsRef = useRef<QueryDocumentSnapshot<DocumentData>[]>([]);
  const currentRoomIndexRef = useRef(0);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    Keyboard.dismiss();
    setIsLoading(true);
    setSearchResults([]);
    setHasMore(true);

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch all relevant rooms first
      const roomsQuery = query(collection(db, 'rooms'), where('participants', 'array-contains', userId));
      const roomsSnapshot = await getDocs(roomsQuery);
      roomsRef.current = roomsSnapshot.docs;
      currentRoomIndexRef.current = 0;

      // 2. Start searching
      await loadMoreMessages();

    } catch (error) {
      console.error('Error initializing search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (currentRoomIndexRef.current >= roomsRef.current.length) {
      setHasMore(false);
      return;
    }

    setIsLoadingMore(true);
    const newResults: MessageResult[] = [];
    let processedCount = 0;
    const queryText = searchQuery.toLowerCase();

    try {
      // Iterate through rooms until we find enough messages or run out of rooms
      while (currentRoomIndexRef.current < roomsRef.current.length && newResults.length < BATCH_SIZE) {
        const roomDoc = roomsRef.current[currentRoomIndexRef.current];
        const roomId = roomDoc.id;

        // Fetch messages for this room
        // Optimization: Order by latest first
        const messagesQuery = query(
          collection(db, 'rooms', roomId, 'messages'),
          orderBy('createdAt', 'desc')
        );
        const messagesSnapshot = await getDocs(messagesQuery);

        messagesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          // Only include text messages - exclude gifts, audio, and image-only messages
          if (
            data.text &&
            typeof data.text === 'string' &&
            data.text.toLowerCase().includes(queryText) &&
            data.type !== 'gift' &&
            data.type !== 'audio'
          ) {
            newResults.push({
              id: doc.id,
              message: data.text,
              sender: data.senderName || data.uid || 'Unknown',
              timestamp: data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : '',
              roomId
            });
          }
        });

        currentRoomIndexRef.current++;

        // Safety break to prevent blocking UI too long if many empty rooms
        // If we've checked 5 rooms and found nothing, let's render what we have (or nothing) and let user trigger more
        if (newResults.length === 0 && processedCount > 5) {
          break;
        }
        processedCount++;
      }

      setSearchResults(prev => [...prev, ...newResults]);

      if (currentRoomIndexRef.current >= roomsRef.current.length) {
        setHasMore(false);
      }

    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderSearchResult = ({ item }: { item: MessageResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push({
        pathname: '/chat/[id]',
        params: { id: item.roomId, messageId: item.id }
      })}
    >
      <View style={styles.resultContent}>
        <View style={styles.row}>
          <Text style={styles.sender}>{item.sender}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#667eea" />
        <Text style={styles.footerText}>Đang tải thêm...</Text>
      </View>
    );
  };

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
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="white" />
        </TouchableOpacity>
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
            !isLoading && searchQuery && searchResults.length === 0 ? (
              <Text style={styles.emptyText}>Không tìm thấy tin nhắn nào</Text>
            ) : (
              !isLoading && !searchQuery ? <Text style={styles.emptyText}>Nhập từ khóa để tìm kiếm</Text> : null
            )
          }
          style={styles.resultsList}
          onEndReached={() => {
            if (hasMore && !isLoadingMore) {
              loadMoreMessages();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#f0f0f0', // Light gray background like AddFriend
    marginRight: 10,
  },
  searchButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sender: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  footerText: {
    marginLeft: 8,
    color: '#666',
  }
});

export default SearchMessageScreen;
