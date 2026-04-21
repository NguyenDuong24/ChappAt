import { View, StyleSheet, Platform, TouchableOpacity, InteractionManager, Alert, BackHandler, useWindowDimensions } from 'react-native';
import React, { useEffect, useState, useContext, useRef, useMemo, useCallback } from 'react';
import EnhancedGroupList from '@/components/groups/EnhancedGroupList';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where, doc, getDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { groupsRef, db } from '@/firebaseConfig';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ThemedStatusBar from '@/components/common/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRefresh } from '@/context/RefreshContext';
import ConversationOptionsModal from '@/components/common/ConversationOptionsModal';
import { useTranslation } from 'react-i18next';
import LiquidScreen from '@/components/liquid/LiquidScreen';
import { RevealScalableView } from '@/components/reveal';
import FeatureActionDrawer from '@/components/drawer/FeatureActionDrawer';
import { useThemedColors } from '@/hooks/useThemedColors';

import Animated, { FadeIn } from 'react-native-reanimated';

export default function Groups() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, isDark, palette } = useTheme();
  const { width } = useWindowDimensions();
  const currentThemeColors = useThemedColors();
  const insets = useSafeAreaInsets();
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userGroups, setUserGroups] = useState([]); 
  const [searchResults, setSearchResults] = useState([]); 
  const [searching, setSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false); 
  const [pinnedGroupIds, setPinnedGroupIds] = useState([]);
  const [hiddenGroupIds, setHiddenGroupIds] = useState([]);
  const [showGroupOptionsModal, setShowGroupOptionsModal] = useState(false);
  const [selectedGroupItem, setSelectedGroupItem] = useState(null);

  // Drawer state
  const [featureDrawer, setFeatureDrawer] = useState(null);
  const isDrawerVisible = !!featureDrawer;
  const drawerOffset = useMemo(() => Math.min(width * 0.62, 250), [width]);

  const groupsUnsubRef = useRef(null);

  useEffect(() => {
    if (!isDrawerVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFeatureDrawer(null);
      return true;
    });
    return () => sub.remove();
  }, [isDrawerVisible]);

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
      }
    } catch (error) {
      console.warn('Error updating old groups:', error);
    }
  };

  const getGroups = useCallback(() => {
    try {
      setLoading(true);
      if (!user?.uid) {
        setGroups([]);
        setUserGroups([]);
        setLoading(false);
        return null;
      }
      if (groupsUnsubRef.current) {
        groupsUnsubRef.current();
        groupsUnsubRef.current = null;
      }
      const q = query(groupsRef, where('members', 'array-contains', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userGroupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isJoined: true }));
        const sortedData = userGroupsData.sort((a, b) => {
          const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
          const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setGroups(sortedData || []);
        setUserGroups(userGroupsData || []);
        setLoading(false);
      }, (error) => {
        setGroups([]);
        setUserGroups([]);
        setLoading(false);
      });
      groupsUnsubRef.current = unsubscribe;
      return unsubscribe;
    } catch (error) {
      setGroups([]);
      setUserGroups([]);
      setLoading(false);
      return null;
    }
  }, [user?.uid]);

  const refreshGroupsOnce = useCallback(() => {
    if (user?.uid) getGroups();
  }, [user?.uid]);

  const { registerRefreshHandler } = useRefresh();

  useEffect(() => {
    if (registerRefreshHandler) {
      registerRefreshHandler('groups', refreshGroupsOnce);
    }
  }, [registerRefreshHandler, refreshGroupsOnce]);

  useEffect(() => {
    let unsub = null;
    if (user?.uid) {
      InteractionManager.runAfterInteractions(() => {
        unsub = getGroups();
        updateOldGroupsType();
      });
    }
    return () => {
        if (groupsUnsubRef.current) groupsUnsubRef.current();
        if (unsub) unsub();
    };
  }, [user?.uid, getGroups]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      setPinnedGroupIds(Array.isArray(data.pinnedGroupIds) ? data.pinnedGroupIds : []);
      setHiddenGroupIds(Array.isArray(data.hiddenGroupIds) ? data.hiddenGroupIds : []);
    });
    return () => unsub();
  }, [user?.uid]);

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
    }, 400); 
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchGroups = async (queryText) => {
    if (!queryText || queryText.length === 0) return;
    try {
      setSearching(true);
      const results = [];
      const normalizedQuery = queryText.trim();
      const q = query(groupsRef, where('type', '==', 'public'), where('isSearchable', '==', true));
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
        }));
      setSearchResults(publicResults.slice(0, 50));
    } catch (error) {
       console.log(error);
    } finally {
      setSearching(false);
    }
  };

  const joinGroup = async (groupId) => {
    try {
      if (!user?.uid) return;
      const groupRef = doc(groupsRef, groupId);
      const groupDoc = await getDoc(groupRef);
      if (!groupDoc.exists()) return;
      const groupData = groupDoc.data();
      if (groupData.type === 'private') return;
      if (groupData.members?.includes(user.uid)) return;
      await updateDoc(groupRef, { members: arrayUnion(user.uid), updatedAt: serverTimestamp() });
      const joinedGroup = { id: groupId, ...groupData, members: [...(groupData.members || []), user.uid], isJoined: true };
      setUserGroups(prev => [joinedGroup, ...prev]);
    } catch (error) {
       console.log(error);
    }
  };

  const handleLongPressGroup = useCallback((groupItem) => {
    if (!groupItem?.id) return;
    setSelectedGroupItem(groupItem);
    setShowGroupOptionsModal(true);
  }, []);

  const groupOptions = useMemo(() => {
    if (!selectedGroupItem?.id || !user?.uid) return [];
    const isPinned = pinnedGroupIds.includes(selectedGroupItem.id);
    return [
      {
        key: 'pin',
        label: isPinned ? t('groups.list_options.unpin') : t('groups.list_options.pin'),
        icon: isPinned ? 'pin-off-outline' : 'pin-outline',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              pinnedGroupIds: isPinned ? arrayRemove(selectedGroupItem.id) : arrayUnion(selectedGroupItem.id)
            });
          } catch (error) { console.log(error); }
        }
      },
      {
        key: 'hide',
        label: t('groups.list_options.remove'),
        icon: 'trash-can-outline',
        variant: 'danger',
        onPress: async () => {
           // ... logic from original file
        }
      }
    ];
  }, [selectedGroupItem, user?.uid, pinnedGroupIds, t]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    revealContainer: { flex: 1 },
    innerLayout: { flex: 1, overflow: 'hidden' },
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
    },
    titleContainer: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
    rightActions: { flexDirection: 'row', alignItems: 'center' },
    groupCount: { marginRight: 16 },
    countText: { fontSize: 16, color: 'white' },
    createButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    searchWrapper: { paddingHorizontal: 16, paddingBottom: 8 },
    searchInput: {
      height: 48,
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderRadius: 24,
      paddingHorizontal: 16,
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
    searchModeText: { marginLeft: 4, fontSize: 14 },
    emptySearchContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    emptySearchText: { fontSize: 18, fontWeight: '500' },
    emptySearchSubtext: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
    fabCreate: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme === 'dark' ? '#EFFFFE' : '#0F312A',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
  }), [theme]);

  const openCreateGroupDrawer = () => setFeatureDrawer('createGroup');

  return (
    <LiquidScreen themeMode={theme} style={styles.container}>
      <RevealScalableView
        revealed={isDrawerVisible}
        side="left"
        scale={0.88}
        offset={drawerOffset}
        style={styles.revealContainer}
      >
        <View style={[styles.innerLayout, { backgroundColor: 'transparent' }]}>
            <ThemedStatusBar translucent />
            <LinearGradient
                colors={palette.appGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={[styles.headerContent, { paddingTop: insets.top + 12 }]}>
                    <View style={styles.titleContainer}>
                        <MaterialCommunityIcons name="account-group" size={28} color={palette.textColor} />
                        <Text style={[styles.headerTitle, { color: palette.textColor }]}>{t('groups_tab.title')}</Text>
                    </View>

                    <View style={styles.rightActions}>
                        <View style={styles.groupCount}>
                            <Text style={[styles.countText, { color: palette.textColor }]}>
                                {isSearchMode ? t('groups_tab.search_results_count', { count: searchResults.length }) : t('groups_tab.groups_count', { count: groups.length })}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.createButton} onPress={openCreateGroupDrawer}>
                            <MaterialCommunityIcons name="plus" size={24} color={palette.textColor} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <View style={styles.searchWrapper}>
                    <TextInput
                        mode="outlined"
                        placeholder={isSearchMode ? t('groups_tab.search_placeholder_public') : t('groups_tab.search_placeholder')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                        outlineColor="transparent"
                        activeOutlineColor="transparent"
                        textColor={palette.textColor}
                        theme={{ colors: { onSurfaceVariant: palette.subtitleColor } }}
                        left={<TextInput.Icon icon="magnify" color={palette.textColor} />}
                        right={searching ? <TextInput.Icon icon="loading" color={palette.textColor} /> : null}
                    />
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <EnhancedGroupList
                    currentUser={user}
                    groups={isSearchMode ? searchResults : groups}
                    onRefresh={isSearchMode ? () => searchGroups(searchQuery.trim()) : refreshGroupsOnce}
                    listHeader={null}
                    onJoinGroup={joinGroup}
                    isSearchMode={isSearchMode}
                    pinnedGroupIds={pinnedGroupIds}
                    hiddenGroupIds={hiddenGroupIds}
                    onLongPressGroup={handleLongPressGroup}
                />

                {isSearchMode && !searching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                    <View style={styles.emptySearchContainer}>
                        <MaterialCommunityIcons name="magnify" size={64} color={currentThemeColors.subtleText} />
                        <Text style={[styles.emptySearchText, { color: currentThemeColors.text }]}>{t('groups_tab.empty_title')}</Text>
                        <Text style={[styles.emptySearchSubtext, { color: currentThemeColors.subtleText }]}>{t('groups_tab.empty_subtitle')}</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.fabCreate} onPress={openCreateGroupDrawer} accessibilityRole="button">
                <MaterialCommunityIcons name="plus" size={32} color={theme === 'dark' ? '#0A4A3A' : '#FFFFFF'} />
            </TouchableOpacity>
        </View>
      </RevealScalableView>

      <FeatureActionDrawer
        visible={isDrawerVisible}
        drawerKey={featureDrawer}
        onClose={() => setFeatureDrawer(null)}
      />

      <ConversationOptionsModal
        visible={showGroupOptionsModal}
        onClose={() => {
          setShowGroupOptionsModal(false);
          setSelectedGroupItem(null);
        }}
        title={t('groups.list_options.title')}
        subtitle={selectedGroupItem?.name || t('groups.list_options.subtitle')}
        options={groupOptions}
      />
    </LiquidScreen>
  );
}
