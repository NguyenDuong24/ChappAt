import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Animated, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export const options = { headerShown: false };

export default function PaymentSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { amount, bonus, orderId, transactionId, provider } = useLocalSearchParams<{
    amount?: string;
    bonus?: string;
    orderId?: string;
    transactionId?: string;
    packageId?: string;
    provider?: string;
  }>();

  const isIAP = provider === 'google_play' || provider === 'apple_iap';
  const txId = transactionId || orderId || '';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(screens)/wallet/CoinWalletScreen');
      return true;
    });
    return () => backHandler.remove();
  }, [opacityAnim, router, scaleAnim]);

  const totalCoins = useMemo(() => {
    return (parseInt(amount || '0', 10) + parseInt(bonus || '0', 10)).toLocaleString();
  }, [amount, bonus]);

  const localTransaction = useMemo(() => ({
    id: `local_${txId || Date.now()}`,
    type: 'topup',
    amount: parseInt(amount || '0', 10) + parseInt(bonus || '0', 10),
    currencyType: 'coins',
    createdAt: new Date().toISOString(),
    metadata: {
      orderId: orderId || '',
      transactionId: transactionId || '',
      source: provider || (orderId ? 'vietqr' : 'google_play'),
    },
  }), [amount, bonus, orderId, transactionId, provider]);

  return (
    <LinearGradient colors={['#F5F7FA', '#E8F5E9']} style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={96} color="#4CAF50" />
          </View>
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: opacityAnim }]}>{t('wallet.payment_success')}</Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: opacityAnim }]}>{t('wallet.payment_success_desc')}</Animated.Text>

        <Animated.View style={[styles.receiptCard, { opacity: opacityAnim }]}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>{t('wallet.coins_added')}</Text>
            <Text style={styles.receiptValueBonus}>+{totalCoins}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>{t('wallet.order_id')}</Text>
            <Text style={styles.receiptValue}>{orderId || 'N/A'}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.buttonContainer, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => router.replace({
              pathname: '/(screens)/wallet/TransactionDetailScreen',
              params: { txId: orderId, transaction: JSON.stringify(localTransaction), fromSuccess: 'true' }
            })}
          >
            <Text style={styles.detailBtnText}>{t('wallet.view_details')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(screens)/wallet/CoinWalletScreen')}>
            <LinearGradient colors={['#4CAF50', '#2E7D32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.doneBtnGradient}>
              <Text style={styles.doneBtnText}>{t('common.done')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingTop: Platform.OS === 'ios' ? 64 : 42 },
  iconContainer: { marginBottom: 20 },
  iconCircle: { width: 136, height: 136, borderRadius: 68, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#2E7D32', textAlign: 'center', marginBottom: 30, paddingHorizontal: 20, lineHeight: 22 },
  receiptCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10,  marginBottom: 28 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  receiptLabel: { fontSize: 14, color: '#666' },
  receiptValue: { fontSize: 14, fontWeight: '700', color: '#222' },
  receiptValueBonus: { fontSize: 20, fontWeight: '800', color: '#43A047' },
  divider: { height: 1, backgroundColor: '#F0F0F0', width: '100%' },
  buttonContainer: { width: '100%', gap: 14 },
  doneBtn: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  doneBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  detailBtn: { width: '100%', paddingVertical: 15, alignItems: 'center', borderRadius: 12, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9' },
  detailBtnText: { color: '#2E7D32', fontSize: 16, fontWeight: '700' },
});
