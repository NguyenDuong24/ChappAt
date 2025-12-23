import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData, onSnapshot } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { useStateCommon } from '@/context/stateCommon';
import { normalizeInterestsArray } from '@/utils/interests';
import { InteractionManager } from 'react-native';

const PAGE_SIZE = 20;

const useHome = (isFocused: boolean = true) => {
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
  const isFetchingRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);

  // Memoize filter object
  const filterMemo = useMemo(() => ({
    gender: stateCommon.filter?.gender || '',
    minAge: stateCommon.filter?.minAge || '',
    maxAge: stateCommon.filter?.maxAge || '',
    job: stateCommon.filter?.job || '',
    educationLevel: stateCommon.filter?.educationLevel || '',
    university: stateCommon.filter?.university || '',
    interests: normalizeInterestsArray(
      Array.isArray(stateCommon.filter?.interests)
        ? stateCommon.filter.interests
        : (stateCommon.filter?.interests ? [stateCommon.filter.interests] : [])
    ),
  }), [stateCommon.filter]);

  const filterKey = useMemo(() => {
    return `${filterMemo.gender}|${filterMemo.minAge}|${filterMemo.maxAge}|${filterMemo.job}|${filterMemo.educationLevel}|${filterMemo.university}|${(filterMemo.interests || []).join(',')}`;
  }, [filterMemo]);

  const buildConstraints = useCallback((isPagination = false, cursor = null) => {
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
    if (filterMemo.university && filterMemo.educationLevel === 'Cao đẳng/Đại học') {
      constraints.push(where('university', '==', filterMemo.university));
    }
    if (Array.isArray(filterMemo.interests) && filterMemo.interests.length > 0) {
      if (filterMemo.interests.length === 1) {
        constraints.push(where('interests', 'array-contains', filterMemo.interests[0]));
      } else {
        constraints.push(where('interests', 'array-contains-any', filterMemo.interests.slice(0, 10)));
      }
    }

    const hasMin = !!filterMemo.minAge;
    const hasMax = !!filterMemo.maxAge;
    if (hasMin) constraints.push(where('age', '>=', Number(filterMemo.minAge)));
    if (hasMax) constraints.push(where('age', '<=', Number(filterMemo.maxAge)));

    if (hasMin || hasMax) {
      constraints.push(orderBy('age', 'asc'));
    } else {
      constraints.push(orderBy('__name__', 'asc'));
    }

    if (isPagination && cursor) {
      constraints.push(startAfter(cursor));
    }

    constraints.push(limit(PAGE_SIZE));
    return constraints;
  }, [filterMemo]);

  const sortUsers = useCallback((fetchedUsers: any[]) => {
    const filtered = fetchedUsers.filter((u) => u.id !== user?.uid);
    const viewerShowOnline = user?.showOnlineStatus !== false;

    if (!viewerShowOnline) return filtered;

    return filtered.sort((a, b) => {
      if (a.isOnline === b.isOnline) return 0;
      return a.isOnline ? -1 : 1;
    });
  }, [user?.uid, user?.showOnlineStatus]);

  // Real-time subscription for the first page
  useEffect(() => {
    if (!user?.uid || !isFocused) return;

    const key = `${user.uid}|${filterKey}`;
    if (lastTriggerKeyRef.current === key) return;
    lastTriggerKeyRef.current = key;

    setLoading(true);
    if (unsubRef.current) unsubRef.current();

    const constraints = buildConstraints(false);
    const q = query(userRef, ...constraints);

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setUsers(sortUsers(fetchedUsers));
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] as any || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error('Error in user subscription:', err);
      setError(err.message);
      setLoading(false);
    });

    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [user?.uid, isFocused, filterKey, buildConstraints, sortUsers]);

  const loadMore = useCallback(async () => {
    if (loading || isFetchingRef.current || !hasMore || !lastDoc) return;
    isFetchingRef.current = true;

    try {
      const constraints = buildConstraints(true, lastDoc as any);
      const q = query(userRef, ...constraints);
      const snapshot = await getDocs(q);

      const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const sortedNewUsers = sortUsers(fetchedUsers);

      setUsers(prev => [...prev, ...sortedNewUsers]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] as any || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('Error loading more users:', err);
      setError(err.message);
    } finally {
      isFetchingRef.current = false;
    }
  }, [loading, hasMore, lastDoc, buildConstraints, sortUsers]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Real-time subscription will handle the refresh automatically 
    // when we trigger a re-render or just by being active.
    // But we can force a re-subscription by clearing the trigger key.
    lastTriggerKeyRef.current = '';
  }, []);

  return {
    users,
    loading,
    filtering: !!filterKey.replace(/\|/g, ''),
    refreshing,
    hasMore,
    loadMore,
    handleRefresh,
    error,
  };
};

export default useHome;