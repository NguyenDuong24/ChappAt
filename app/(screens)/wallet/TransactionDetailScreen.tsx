import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Share, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { coinServerApi } from '../../../src/services/coinServerApi';

export const options = { headerShown: false };

type Transaction = {
  id: string;
  type: string;
  amount: number;
  currencyType?: string;
  createdAt?: Date | string;
  metadata?: any;
};

const formatTransactionDate = (value: any, locale: string) => {
  if (!value) return 'N/A';
  
  let date;
  if (value?._seconds) {
    date = new Date(value._seconds * 1000);
  } else if (value?.seconds) {
    date = new Date(value.seconds * 1000);
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    date = new Date(value);
  }
  
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
};

export default function TransactionDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { txId, transaction, fromSuccess } = useLocalSearchParams<{ txId: string; transaction?: string; fromSuccess?: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  // Fallback helper
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (transaction) {
          setTx(JSON.parse(transaction));
          return;
        }
        const result = await coinServerApi.getTransactions(50);
        const found = result.transactions.find((item: Transaction) => item.id === txId || item.metadata?.orderId === txId);
        if (mounted) setTx(found || null);
      } catch (error) {
        console.error('Load transaction detail error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [txId, transaction]);

  const copyId = useCallback(async () => {
    const idToCopy = tx?.id || txId || '';
    if (!idToCopy) return;
    await Clipboard.setStringAsync(idToCopy);
    Alert.alert(tf('common.success', 'Thành công'), tf('wallet.copied_transaction_id', 'Đã sao chép mã giao dịch'));
  }, [tf, tx?.id, txId]);

  const shareDetail = useCallback(async () => {
    const id = tx?.id || txId || 'N/A';
    await Share.share({ message: `SaiGon Match transaction: ${id}` });
  }, [tx?.id, txId]);

  const reportIssue = useCallback(() => {
    const id = tx?.id || txId || 'N/A';
    Alert.alert(
      tf('wallet.need_support', 'Cần hỗ trợ?'),
      tf('wallet.support_message', 'Vui lòng gửi mã giao dịch {{id}} cho bộ phận hỗ trợ').replace('{{id}}', id),
      [
        { text: tf('common.cancel', 'Hủy'), style: 'cancel' },
        { text: tf('wallet.copy_id', 'Sao chép ID'), onPress: copyId },
      ]
    );
  }, [copyId, tf, tx?.id, txId]);

  const goBack = () => {
    if (fromSuccess === 'true') {
      router.replace('/(screens)/wallet/CoinWalletScreen');
    } else {
      if (router.canGoBack()) router.back();
      else router.replace('/(screens)/wallet/CoinWalletScreen');
    }
  };

  const details = getTransactionDisplay(tx, tf);
  const dateText = formatTransactionDate(tx?.createdAt, i18n.language);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[details.color, shadeColor(details.color, -20)]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.iconBtn} onPress={goBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tf('wallet.transaction_detail', 'Chi tiết giao dịch')}</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={shareDetail} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroIcon}><Ionicons name={details.icon as any} size={42} color={details.color} /></View>
        <Text style={styles.heroTitle}>{details.title}</Text>
        <Text style={styles.heroAmount}>
          {tx ? `${tx.amount > 0 ? '+' : ''}${tx.amount}` : '--'} {tx?.currencyType === 'coins' ? tf('wallet.coins', 'Xu') : tf('wallet.banhMi', 'Bánh mì')}
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#0EA5E9" size="large" /></View>
      ) : !tx ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>{tf('wallet.transaction_not_found', 'Không tìm thấy giao dịch')}</Text>
          <Text style={styles.emptyDesc}>{tf('wallet.transaction_not_found_desc', 'Giao dịch không tồn tại hoặc đã bị xóa')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <InfoRow label={tf('wallet.status', 'Trạng thái')} value={tf('wallet.completed', 'Hoàn thành')} color="#10B981" />
            <InfoRow label={tf('wallet.transaction_id', 'Mã giao dịch')} value={tx.id} copyable onCopy={copyId} />
            <InfoRow label={tf('wallet.time', 'Thời gian')} value={dateText} />
            <InfoRow label={tf('wallet.type', 'Loại')} value={details.title} />
            <InfoRow label={tf('wallet.description', 'Mô tả')} value={details.description} />
            {tx.metadata?.orderId && <InfoRow label={tf('wallet.order_id', 'Mã đơn hàng')} value={tx.metadata.orderId} />}
            {tx.metadata?.source && <InfoRow label={tf('wallet.source', 'Nguồn')} value={String(tx.metadata.source)} />}
          </View>

          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionRow} onPress={copyId} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="copy-outline" size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.actionText}>{tf('wallet.copy_transaction_id', 'Sao chép mã giao dịch')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={reportIssue} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="help-buoy-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>{tf('wallet.report_or_support', 'Báo cáo hoặc hỗ trợ')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({ label, value, color, copyable, onCopy }: { label: string; value: string; color?: string; copyable?: boolean; onCopy?: () => void }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TouchableOpacity disabled={!copyable} onPress={onCopy} style={styles.infoValueWrap} activeOpacity={0.7}>
        <Text style={[styles.infoValue, color ? { color } : null]} numberOfLines={2}>{value}</Text>
        {copyable && <Ionicons name="copy-outline" size={16} color="#9CA3AF" />}
      </TouchableOpacity>
    </View>
  );
}

function getTransactionDisplay(tx: Transaction | null, tf: (key: string, fallback: string) => string) {
  if (!tx) return { title: tf('wallet.transaction', 'Giao dịch'), description: '', icon: 'receipt-outline', color: '#0EA5E9' };
  if (tx.type === 'reward') return { title: tf('wallet.watch_ad', 'Xem quảng cáo'), description: tf('wallet.watch_ad_desc', 'Nhận thưởng'), icon: 'play-circle-outline', color: '#10B981' };
  if (tx.type === 'topup') {
    const orderId = tx.metadata?.orderId?.slice(-8) || 'N/A';
    return {
      title: tf('wallet.topup', 'Nạp'),
      description: tx.metadata?.source === 'vietqr' ? tf('wallet.topup_vietqr_desc', 'Nạp qua VietQR #{{orderId}}').replace('{{orderId}}', orderId) : tf('wallet.topup_desc', 'Nạp tài khoản'),
      icon: 'wallet-outline',
      color: '#0EA5E9'
    };
  }
  if (tx.type === 'spend') return {
    title: tf('wallet.spend', 'Chi tiêu'),
    description: tx.metadata?.purpose || tf('wallet.spend_desc', 'Chi tiêu'),
    icon: 'remove-circle-outline',
    color: '#EF4444'
  };
  return {
    title: tx.type,
    description: tf('wallet.transaction', 'Giao dịch'),
    icon: tx.amount > 0 ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline',
    color: tx.amount > 0 ? '#10B981' : '#EF4444'
  };
}

function shadeColor(color: string, percent: number) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 32, paddingHorizontal: 16, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  headerTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroAmount: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  infoRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  infoValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoValue: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '700' },
  actionsCard: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  actionIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionText: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '600' },
  actionDivider: { height: 1, backgroundColor: '#F3F4F6' },
});