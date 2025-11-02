import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ThemeColors = {
  text: string;
  subtleText: string;
  surface: string;
  border: string;
  cardBackground?: string;
  tint?: string;
};

export interface GiftPayload {
  id: string;
  name: string;
  price: number;
  icon?: string;
}

interface GiftMessageProps {
  gift: GiftPayload;
  senderName?: string;
  isCurrentUser: boolean;
  themeColors: ThemeColors;
}

export default function GiftMessage({ gift, senderName, isCurrentUser, themeColors }: GiftMessageProps) {
  if (!gift) return null;
  const note = isCurrentUser
    ? `Bạn đã tặng quà`
    : `${senderName || 'Người dùng'} đã tặng bạn một món quà`;

  return (
    <View style={[
      styles.card,
      { backgroundColor: themeColors.surface, borderColor: themeColors.border }
    ]}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{gift.icon || '🎁'}</Text>
        <View style={styles.info}>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
            {gift.name}
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.subtleText }]} numberOfLines={1}>
            {note}
          </Text>
        </View>
        <View style={[styles.pricePill, { borderColor: themeColors.border }]}> 
          <Text style={styles.priceText}>🥖 {gift.price}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 34,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  pricePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
