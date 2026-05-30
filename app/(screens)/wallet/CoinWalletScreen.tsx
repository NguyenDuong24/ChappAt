import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { coinServerApi, getErrorMessage } from '../../../src/services/coinServerApi';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHandler } from 'react-native';
import CoinPurchaseSection from '../../../components/payment/CoinPurchaseSection';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

const PROD_REWARDED_AD_UNIT_ID = 'ca-app-pub-9793421534392971/7526441306';

export const options = { headerShown: false };

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currencyType?: string;
  createdAt?: Date | string;
  metadata?: any;
}

const CACHED_BALANCE_KEY = '@SaiGon Match:cached_balance_v2';
const CACHED_LOCAL_TX_KEY = '@SaiGon Match:wallet_local_pending_transactions_v1';

const formatTransactionDate = (value: any, locale: string) => {
  if (!value) return '';
  const date = value?._seconds ? new Date(value._seconds * 1000) : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
};

const isLocalTransaction = (tx: Transaction) => tx.id.startsWith('local_') || tx.metadata?.syncStatus === 'pending';

const mergeServerAndLocalTransactions = (serverTransactions: Transaction[], localTransactions: Transaction[]) => {
  const serverOrderIds = new Set(serverTransactions.map(tx => tx.metadata?.orderId).filter(Boolean));
  const stillPendingLocal = localTransactions.filter(tx => {
    const orderId = tx.metadata?.orderId;
    return !orderId || !serverOrderIds.has(orderId);
  });

  return [...stillPendingLocal, ...serverTransactions].filter((tx, index, arr) => {
    const orderId = tx.metadata?.orderId;
    return arr.findIndex(item => item.id === tx.id || (orderId && item.metadata?.orderId === orderId)) === index;
  });
};

// Modified TransactionItem to use tf
const TransactionItem = memo(({ tx, details, locale, tf, onPress }: {
  tx: Transaction;
  details: { title: string; description: string; icon: any; color: string };
  locale: string;
  tf: (key: string, fallback: string) => string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.txItem} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.txIcon, { backgroundColor: details.color + '15' }]}>
      <Ionicons name={details.icon} size={22} color={details.color} />
    </View>
    <View style={styles.txDetails}>
      <Text style={styles.txType}>{details.title}</Text>
      <Text style={styles.txDescription} numberOfLines={1}>{details.description}</Text>
      <Text style={styles.txDate}>
        {formatTransactionDate(tx.createdAt, locale)}
      </Text>
      {isLocalTransaction(tx) && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>{tf('wallet.syncing_transaction', 'Đang đồng bộ')}</Text>
        </View>
      )}
    </View>
    <View style={styles.txAmountContainer}>
      <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#4CAF50' : '#F44336' }]}>
        {tx.amount > 0 ? '+' : ''}{tx.amount}
      </Text>
      <Text style={styles.txCurrency}>
        {tx.currencyType === 'coins' ? tf('wallet.coins', 'Xu') : tf('wallet.banhMi', 'Bánh mì')}
      </Text>
    </View>
  </TouchableOpacity>
));

