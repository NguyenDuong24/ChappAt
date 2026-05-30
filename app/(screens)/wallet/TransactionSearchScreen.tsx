import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { coinServerApi } from '../../../src/services/coinServerApi';

export const options = { headerShown: false };

type Transaction = { id: string; type: string; amount: number; metadata?: any; createdAt?: any; currencyType?: string };

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

export default function TransactionSearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await coinServerApi.getTransactions(100);
        if (mounted) {
          setTransactions(res.transactions);
          setFiltered(res.transactions);
        }
      } catch (err) { }
      if (mounted) setLoading(false);
    };
    load();
    setTimeout(() => inputRef.current?.focus(), 150);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!query.trim()) { setFiltered(transactions); return; }
    const lower = query.toLowerCase();
    setFiltered(transactions.filter(tx =>
      tx.id.toLowerCase().includes(lower) ||
      (tx.metadata?.orderId && String(tx.metadata.orderId).toLowerCase().includes(lower)) ||
      (tx.metadata?.purpose && String(tx.metadata.purpose).toLowerCase().includes(lower))
    ));
  }, [query, transactions]);

  const handleTxPress = useCallback((tx: Transaction) => {
    router.push({
      pathname: '/(screens)/wallet/TransactionDetailScreen',
      params: { txId: tx.id, transaction: JSON.stringify(tx) }
    });
  }, [router]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('wallet.search_transactions')}
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#999"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} activeOpacity={0.6}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#0EA5E9" size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={54} color="#D1D5DB" />
          <Text style={styles.emptyText}>{t('wallet.no_results')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.txItem} onPress={() => handleTxPress(item)} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: item.amount > 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                <Ionicons name={item.amount > 0 ? 'arrow-down' : 'arrow-up'} size={20} color={item.amount > 0 ? '#4CAF50' : '#F44336'} />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txId} numberOfLines={1}>{item.id}</Text>
                <Text style={styles.txDate}>
                  {formatTransactionDate(item.createdAt, i18n.language)}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: item.amount > 0 ? '#4CAF50' : '#F44336' }]}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </Text>
                <Text style={styles.txType}>{t(`wallet.type_${item.type}`, item.type)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: Platform.OS === 'ios' ? 52 : 24, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', zIndex: 10 },
  backBtn: { padding: 6, marginRight: 10, borderRadius: 20 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 42 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#111827', paddingVertical: 0 },
  clearBtn: { padding: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#6B7280', marginTop: 16, fontSize: 15, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  txItem: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', alignItems: 'center' },
  iconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txInfo: { flex: 1, marginRight: 10 },
  txId: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  txDate: { fontSize: 12, color: '#6B7280' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  txType: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '600' },
});

