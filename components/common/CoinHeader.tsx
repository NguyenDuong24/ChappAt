import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function CoinHeaderRight() {
  const router = useRouter();
  const { coins } = useAuth();
  const theme = useContext(ThemeContext)?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.push('/(screens)/wallet/CoinWalletScreen')}
        style={styles.balanceContainer}
        activeOpacity={0.7}
      >
        <Text style={[styles.balanceText, { color: currentThemeColors.text }]}>🥖 {Number(coins || 0).toLocaleString()}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/gifts/Inbox')}
        style={styles.iconButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="card-giftcard" size={20} color={currentThemeColors.tint || '#667eea'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  balanceContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  balanceText: {
    fontWeight: '700',
    fontSize: 14,
  },
  iconButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
