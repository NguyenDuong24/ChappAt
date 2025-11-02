import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Checkbox, Avatar, Searchbar } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import Animated, { FadeIn } from 'react-native-reanimated';

interface FriendSelectionListProps {
  currentUser: any;
  selectedFriends: string[];
  onSelectionChange: (selected: string[]) => void;
  disabled?: boolean;
}

const FriendSelectionList = ({
  currentUser,
  selectedFriends,
  onSelectionChange,
  disabled = false,
}: FriendSelectionListProps) => {
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<any[]>([]);

  useEffect(() => {
    loadFriends();
  }, [currentUser]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = friends.filter(
      friend =>
        friend.displayName?.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query)
    );
    setFilteredFriends(filtered);
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const friendsRef = collection(db, 'users');
      const q = query(
        friendsRef,
        where('friends', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const friendsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setFriends(friendsData);
      setFilteredFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    if (disabled) return;
    
    const newSelected = selectedFriends.includes(friendId)
      ? selectedFriends.filter(id => id !== friendId)
      : [...selectedFriends, friendId];
    
    onSelectionChange(newSelected);
  };

  const renderFriend = ({ item }: { item: any }) => {
    const isSelected = selectedFriends.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          {
            backgroundColor: isSelected
              ? theme === 'dark'
                ? 'rgba(102, 126, 234, 0.2)'
                : 'rgba(102, 126, 234, 0.1)'
              : 'transparent',
          },
        ]}
        onPress={() => toggleFriendSelection(item.id)}
        disabled={disabled}
      >
        <View style={styles.friendInfo}>
          {item.photoURL ? (
            <Avatar.Image
              size={40}
              source={{ uri: item.photoURL }}
            />
          ) : (
            <Avatar.Text
              size={40}
              label={item.displayName?.charAt(0)?.toUpperCase() || '?'}
              style={{ backgroundColor: '#667eea' }}
            />
          )}
          <View style={styles.textContainer}>
            <Text
              style={[styles.friendName, { color: currentThemeColors.text }]}
              numberOfLines={1}
            >
              {item.displayName}
            </Text>
            <Text
              style={[styles.friendEmail, { color: currentThemeColors.subtleText }]}
              numberOfLines={1}
            >
              {item.email}
            </Text>
          </View>
        </View>
        <Checkbox
          status={isSelected ? 'checked' : 'unchecked'}
          disabled={disabled}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <Animated.View 
      entering={FadeIn}
      style={styles.container}
    >
      <Searchbar
        placeholder="Tìm bạn bè..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={{ color: currentThemeColors.text }}
        iconColor={currentThemeColors.text}
        placeholderTextColor={currentThemeColors.subtleText}
        disabled={disabled}
      />

      {filteredFriends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: currentThemeColors.subtleText }]}>
            {searchQuery
              ? 'Không tìm thấy bạn bè nào'
              : 'Bạn chưa có người bạn nào'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriend}
          keyExtractor={item => item.id}
          style={styles.list}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    marginBottom: 16,
    elevation: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e5e5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default FriendSelectionList;
