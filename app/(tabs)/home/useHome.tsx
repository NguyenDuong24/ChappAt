import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext';
import { getDocs } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { useStateCommon } from '../../../context/stateCommon';

const useHome = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { stateCommon } = useStateCommon();
    const [refreshing, setRefreshing] = useState(false);

    const getUsers = async () => {
        setLoading(true);
        const querySnapshot = await getDocs(userRef);
        const data = querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((docUser) => {
                const matchesGender =
                    stateCommon.filter.gender === "all" ||
                    !stateCommon.filter.gender ||
                    docUser.gender === stateCommon.filter.gender;
            
                const matchesAge =
                    (!stateCommon.filter.minAge || docUser.age >= stateCommon.filter.minAge) &&
                    (!stateCommon.filter.maxAge || docUser.age <= stateCommon.filter.maxAge);
            
                return docUser.id !== user?.uid && matchesGender && matchesAge;
            });
        const sortedUsers = data.sort((a, b) => (a.isOnline === b.isOnline ? 0 : a.isOnline ? -1 : 1));
        setUsers(sortedUsers);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await getUsers();
        setRefreshing(false);
    };

    useEffect(() => {
        handleRefresh();
    }, [stateCommon.filter]);

    return {
        getUsers,
        users,
        loading,
        refreshing,
        handleRefresh,
    };
};

export default useHome;