export default function CoinWalletScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from: string }>();

  // Fallback helper
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  const [coins, setCoins] = useState<number>(0);
  const [banhMi, setBanhMi] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [rewardAdLoaded, setRewardAdLoaded] = useState(false);
  const [giftAdLoaded, setGiftAdLoaded] = useState(false);
  const [rewardAd, setRewardAd] = useState<any>(null);
  const [giftAd, setGiftAd] = useState<any>(null);

  const isShowingAdRef = useRef(false);
  const claimedRewardRef = useRef<{ reward: boolean; gift: boolean }>({ reward: false, gift: false });
  const pendingAdIdRef = useRef<string>('');
  const isMountedRef = useRef(true);
  const adUnsubscribesRef = useRef<(() => void)[]>([]);
  const rewardResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBackPress = useCallback(() => {
    if (from === 'profile') {
      router.replace('/(tabs)/profile');
    } else {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/home');
    }
    return true;
  }, [from, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const loadBalance = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const result = await coinServerApi.getBalance();
      if (!isMountedRef.current) return;
      setCoins(result.coins);
      setBanhMi(result.banhMi);
      try {
        await AsyncStorage.setItem(CACHED_BALANCE_KEY, JSON.stringify({ coins: result.coins, banhMi: result.banhMi }));
      } catch (_) { }
    } catch (error) {
      console.error('Load balance error:', error);
    } finally {
      if (showLoading && isMountedRef.current) setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const result = await coinServerApi.getTransactions(50);
      let cachedLocal: Transaction[] = [];
      try {
        const raw = await AsyncStorage.getItem(CACHED_LOCAL_TX_KEY);
        if (raw) cachedLocal = JSON.parse(raw);
      } catch (_) { }

      if (isMountedRef.current) {
        setTransactions(prev => {
          const localPending = [...cachedLocal, ...prev.filter(isLocalTransaction)];
          const serverTransactions = result.transactions || [];
          const merged = mergeServerAndLocalTransactions(serverTransactions, localPending);

          const filteredLocal = merged.filter(isLocalTransaction);
          AsyncStorage.setItem(CACHED_LOCAL_TX_KEY, JSON.stringify(filteredLocal)).catch(() => { });
          return merged;
        });
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBalance(false);
      loadTransactions();
    }, [loadBalance, loadTransactions])
  );

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHED_BALANCE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setCoins(parsed.coins || 0);
          setBanhMi(parsed.banhMi || 0);
        }
      } catch (_) { }

      try {
        const localCachedTx = await AsyncStorage.getItem(CACHED_LOCAL_TX_KEY);
        if (localCachedTx) {
          const parsedTx = JSON.parse(localCachedTx);
          if (Array.isArray(parsedTx) && parsedTx.length > 0) {
            setTransactions(parsedTx);
          }
        }
      } catch (_) { }

      try {
        await Promise.all([loadBalance(false), loadTransactions()]);
      } catch (_) { }
      finally {
        if (isMountedRef.current) setInitialLoading(false);
      }
    })();

    const adTimer = setTimeout(() => loadAds(), 800);

    return () => {
      isMountedRef.current = false;
      clearTimeout(adTimer);
      adUnsubscribesRef.current.forEach(unsubscribe => unsubscribe());
      adUnsubscribesRef.current = [];
      if (rewardResetTimerRef.current) clearTimeout(rewardResetTimerRef.current);
    };
  }, [loadBalance, loadTransactions]);

  const loadAds = useCallback(async () => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
    adUnsubscribesRef.current.forEach(unsubscribe => unsubscribe());
    adUnsubscribesRef.current = [];
    const adUnitId = PROD_REWARDED_AD_UNIT_ID;

    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = await import('react-native-google-mobile-ads');
      if (!isMountedRef.current) return;

      const reward = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });
      adUnsubscribesRef.current.push(reward.addAdEventListener(RewardedAdEventType.LOADED, () => { if (isMountedRef.current) setRewardAdLoaded(true); }));
      adUnsubscribesRef.current.push(reward.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => handleAdEarned('reward')));
      adUnsubscribesRef.current.push(reward.addAdEventListener(AdEventType.CLOSED, () => {
        if (isMountedRef.current) { setRewardAdLoaded(false); isShowingAdRef.current = false; reward.load(); }
      }));
      reward.load();
      setRewardAd(reward);

      const gift = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });
      adUnsubscribesRef.current.push(gift.addAdEventListener(RewardedAdEventType.LOADED, () => { if (isMountedRef.current) setGiftAdLoaded(true); }));
      adUnsubscribesRef.current.push(gift.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => handleAdEarned('gift')));
      adUnsubscribesRef.current.push(gift.addAdEventListener(AdEventType.CLOSED, () => {
        if (isMountedRef.current) { setGiftAdLoaded(false); isShowingAdRef.current = false; gift.load(); }
      }));
      gift.load();
      setGiftAd(gift);
    } catch (error) {
      console.warn('[RewardedAd] Lazy load failed:', error);
    }
  }, []);

  const handleAdEarned = useCallback(async (type: 'reward' | 'gift') => {
    if (claimedRewardRef.current[type]) return;
    claimedRewardRef.current[type] = true;
    const adId = pendingAdIdRef.current || `${type}_ad_${Date.now()}`;
    try {
      setLoading(true);
      if (type === 'reward') {
        const result = await coinServerApi.reward(adId, { source: 'rewarded_ad' });
        setBanhMi(result.newBalance);
        loadBalance(false);
        Alert.alert(tf('common.success', 'Thành công'), `+${result.amount} ${tf('wallet.banhMi', 'Bánh mì')}!`);
      } else {
        const result = await coinServerApi.rewardGift(adId, { source: 'rewarded_ad_gift' });
        Alert.alert(tf('common.success', 'Thành công'), result.message || tf('wallet.lucky_gift', 'Quà may mắn'));
      }
      loadTransactions();
    } catch (error) {
      Alert.alert(tf('common.error', 'Lỗi'), getErrorMessage(error as any));
    } finally {
      if (isMountedRef.current) setLoading(false);
      if (rewardResetTimerRef.current) clearTimeout(rewardResetTimerRef.current);
      rewardResetTimerRef.current = setTimeout(() => { claimedRewardRef.current[type] = false; }, 1000);
    }
  }, [tf, loadBalance, loadTransactions]);

  const showAd = useCallback((type: 'reward' | 'gift') => {
    if (isShowingAdRef.current) return;
    const ad = type === 'reward' ? rewardAd : giftAd;
    const isLoaded = type === 'reward' ? rewardAdLoaded : giftAdLoaded;
    if (ad && isLoaded) {
      isShowingAdRef.current = true;
      pendingAdIdRef.current = `${type}_${Date.now()}`;
      claimedRewardRef.current[type] = false;
      try { ad.show(); } catch (e) {
        isShowingAdRef.current = false;
        Alert.alert(tf('common.error', 'Lỗi'), tf('wallet.ad_error', 'Lỗi hiển thị quảng cáo'));
      }
    } else {
      Alert.alert(tf('common.loading', 'Đang tải'), tf('wallet.ad_loading', 'Quảng cáo đang tải'));
      try { ad?.load(); } catch (_) { }
    }
  }, [rewardAd, giftAd, rewardAdLoaded, giftAdLoaded, tf]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadBalance(false), loadTransactions()]).finally(() => {
      if (isMountedRef.current) setRefreshing(false);
    });
  }, [loadBalance, loadTransactions]);

  const handlePurchaseSuccess = useCallback(async (_newBalance?: number, localTx?: Transaction) => {
    if (localTx) {
      try {
        const raw = await AsyncStorage.getItem(CACHED_LOCAL_TX_KEY);
        const cached = raw ? JSON.parse(raw) : [];
        const exists = cached.some((tx: Transaction) => tx.id === localTx.id || (localTx.metadata?.orderId && tx.metadata?.orderId === localTx.metadata.orderId));
        if (!exists) {
          await AsyncStorage.setItem(CACHED_LOCAL_TX_KEY, JSON.stringify([localTx, ...cached]));
        }
      } catch (_) { }

      setTransactions(prev => {
        const exists = prev.some(tx => tx.id === localTx.id || (localTx.metadata?.orderId && tx.metadata?.orderId === localTx.metadata.orderId));
        if (exists) return prev;
        return [localTx, ...prev];
      });
    }
    await Promise.all([loadBalance(true), loadTransactions()]);
    setTimeout(() => {
      loadTransactions();
    }, 2500);
  }, [loadBalance, loadTransactions]);

  const stats = useMemo(() => ({
    earned: transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0),
    spent: Math.abs(transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0)),
  }), [transactions]);

  const getTransactionDetails = useCallback((tx: Transaction) => {
    const { type, metadata, amount } = tx;
    if (type === 'reward') return { title: tf('wallet.watch_ad', 'Xem quảng cáo'), description: tf('wallet.watch_ad_desc', 'Nhận thưởng'), icon: 'play-circle-outline' as any, color: '#4CAF50' };
    if (type === 'topup') {
      if (metadata?.type === 'gift_redeem') return { title: tf('wallet.redeem_gift', 'Đổi quà'), description: tf('wallet.redeem_gift_desc', 'Đổi quà'), icon: 'gift-outline' as any, color: '#4CAF50' };
      if (metadata?.source === 'vietqr') return { title: tf('wallet.topup_vietqr', 'Nạp VietQR'), description: tf('wallet.topup_vietqr_desc', 'Mã {{orderId}}').replace('{{orderId}}', metadata.orderId?.slice(-8) || 'N/A'), icon: 'wallet-outline' as any, color: '#4CAF50' };
      return { title: tf('wallet.topup', 'Nạp'), description: tf('wallet.topup_desc', 'Nạp tài khoản'), icon: 'add-circle-outline' as any, color: '#4CAF50' };
    }
    if (type === 'spend') {
      if (metadata?.type === 'shop_purchase') return { title: tf('store.title', 'Cửa hàng'), description: metadata.itemName || tf('store.item', 'Sản phẩm'), icon: 'cart-outline' as any, color: '#F44336' };
      if (metadata?.type === 'gift') return { title: tf('wallet.send_gift', 'Tặng quà'), description: tf('wallet.send_gift_desc', 'Gửi quà'), icon: 'heart-outline' as any, color: '#F44336' };
      return { title: tf('wallet.spend', 'Chi tiêu'), description: metadata?.purpose || tf('wallet.spend_desc', 'Chi tiêu'), icon: 'remove-circle-outline' as any, color: '#F44336' };
    }
    return { title: type.charAt(0).toUpperCase() + type.slice(1), description: tf('wallet.transaction', 'Giao dịch'), icon: (amount > 0 ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline') as any, color: amount > 0 ? '#4CAF50' : '#F44336' };
  }, [tf]);

  const txWithDetails = useMemo(() =>
    transactions.map(tx => ({ tx, details: getTransactionDetails(tx) })),
    [transactions, getTransactionDetails]
  );

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <LinearGradient colors={['#0EA5E9', '#06B6D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Ionicons name="wallet" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitleText}>{tf('wallet.title', 'Ví của tôi')}</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerBalance}>
          <View style={styles.balanceContainer}>
            <View style={styles.balanceItem}>
              <Text style={styles.headerBalanceLabel}>{tf('wallet.coins', 'Xu')}</Text>
              <View style={styles.headerBalanceAmount}>
                <Ionicons name="diamond" size={20} color="#ffd700" style={{ marginRight: 6 }} />
                <Text style={styles.headerBalanceValue}>{coins.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.headerBalanceLabel}>{tf('wallet.banhMi', 'Bánh mì')}</Text>
              <View style={styles.headerBalanceAmount}>
                <MaterialCommunityIcons name="baguette" size={20} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={styles.headerBalanceValue}>{banhMi.toLocaleString()}</Text>
              </View>
            </View>
          </View>
          {initialLoading && <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />}
        </View>
      </LinearGradient>

      {/* Scrollable body */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <View style={styles.statText}>
              <Text style={styles.statLabel}>{tf('wallet.earned', 'Đã nhận')}</Text>
              <Text style={styles.statValue}>{stats.earned.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trending-down" size={24} color="#F44336" />
            <View style={styles.statText}>
              <Text style={styles.statLabel}>{tf('wallet.spent', 'Đã chi')}</Text>
              <Text style={styles.statValue}>{stats.spent.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* VietQR Purchase */}
        <CoinPurchaseSection onPurchaseSuccess={handlePurchaseSuccess} />

        {/* Ad Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tf('wallet.free_coins', 'Nhận miễn phí')}</Text>
          <View style={styles.adCard}>
            <View style={styles.adInfo}>
              <Ionicons name="play-circle" size={40} color="#4CAF50" />
              <View style={styles.adTextContainer}>
                <Text style={styles.adTitle}>{tf('wallet.watch_ad', 'Xem quảng cáo')}</Text>
                <Text style={styles.adSubtitle}>{tf('wallet.watch_ad_desc', 'Nhận thưởng')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.watchBtn, !rewardAdLoaded && styles.disabledBtn]}
              onPress={() => showAd('reward')}
              disabled={loading || !rewardAdLoaded}
            >
              <Text style={styles.watchBtnText}>{rewardAdLoaded ? tf('wallet.watch_now', 'Xem ngay') : tf('common.loading', 'Đang tải')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.adCard, { marginTop: 12 }]}>
            <View style={styles.adInfo}>
              <Ionicons name="gift" size={40} color="#9C27B0" />
              <View style={styles.adTextContainer}>
                <Text style={styles.adTitle}>{tf('wallet.lucky_gift', 'Quà may mắn')}</Text>
                <Text style={styles.adSubtitle}>{tf('wallet.lucky_gift_desc', 'Mở quà bí ẩn')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.watchBtn, { backgroundColor: '#9C27B0' }, !giftAdLoaded && styles.disabledBtn]}
              onPress={() => showAd('gift')}
              disabled={loading || !giftAdLoaded}
            >
              <Text style={styles.watchBtnText}>{giftAdLoaded ? tf('wallet.open_gift', 'Mở quà') : tf('common.loading', 'Đang tải')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>{tf('wallet.history', 'Lịch sử')}</Text>
            <TouchableOpacity style={styles.searchTxBtn} onPress={() => router.push('/(screens)/wallet/TransactionSearchScreen')}>
              <Ionicons name="search" size={16} color="#0EA5E9" />
              <Text style={styles.searchTxText}>{tf('wallet.search', 'Tìm')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.transactionList}>
            {initialLoading ? (
              <View style={styles.loadingList}>
                <ActivityIndicator size="small" color="#555" />
              </View>
            ) : txWithDetails.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{tf('wallet.no_transactions', 'Chưa có giao dịch')}</Text>
              </View>
            ) : (
              txWithDetails.map(({ tx, details }) => (
                <TransactionItem
                  key={tx.id}
                  tx={tx}
                  details={details}
                  locale={i18n.language}
                  tf={tf}
                  onPress={() => router.push({ pathname: '/(screens)/wallet/TransactionDetailScreen', params: { txId: tx.id, transaction: JSON.stringify(tx) } })}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {loading && !initialLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  refreshButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerTitleText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerBalance: { alignItems: 'center', paddingTop: 8 },
  balanceContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  balanceItem: { alignItems: 'center', flex: 1 },
  balanceDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
  headerBalanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 6 },
  headerBalanceAmount: { flexDirection: 'row', alignItems: 'center' },
  headerBalanceValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 40 },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, margin: 16, marginTop: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, 
  },
  statItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statText: { marginLeft: 10 },
  statLabel: { fontSize: 12, color: '#757575', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E0E0E0', marginHorizontal: 12 },
  section: { marginBottom: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchTxBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F7FF', borderWidth: 1, borderColor: '#BEE3F8', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  searchTxText: { color: '#0EA5E9', fontSize: 12, fontWeight: '700' },
  adCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, 
  },
  adInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  adTextContainer: { marginLeft: 12 },
  adTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  adSubtitle: { fontSize: 13, color: '#757575' },
  watchBtn: { backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  disabledBtn: { backgroundColor: '#E0E0E0' },
  watchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  transactionList: { backgroundColor: '#fff', borderRadius: 12 },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txType: { fontSize: 15, fontWeight: '700', color: '#333' },
  txDescription: { fontSize: 13, color: '#666', marginTop: 1 },
  txDate: { fontSize: 11, color: '#999', marginTop: 4 },
  pendingBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FFF4E5' },
  pendingBadgeText: { fontSize: 10, color: '#B45309', fontWeight: '700' },
  txAmountContainer: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '800' },
  txCurrency: { fontSize: 10, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 14 },
  loadingList: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
});