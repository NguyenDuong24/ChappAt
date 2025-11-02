import React from 'react';
import { View, FlatList, Text } from 'react-native';
import { BlockedContentWrapper } from '@/components/common/BlockedContentWrapper';
import { useAuth } from '@/context/authContext';
import { useFilterBlockedContent } from '@/hooks/useBlockStatus';

/**
 * EXAMPLE: How to use BlockedContentWrapper in a post feed
 * 
 * This example shows two approaches:
 * 1. Filter posts before rendering (recommended for lists)
 * 2. Wrap individual posts (good for single post views)
 */

interface Post {
  id: string;
  userID: string;
  content: string;
  // ... other fields
}

// APPROACH 1: Filter entire list (Recommended for feeds)
export const PostFeedWithBlockFilter = ({ posts }: { posts: Post[] }) => {
  const { user } = useAuth();
  const { filteredItems: filteredPosts, loading } = useFilterBlockedContent(
    posts,
    user?.uid
  );

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <FlatList
      data={filteredPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View>
          {/* Your post component here */}
          <Text>{item.content}</Text>
        </View>
      )}
    />
  );
};

// APPROACH 2: Wrap individual posts (Good for single posts or mixed content)
export const SinglePostWithBlockWrapper = ({ post }: { post: Post }) => {
  return (
    <BlockedContentWrapper
      targetUserId={post.userID}
      showPlaceholder={true}
      placeholderMessage="Bài viết này đã bị ẩn"
    >
      <View>
        {/* Your post component here */}
        <Text>{post.content}</Text>
      </View>
    </BlockedContentWrapper>
  );
};

// APPROACH 3: Don't show placeholder at all (completely hide)
export const PostFeedHideBlocked = ({ posts }: { posts: Post[] }) => {
  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <BlockedContentWrapper
          targetUserId={item.userID}
          showPlaceholder={false} // Completely hide blocked content
        >
          <View>
            <Text>{item.content}</Text>
          </View>
        </BlockedContentWrapper>
      )}
    />
  );
};
