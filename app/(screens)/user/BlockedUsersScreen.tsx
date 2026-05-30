import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useTheme } from '@/context/ThemeContext';
import { getLiquidPalette, LiquidGlassBackground, LiquidSurface } from '@/components/liquid';
import { followService } from '@/services/followService';
import { db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface BlockedUser {
  uid: string;
  username: string;
  displayName?: string;
  profileUrl?: string;
  blockDocId: string;
}

const BlockedUsersScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark, palette: contextPalette } = useTheme();

  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const palette = useMemo(() => {
    const cp = contextPalette || getLiquidPalette(theme);
    return {
      text: cp.textColor,
      subtleText: cp.subtitleColor,
      softText: isDark ? 'rgba(255,255,248,0.62)' : 'rgba(11,33,36,0.62)',
      border: cp.menuBorder || (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)'),
      primary: cp.primary,
      danger: '#FF6B7F',
      success: '#2FE0AC',
      cardGlass: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    };
  }, [theme, isDark, contextPalette]);

  const loadBlockedUsers = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const blocks = await followService.getBlockedUsers(user.uid);
      const resolvedUsers: BlockedUser[] = [];

      for (const block of blocks) {
        try {
          const userDocRef = doc(db, 'users', block.blockedId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            resolvedUsers.push({
              uid: block.blockedId,
              username: data.username || '',
              displayName: data.displayName || data.username || t('chat.unknown_user'),
              profileUrl: data.profileUrl || data.photoURL || 'https://via.placeholder.com/80',
              blockDocId: block.id,
            });
          } else {
            // Fallback for deleted users or missing documents
            resolvedUsers.push({
              uid: block.blockedId,
              username: 'unknown',
              displayName: t('chat.unknown_user'),
              profileUrl: 'https://via.placeholder.com/80',
              blockDocId: block.id,
            });
          }
        } catch (err) {
          console.error(`Error resolving blocked user ${block.blockedId}:`, err);
        }
      }

      setBlockedUsers(resolvedUsers);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      Alert.alert(t('common.error'), t('settings.update_error'));
    } finally {
      setLoading(false);
    }
  }, [user?.uid, t]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = (blockedUser: BlockedUser) => {
    Alert.alert(
      t('settings.unblock_btn'),
      t('settings.unblock_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.unblock_btn'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) return;
            try {
              setActionLoading(blockedUser.uid);
              const success = await followService.unblockUser(user.uid, blockedUser.uid);
              if (success) {
                setBlockedUsers((prev) => prev.filter((item) => item.uid !== blockedUser.uid));
              } else {
                Alert.alert(t('common.error'), t('settings.update_error'));
              }
            } catch (err) {
              console.error('Error unblocking:', err);
              Alert.alert(t('common.error'), t('settings.update_error'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const backButtonBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const backButtonBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)';

  const renderBlockedItem = ({ item }: { item: BlockedUser }) => {
    const isUnblocking = actionLoading === item.uid;

    return (
      <LiquidSurface themeMode={theme} style={styles.userCard} intensity={isDark ? 16 : 8}>
        <View style={styles.cardLeft}>
          <Image source={{ uri: item.profileUrl }} style={styles.avatar} contentFit="cover" />
          <View style={styles.userDetails}>
            <Text style={[styles.displayName, { color: palette.text }]} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={[styles.username, { color: palette.subtleText }]} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
          style={[styles.unblockButton, { borderColor: palette.border }]}
          activeOpacity={0.8}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={palette.text} />
          ) : (
            <Text style={[styles.unblockButtonText, { color: palette.text }]}>
              {t('settings.unblock_btn')}
            </Text>
          )}
        </TouchableOpacity>
      </LiquidSurface>
    );
  };

  return (
    <LiquidGlassBackground themeMode={theme} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: backButtonBg, borderColor: backButtonBorder }]}
          activeOpacity={0.86}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{t('settings.blocked_users')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.text} />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: palette.cardGlass }]}>
            <MaterialCommunityIcons name="account-cancel-outline" size={48} color={palette.subtleText} />
          </View>
          <Text style={[styles.emptyText, { color: palette.text }]}>
            {t('settings.no_blocked_users')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.uid}
          renderItem={renderBlockedItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </LiquidGlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 38,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '700',
  },
  username: {
    fontSize: 12,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default BlockedUsersScreen;
