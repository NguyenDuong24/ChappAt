import React, { useEffect } from 'react';
import { useFollowingPosts, useExploreActions, useExploreState, useExploreLoading } from '@/context/ExploreContext';
import BaseExploreTab from '@/components/explore/BaseExploreTab';

const Tab3Screen = ({ isActive }: { isActive: boolean }) => {
    const { posts: followingPosts, hasMore } = useFollowingPosts() || { posts: [], hasMore: false };
    const { loadMoreFollowing, deletePost, toggleLike, refresh, ensureFeedReady, updatePostPrivacy } = useExploreActions() || {};
    const { loadingInitial, isRefreshing } = useExploreState() || {};
    const { loadingFollowing } = useExploreLoading() || {};

    useEffect(() => {
        if (isActive) {
            ensureFeedReady?.('following');
        }
    }, [isActive, ensureFeedReady]);

    return (
        <BaseExploreTab
            isActive={isActive}
            posts={followingPosts}
            hasMore={hasMore}
            loadMore={loadMoreFollowing}
            loadingSpecific={loadingFollowing}
            refreshType="following"
            footerLoadingText="Đang tìm thêm bài viết từ bạn bè..."
            deletePost={deletePost}
            toggleLike={toggleLike}
            refresh={refresh}
            updatePostPrivacy={updatePostPrivacy}
            loadingInitial={loadingInitial}
            isRefreshing={isRefreshing}
        />
    );
};

export default React.memo(Tab3Screen);
