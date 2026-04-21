import React, { useState, useEffect, useRef, useCallback, useMemo, memo, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { coinServerApi, getErrorMessage } from '../../../src/services/coinServerApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHandler } from 'react-native';
import CoinPurchaseSection from '../../../components/payment/CoinPurchaseSection';
import { RewardedAd, RewardedAdEventType, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '@/context/ThemeContext';
import { LiquidGlassBackground, LiquidSurface, getLiquidPalette } from '@/components/liquid';
import { BlurView } from 'expo-blur';
import { convertTimestampToDate } from '@/utils/common';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

const PROD_REWARDED_AD_UNIT_ID = 'ca-app-pub-9844251118980104/4096893807';

export const options = { headerShown: false };

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currencyType?: string;
  createdAt?: Date | string;
  metadata?: any;
}

const CACHED_BALANCE_KEY = '@chappat:cached_balance_v2';

// ─── Memo'd TransactionItem ───
const TransactionItem = memo(({ tx, details, locale, t, palette, index }: {
  tx: Transaction;
  details: { title: string; description: string; icon: any; color: string };
  locale: string;
  t: any;
  palette: any;
  index: number;
}) => {
  const formatTxTime = (createdAt: any) => {
    try {
      const iso = convertTimestampToDate(createdAt);
      if (!iso) return '';
      return new Date(iso).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).springify()} 
      layout={LinearTransition}
      style={[styles.txItem, { borderBottomColor: palette.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
    >
      <View style={[styles.txIcon, { backgroundColor: details.color + '15' }]}>
        <Ionicons name={details.icon} size={22} color={details.color} />
      </View>
      <View style={styles.txDetails}>
        <Text style={[styles.txType, { color: palette.textColor }]}>{details.title}</Text>
        <Text style={[styles.txDescription, { color: palette.subtitleColor }]} numberOfLines={1}>{details.description}</Text>
        <Text style={[styles.txDate, { color: palette.subtitleColor, opacity: 0.6 }]}>
          {formatTxTime(tx.createdAt)}
        </Text>
      </View>
      <View style={styles.txAmountContainer}>
        <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#4CAF50' : '#FF6B7F' }]}>
          {tx.amount > 0 ? '+' : ''}{tx.amount}
        </Text>
        <Text style={[styles.txCurrency, { color: palette.subtitleColor }]}>
          {tx.currencyType === 'coins' ? t('wallet.coins') : t('wallet.banhMi')}
        </Text>
      </View>
    </Animated.View>
  );
});

// ─── Main Screen ───
export default function CoinWalletScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from: string }>();

  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const isDark = themeCtx?.isDark ?? (theme === 'dark');
  const palette = useMemo(() => themeCtx?.palette || getLiquidPalette(theme), [theme, themeCtx]);

  const [coins, setCoins] = useState<number>(0);
  const [banhMi, setBanhMi] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [rewardAdLoaded, setRewardAdLoaded] = useState(false);
  const [giftAdLoaded, setGiftAdLoaded] = useState(false);
  const [rewardAd, setRewardAd] = useState<RewardedAd | null>(null);
  const [giftAd, setGiftAd] = useState<RewardedAd | null>(null);

  const isShowingAdRef = useRef(false);
  const claimedRewardRef = useRef<{ reward: boolean; gift: boolean }>({ reward: false, gift: false });
  const pendingAdIdRef = useRef<string>('');
  const isMountedRef = useRef(true);

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
      const result = await coinServerApi.getTransactions(20);
      if (isMountedRef.current) setTransactions(result.transactions);
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      // Show cached balance instantly
      try {
        const cached = await AsyncStorage.getItem(CACHED_BALANCE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setCoins(parsed.coins || 0);
          setBanhMi(parsed.banhMi || 0);
        }
      } catch (_) { }

      try {
        await Promise.all([loadBalance(false), loadTransactions()]);
      } catch (_) { }
      finally {
        if (isMountedRef.current) setInitialLoading(false);
      }
    })();

    // Init ads after a small delay
    const adTimer = setTimeout(() => loadAds(), 800);

    return () => {
      isMountedRef.current = false;
      clearTimeout(adTimer);
    };
  }, [loadBalance, loadTransactions]);

  const loadAds = useCallback(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
    const adUnitId = __DEV__ ? TestIds.REWARDED : PROD_REWARDED_AD_UNIT_ID;

    const reward = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });
    reward.addAdEventListener(RewardedAdEventType.LOADED, () => { if (isMountedRef.current) setRewardAdLoaded(true); });
    reward.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => handleAdEarned('reward'));
    reward.addAdEventListener(AdEventType.CLOSED, () => {
      if (isMountedRef.current) { setRewardAdLoaded(false); isShowingAdRef.current = false; reward.load(); }
    });
    reward.load();
    setRewardAd(reward);

    const gift = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });
    gift.addAdEventListener(RewardedAdEventType.LOADED, () => { if (isMountedRef.current) setGiftAdLoaded(true); });
    gift.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => handleAdEarned('gift'));
    gift.addAdEventListener(AdEventType.CLOSED, () => {
      if (isMountedRef.current) { setGiftAdLoaded(false); isShowingAdRef.current = false; gift.load(); }
    });
    gift.load();
    setGiftAd(gift);
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
        Alert.alert(t('common.success'), `+${result.amount} ${t('wallet.banhMi')}!`);
      } else {
        const result = await coinServerApi.rewardGift(adId, { source: 'rewarded_ad_gift' });
        Alert.alert(t('common.success'), result.message || t('wallet.lucky_gift'));
      }
      loadTransactions();
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error as any));
    } finally {
      setLoading(false);
      setTimeout(() => { claimedRewardRef.current[type] = false; }, 1000);
    }
  }, [t, loadBalance, loadTransactions]);

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
        Alert.alert(t('common.error'), t('wallet.ad_error'));
      }
    } else {
      Alert.alert(t('common.loading'), t('wallet.ad_loading'));
      try { ad?.load(); } catch (_) { }
    }
  }, [rewardAd, giftAd, rewardAdLoaded, giftAdLoaded, t]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadBalance(false), loadTransactions()]).finally(() => {
      if (isMountedRef.current) setRefreshing(false);
    });
  }, [loadBalance, loadTransactions]);

  const handlePurchaseSuccess = useCallback(() => {
    loadBalance(true);
  }, [loadBalance]);

  const stats = useMemo(() => ({
    earned: transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0),
    spent: Math.abs(transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0)),
  }), [transactions]);

  const getTransactionDetails = useCallback((tx: Transaction) => {
    const { type, metadata, amount } = tx;
    if (type === 'reward') return { title: t('wallet.watch_ad'), description: t('wallet.watch_ad_desc'), icon: 'play-circle-outline' as any, color: '#4CAF50' };
    if (type === 'topup') {
      if (metadata?.type === 'gift_redeem') return { title: t('wallet.redeem_gift'), description: t('wallet.redeem_gift_desc'), icon: 'gift-outline' as any, color: '#4CAF50' };
      if (metadata?.source === 'vietqr') return { title: t('wallet.topup_vietqr'), description: t('wallet.topup_vietqr_desc', { orderId: metadata.orderId?.slice(-8) || 'N/A' }), icon: 'wallet-outline' as any, color: '#4CAF50' };
      return { title: t('wallet.topup'), description: t('wallet.topup_desc'), icon: 'add-circle-outline' as any, color: '#4CAF50' };
    }
    if (type === 'spend') {
      if (metadata?.type === 'shop_purchase') return { title: t('store.title'), description: metadata.itemName || t('store.item'), icon: 'cart-outline' as any, color: '#FF6B7F' };
      if (metadata?.type === 'gift') return { title: t('wallet.send_gift'), description: t('wallet.send_gift_desc'), icon: 'heart-outline' as any, color: '#FF6B7F' };
      return { title: t('wallet.spend'), description: metadata?.purpose || t('wallet.spend_desc'), icon: 'remove-circle-outline' as any, color: '#FF6B7F' };
    }
    return { title: type.charAt(0).toUpperCase() + type.slice(1), description: t('wallet.transaction'), icon: (amount > 0 ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline') as any, color: amount > 0 ? '#4CAF50' : '#FF6B7F' };
  }, [t]);

  const txWithDetails = useMemo(() =>
    transactions.map(tx => ({ tx, details: getTransactionDetails(tx) })),
    [transactions, getTransactionDetails]
  );

  const glassBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={styles.container}>
      <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: glassBorder, borderBottomWidth: 1 }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.headerTop}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={palette.textColor} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Ionicons name="wallet" size={24} color={palette.primary || "#0EA5E9"} style={{ marginRight: 8 }} />
            <Text style={[styles.headerTitleText, { color: palette.textColor }]}>{t('wallet.title')}</Text>
          </View>
          <TouchableOpacity style={[styles.refreshButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color={palette.textColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBalance}>
          <View style={styles.balanceContainer}>
            <View style={styles.balanceItem}>
              <Text style={[styles.headerBalanceLabel, { color: palette.subtitleColor }]}>{t('wallet.coins')}</Text>
              <View style={styles.headerBalanceAmount}>
                <Ionicons name="diamond" size={20} color="#ffd700" style={{ marginRight: 6 }} />
                <Text style={[styles.headerBalanceValue, { color: palette.textColor }]}>{coins.toLocaleString()}</Text>
              </View>
            </View>
            <View style={[styles.balanceDivider, { backgroundColor: glassBorder }]} />
            <View style={styles.balanceItem}>
              <Text style={[styles.headerBalanceLabel, { color: palette.subtitleColor }]}>{t('wallet.banhMi')}</Text>
              <View style={styles.headerBalanceAmount}>
                <MaterialCommunityIcons name="baguette" size={20} color="#FFD700" style={{ marginRight: 6 }} />
                <Text style={[styles.headerBalanceValue, { color: palette.textColor }]}>{banhMi.toLocaleString()}</Text>
              </View>
            </View>
          </View>
          {initialLoading && <ActivityIndicator size="small" color={palette.textColor} style={{ marginTop: 8 }} />}
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 5 : 15} style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <View style={styles.statText}>
              <Text style={[styles.statLabel, { color: palette.subtitleColor }]}>{t('wallet.earned')}</Text>
              <Text style={[styles.statValue, { color: palette.textColor }]}>{stats.earned.toLocaleString()}</Text>
            </View>
          </View>
          <View style={[styles.statDivider, { backgroundColor: glassBorder }]} />
          <View style={styles.statItem}>
            <Ionicons name="trending-down" size={24} color="#FF6B7F" />
            <View style={styles.statText}>
              <Text style={[styles.statLabel, { color: palette.subtitleColor }]}>{t('wallet.spent')}</Text>
              <Text style={[styles.statValue, { color: palette.textColor }]}>{stats.spent.toLocaleString()}</Text>
            </View>
          </View>
        </LiquidSurface>

        {/* Purchase Section */}
        <CoinPurchaseSection onPurchaseSuccess={handlePurchaseSuccess} />

        {/* Ad Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textColor }]}>{t('wallet.free_coins')}</Text>
          
          <LiquidSurface themeMode={theme} borderRadius={20} intensity={isDark ? 10 : 20} style={styles.adCard}>
            <View style={styles.adInfo}>
              <Ionicons name="play-circle" size={40} color="#4CAF50" />
              <View style={styles.adTextContainer}>
                <Text style={[styles.adTitle, { color: palette.textColor }]}>{t('wallet.watch_ad')}</Text>
                <Text style={[styles.adSubtitle, { color: palette.subtitleColor }]}>{t('wallet.watch_ad_desc')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.watchBtn, { backgroundColor: palette.primary || '#4CAF50' }, (!rewardAdLoaded && !__DEV__) && styles.disabledBtn]}
              onPress={() => showAd('reward')}
              disabled={loading}
            >
              <Text style={styles.watchBtnText}>{rewardAdLoaded || __DEV__ ? t('wallet.watch_now') : t('common.loading')}</Text>
            </TouchableOpacity>
          </LiquidSurface>

          <LiquidSurface themeMode={theme} borderRadius={20} intensity={isDark ? 10 : 20} style={[styles.adCard, { marginTop: 12 }]}>
            <View style={styles.adInfo}>
              <Ionicons name="gift" size={40} color="#9C27B0" />
              <View style={styles.adTextContainer}>
                <Text style={[styles.adTitle, { color: palette.textColor }]}>{t('wallet.lucky_gift')}</Text>
                <Text style={[styles.adSubtitle, { color: palette.subtitleColor }]}>{t('wallet.lucky_gift_desc')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.watchBtn, { backgroundColor: '#9C27B0' }, (!giftAdLoaded && !__DEV__) && styles.disabledBtn]}
              onPress={() => showAd('gift')}
              disabled={loading}
            >
              <Text style={styles.watchBtnText}>{giftAdLoaded || __DEV__ ? t('wallet.open_gift') : t('common.loading')}</Text>
            </TouchableOpacity>
          </LiquidSurface>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textColor }]}>{t('wallet.history')}</Text>
          <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 8 : 15} style={styles.transactionList}>
            {initialLoading ? (
              <View style={styles.loadingList}>
                <ActivityIndicator size="small" color={palette.textColor} />
              </View>
            ) : txWithDetails.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={palette.subtitleColor} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: palette.subtitleColor }]}>{t('wallet.no_transactions')}</Text>
              </View>
            ) : (
              txWithDetails.map(({ tx, details }, index) => (
                <TransactionItem
                  key={tx.id}
                  tx={tx}
                  details={details}
                  locale={i18n.language}
                  t={t}
                  palette={palette}
                  index={index}
                />
              ))
            )}
          </LiquidSurface>
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
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: 25,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, zIndex: 1 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  refreshButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerTitleText: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  headerBalance: { alignItems: 'center', paddingTop: 8, zIndex: 1 },
  balanceContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  balanceItem: { alignItems: 'center', flex: 1 },
  balanceDivider: { width: 1, height: 40, marginHorizontal: 10 },
  headerBalanceLabel: { fontSize: 13, marginBottom: 6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  headerBalanceAmount: { flexDirection: 'row', alignItems: 'center' },
  headerBalanceValue: { fontSize: 26, fontWeight: '900' },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 40, paddingTop: 10 },
  statsCard: {
    padding: 20, margin: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  statItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statText: { marginLeft: 12 },
  statLabel: { fontSize: 12, fontWeight: '800', marginBottom: 2, textTransform: 'uppercase', opacity: 0.6 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statDivider: { width: 1, height: 40, marginHorizontal: 12 },
  section: { marginBottom: 25, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15, letterSpacing: -0.5 },
  adCard: {
    padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  adInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  adTextContainer: { marginLeft: 12 },
  adTitle: { fontSize: 16, fontWeight: '800' },
  adSubtitle: { fontSize: 13, opacity: 0.7 },
  watchBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  disabledBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  watchBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  transactionList: { overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txType: { fontSize: 15, fontWeight: '800' },
  txDescription: { fontSize: 13, marginTop: 1, opacity: 0.8 },
  txDate: { fontSize: 11, marginTop: 4 },
  txAmountContainer: { alignItems: 'flex-end' },
  txAmount: { fontSize: 17, fontWeight: '900' },
  txCurrency: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 50 },
  emptyText: { marginTop: 12, fontSize: 15, fontWeight: '700' },
  loadingList: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
});
