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
    getDoc
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
            // Trending usually needs a different approach, but for real-time top, 
            // we might just stick to latest or a specific trending flag if available.
            // For now, let's use latest as a placeholder for real-time trending top.
            q = query(postsRef, orderBy('timestamp', 'desc'), limit(pageSize));
        } else if (type === 'following') {
            if (followingIds.length === 0) {
                callback([]);
                return () => { };
            }
            // Firebase 'in' query limit is 10/30 depending on version, 
            // but for real-time we might only subscribe to the most active ones 
            // or use a different strategy. 
            // For simplicity, we'll take the first 10 following IDs.
            const batch = followingIds.slice(0, 10);
            q = query(
                postsRef,
                where('userID', 'in', batch),
                orderBy('timestamp', 'desc'),
                limit(pageSize)
            );
        }

        return onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(posts, snapshot.docs[snapshot.docs.length - 1]);
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
        if (!lastDoc) return { posts: [], lastDoc: null };

        let q;
        const postsRef = collection(db, 'posts');

        if (type === 'latest') {
            q = query(
                postsRef,
                orderBy('timestamp', 'desc'),
                startAfter(lastDoc),
                limit(pageSize)
            );
        } else if (type === 'trending') {
            // For trending pagination, we might need a different sort
            q = query(
                postsRef,
                orderBy('timestamp', 'desc'), // Placeholder
                startAfter(lastDoc),
                limit(pageSize)
            );
        } else if (type === 'following') {
            if (followingIds.length === 0) return { posts: [], lastDoc: null };

            // This is tricky with 'in' and pagination across multiple batches.
            // For now, we'll simplify to the current batch logic used in tab3.
            const batch = followingIds.slice(0, 10); // Simplified
            q = query(
                postsRef,
                where('userID', 'in', batch),
                orderBy('timestamp', 'desc'),
                startAfter(lastDoc),
                limit(pageSize)
            );
        }

        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            posts,
            lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
            hasMore: snapshot.docs.length === pageSize
        };
    }
}

export default new PostService();
