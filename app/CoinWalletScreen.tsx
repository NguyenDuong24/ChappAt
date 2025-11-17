import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { coinServerApi, getErrorMessage } from '../src/services/coinServerApi';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  createdAt?: Date | string;
  metadata?: any;
}

/**
 * Ví dụ component để quản lý coin
 * Tích hợp vào app của bạn
 */
export default function CoinWalletScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, []);

  const loadBalance = async () => {
    try {
      setLoading(true);
      const result = await coinServerApi.getBalance();
      setBalance(result.coins);
    } catch (error) {
      Alert.alert('Lỗi', getErrorMessage(error as any));
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const result = await coinServerApi.getTransactions(20);
      setTransactions(result.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const handleTopup = async () => {
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

              const result = await coinServerApi.topup(numAmount, {
                source: 'manual_topup'
              });

              setBalance(result.newBalance);
              Alert.alert('Thành công', `Đã nạp ${numAmount} coin!`);
              loadTransactions();
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

              const result = await coinServerApi.spend(numAmount, {
                purpose: 'test_spend'
              });

              setBalance(result.newBalance);
              Alert.alert('Thành công', `Đã tiêu ${numAmount} coin!`);
              loadTransactions();
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

  const handleReward = async () => {
    Alert.alert(
      'Xem quảng cáo',
      'Bạn có muốn xem quảng cáo để nhận 10 coin miễn phí?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xem',
          onPress: async () => {
            try {
              setLoading(true);
              // Simulate ad watching (in real app, integrate AdMob or similar)
              Alert.alert('Đang tải quảng cáo...', 'Vui lòng chờ...');
              
              // Call reward API
              const result = await coinServerApi.reward('ad_' + Date.now(), {
                source: 'rewarded_ad'
              });

              setBalance(result.newBalance);
              Alert.alert('Thành công', `Đã nhận ${result.amount} coin từ quảng cáo!`);
              loadTransactions();
            } catch (error) {
              Alert.alert('Lỗi', getErrorMessage(error as any));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBalance(), loadTransactions()]);
    setRefreshing(false);
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'topup': return '➕ Nạp';
      case 'spend': return '💸 Tiêu';
      case 'purchase': return '🛍️ Mua';
      case 'redeem': return '🎁 Đổi quà';
      case 'reward': return '📺 Quảng cáo';
      default: return type;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#FFD700" />
        ) : (
          <Text style={styles.balanceAmount}>🥖 {balance.toLocaleString()}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.topupButton]} 
          onPress={handleTopup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>➕ Nạp Coin</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.spendButton]} 
          onPress={handleSpend}
          disabled={loading}
        >
          <Text style={styles.buttonText}>💸 Tiêu Coin</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.refreshButton]} 
        onPress={handleRefresh}
        disabled={refreshing}
      >
        <Text style={styles.buttonText}>
          {refreshing ? '⏳ Đang tải...' : '🔄 Làm mới'}
        </Text>
      </TouchableOpacity>

      {/* Transaction History */}
      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionType}>
                  {getTransactionTypeText(tx.type)}
                </Text>
                <Text style={styles.transactionDate}>
                  {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : 'N/A'}
                </Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                tx.amount > 0 ? styles.positiveAmount : styles.negativeAmount
              ]}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </Text>
            </View>
          ))
        }
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.rewardButton]} 
        onPress={handleReward}
        disabled={loading}
      >
        <Text style={styles.buttonText}>📺 Xem QC nhận 10 coin</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.refreshButton]} 
        onPress={handleRefresh}
        disabled={refreshing}
      >
        <Text style={styles.buttonText}>
          {refreshing ? '⏳ Đang tải...' : '🔄 Làm mới'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topupButton: {
    backgroundColor: '#4CAF50',
  },
  spendButton: {
    backgroundColor: '#FF9800',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 16,
    marginTop: 12,
  },
  rewardButton: {
    backgroundColor: '#FF5722',
    marginHorizontal: 16,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#F44336',
  },
});
