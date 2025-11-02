import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { Colors } from '@/constants/Colors';
import { ThemeContext } from '@/context/ThemeContext';
import { useContext } from 'react';
import { giftService } from '@/services/giftService';
import type { GiftReceiptDoc } from '@/services/giftService';
import { formatDetailedTime } from '@/utils/common';

export default function GiftsInboxScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const [items, setItems] = useState<GiftReceiptDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAllRead, setLoadingAllRead] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = giftService.subscribeReceivedGifts(user.uid, (list) => {
      setItems(list);
    });
    return () => {
      try { unsub(); } catch {}
    };
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
    } finally {
      setLoadingAllRead(false);
    }
  };

  const confirmRedeem = (item: GiftReceiptDoc) => {
    if (!user?.uid) return;
    if (item.redeemed) return;
    const value = item.gift?.price ?? 0;
    Alert.alert(
      'Đổi quà lấy Bánh mì',
      `Bạn muốn đổi "${item.gift?.name}" lấy 🥖 ${value}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đổi',
          style: 'destructive',
          onPress: async () => {
            try {
              setRedeemingId(item.id);
              const res = await giftService.redeemGiftReceipt(user.uid!, item.id);
              Alert.alert('Thành công', `Bạn đã nhận được 🥖 ${res.redeemValue}`);
            } catch (e: any) {
              const msg = e?.message || 'Có lỗi xảy ra, vui lòng thử lại';
              Alert.alert('Không thể đổi quà', msg);
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: GiftReceiptDoc }) => {
    const created = item.createdAt ? formatDetailedTime(item.createdAt) : '';
    const isRedeeming = redeemingId === item.id;
    const redeemedText = item.redeemed ? `Đã đổi • 🥖 ${item.redeemValue ?? item.gift?.price ?? ''}` : '';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: currentThemeColors.surface, borderColor: currentThemeColors.border },
        ]}
        activeOpacity={0.8}
        onPress={() => router.push(`/chat/${item.fromUid}`)}
      >
        <View style={styles.row}>
          <Text style={styles.emoji}>{item.gift?.icon || '🎁'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: currentThemeColors.text }]} numberOfLines={1}>
              {item.gift?.name} • 🥖 {item.gift?.price}
            </Text>
            <Text style={[styles.subtitle, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
              Từ {item.fromName || item.fromUid}
            </Text>
            <Text style={[styles.time, { color: currentThemeColors.subtleText }]}>{created}</Text>
            {item.redeemed && (
              <Text style={[styles.redeemedLabel, { color: '#2e7d32' }]}>{redeemedText}</Text>
            )}
          </View>
          <View style={styles.actions}>
            {item.status !== 'read' ? (
              <TouchableOpacity
                onPress={() => giftService.markGiftReceiptsReadBatch(user?.uid!, [item.id])}
                style={[styles.readBtn, { borderColor: currentThemeColors.border }]}
              >
                <Text style={styles.readBtnText}>Đã đọc</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 12, color: '#4CAF50' }}>Đã đọc</Text>
            )}

            {!item.redeemed ? (
              <TouchableOpacity
                onPress={() => confirmRedeem(item)}
                disabled={isRedeeming}
                style={[styles.redeemBtn, { backgroundColor: isRedeeming ? '#bdbdbd' : currentThemeColors.tint }]}
              >
                {isRedeeming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.redeemBtnText}>Đổi lấy 🥖 {item.gift?.price}</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Stack.Screen
        options={{
          title: 'Quà đã nhận',
          headerRight: () => (
            <TouchableOpacity onPress={markAllRead} disabled={loadingAllRead} style={{ paddingHorizontal: 12 }}>
              <Text style={{ color: loadingAllRead ? currentThemeColors.subtleText : currentThemeColors.tint }}>
                Đọc hết
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: currentThemeColors.subtleText }}>Chưa có quà nào</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 36, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  time: { fontSize: 11, marginTop: 2 },
  actions: { marginLeft: 8, alignItems: 'flex-end' },
  readBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  readBtnText: { fontSize: 12, fontWeight: '600' },
  redeemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  redeemBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  redeemedLabel: { fontSize: 12, marginTop: 6, fontWeight: '600' },
});
