import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import EnhancedGroupList from '@/components/groups/EnhancedGroupList';
import EnhancedCreateGroupModal from '@/components/groups/EnhancedCreateGroupModal';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where, doc, getDoc, updateDoc, serverTimestamp, arrayUnion, onSnapshot } from 'firebase/firestore';
import { groupsRef } from '@/firebaseConfig';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ThemedStatusBar from '@/components/common/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, { FadeIn } from 'react-native-reanimated';

export default function Groups() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userGroups, setUserGroups] = useState([]); // Track user's joined groups
  const [searchResults, setSearchResults] = useState([]); // Search results for global search
  const [searching, setSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false); // Toggle between my groups and search results

  const groupsUnsubRef = useRef(null);

  // Function to update old groups without type field
  const updateOldGroupsType = async () => {
    try {
      const q = query(groupsRef, where('members', 'array-contains', user.uid));
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(group => !group.type)
        .map(group => 
          updateDoc(doc(db, 'groups', group.id), { 
            type: 'private',
            isSearchable: false 
          })
        );
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Updated ${updatePromises.length} old groups with type: private`);
      }
    } catch (error) {
      console.warn('Error updating old groups:', error);
    }
  };

  // Function to refresh groups once (for pull-to-refresh)
  const refreshGroupsOnce = () => {
    if (user?.uid) {
      getGroups();
    }
  };

  useEffect(() => {
    let unsub = null;
    if (user?.uid) {
      unsub = getGroups();
      // Update old groups without type (one-time operation)
      updateOldGroupsType();
    }

    return () => {
      try {
        if (groupsUnsubRef.current) {
          groupsUnsubRef.current();
          groupsUnsubRef.current = null;
        }
        if (unsub) unsub();
      } catch (err) {
        console.warn('Error cleaning up groups listener', err);
      }
    };
  }, [user]);

  // Real-time listener for user's joined groups only
  const getGroups = () => {
    try {
      setLoading(true);
      if (!user?.uid) {
        setGroups([]);
        setUserGroups([]);
        setLoading(false);
        return null;
      }

      // Unsubscribe any previous listener
      if (groupsUnsubRef.current) {
        groupsUnsubRef.current();
        groupsUnsubRef.current = null;
      }

      const q = query(
        groupsRef,
        where('members', 'array-contains', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userGroupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isJoined: true }));
        const sortedData = userGroupsData.sort((a, b) => {
          const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
          const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setGroups(sortedData || []);
        setUserGroups(userGroupsData);
        setLoading(false);
      }, (error) => {
        console.error('Groups snapshot error', error);
        setGroups([]);
        setUserGroups([]);
        setLoading(false);
      });

      groupsUnsubRef.current = unsubscribe;
      return unsubscribe;
    } catch (error) {
      console.error("Error setting groups listener: ", error);
      setGroups([]);
      setUserGroups([]);
      setLoading(false);
      return null;
    }
  };

  // Debounced search effect - similar to Telegram's global search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        setIsSearchMode(true);
        searchGroups(searchQuery.trim());
      } else {
        setIsSearchMode(false);
        setSearchResults([]);
        setSearching(false);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchGroups = async (queryText) => {
    if (!queryText || queryText.length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      setSearching(true);

      const results = [];
      const normalizedQuery = queryText.trim();

      // Attempt exact doc ID lookup first (returns public or private group)
      try {
        const groupDocRef = doc(groupsRef, normalizedQuery);
        const groupDocSnap = await getDoc(groupDocRef);
        if (groupDocSnap.exists()) {
          const data = { id: groupDocSnap.id, ...groupDocSnap.data() };
          const isJoined = userGroups.some(g => g.id === data.id);
          results.push({ id: data.id, ...data, isJoined, isIdMatch: true });
        }
      } catch (idError) {
        // ignore id lookup errors
      }

      // Search public groups by name/description (only searchable ones)
      const q = query(
        groupsRef,
        where('type', '==', 'public'),
        where('isSearchable', '==', true)
      );
      const snapshot = await getDocs(q);

      const publicResults = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(group => {
          const name = (group.name || '').toLowerCase();
          const description = (group.description || '').toLowerCase();
          const searchTerm = normalizedQuery.toLowerCase();
          return name.includes(searchTerm) || description.includes(searchTerm);
        })
        .map(group => ({
          ...group,
          isJoined: userGroups.some(g => g.id === group.id),
          isIdMatch: false
        }));

      // dedupe by id (if id matched and also in publicResults)
      const seen = new Set(results.map(r => r.id));
      publicResults.forEach(r => {
        if (!seen.has(r.id)) {
          results.push(r);
          seen.add(r.id);
        }
      });

      // Sort by ID match first, then relevance then popularity
      const sorted = results.sort((a, b) => {
        if (a.isIdMatch && !b.isIdMatch) return -1;
        if (!a.isIdMatch && b.isIdMatch) return 1;

        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const searchTerm = normalizedQuery.toLowerCase();

        const aExact = aName === searchTerm ? 1 : 0;
        const bExact = bName === searchTerm ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        const aStarts = aName.startsWith(searchTerm) ? 1 : 0;
        const bStarts = bName.startsWith(searchTerm) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;

        return (b.members?.length || 0) - (a.members?.length || 0);
      });

      setSearchResults(sorted.slice(0, 50));
    } catch (error) {
      console.error('Error searching groups:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const joinGroup = async (groupId) => {
    try {
      if (!user?.uid) return;

      const groupRef = doc(groupsRef, groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        console.error('Group not found');
        return;
      }

      const groupData = groupDoc.data();

      // Prevent joining private groups unless already invited
      if (groupData.type === 'private') {
        console.log('Cannot join private group directly. Invitation required.');
        return;
      }

      // Check if user is already a member
      if (groupData.members?.includes(user.uid)) {
        console.log('User is already a member of this group');
        return;
      }

      // Add user to group members
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

      // Build joined group object
      const joinedGroup = { id: groupId, ...groupData, members: [...(groupData.members || []), user.uid], isJoined: true };

      // Update local state: add to `groups` if not present, else update
      setGroups(prevGroups => {
        const exists = prevGroups.some(g => g.id === groupId);
        if (exists) {
          return prevGroups.map(group => 
            group.id === groupId ? { ...group, isJoined: true, members: [...(group.members || []), user.uid] } : group
          );
        }
        // add to the top of the user's groups list
        return [joinedGroup, ...prevGroups];
      });

      // Also ensure userGroups state includes this group so UI shows it as joined
      setUserGroups(prev => {
        if (prev.some(g => g.id === groupId)) return prev;
        return [joinedGroup, ...prev];
      });

      // Update searchResults if in search mode to reflect joined state immediately
      if (isSearchMode) {
        setSearchResults(prevResults =>
          prevResults.map(result =>
            result.id === groupId
              ? { ...result, isJoined: true, members: [...(result.members || []), user.uid] }
              : result
          )
        );
      }
      
      console.log('Successfully joined group');
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    header: {
      paddingBottom: 16,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: 'transparent',
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    groupCount: {
      marginRight: 16,
    },
    countText: {
      fontSize: 16,
      color: 'white',
    },
    createButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#667EEA',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    searchWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: 'transparent',
    },
    searchInput: {
      height: 48,
      backgroundColor: theme === 'dark' ? '#1E293B' : '#F8FAFC',
      borderRadius: 24,
      paddingHorizontal: 16,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    searchModeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: theme === 'dark' ? '#334155' : '#E2E8F0',
      marginTop: 8,
    },
    searchModeText: {
      marginLeft: 4,
      fontSize: 14,
    },
    emptySearchContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    emptySearchText: {
      fontSize: 18,
      fontWeight: 'medium',
    },
    emptySearchSubtext: {
      fontSize: 14,
      color: '#94A3B8',
      textAlign: 'center',
      marginTop: 4,
    },
    fabCreate: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#667EEA',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
  }), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.backgroundHeader }]}> 
      <ThemedStatusBar translucent />

      <LinearGradient
        colors={theme === 'dark' 
          ? ['#1a1a2e', '#16213e'] 
          : ['#4facfe', '#00f2fe']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + 12 }]}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons 
              name="account-group" 
              size={28} 
              color="white"
            />
            <Text style={[styles.headerTitle, { color: 'white' }]}>
              Nhóm Chat
            </Text>
          </View>
          
          <View style={styles.rightActions}>
            <View style={styles.groupCount}>
              <Text style={[styles.countText, { color: 'white' }]}>
                {isSearchMode ? `${searchResults.length} kết quả` : `${groups.length} nhóm`}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
        </View>
                {/* Search and actions */}
        <View style={styles.searchWrapper}>
          <TextInput
            mode="outlined"
            placeholder={isSearchMode ? "Tìm kiếm nhóm công khai hoặc ID..." : "Tìm kiếm nhóm..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            outlineColor={theme === 'dark' ? '#334155' : '#E2E8F0'}
            activeOutlineColor="#667EEA"
            textColor={currentThemeColors.text}
            theme={{ colors: { onSurfaceVariant: theme === 'dark' ? '#94A3B8' : '#64748B' } }}
            left={<TextInput.Icon icon="magnify" color="#667EEA" />}
            right={searching ? <TextInput.Icon icon="loading" color="#667EEA" /> : null}
          />

          {isSearchMode && (
            <View style={styles.searchModeIndicator}>
              <MaterialCommunityIcons name="earth" size={16} color="#667EEA" />
              <Text style={[styles.searchModeText, { color: currentThemeColors.text }]}>Tìm kiếm: {searchResults.length} kết quả</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={[styles.content]}> 

        <EnhancedGroupList
          currentUser={user}
          groups={isSearchMode ? searchResults : groups}
          onRefresh={isSearchMode ? () => searchGroups(searchQuery.trim()) : refreshGroupsOnce}
          listHeader={null}
          onJoinGroup={joinGroup}
          isSearchMode={isSearchMode}
        />

        {isSearchMode && !searching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
          <View style={styles.emptySearchContainer}>
            <MaterialCommunityIcons name="magnify" size={64} color={currentThemeColors.subtleText} />
            <Text style={[styles.emptySearchText, { color: currentThemeColors.text }]}>Không tìm thấy nhóm</Text>
            <Text style={[styles.emptySearchSubtext, { color: currentThemeColors.subtleText }]}>Thử tìm kiếm với từ khóa khác hoặc ID</Text>
          </View>
        )}

      </View>

      <EnhancedCreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={(newGroup) => {
          const groupWithJoined = { ...newGroup, isJoined: true };
          setGroups(prev => [groupWithJoined, ...prev]);
          setUserGroups(prev => [groupWithJoined, ...prev]);
          setShowCreateModal(false);
        }}
        currentUser={user}
      />

      {/* Floating create button so users can still create groups - hidden on small screens or when modal open */}
      <TouchableOpacity
        style={styles.fabCreate}
        onPress={() => setShowCreateModal(true)}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="plus" size={24} color="white" />
      </TouchableOpacity>

    </View>
  );
}
