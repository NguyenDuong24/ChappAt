import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useHotSpotInvitations } from '@/hooks/useHotSpots';
import { useTranslation } from 'react-i18next';

interface Friend {
  id: string;
  displayName: string;
  avatar: string;
  email: string;
}

const InviteFriendScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { hotSpotId, hotSpotTitle } = useLocalSearchParams<{ hotSpotId: string; hotSpotTitle: string }>();
  const { sendInvitation } = useHotSpotInvitations();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const mockFriends: Friend[] = [
        { id: '1', displayName: 'Nguyen Van A', avatar: 'https://via.placeholder.com/50', email: 'a@example.com' },
        { id: '2', displayName: 'Tran Thi B', avatar: 'https://via.placeholder.com/50', email: 'b@example.com' },
        { id: '3', displayName: 'Le Van C', avatar: 'https://via.placeholder.com/50', email: 'c@example.com' },
      ];
      setFriends(mockFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
      Alert.alert(t('common.error'), t('invite_friend.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => (prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]));
  };

  const handleSendInvitations = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert(t('common.info'), t('invite_friend.select_at_least_one'));
      return;
    }

    try {
      setSending(true);
      for (const friendId of selectedFriends) {
        await sendInvitation(hotSpotId || '', friendId);
      }

      Alert.alert(t('common.success'), t('invite_friend.sent_count', { count: selectedFriends.length }), [{ text: t('common.ok'), onPress: () => router.back() }]);
    } catch (error) {
      console.error('Error sending invitations:', error);
      Alert.alert(t('common.error'), t('invite_friend.send_error'));
    } finally {
      setSending(false);
    }
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isSelected = selectedFriends.includes(item.id);
    return (
      <TouchableOpacity style={[styles.friendItem, isSelected && styles.friendItemSelected]} onPress={() => toggleFriendSelection(item.id)}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.displayName}</Text>
          <Text style={styles.friendEmail}>{item.email}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>{isSelected && <MaterialIcons name="check" size={16} color="#FFFFFF" />}</View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>{t('invite_friend.loading_friends')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>{t('invite_friend.title')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{hotSpotTitle}</Text>
        </View>
        <TouchableOpacity
          style={[styles.sendButton, selectedFriends.length === 0 && styles.sendButtonDisabled]}
          onPress={handleSendInvitations}
          disabled={sending || selectedFriends.length === 0}
        >
          {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sendButtonText}>{t('invite_friend.send')}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder={t('invite_friend.search_placeholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {selectedFriends.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedText}>{t('invite_friend.selected_count', { count: selectedFriends.length })}</Text>
        </View>
      )}

      <FlatList
        data={filteredFriends}
        keyExtractor={item => item.id}
        renderItem={renderFriendItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>{searchQuery ? t('invite_friend.empty_search') : t('invite_friend.empty_default')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, marginRight: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  sendButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#CCC' },
  sendButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#000' },
  selectedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E8F8F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedText: { fontSize: 14, color: '#4ECDC4', fontWeight: '500' },
  listContainer: { paddingHorizontal: 16 },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  friendItemSelected: { backgroundColor: '#E8F8F7', borderColor: '#4ECDC4' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#000' },
  friendEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 16 },
});

export default InviteFriendScreen;
