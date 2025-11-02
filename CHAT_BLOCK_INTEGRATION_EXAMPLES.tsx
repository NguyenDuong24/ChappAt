/**
 * 🔐 BLOCK SYSTEM INTEGRATION EXAMPLES
 * 
 * Examples showing how to integrate block system into:
 * 1. Chat Screen
 * 2. User List
 * 3. Direct Message
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useChatPermission, useFilteredUserList } from '@/hooks/useChatPermission';
import { BlockedChatView } from '@/components/common/BlockedChatView';
import { useAuth } from '@/context/authContext';

// ============================================
// EXAMPLE 1: Chat Screen with Block Check
// ============================================
export function ChatScreen({ route }) {
  const { user } = useAuth();
  const { targetUserId, targetUserName } = route.params;
  
  // 🔥 Check if chat is allowed
  const { canChat, reason, loading } = useChatPermission(
    user?.uid,
    targetUserId
  );

  if (loading) {
    return <Text>Loading...</Text>;
  }

  // ❌ Show blocked view if cannot chat
  if (!canChat) {
    return (
      <BlockedChatView
        reason={reason?.includes('chặn') ? 'blocked' : 'blockedBy'}
      />
    );
  }

  // ✅ Show normal chat interface
  return (
    <View>
      <Text>Chat with {targetUserName}</Text>
      {/* Your chat UI here */}
    </View>
  );
}

// ============================================
// EXAMPLE 2: User List with Blocked Users Filtered
// ============================================
interface User {
  id: string;
  name: string;
  avatar?: string;
}

export function UserListScreen() {
  const { user } = useAuth();
  
  // Your users data
  const [allUsers, setAllUsers] = React.useState<User[]>([
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' }, // This user might be blocked
  ]);

  // 🔥 Auto-filter blocked users
  const { filteredUsers, loading } = useFilteredUserList(
    allUsers,
    user?.uid
  );

  if (loading) {
    return <Text>Loading users...</Text>;
  }

  return (
    <FlatList
      data={filteredUsers} // Only shows non-blocked users
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={{ padding: 16 }}>
          <Text>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

// ============================================
// EXAMPLE 3: Direct Message Button with Check
// ============================================
export function UserProfileWithMessageButton({ targetUser }) {
  const { user } = useAuth();
  const { canChat, reason } = useChatPermission(user?.uid, targetUser.id);

  const handleSendMessage = () => {
    if (!canChat) {
      alert(reason || 'Không thể nhắn tin với người dùng này');
      return;
    }

    // Navigate to chat
    // navigation.navigate('Chat', { targetUserId: targetUser.id });
  };

  return (
    <TouchableOpacity
      onPress={handleSendMessage}
      disabled={!canChat}
      style={{
        padding: 12,
        backgroundColor: canChat ? '#667eea' : '#ccc',
        borderRadius: 8,
      }}
    >
      <Text style={{ color: 'white' }}>
        {canChat ? 'Nhắn tin' : 'Không thể nhắn tin'}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================
// EXAMPLE 4: Chat List (Conversations)
// ============================================
interface Conversation {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
}

export function ChatListScreen() {
  const { user } = useAuth();
  
  const [conversations, setConversations] = React.useState<Conversation[]>([
    { id: '1', userId: 'user1', userName: 'Alice', lastMessage: 'Hello!' },
    { id: '2', userId: 'user2', userName: 'Bob', lastMessage: 'Hi there' },
  ]);

  // 🔥 Filter out conversations with blocked users
  const { filteredUsers: filteredConversations } = useFilteredUserList(
    conversations,
    user?.uid
  );

  return (
    <FlatList
      data={filteredConversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={{ padding: 16, borderBottomWidth: 1 }}>
          <Text style={{ fontWeight: 'bold' }}>{item.userName}</Text>
          <Text style={{ color: '#666' }}>{item.lastMessage}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

// ============================================
// EXAMPLE 5: Search Users (excluding blocked)
// ============================================
export function SearchUsersScreen() {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = React.useState<User[]>([]);

  const handleSearch = async (query: string) => {
    // Fetch search results from your API
    const results: User[] = []; // Your search results
    
    // Filter out blocked users before showing
    const { filteredUsers } = useFilteredUserList(results, user?.uid);
    setSearchResults(filteredUsers);
  };

  return (
    <View>
      {/* Search input */}
      <FlatList
        data={searchResults}
        renderItem={({ item }) => <Text>{item.name}</Text>}
      />
    </View>
  );
}

// ============================================
// USAGE SUMMARY
// ============================================

/**
 * 1. IN CHAT SCREEN:
 * ==================
 * const { canChat, reason } = useChatPermission(currentUserId, targetUserId);
 * 
 * if (!canChat) {
 *   return <BlockedChatView reason={reason} />;
 * }
 * 
 * 
 * 2. IN USER LIST:
 * ================
 * const { filteredUsers } = useFilteredUserList(users, currentUserId);
 * <FlatList data={filteredUsers} ... />
 * 
 * 
 * 3. IN DIRECT MESSAGE BUTTON:
 * ============================
 * const { canChat } = useChatPermission(currentUserId, targetUserId);
 * <Button disabled={!canChat}>Nhắn tin</Button>
 * 
 * 
 * 4. IN CHAT LIST (Conversations):
 * ================================
 * const { filteredUsers: filteredConvos } = useFilteredUserList(conversations, currentUserId);
 * <FlatList data={filteredConvos} ... />
 */
