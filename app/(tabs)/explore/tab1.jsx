import React from 'react';
import { useLatestPosts, useExploreActions, useExploreState, useExploreLoading } from '@/context/ExploreContext';
import BaseExploreTab from '@/components/explore/BaseExploreTab';

const Tab1Screen = ({ isActive }: { isActive: boolean }) => {
    const { posts: latestPosts, hasMore } = useLatestPosts() || { posts: [], hasMore: false };
    const { loadMore, deletePost, toggleLike, refresh, updatePostPrivacy } = useExploreActions() || {};
    const { loadingInitial, isRefreshing } = useExploreState() || {};
    const { loadingLatest } = useExploreLoading() || {};

    return (
        <BaseExploreTab
            isActive={isActive}
            posts={latestPosts}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingSpecific={loadingLatest}
            refreshType="latest"
            footerLoadingText="Đang tìm thêm bài viết mới..."
            deletePost={deletePost}
            toggleLike={toggleLike}
            refresh={refresh}
            updatePostPrivacy={updatePostPrivacy}
            loadingInitial={loadingInitial}
            isRefreshing={isRefreshing}
        />
    );
};

export default React.memo(Tab1Screen);