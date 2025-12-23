import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Platform, RefreshControl, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { coinServerApi, getErrorMessage } from '../../../src/services/coinServerApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHandler } from 'react-native';
import CoinPurchaseSection from '../../../components/payment/CoinPurchaseSection';
import { RewardedAd, RewardedAdEventType, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { useTranslation } from 'react-i18next';

// AdMob configuration
const ADMOB_APP_ID = 'ca-app-pub-9844251118980104~9150620374';
const PROD_REWARDED_AD_UNIT_ID = 'ca-app-pub-9844251118980104/4096893807';

export const options = {
  headerShown: false, // Ẩn header mặc định để dùng custom header
};

interface Transaction {
  id: string;
  type: string;
  amount: number;
  createdAt?: Date | string;
  metadata?: any;
}

const CACHED_BALANCE_KEY = '@chappat:cached_balance';

export default function CoinWalletScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from: string }>();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // AdMob State
  const [rewardAdLoaded, setRewardAdLoaded] = useState(false);
  const [giftAdLoaded, setGiftAdLoaded] = useState(false);
  const [rewardAd, setRewardAd] = useState<RewardedAd | null>(null);
  const [giftAd, setGiftAd] = useState<RewardedAd | null>(null);

  const isShowingAdRef = useRef(false);
  const claimedRewardRef = useRef<{ reward: boolean; gift: boolean }>({ reward: false, gift: false });
  const pendingAdIdRef = useRef<string>('');
  const isMountedRef = useRef(true);

  const handleBackPress = () => {
    if (from === 'profile') {
      router.replace('/(tabs)/profile');
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    }
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [from]);

  useEffect(() => {
    isMountedRef.current = true;

    // Immediately show cached balance (fast) while we load remote data
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHED_BALANCE_KEY);
        if (cached !== null) {
          setBalance(parseInt(cached, 10) || 0);
        }
      } catch (e) {
        // ignore cache read errors
      }

      setInitialLoading(true);
      try {
        // Load both remote pieces concurrently so we show the screen fast
        await Promise.all([loadBalance(false), loadTransactions()]);
      } catch (e) {
        // swallow errors here to avoid blocking the UI
      } finally {
        if (isMountedRef.current) setInitialLoading(false);
      }
    })();

    // Initialize Ads
    loadAds();

    return () => {
      isMountedRef.current = false;
      // Cleanup logic if needed
    };
  }, []);

  const loadAds = () => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    const adUnitId = __DEV__ ? TestIds.REWARDED : PROD_REWARDED_AD_UNIT_ID;

    // Create Reward Ad
    const reward = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    reward.addAdEventListener(RewardedAdEventType.LOADED, () => {
      if (isMountedRef.current) setRewardAdLoaded(true);
    });

    reward.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      handleAdEarned('reward');
    });

    reward.addAdEventListener(AdEventType.CLOSED, () => {
      if (isMountedRef.current) {
        setRewardAdLoaded(false);
        isShowingAdRef.current = false;
        // Reload ad
        reward.load();
      }
    });

    reward.load();
    setRewardAd(reward);

    // Create Gift Ad (using same unit ID for now, or different if available)
    const gift = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    gift.addAdEventListener(RewardedAdEventType.LOADED, () => {
      if (isMountedRef.current) setGiftAdLoaded(true);
    });

    gift.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      handleAdEarned('gift');
    });

    gift.addAdEventListener(AdEventType.CLOSED, () => {
      if (isMountedRef.current) {
        setGiftAdLoaded(false);
        isShowingAdRef.current = false;
        // Reload ad
        gift.load();
      }
    });

    gift.load();
    setGiftAd(gift);
  };

  const handleAdEarned = async (type: 'reward' | 'gift') => {
    if (claimedRewardRef.current[type]) return;
    claimedRewardRef.current[type] = true;

    const adId = pendingAdIdRef.current || `${type}_ad_${Date.now()}`;

    try {
      setLoading(true);
      if (type === 'reward') {
        const result = await coinServerApi.reward(adId, { source: 'rewarded_ad' });
        setBalance(result.newBalance);
        Alert.alert(t('common.success'), `${t('common.success')}! ${t('wallet.earned')} ${result.amount} coin!`);

        // Persist balance to cache to show instantly on next open
        try {
          await AsyncStorage.setItem(CACHED_BALANCE_KEY, String(result.newBalance));
        } catch (e) { }
      } else {
        const result = await coinServerApi.rewardGift(adId, { source: 'rewarded_ad_gift' });
        Alert.alert(t('common.success'), result.message || t('wallet.lucky_gift'));
      }

      loadTransactions();

    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error as any));
    } finally {
      setLoading(false);
      // Reset claim flag after a short delay
      setTimeout(() => {
        claimedRewardRef.current[type] = false;
      }, 1000);
    }
  };

  const showAd = (type: 'reward' | 'gift') => {
    if (isShowingAdRef.current) return;

    const ad = type === 'reward' ? rewardAd : giftAd;
    const isLoaded = type === 'reward' ? rewardAdLoaded : giftAdLoaded;

    if (ad && isLoaded) {
      isShowingAdRef.current = true;
      pendingAdIdRef.current = `${type}_${Date.now()}`;
      claimedRewardRef.current[type] = false;
      try {
        ad.show();
      } catch (e) {
        console.error('Error showing ad:', e);
        isShowingAdRef.current = false;
        Alert.alert(t('common.error'), 'Không thể mở quảng cáo.');
      }
    } else {
      Alert.alert(t('common.loading'), 'Quảng cáo đang được tải, vui lòng thử lại sau giây lát.');
      // Trigger load again just in case if not loaded
      try { ad?.load(); } catch (e) { }
    }
  };

  const simulateAd = (type: 'reward' | 'gift') => {
    Alert.alert(
      'DEV Mode',
      `Mô phỏng xem quảng cáo ${type}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Xem xong',
          onPress: () => handleAdEarned(type)
        }
      ]
    );
  };

  const loadBalance = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const result = await coinServerApi.getBalance();
      setBalance(result.coins);

      // Cache balance locally so screen can be drawn quickly next time
      try { await AsyncStorage.setItem(CACHED_BALANCE_KEY, String(result.coins)); } catch (e) { }
    } catch (error) {
      console.error('Load balance error:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const result = await coinServerApi.getTransactions(20);
      setTransactions(result.transactions);
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([loadBalance(false), loadTransactions()]).then(() => setRefreshing(false));
  }, []);

  const getTransactionDetails = (tx: Transaction) => {
    const { type, metadata, amount } = tx;

    if (type === 'reward') {
      return {
        title: t('wallet.watch_ad'),
        description: t('wallet.watch_ad_desc'),
        icon: 'play-circle-outline' as any,
        color: '#4CAF50'
      };
    }

    if (type === 'topup') {
      if (metadata?.type === 'gift_redeem') {
        return {
          title: 'Đổi quà tặng',
          description: `Nhận coin từ quà tặng`,
          icon: 'gift-outline' as any,
          color: '#4CAF50'
        };
      }
      if (metadata?.source === 'momo') {
        return {
          title: 'Nạp qua MoMo',
          description: `Giao dịch: ${metadata.orderId?.slice(-8) || 'N/A'}`,
          icon: 'wallet-outline' as any,
          color: '#4CAF50'
        };
      }
      return {
        title: t('wallet.topup'),
        description: 'Nạp tiền vào ví',
        icon: 'add-circle-outline' as any,
        color: '#4CAF50'
      };
    }

    if (type === 'spend') {
      if (metadata?.type === 'shop_purchase') {
        return {
          title: t('store.title'),
          description: `${metadata.itemName || 'Vật phẩm'}`,
          icon: 'cart-outline' as any,
          color: '#F44336'
        };
      }
      if (metadata?.type === 'gift') {
        return {
          title: 'Tặng quà',
          description: `Tặng quà cho bạn bè`,
          icon: 'heart-outline' as any,
          color: '#F44336'
        };
      }
      return {
        title: t('wallet.spend'),
        description: metadata?.purpose || 'Sử dụng dịch vụ',
        icon: 'remove-circle-outline' as any,
        color: '#F44336'
      };
    }

    return {
      title: type.charAt(0).toUpperCase() + type.slice(1),
      description: 'Giao dịch coin',
      icon: (amount > 0 ? "arrow-down-circle-outline" : "arrow-up-circle-outline") as any,
      color: amount > 0 ? '#4CAF50' : '#F44336'
    };
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitle}>
            <Ionicons name="wallet" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitleText}>{t('wallet.title')}</Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBalance}>
          <Text style={styles.headerBalanceLabel}>{t('wallet.balance')}</Text>
          <View style={styles.headerBalanceAmount}>
            <Ionicons name="diamond" size={20} color="#ffd700" style={{ marginRight: 6 }} />
            <Text style={styles.headerBalanceValue}>{balance.toLocaleString()}</Text>
            <Text style={styles.headerBalanceCoin}> Coin</Text>

            {/* Inline loader for initial load so whole screen doesn't block */}
            {initialLoading && (
              <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <View style={styles.statText}>
              <Text style={styles.statLabel}>{t('wallet.earned')}</Text>
              <Text style={styles.statValue}>
                {transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trending-down" size={24} color="#F44336" />
            <View style={styles.statText}>
              <Text style={styles.statLabel}>{t('wallet.spent')}</Text>
              <Text style={styles.statValue}>
                {Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* MoMo Coin Purchase Section */}
        <CoinPurchaseSection onPurchaseSuccess={() => loadBalance(true)} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('wallet.free_coins')}</Text>
          <View style={styles.adCard}>
            <View style={styles.adInfo}>
              <Ionicons name="play-circle" size={40} color="#4CAF50" />
              <View style={styles.adTextContainer}>
                <Text style={styles.adTitle}>{t('wallet.watch_ad')}</Text>
                <Text style={styles.adSubtitle}>{t('wallet.watch_ad_desc')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.watchBtn, (!rewardAdLoaded && !__DEV__) && styles.disabledBtn]}
              onPress={() => showAd('reward')}
              disabled={loading}
            >
              <Text style={styles.watchBtnText}>
                {rewardAdLoaded || __DEV__ ? t('wallet.watch_now') : t('common.loading')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.adCard, { marginTop: 12 }]}>
            <View style={styles.adInfo}>
              <Ionicons name="gift" size={40} color="#9C27B0" />
              <View style={styles.adTextContainer}>
                <Text style={styles.adTitle}>{t('wallet.lucky_gift')}</Text>
                <Text style={styles.adSubtitle}>{t('wallet.lucky_gift_desc')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.watchBtn, { backgroundColor: '#9C27B0' }, (!giftAdLoaded && !__DEV__) && styles.disabledBtn]}
              onPress={() => showAd('gift')}
              disabled={loading}
            >
              <Text style={styles.watchBtnText}>
                {giftAdLoaded || __DEV__ ? t('wallet.open_gift') : t('common.loading')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('wallet.history')}</Text>
          <View style={styles.transactionList}>
            {initialLoading ? (
              <View style={styles.loadingList}>
                <ActivityIndicator size="small" color="#555" />
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{t('wallet.no_transactions')}</Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const details = getTransactionDetails(tx);
                return (
                  <View key={tx.id} style={styles.txItem}>
                    <View style={[styles.txIcon, { backgroundColor: details.color + '15' }]}>
                      <Ionicons
                        name={details.icon}
                        size={22}
                        color={details.color}
                      />
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={styles.txType}>{details.title}</Text>
                      <Text style={styles.txDescription} numberOfLines={1}>{details.description}</Text>
                      <Text style={styles.txDate}>
                        {tx.createdAt ? new Date(tx.createdAt as any).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}
                      </Text>
                    </View>
                    <View style={styles.txAmountContainer}>
                      <Text style={[styles.txAmount, { color: tx.amount > 0 ? "#4CAF50" : "#F44336" }]}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </Text>
                      <Text style={styles.txCurrency}>coin</Text>
                    </View>
                  </View>
                );
              })
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
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  // Header Styles
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerTitleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerBalance: {
    alignItems: 'center',
    paddingTop: 8,
  },
  headerBalanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginBottom: 6,
  },
  headerBalanceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBalanceValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerBalanceCoin: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  // Stats Card Styles
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    marginLeft: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  adCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adTextContainer: {
    marginLeft: 12,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  adSubtitle: {
    fontSize: 13,
    color: '#757575',
  },
  watchBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  disabledBtn: {
    backgroundColor: '#E0E0E0',
  },
  watchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  transactionList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flex: 1,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  txDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  txDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  txCurrency: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  loadingList: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});