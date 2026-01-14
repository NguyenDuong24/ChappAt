import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    startAfter,
    doc,
    getDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

class PostService {
    /**
     * Subscribe to the first page of posts for real-time updates.
     * @param {Object} options - Query options (type, userId, etc.)
     * @param {Function} callback - Callback function for snapshot updates
     * @returns {Function} Unsubscribe function
     */
    subscribeToFirstPage(options, callback) {
        const { type, pageSize = 20, followingIds = [] } = options;
        let q;

        const postsRef = collection(db, 'posts');

        if (type === 'latest') {
            q = query(postsRef, orderBy('timestamp', 'desc'), limit(pageSize));
        } else if (type === 'trending') {
            // Trending: Fetch last 100 posts to sort by likes in memory
            q = query(
                postsRef,
                orderBy('timestamp', 'desc'),
                limit(100)
            );
        } else if (type === 'following') {
            if (followingIds.length === 0) {
                callback([]);
                return () => { };
            }
            const batch = followingIds.slice(0, 10);
            q = query(
                postsRef,
                where('userID', 'in', batch),
                orderBy('timestamp', 'desc'),
                limit(pageSize)
            );
        }

        return onSnapshot(q, (snapshot) => {
            let posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter based on privacy
            if (type === 'latest' || type === 'trending') {
                posts = posts.filter(p => !p.privacy || p.privacy === 'public');
            } else if (type === 'following') {
                posts = posts.filter(p => !p.privacy || p.privacy === 'public' || p.privacy === 'friends');
            }

            const currentLimit = type === 'trending' ? 100 : pageSize;
            const hasMore = snapshot.docs.length === currentLimit;

            if (type === 'trending') {
                const now = Date.now();
                const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

                const getMs = (ts) => {
                    if (!ts) return 0;
                    if (ts.toMillis) return ts.toMillis();
                    if (ts.seconds) return ts.seconds * 1000;
                    if (ts instanceof Date) return ts.getTime();
                    return 0;
                };

                const getLikes = (p) => p.likesCount ?? (Array.isArray(p.likes) ? p.likes.length : 0);

                const calculateScore = (p) => {
                    const likes = getLikes(p);
                    const hours = (now - getMs(p.timestamp)) / 3600000;
                    return (likes + 1) / Math.pow(hours + 2, 1.5);
                };

                let trending = posts.filter(p => getMs(p.timestamp) >= twentyFourHoursAgo);

                if (trending.length >= 3) {
                    trending.sort((a, b) => getLikes(b) - getLikes(a) || getMs(b.timestamp) - getMs(a.timestamp));
                } else {
                    trending = [...posts].sort((a, b) => calculateScore(b) - calculateScore(a));
                }

                posts = trending;
            }

            callback(posts, snapshot.docs[snapshot.docs.length - 1], hasMore);
        }, (error) => {
            console.error(`Error subscribing to ${type} posts:`, error);
        });
    }

    /**
     * Fetch subsequent pages using getDocs.
     * @param {Object} options - Query options
     * @param {Object} lastDoc - Last document for pagination
     * @returns {Promise} Array of posts and new lastDoc
     */
    async fetchNextPage(options, lastDoc) {
        const { type, pageSize = 20, followingIds = [] } = options;
        if (!lastDoc) return { posts: [], lastDoc: null, hasMore: false };

        let allPosts = [];
        let currentLastDoc = lastDoc;
        let hasMore = true;
        let attempts = 0;

        // Try to fetch until we get at least some posts or we've tried too many times (max 3 batches)
        while (allPosts.length < pageSize && hasMore && attempts < 3) {
            attempts++;
            let q;
            const postsRef = collection(db, 'posts');

            if (type === 'latest' || type === 'trending') {
                q = query(
                    postsRef,
                    orderBy('timestamp', 'desc'),
                    startAfter(currentLastDoc),
                    limit(pageSize)
                );
            } else if (type === 'following') {
                if (followingIds.length === 0) return { posts: [], lastDoc: null, hasMore: false };
                const batch = followingIds.slice(0, 10);
                q = query(
                    postsRef,
                    where('userID', 'in', batch),
                    orderBy('timestamp', 'desc'),
                    startAfter(currentLastDoc),
                    limit(pageSize)
                );
            }

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                hasMore = false;
                break;
            }

            let batchPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (type === 'latest' || type === 'trending') {
                batchPosts = batchPosts.filter(p => !p.privacy || p.privacy === 'public');
            } else if (type === 'following') {
                batchPosts = batchPosts.filter(p => !p.privacy || p.privacy === 'public' || p.privacy === 'friends');
            }

            allPosts = [...allPosts, ...batchPosts];
            currentLastDoc = snapshot.docs[snapshot.docs.length - 1];
            hasMore = snapshot.docs.length === pageSize;
        }

        return {
            posts: allPosts,
            lastDoc: currentLastDoc,
            hasMore
        };
    }
}

export default new PostService();
