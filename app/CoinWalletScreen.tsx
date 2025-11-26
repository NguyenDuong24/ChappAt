import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Platform, RefreshControl, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { coinServerApi, getErrorMessage } from '../src/services/coinServerApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHandler } from 'react-native';

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
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from: string }>();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // AdMob Refs & State
  const adMobModuleRef = useRef<any>(null);
  const rewardAdRef = useRef<any>(null);
  const giftAdRef = useRef<any>(null);

  const [rewardAdLoaded, setRewardAdLoaded] = useState(false);
  const [giftAdLoaded, setGiftAdLoaded] = useState(false);

  const isShowingAdRef = useRef(false);
  const claimedRewardRef = useRef<{ reward: boolean; gift: boolean }>({ reward: false, gift: false });
  const pendingAdIdRef = useRef<string>('');
  const isMountedRef = useRef(true);
  const adMobAvailableRef = useRef(false);

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

    // Defer heavy Module initialization to after first render frame
    InteractionManager.runAfterInteractions(() => {
      initializeAds();
    });

    return () => {
      isMountedRef.current = false;
      // Cleanup logic if needed
    };
  }, []);

  const initializeAds = async () => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      console.log('AdMob not supported on this platform');
      return;
    }

    try {
      // Dynamic require to avoid bundling issues on web/dev-client without native code
      let AdMobRaw: any;
      try {
        AdMobRaw = require('react-native-google-mobile-ads');
      } catch (e) {
        console.warn('react-native-google-mobile-ads not installed or linked');
        return;
      }

      const AdMobModule = AdMobRaw?.default || AdMobRaw;
      const { MobileAds, RewardedAd, RewardedAdEventType, AdEventType, TestIds } = AdMobModule || {};

      if (!MobileAds || !RewardedAd) {
        console.warn('AdMob module missing required exports');
        return;
      }

      adMobModuleRef.current = AdMobModule;

      // Initialize SDK
      await MobileAds().initialize();
      adMobAvailableRef.current = true;

      const adUnitId = (__DEV__ && TestIds?.REWARDED) ? TestIds.REWARDED : PROD_REWARDED_AD_UNIT_ID;

      // --- Setup Reward Ad ---
      const createRewardAd = () => {
        const ad = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });

        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (isMountedRef.current) setRewardAdLoaded(true);
        });

        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
          handleAdEarned('reward');
        });

        ad.addAdEventListener(AdEventType.CLOSED, () => {
          if (isMountedRef.current) {
            setRewardAdLoaded(false);
            isShowingAdRef.current = false;
          }
          // Reload
          ad.load();
        });

        ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
          console.warn('Reward Ad Error:', error);
          if (isMountedRef.current) setRewardAdLoaded(false);
        });

        ad.load();
        return ad;
      };

      // --- Setup Gift Ad ---
      const createGiftAd = () => {
        const ad = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });

        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          if (isMountedRef.current) setGiftAdLoaded(true);
        });

        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
          handleAdEarned('gift');
        });

        ad.addAdEventListener(AdEventType.CLOSED, () => {
          if (isMountedRef.current) {
            setGiftAdLoaded(false);
            isShowingAdRef.current = false;
          }
          ad.load();
        });

        ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
          console.warn('Gift Ad Error:', error);
          if (isMountedRef.current) setGiftAdLoaded(false);
        });

        ad.load();
        return ad;
      };

      rewardAdRef.current = createRewardAd();
      giftAdRef.current = createGiftAd();

    } catch (error) {
      console.error('Failed to initialize ads:', error);
    }
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
        Alert.alert('Chúc mừng!', `Bạn đã nhận được ${result.amount} coin!`);

        // Persist balance to cache to show instantly on next open
        try {
          await AsyncStorage.setItem(CACHED_BALANCE_KEY, String(result.newBalance));
        } catch (e) { }
      } else {
        const result = await coinServerApi.rewardGift(adId, { source: 'rewarded_ad_gift' });
        Alert.alert('Chúc mừng!', result.message || 'Bạn đã nhận được quà!');
      }

      loadTransactions();

    } catch (error) {
      Alert.alert('Lỗi', getErrorMessage(error as any));
    } finally {
      setLoading(false);
      // Reset claim flag after a short delay or immediately if logic dictates
      setTimeout(() => {
        claimedRewardRef.current[type] = false;
      }, 1000);
    }
  };

  const showAd = (type: 'reward' | 'gift') => {
    if (isShowingAdRef.current) return;

    if (!adMobAvailableRef.current) {
      if (__DEV__) {
        simulateAd(type);
        return;
      }
      Alert.alert('Thông báo', 'Quảng cáo chưa sẵn sàng hoặc không được hỗ trợ.');
      return;
    }

    const adRef = type === 'reward' ? rewardAdRef.current : giftAdRef.current;
    const isLoaded = type === 'reward' ? rewardAdLoaded : giftAdLoaded;

    if (adRef && isLoaded) {
      isShowingAdRef.current = true;
      pendingAdIdRef.current = `${type}_${Date.now()}`;
      claimedRewardRef.current[type] = false;
      try {
        adRef.show();
      } catch (e) {
        console.error('Error showing ad:', e);
        isShowingAdRef.current = false;
        Alert.alert('Lỗi', 'Không thể mở quảng cáo.');
      }
    } else {
      Alert.alert('Đang tải', 'Quảng cáo đang được tải, vui lòng thử lại sau giây lát.');
      // Trigger load again just in case
      try { adRef?.load(); } catch (e) { }
    }
  };

  const simulateAd = (type: 'reward' | 'gift') => {
    Alert.alert(
      'DEV Mode',
      `Mô phỏng xem quảng cáo ${type}?`,
      [
        { text: 'Hủy', style: 'cancel' },
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

  const handleTopup = async () => {
    // ... existing topup logic ...
    Alert.prompt(
      'Nạp Coin',
      'Nhập số coin muốn nạp (1-1000):',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Nạp',
          onPress: async (amount) => {
            try {
              setLoading(true);
              const numAmount = parseInt(amount || '0');
              if (isNaN(numAmount) || numAmount < 1 || numAmount > 1000) {
                Alert.alert('Lỗi', 'Số coin phải từ 1 đến 1000');
                return;
              }
              const result = await coinServerApi.topup(numAmount, { source: 'manual_topup' });
              setBalance(result.newBalance);
              Alert.alert('Thành công', `Đã nạp ${numAmount} coin!`);
              loadTransactions();

              // Persist to cache
              try { await AsyncStorage.setItem(CACHED_BALANCE_KEY, String(result.newBalance)); } catch (e) { }
            } catch (error) {
              Alert.alert('Lỗi', getErrorMessage(error as any));
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleSpend = async () => {
    Alert.prompt(
      'Tiêu Coin',
      'Nhập số coin muốn tiêu (1-5000):',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiêu',
          onPress: async (amount) => {
            try {
              setLoading(true);
              const numAmount = parseInt(amount || '0');
              if (isNaN(numAmount) || numAmount < 1 || numAmount > 5000) {
                Alert.alert('Lỗi', 'Số coin phải từ 1 đến 5000');
                return;
              }
              if (numAmount > balance) {
                Alert.alert('Lỗi', 'Không đủ coin');
                return;
              }
              const result = await coinServerApi.spend(numAmount, { purpose: 'test_spend' });
              setBalance(result.newBalance);
              Alert.alert('Thành công', `Đã tiêu ${numAmount} coin!`);
              loadTransactions();

              // Persist to cache
              try { await AsyncStorage.setItem(CACHED_BALANCE_KEY, String(result.newBalance)); } catch (e) { }
            } catch (error) {
              Alert.alert('Lỗi', getErrorMessage(error as any));
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([loadBalance(false), loadTransactions()]).then(() => setRefreshing(false));
  }, []);

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
            <Text style={styles.headerTitleText}>Ví Coin</Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBalance}>
          <Text style={styles.headerBalanceLabel}>Số dư của bạn</Text>
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

      {/* Quick Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={24} color="#4CAF50" />
          <View style={styles.statText}>
            <Text style={styles.statLabel}>Đã kiếm</Text>
            <Text style={styles.statValue}>
              {transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="trending-down" size={24} color="#F44336" />
          <View style={styles.statText}>
            <Text style={styles.statLabel}>Đã tiêu</Text>
            <Text style={styles.statValue}>
              {Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleTopup} disabled={loading}>
          <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="wallet-outline" size={24} color="#2196F3" />
          </View>
          <Text style={styles.actionText}>Nạp Coin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleSpend} disabled={loading}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="cart-outline" size={24} color="#F44336" />
          </View>
          <Text style={styles.actionText}>Tiêu Coin</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kiếm Coin Miễn Phí</Text>
        <View style={styles.adCard}>
          <View style={styles.adInfo}>
            <Ionicons name="play-circle" size={40} color="#4CAF50" />
            <View style={styles.adTextContainer}>
              <Text style={styles.adTitle}>Xem Video Quảng Cáo</Text>
              <Text style={styles.adSubtitle}>Nhận ngay coin thưởng</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.watchBtn, (!rewardAdLoaded && !__DEV__) && styles.disabledBtn]}
            onPress={() => showAd('reward')}
            disabled={loading}
          >
            <Text style={styles.watchBtnText}>
              {rewardAdLoaded || __DEV__ ? 'Xem Ngay' : 'Đang tải...'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.adCard, { marginTop: 12 }]}>
          <View style={styles.adInfo}>
            <Ionicons name="gift" size={40} color="#9C27B0" />
            <View style={styles.adTextContainer}>
              <Text style={styles.adTitle}>Hộp Quà May Mắn</Text>
              <Text style={styles.adSubtitle}>Xem quảng cáo nhận quà</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.watchBtn, { backgroundColor: '#9C27B0' }, (!giftAdLoaded && !__DEV__) && styles.disabledBtn]}
            onPress={() => showAd('gift')}
            disabled={loading}
          >
            <Text style={styles.watchBtnText}>
              {giftAdLoaded || __DEV__ ? 'Mở Quà' : 'Đang tải...'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        <ScrollView
          style={styles.transactionList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {initialLoading ? (
            <View style={styles.loadingList}>
              <ActivityIndicator size="small" color="#555" />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.txItem}>
                <View style={styles.txIcon}>
                  <Ionicons
                    name={tx.amount > 0 ? "arrow-down-circle" : "arrow-up-circle"}
                    size={24}
                    color={tx.amount > 0 ? "#4CAF50" : "#F44336"}
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txType}>{tx.type}</Text>
                  <Text style={styles.txDate}>
                    {tx.createdAt ? new Date(tx.createdAt as any).toLocaleString('vi-VN') : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.amount > 0 ? "#4CAF50" : "#F44336" }]}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

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
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  coinText: {
    fontSize: 20,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  txDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 'bold',
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

