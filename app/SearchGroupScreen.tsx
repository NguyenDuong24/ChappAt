import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { arrayUnion, collection, doc, getDocs, limit, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { LiquidScreen, LiquidSurface } from '@/components/liquid';
import { LinearGradient } from 'expo-linear-gradient';

type GroupItem = {
  id: string;
  name?: string;
  description?: string;
  photoURL?: string;
  avatarUrl?: string;
  type?: string;
  isSearchable?: boolean;
  members?: string[];
};

const SearchGroupScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = Colors[theme] || Colors.light;

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const palette = useMemo(() => {
    if (theme === 'dark') {
      return {
        header: ['rgba(14,66,56,0.9)', 'rgba(11,45,38,0.9)'] as [string, string],
        searchBg: 'rgba(255,255,255,0.12)',
        searchBorder: 'rgba(195,255,239,0.24)',
        cardBg: 'rgba(16,43,38,0.66)',
        cardBorder: 'rgba(200,255,241,0.2)',
      };
    }
    return {
      header: ['rgba(15,112,88,0.88)', 'rgba(10,81,64,0.9)'] as [string, string],
      searchBg: 'rgba(255,255,255,0.18)',
      searchBorder: 'rgba(240,255,250,0.42)',
      cardBg: 'rgba(255,255,255,0.58)',
      cardBorder: 'rgba(110,167,150,0.26)',
    };
  }, [theme]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const groupsSnap = await getDocs(query(collection(db, 'groups'), limit(140)));
      const rows = groupsSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) } as GroupItem))
        .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
      setGroups(rows);
    } catch (error) {
      console.error('Error loading groups for search:', error);
      Alert.alert(t('common.error'), t('chat.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const canView = useCallback((item: GroupItem) => {
    const isMember = Boolean(user?.uid && item.members?.includes(user.uid));
    if (isMember) return true;
    if ((item.type || 'private') === 'public') return true;
    return Boolean(item.isSearchable);
  }, [user?.uid]);

  const filteredGroups = useMemo(() => {
    const keyword = queryText.trim().toLowerCase();
    const visibleGroups = groups.filter(canView);

    if (!keyword) {
      return visibleGroups.slice(0, 40);
    }

    return visibleGroups.filter((item) => {
      const target = `${item.name || ''} ${item.description || ''} ${item.id}`.toLowerCase();
      return target.includes(keyword);
    });
  }, [canView, groups, queryText]);

  const joinGroup = useCallback(async (item: GroupItem) => {
    if (!user?.uid) {
      Alert.alert(t('common.error'), 'Please sign in first.');
      return;
    }

    const alreadyJoined = item.members?.includes(user.uid);
    if (alreadyJoined) {
      router.push('/(tabs)/groups');
      return;
    }

    if ((item.type || 'private') === 'private' && !item.isSearchable) {
      Alert.alert(t('common.info'), 'This private group only accepts invites.');
      return;
    }

    setJoiningId(item.id);
    try {
      await updateDoc(doc(db, 'groups', item.id), {
        members: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      });

      setGroups((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, members: [...(row.members || []), user.uid] }
            : row
        )
      );
    } catch (error) {
      console.error('Error joining group from search:', error);
      Alert.alert(t('common.error'), t('chat.error_generic'));
    } finally {
      setJoiningId(null);
    }
  }, [router, t, user?.uid]);

  const renderItem = useCallback(
    ({ item, index }: { item: GroupItem; index: number }) => {
      const isJoined = Boolean(user?.uid && item.members?.includes(user.uid));
      const isPrivate = (item.type || 'private') === 'private';
      const avatarUri = item.photoURL || item.avatarUrl;
      const isJoining = joiningId === item.id;

      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index, 10) * 30).duration(280)}
          layout={LinearTransition.springify().damping(18).stiffness(210)}
        >
          <LiquidSurface
            themeMode={theme}
            intensity={18}
            borderRadius={18}
            style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
          >
            <View style={styles.cardBody}>
              <View style={styles.avatarWrap}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <MaterialCommunityIcons name="account-group-outline" size={20} color="#EFFFF8" />
                  </View>
                )}
              </View>

              <View style={styles.content}>
                <Text numberOfLines={1} style={[styles.groupName, { color: currentThemeColors.text }]}>
                  {item.name || `Group ${item.id.slice(0, 6)}`}
                </Text>
                <Text numberOfLines={2} style={[styles.groupDesc, { color: currentThemeColors.subtleText }]}>
                  {item.description || 'No description yet'}
                </Text>

                <View style={styles.chipRow}>
                  <View style={styles.chip}>
                    <MaterialCommunityIcons
                      name={isPrivate ? 'lock-outline' : 'earth'}
                      size={12}
                      color="#DDFEF3"
                    />
                    <Text style={styles.chipText}>{isPrivate ? 'Private' : 'Public'}</Text>
                  </View>
                  <View style={styles.chip}>
                    <MaterialCommunityIcons name="account-multiple-outline" size={12} color="#DDFEF3" />
                    <Text style={styles.chipText}>{item.members?.length || 0}</Text>
                  </View>
                </View>
              </View>

              <Pressable
                disabled={isJoining}
                onPress={() => joinGroup(item)}
                style={[styles.actionButton, isJoined && styles.actionButtonJoined]}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#EFFFF8" />
                ) : (
                  <Text style={styles.actionText}>{isJoined ? 'Open' : 'Join'}</Text>
                )}
              </Pressable>
            </View>
          </LiquidSurface>
        </Animated.View>
      );
    },
    [currentThemeColors.subtleText, currentThemeColors.text, joinGroup, joiningId, palette.cardBg, palette.cardBorder, theme, user?.uid]
  );

  return (
    <LiquidScreen themeMode={theme}>
      <LinearGradient
        colors={palette.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#F2FFF9" />
          </Pressable>
          <Text style={styles.title}>Search Group</Text>
          <Pressable onPress={loadGroups} style={styles.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={18} color="#F2FFF9" />
          </Pressable>
        </View>

        <LiquidSurface themeMode={theme} intensity={20} borderRadius={20} style={styles.searchSurface}>
          <View style={[styles.searchRow, { backgroundColor: palette.searchBg, borderColor: palette.searchBorder }]}>
            <MaterialCommunityIcons name="magnify" size={18} color="rgba(235,255,249,0.86)" />
            <TextInput
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Search by name, id, or description"
              placeholderTextColor="rgba(235,255,249,0.6)"
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>
        </LiquidSurface>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: currentThemeColors.subtleText }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={40}
                color={currentThemeColors.subtleText}
              />
              <Text style={[styles.emptyText, { color: currentThemeColors.subtleText }]}>
                No groups matched your keyword.
              </Text>
            </View>
          }
        />
      )}
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,255,247,0.28)',
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,255,247,0.28)',
  },
  title: {
    color: '#F2FFF9',
    fontSize: 18,
    fontWeight: '800',
  },
  searchSurface: {
    padding: 2,
  },
  searchRow: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F2FFF9',
    fontSize: 15,
    paddingVertical: 0,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 116,
    gap: 10,
  },
  card: {
    borderWidth: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A8A6E',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
  },
  groupDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  chipRow: {
    marginTop: 7,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    height: 22,
    backgroundColor: 'rgba(20,124,96,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(235,255,248,0.35)',
  },
  chipText: {
    color: '#DDFEF3',
    fontSize: 11,
    fontWeight: '700',
  },
  actionButton: {
    minWidth: 68,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F8E71',
  },
  actionButtonJoined: {
    backgroundColor: 'rgba(31,142,113,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(232,255,247,0.45)',
  },
  actionText: {
    color: '#EFFFF8',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 90,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default SearchGroupScreen;

