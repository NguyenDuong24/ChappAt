import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from '@/context/authContext';
import {
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { useStateCommon } from '@/context/stateCommon';
import { normalizeInterestsArray } from '@/utils/interests';

const PAGE_SIZE = 20;

const useHome = (isFocused: boolean = true) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const { stateCommon } = useStateCommon();
  const requestLockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const filterMemo = useMemo(() => {
    return {
      gender: stateCommon.filter?.gender || '',
      minAge: stateCommon.filter?.minAge || '',
      maxAge: stateCommon.filter?.maxAge || '',
      job: stateCommon.filter?.job || '',
      educationLevel: stateCommon.filter?.educationLevel || '',
      university: stateCommon.filter?.university || '',
      interests: normalizeInterestsArray(
        Array.isArray(stateCommon.filter?.interests)
          ? stateCommon.filter.interests
          : []
      ),
    };
  }, [stateCommon.filter]);

  const filterKey = useMemo(() => {
    return `${filterMemo.gender}|${filterMemo.minAge}|${filterMemo.maxAge}|${filterMemo.job}|${filterMemo.educationLevel}|${filterMemo.university}|${(filterMemo.interests || []).join(',')}`;
  }, [filterMemo]);

  const buildConstraints = useCallback(
    (isPagination = false, cursor = null) => {
      const constraints: any[] = [];

      if (filterMemo.gender && filterMemo.gender !== 'all') {
        constraints.push(where('gender', '==', filterMemo.gender));
      }
      if (filterMemo.job) {
        constraints.push(where('job', '==', filterMemo.job));
      }
      if (filterMemo.educationLevel) {
        constraints.push(where('educationLevel', '==', filterMemo.educationLevel));
      }
      if (filterMemo.university && filterMemo.educationLevel === 'Cao ?????ng/? ???i h?? c') {
        constraints.push(where('university', '==', filterMemo.university));
      }

      if (filterMemo.minAge) constraints.push(where('age', '>=', Number(filterMemo.minAge)));
      if (filterMemo.maxAge) constraints.push(where('age', '<=', Number(filterMemo.maxAge)));

      if (filterMemo.minAge || filterMemo.maxAge) {
        constraints.push(orderBy('age', 'asc'));
      } else {
        constraints.push(orderBy('isOnline', 'desc'));
        constraints.push(orderBy('__name__', 'asc'));
      }

      if (isPagination && cursor) {
        constraints.push(startAfter(cursor));
      }

      constraints.push(limit(PAGE_SIZE));
      return constraints;
    },
    [filterMemo]
  );

  const fetchInitial = useCallback(async (isRefresh = false) => {
    if (!user?.uid || requestLockRef.current) return;
    requestLockRef.current = true;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }

    try {
      setError(null);
      const q = query(userRef, ...buildConstraints(false));
      const snapshot = await getDocs(q);

      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      // Filter out self, private profiles, and incognito users
      const validUsers = fetchedUsers.filter(u => u.id !== user.uid && u.profileVisible !== false && u.isIncognito !== true);
      setUsers(validUsers);
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] as any || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('Fetch initial error:', err);
      setError(err.message);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      requestLockRef.current = false;
    }
  }, [user?.uid, buildConstraints]);

  // Initial load or filter change
  useEffect(() => {
    if (isFocused && user?.uid) {
      fetchInitial(false);
    }
  }, [isFocused, filterKey, user?.uid]); // Re-fetch only when filter changes or screen is focused

  const loadMore = useCallback(async () => {
    if (initialLoading || loadingMore || !hasMore || !lastDoc || requestLockRef.current) return;
    requestLockRef.current = true;
    setLoadingMore(true);

    try {
      const q = query(userRef, ...buildConstraints(true, lastDoc as any));
      const snapshot = await getDocs(q);

      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      
      const newUsers = fetchedUsers.filter(u => u.id !== user?.uid && u.profileVisible !== false && u.isIncognito !== true);

      setUsers(prev => {
        const combined = [...prev, ...newUsers];
        return Array.from(new Map(combined.map(u => [u.id || u.uid, u])).values());
      });
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] as any || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('Error loading more users:', err);
      setError(err.message);
    } finally {
      setLoadingMore(false);
      requestLockRef.current = false;
    }
  }, [initialLoading, loadingMore, hasMore, lastDoc, buildConstraints, user?.uid]);

  const handleRefresh = useCallback(() => {
    fetchInitial(true);
  }, [fetchInitial]);

  return {
    users,
    loading: initialLoading,
    loadingMore,
    refreshing,
    filtering: !!filterKey.replace(/|/g, ''),
    hasMore,
    loadMore,
    handleRefresh,
    error,
  };
};

export default useHome;

