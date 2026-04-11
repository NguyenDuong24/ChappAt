import React from 'react';
import { useTrendingPosts, useExploreActions, useExploreState, useExploreLoading } from '@/context/ExploreContext';
import BaseExploreTab from '@/components/explore/BaseExploreTab';

const Tab2Screen = ({ isActive }: { isActive: boolean }) => {
    const { posts: trendingPosts, hasMore } = useTrendingPosts() || { posts: [], hasMore: false };
    const { loadMoreTrending, deletePost, toggleLike, refresh, updatePostPrivacy } = useExploreActions() || {};
    const { loadingInitial, isRefreshing } = useExploreState() || {};
    const { loadingTrending } = useExploreLoading() || {};

    return (
        <BaseExploreTab
            isActive={isActive}
            posts={trendingPosts}
            hasMore={hasMore}
            loadMore={loadMoreTrending}
            loadingSpecific={loadingTrending}
            refreshType="trending"
            footerLoadingText="Đang tìm thêm bài viết phổ biến..."
            deletePost={deletePost}
            toggleLike={toggleLike}
            refresh={refresh}
            updatePostPrivacy={updatePostPrivacy}
            loadingInitial={loadingInitial}
            isRefreshing={isRefreshing}
        />
    );
};

export default React.memo(Tab2Screen);