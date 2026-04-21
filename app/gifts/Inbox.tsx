import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { giftService } from '@/services/giftService';
import type { GiftReceiptDoc } from '@/services/giftService';
import { convertTimestampToDate } from '@/utils/common';
import { useTranslation } from 'react-i18next';
import { LiquidGlassBackground, LiquidSurface, getLiquidPalette } from '@/components/liquid';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

export default function GiftsInboxScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const isDark = themeCtx?.isDark ?? (theme === 'dark');
  const palette = useMemo(() => themeCtx?.palette || getLiquidPalette(theme), [theme, themeCtx]);
  const { t, i18n } = useTranslation();

  const [items, setItems] = useState<GiftReceiptDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAllRead, setLoadingAllRead] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    onRefresh();
  }, [user?.uid]);

  const onRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      const { items: latest } = await giftService.listReceivedGifts(user.uid, { pageSize: 30 });
      setItems(latest);
    } finally {
      setRefreshing(false);
    }
  };

  const markAllRead = async () => {
    if (!user?.uid) return;
    const unread = items.filter((i) => i.status !== 'read');
    if (unread.length === 0) return;
    setLoadingAllRead(true);
    try {
      await giftService.markGiftReceiptsReadBatch(user.uid, unread.map((i) => i.id));
      // Update local state smoothly
      setItems((prev) => prev.map((i) => ({ ...i, status: 'read' })));
    } finally {
      setLoadingAllRead(false);
    }
  };

  const confirmRedeem = (item: GiftReceiptDoc) => {
    if (!user?.uid) return;
    if (item.redeemed) return;
    const value = item.gift?.price ?? 0;
    Alert.alert(
      t('gifts_inbox.redeem_title'),
      t('gifts_inbox.redeem_message', { name: item.gift?.name, value }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('gifts_inbox.redeem_action'),
          style: 'destructive',
          onPress: async () => {
            try {
              setRedeemingId(item.id);
              const res = await giftService.redeemGiftReceipt(user.uid!, item.id);
              Alert.alert(t('common.success'), t('gifts_inbox.redeem_success', { value: res.redeemValue }));
              setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, redeemed: true, redeemValue: res.redeemValue } : i)));
            } catch (e: any) {
              const msg = e?.message || t('gifts_inbox.redeem_error_default');
              Alert.alert(t('gifts_inbox.redeem_error_title'), msg);
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ]
    );
  };

  const formatItemTime = (createdAt: any) => {
    try {
      const iso = convertTimestampToDate(createdAt);
      if (!iso) return '';
      return new Date(iso).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item, index }: { item: GiftReceiptDoc; index: number }) => {
    const created = formatItemTime(item.createdAt);
    const isRedeeming = redeemingId === item.id;
    const redeemedText = item.redeemed ? t('gifts_inbox.redeemed_label', { value: item.redeemValue ?? item.gift?.price ?? '' }) : '';
    const isUnread = item.status !== 'read';

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()} layout={LinearTransition}>
        <LiquidSurface themeMode={theme} borderRadius={20} intensity={isDark ? 8 : 15} style={[styles.card, isUnread && styles.unreadCard]}>
          <TouchableOpacity
            style={styles.cardContent}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(tabs)/chat/[id]', params: { id: item.fromUid } })}
          >
            <View style={[styles.emojiContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Text style={styles.emoji}>{item.gift?.icon || '🎁'}</Text>
            </View>

            <View style={styles.detailsContainer}>
              <Text style={[styles.itemName, { color: palette.textColor }]} numberOfLines={1}>
                {item.gift?.name} <Text style={{ opacity: 0.5 }}>•</Text> 🥖 {item.gift?.price}
              </Text>
              
              <View style={styles.fromRow}>
                <Feather name="user" size={12} color={palette.primary || '#8A2BE2'} />
                <Text style={[styles.fromText, { color: palette.subtitleColor }]} numberOfLines={1}>
                  {t('gifts_inbox.from_user', { name: item.fromName || item.fromUid })}
                </Text>
              </View>

              <Text style={[styles.time, { color: palette.subtitleColor, opacity: 0.6 }]}>{created}</Text>

              {item.redeemed && (
                <View style={styles.redeemedBadge}>
                  <Feather name="check-circle" size={12} color="#4CAF50" />
                  <Text style={styles.redeemedText}>{redeemedText}</Text>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              {isUnread ? (
                <TouchableOpacity
                  onPress={() => giftService.markGiftReceiptsReadBatch(user?.uid!, [item.id])}
                  style={[styles.readBtn, { backgroundColor: palette.primary ? palette.primary + '20' : 'rgba(138,43,226,0.2)' }]}
                >
                  <Text style={[styles.readBtnText, { color: palette.primary || '#8A2BE2' }]}>{t('gifts_inbox.mark_read')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.readBadge}>
                  <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
                </View>
              )}

              {!item.redeemed ? (
                <TouchableOpacity
                  onPress={() => confirmRedeem(item)}
                  disabled={isRedeeming}
                  style={[styles.redeemBtn, { backgroundColor: palette.secondary || '#FF1493', opacity: isRedeeming ? 0.7 : 1 }]}
                >
                  {isRedeeming ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.redeemBtnText}>{t('gifts_inbox.redeem_action')} 🥖</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </LiquidSurface>
      </Animated.View>
    );
  };

  return (
    <LiquidGlassBackground theme={theme} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: palette.primary ? palette.primary + '15' : 'rgba(138,43,226,0.1)' }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={palette.textColor} />
          </TouchableOpacity>

          <View style={styles.headerTitle}>
            <Text style={[styles.headerTitleText, { color: palette.textColor }]}>{t('gifts_inbox.title')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, loadingAllRead && { opacity: 0.5 }]}
            onPress={markAllRead}
            disabled={loadingAllRead}
          >
            {loadingAllRead ? (
              <ActivityIndicator size="small" color={palette.textColor} />
            ) : (
              <Ionicons name="checkmark-done-circle-outline" size={22} color={palette.textColor} />
            )}
          </TouchableOpacity>
        </View>

        <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 10 : 20} style={styles.statsCard}>
          <Text style={[styles.statsLabel, { color: palette.subtitleColor }]}>{t('gifts_inbox.total_received')}</Text>
          <Text style={[styles.statsValue, { color: palette.textColor }]}>{items.length}</Text>
        </LiquidSurface>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={palette.primary} 
            colors={[palette.primary || '#8A2BE2']} 
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={[styles.emptyText, { color: palette.subtitleColor }]}>{t('gifts_inbox.empty')}</Text>
          </View>
        )}
      />
    </LiquidGlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 65 : 45,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  actionButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center' },
  headerTitleText: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statsCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: -10, // Helps blend with background curve
    marginHorizontal: 10,
  },
  statsLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  statsValue: { fontSize: 36, fontWeight: '900' },
  listContent: { padding: 16, paddingBottom: 40, paddingTop: 20 },
  card: { marginBottom: 16, overflow: 'hidden' },
  unreadCard: { borderWidth: 1, borderColor: 'rgba(138,43,226,0.3)' },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  emojiContainer: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  emoji: { fontSize: 32 },
  detailsContainer: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  fromText: { fontSize: 13, fontWeight: '600' },
  time: { fontSize: 12, fontWeight: '500' },
  redeemedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12
  },
  redeemedText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
  actions: { alignItems: 'flex-end', marginLeft: 12, justifyContent: 'center', gap: 10 },
  readBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  readBtnText: { fontSize: 12, fontWeight: '800' },
  readBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(76, 175, 80, 0.1)', alignItems: 'center', justifyContent: 'center' },
  redeemBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  redeemBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '700' },
});
