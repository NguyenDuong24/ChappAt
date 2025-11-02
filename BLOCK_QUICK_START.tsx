/**
 * 🚫 BLOCK USER SYSTEM - QUICK START
 * 
 * Copy this code to test the block system immediately
 */

import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { BlockedContentWrapper } from '@/components/common/BlockedContentWrapper';
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';
import { useAuth } from '@/context/authContext';

// ============================================
// EXAMPLE 1: Filter posts in feed (RECOMMENDED)
// ============================================
export function PostFeedScreen() {
  const { user } = useAuth();
  
  // Your posts data
  const posts = [
    { id: '1', userID: 'user123', content: 'Hello world', username: 'john' },
    { id: '2', userID: 'user456', content: 'Nice post', username: 'jane' },
    { id: '3', userID: 'user789', content: 'Blocked user post', username: 'blocked' },
  ];

  // 🔥 AUTO-FILTER blocked users' posts
  const { filteredItems: filteredPosts, loading } = useFilterBlockedContent(
    posts,
    user?.uid
  );

  if (loading) return <Text>Loading...</Text>;

  return (
    <FlatList
      data={filteredPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1 }}>
          <Text style={{ fontWeight: 'bold' }}>@{item.username}</Text>
          <Text>{item.content}</Text>
        </View>
      )}
    />
  );
}

// ============================================
// EXAMPLE 2: Wrap single post (for detail view)
// ============================================
export function PostDetailScreen({ post }) {
  return (
    <BlockedContentWrapper
      targetUserId={post.userID}
      showPlaceholder={true}
      placeholderMessage="Bài viết này không khả dụng"
    >
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: 'bold' }}>@{post.username}</Text>
        <Text>{post.content}</Text>
      </View>
    </BlockedContentWrapper>
  );
}

// ============================================
// EXAMPLE 3: Hide blocked comments
// ============================================
export function CommentSection({ postId }) {
  const { user } = useAuth();
  
  const comments = [
    { id: '1', userID: 'user1', text: 'Nice!', username: 'alice' },
    { id: '2', userID: 'user2', text: 'Great', username: 'bob' },
  ];

  const { filteredItems: filteredComments } = useFilterBlockedContent(
    comments,
    user?.uid
  );

  return (
    <View>
      {filteredComments.map(comment => (
        <View key={comment.id} style={{ padding: 8 }}>
          <Text style={{ fontWeight: '600' }}>@{comment.username}</Text>
          <Text>{comment.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================
// EXAMPLE 4: Block user from profile
// ============================================
import { Alert } from 'react-native';
import { followService } from '@/services/followService';

export async function blockUserFromProfile(currentUserId: string, targetUserId: string) {
  Alert.alert(
    '⚠️ Chặn người dùng',
    'Bạn có chắc muốn chặn người dùng này?',
    [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Chặn',
        style: 'destructive',
        onPress: async () => {
          try {
            const success = await followService.blockUser(currentUserId, targetUserId);
            if (success) {
              Alert.alert('✅ Thành công', 'Đã chặn người dùng');
            }
          } catch (error) {
            Alert.alert('❌ Lỗi', 'Không thể chặn người dùng');
          }
        },
      },
    ]
  );
}

// ============================================
// EXAMPLE 5: Check if user is blocked
// ============================================
import { useBlockStatus } from '@/hooks/useBlockStatus';

export function UserProfileCard({ userId }) {
  const { user } = useAuth();
  const { isBlocked, isBlockedBy, hasBlockRelation } = useBlockStatus(
    user?.uid,
    userId
  );

  if (hasBlockRelation) {
    return (
      <View style={{ padding: 16, backgroundColor: '#fee' }}>
        <Text>
          {isBlocked 
            ? '🚫 Bạn đã chặn người dùng này' 
            : '⚠️ Người dùng này đã chặn bạn'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text>Normal profile view</Text>
    </View>
  );
}

// ============================================
// TO USE IN YOUR PROJECT:
// ============================================

/**
 * 1. Import the hook or component:
 * 
 *    import { useFilterBlockedContent } from '@/hooks/useBlockStatus';
 *    import { BlockedContentWrapper } from '@/components/common/BlockedContentWrapper';
 * 
 * 2. Use in your component:
 * 
 *    const { filteredItems } = useFilterBlockedContent(items, currentUserId);
 * 
 * 3. Or wrap content:
 * 
 *    <BlockedContentWrapper targetUserId={post.userID}>
 *      <YourContent />
 *    </BlockedContentWrapper>
 * 
 * 4. Done! 🎉
 */
