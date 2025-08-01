import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext';
import { getDocs } from 'firebase/firestore';
import { userRef } from '@/firebaseConfig';
import { useStateCommon } from '../../../context/stateCommon';

const useHome = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtering, setFiltering] = useState(false);
    const { stateCommon } = useStateCommon();
    const [refreshing, setRefreshing] = useState(false);

    const getUsers = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        
        // Show filtering state when applying filter
        if (stateCommon.filter && (stateCommon.filter.gender || stateCommon.filter.minAge || stateCommon.filter.maxAge)) {
            setFiltering(true);
        }
        
        console.log('🔍 Getting users with filter:', stateCommon.filter);
        
        try {
            const querySnapshot = await getDocs(userRef);
            let allUsers = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
            
            console.log('📝 All users before filtering:', allUsers.length);
            
            // Apply filters
            const filteredUsers = allUsers.filter((docUser) => {
                // Exclude current user
                if (docUser.id === user?.uid) {
                    return false;
                }
                
                // Gender filter
                let matchesGender = true;
                if (stateCommon.filter.gender && stateCommon.filter.gender !== 'all') {
                    matchesGender = docUser.gender === stateCommon.filter.gender;
                }
            
                // Age filter
                let matchesAge = true;
                if (stateCommon.filter.minAge || stateCommon.filter.maxAge) {
                    const userAge = Number(docUser.age);
                    const minAge = stateCommon.filter.minAge ? Number(stateCommon.filter.minAge) : 0;
                    const maxAge = stateCommon.filter.maxAge ? Number(stateCommon.filter.maxAge) : 999;
                    
                    if (stateCommon.filter.minAge && userAge < minAge) {
                        matchesAge = false;
                    }
                    if (stateCommon.filter.maxAge && userAge > maxAge) {
                        matchesAge = false;
                    }
                }
                
                const shouldInclude = matchesGender && matchesAge;
                
                if (shouldInclude || !matchesGender || !matchesAge) {
                    console.log(`👤 ${docUser.username}: age=${docUser.age}, gender=${docUser.gender}, matchesGender=${matchesGender}, matchesAge=${matchesAge}, included=${shouldInclude}`);
                }
                
                return shouldInclude;
            });
            
            // Sort by online status
            const sortedUsers = filteredUsers.sort((a, b) => {
                if (a.isOnline === b.isOnline) return 0;
                return a.isOnline ? -1 : 1;
            });
            
            console.log(`✅ Final filtered users: ${sortedUsers.length}`);
            setUsers(sortedUsers);
        } catch (error) {
            console.error('Error getting users:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setFiltering(false);
        }
    };

    const handleRefresh = async () => {
        await getUsers(true); // Pass true to indicate this is a refresh
    };

    useEffect(() => {
        console.log('🔄 Filter changed, refreshing users...', stateCommon.filter);
        handleRefresh();
    }, [stateCommon.filter, user?.uid]); // Added user?.uid to dependencies

    return {
        getUsers,
        users,
        loading,
        filtering,
        refreshing,
        handleRefresh,
    };
};

export default useHome;
