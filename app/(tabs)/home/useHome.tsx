import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { useStateCommon } from '../../../context/stateCommon';
import { normalizeInterestsArray } from '@/utils/interests';

const PAGE_SIZE = 20;

const useHome = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const { stateCommon } = useStateCommon();
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastTriggerKeyRef = useRef<string>('');

  // Memoize filter object to prevent unnecessary re-renders
  const filterMemo = useMemo(() => {
    const filter = {
      gender: stateCommon.filter?.gender || '',
      minAge: stateCommon.filter?.minAge || '',
      maxAge: stateCommon.filter?.maxAge || '',
      job: stateCommon.filter?.job || '',
      educationLevel: stateCommon.filter?.educationLevel || '',
      university: stateCommon.filter?.university || '',
      interests: normalizeInterestsArray(Array.isArray(stateCommon.filter?.interests) ? stateCommon.filter.interests : (stateCommon.filter?.interests ? [stateCommon.filter.interests] : [])),
    };
    console.log('[DEBUG] Creating filterMemo:', filter);
    return filter;
  }, [stateCommon.filter]);

  console.log('[DEBUG] Filter Memo used:', filterMemo);

  const getUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      // Reset pagination on refresh
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoading(true);
    }

    if (filterMemo.gender || filterMemo.minAge || filterMemo.maxAge || filterMemo.job || filterMemo.educationLevel || filterMemo.university) {
      setFiltering(true);
    }

    try {
      setError(null);
      console.log('[DEBUG] Fetching users with filter:', filterMemo, 'refresh:', isRefresh);

      const constraints: any[] = [];

      // Filters
      if (filterMemo.gender && filterMemo.gender !== 'all') {
        constraints.push(where('gender', '==', filterMemo.gender));
      }

      if (filterMemo.job) {
        constraints.push(where('job', '==', filterMemo.job));
      }

      if (filterMemo.educationLevel) {
        constraints.push(where('educationLevel', '==', filterMemo.educationLevel));
      }

      if (filterMemo.university && filterMemo.educationLevel === 'Cao đẳng/Đại học') {
        constraints.push(where('university', '==', filterMemo.university));
      }

      // Interests filtering: use array-contains or array-contains-any for multi-selection
      if (Array.isArray(filterMemo.interests) && filterMemo.interests.length > 0) {
        if (filterMemo.interests.length === 1) {
          constraints.push(where('interests', 'array-contains', filterMemo.interests[0]));
        } else {
          // Firestore supports up to 10 values for array-contains-any
          constraints.push(where('interests', 'array-contains-any', filterMemo.interests.slice(0, 10)));
        }
      }

      const hasMin = !!filterMemo.minAge;
      const hasMax = !!filterMemo.maxAge;
      const minAge = hasMin ? Number(filterMemo.minAge) : undefined;
      const maxAge = hasMax ? Number(filterMemo.maxAge) : undefined;

      if (hasMin) constraints.push(where('age', '>=', Number(minAge)));
      if (hasMax) constraints.push(where('age', '<=', Number(maxAge)));

      // Order by: if using age range, order by age first (required by Firestore)
      if (hasMin || hasMax) {
        constraints.push(orderBy('age', 'asc'));
        // Secondary ordering for stable pagination can be added if needed, e.g., orderBy('__name__', 'asc')
      } else {
        constraints.push(orderBy('__name__', 'asc'));
      }

      // Pagination
      if (!isRefresh && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      constraints.push(limit(PAGE_SIZE));

      const q = query(userRef, ...constraints);
      const querySnapshot = await getDocs(q);

      let fetchedUsers = querySnapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as any[];

      // Exclude current user on client side (simpler than Firestore != filter)
      fetchedUsers = fetchedUsers.filter((u) => u.id !== user?.uid);

      const viewerShowOnline = user?.showOnlineStatus !== false;

      // Sort by online status only if viewer allows seeing online statuses
      const sortedUsers = viewerShowOnline
        ? fetchedUsers.sort((a, b) => {
            if (a.isOnline === b.isOnline) return 0;
            return a.isOnline ? -1 : 1;
          })
        : fetchedUsers;

      if (isRefresh) {
        setUsers(sortedUsers);
      } else {
        setUsers((prev) => [...prev, ...sortedUsers]);
      }

      // Update pagination cursors
      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] as any);
        const nextHasMore = querySnapshot.docs.length === PAGE_SIZE;
        setHasMore(nextHasMore);
        console.log('[DEBUG] Loaded users:', sortedUsers.length, 'hasMore:', nextHasMore);
      } else {
        setHasMore(false);
        console.log('[DEBUG] Loaded users:', sortedUsers.length, 'hasMore:', false);
      }

      console.log('[DEBUG] Loaded users:', sortedUsers.length, 'hasMore:', hasMore);
    } catch (error) {
      console.error('[ERROR] Error getting users:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An error occurred while fetching users.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFiltering(false);
    }
  }, [user?.uid, filterMemo, lastDoc, hasMore]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      getUsers(false);
    }
  }, [loading, hasMore, getUsers]);

  const handleRefresh = useCallback(async () => {
    await getUsers(true);
  }, [getUsers]);

  // Initial load and reload when filter changes (debounced, guarded)
  useEffect(() => {
    if (!user?.uid) return;

    const key = `${user.uid}|${filterMemo.gender}|${filterMemo.minAge}|${filterMemo.maxAge}|${filterMemo.job}|${filterMemo.educationLevel}|${filterMemo.university}|${(filterMemo.interests || []).join(',')}`;
    if (lastTriggerKeyRef.current === key) return; // prevent duplicate triggers
    lastTriggerKeyRef.current = key;

    console.log('[DEBUG] Triggering getUsers for user:', user.uid, 'with filter:', filterMemo);
    const t = setTimeout(() => {
      getUsers(true);
    }, 300);

    return () => clearTimeout(t);
  }, [user?.uid, filterMemo.gender, filterMemo.minAge, filterMemo.maxAge, filterMemo.job, filterMemo.educationLevel, filterMemo.university, (filterMemo.interests || []).join(',')]);

  return {
    getUsers,
    users,
    loading,
    filtering,
    refreshing,
    hasMore,
    loadMore,
    handleRefresh,
    error,
  };
};

export default useHome;