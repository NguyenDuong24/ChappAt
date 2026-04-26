import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { GiftItem } from '@/services/giftService';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

interface GiftPickerProps {
  visible: boolean;
  onClose: () => void;
  onSend: (giftId: string) => void;
  gifts: GiftItem[];
  coins: number;
  banhMi: number;
  themeColors: any;
  loading?: boolean;
}

const getGiftsCategories = (t: any) => [
  { id: 'all', name: t('gift_picker.categories.all'), icon: 'apps' },
  { id: 'popular', name: t('gift_picker.categories.popular'), icon: 'trending-up' },
  { id: 'love', name: t('gift_picker.categories.love'), icon: 'favorite' },
  { id: 'funny', name: t('gift_picker.categories.funny'), icon: 'mood' },
  { id: 'luxury', name: t('gift_picker.categories.luxury'), icon: 'diamond' },
  { id: 'special', name: t('gift_picker.categories.special'), icon: 'stars' },
];

export default function GiftPicker({
  visible,
  onClose,
  onSend,
  gifts,
  coins,
  banhMi,
  themeColors,
  loading = false,
}: GiftPickerProps) {
  const { t } = useTranslation();
  const CATEGORIES = useMemo(() => getGiftsCategories(t), [t]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));
  const isDark = Boolean(themeColors?.isDark);

  const ui = useMemo(() => {
    const primary = themeColors?.primary || themeColors?.tint || '#4F46E5';
    const secondary = themeColors?.secondary || primary;
    const border = themeColors?.border || (isDark ? '#26354D' : '#D9E2F0');
    const text = themeColors?.text || (isDark ? '#F8FAFC' : '#0F172A');
    const subtle = themeColors?.subtleText || (isDark ? '#9FB1C9' : '#5B6B84');
    const sheetBg = themeColors?.palette?.menuBackground || (isDark ? '#0B1220' : '#FFFFFF');
    const surface = themeColors?.inputBackground || (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.80)');
    const surfaceElevated = themeColors?.surfaceElevated || themeColors?.softPrimary || (isDark ? '#17243A' : '#EEF2FF');
    const footerBg = themeColors?.surface || (isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9');
    if (isDark) {
      return {
        sheetBg,
        surface,
        surfaceElevated,
        border,
        text,
        subtle,
        primary,
        secondary,
        primarySoft: themeColors?.softPrimary || `${primary}22`,
        footerBg,
      };
    }
    return {
      sheetBg,
      surface,
      surfaceElevated,
      border,
      text,
      subtle,
      primary,
      secondary,
      primarySoft: themeColors?.softPrimary || `${primary}16`,
      footerBg,
    };
  }, [isDark, themeColors]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [fadeAnim, slideAnim, visible]);

  const filteredGifts = useMemo(() => {
    if (selectedCategory === 'all') return gifts;

    return gifts.filter((gift) => {
      const name = (gift.name || '').toLowerCase();
      if (selectedCategory === 'special') return gift.currencyType === 'coins';
      if (selectedCategory === 'love') return name.includes('tim') || name.includes('hoa') || name.includes('love');
      if (selectedCategory === 'funny') return name.includes('hai') || name.includes('vui');
      if (selectedCategory === 'luxury') return gift.price >= 500 || name.includes('kim cuong');
      if (selectedCategory === 'popular') return gift.price < 100;
      return true;
    });
  }, [gifts, selectedCategory]);

  if (!visible && (fadeAnim as any)._value === 0) return null;

  const selectedGift = gifts.find((g) => g.id === selectedGiftId) || null;
  const canAfford = selectedGift
    ? selectedGift.currencyType === 'coins'
      ? coins >= selectedGift.price
      : banhMi >= selectedGift.price
    : false;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim, backgroundColor: themeColors?.backdrop || 'rgba(0,0,0,0.42)' }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: ui.sheetBg,
            borderTopColor: ui.border,
          },
        ]}
      >
        <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={styles.sheetBody}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: ui.text }]}>{t('gift_picker.title')}</Text>
              <Text style={[styles.subtitle, { color: ui.subtle }]}>{t('gift_picker.subtitle')}</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: ui.surface, borderColor: ui.border }]} onPress={onClose}>
              <MaterialIcons name="close" size={22} color={ui.subtle} />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceRow}>
            <View style={[styles.balancePill, { backgroundColor: ui.surfaceElevated, borderColor: ui.border }]}> 
              <MaterialCommunityIcons name="bread-slice" size={15} color="#F59E0B" />
              <Text style={[styles.balanceText, { color: ui.text }]}>{banhMi}</Text>
            </View>
            <View style={[styles.balancePill, { backgroundColor: ui.surfaceElevated, borderColor: ui.border }]}> 
              <MaterialCommunityIcons name="database" size={15} color="#FACC15" />
              <Text style={[styles.balanceText, { color: ui.text }]}>{coins}</Text>
            </View>
          </View>

          <View style={styles.categoryWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isActive ? ui.primarySoft : ui.surface,
                        borderColor: isActive ? ui.primary : ui.border,
                      },
                    ]}
                  >
                    <MaterialIcons name={cat.icon as any} size={16} color={isActive ? ui.primary : ui.subtle} />
                    <Text style={[styles.categoryText, { color: isActive ? ui.primary : ui.subtle }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={ui.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.grid}>
              {filteredGifts.length === 0 ? (
                <View style={styles.centerBox}>
                  <MaterialIcons name="sentiment-dissatisfied" size={46} color={ui.subtle} />
                  <Text style={[styles.emptyText, { color: ui.subtle }]}>{t('gift_picker.empty')}</Text>
                </View>
              ) : (
                filteredGifts.map((gift) => {
                  const isSelected = selectedGiftId === gift.id;
                  return (
                    <TouchableOpacity
                      key={gift.id}
                      onPress={() => setSelectedGiftId((prev) => (prev === gift.id ? null : gift.id))}
                      style={[
                        styles.giftCard,
                        {
                          backgroundColor: ui.surface,
                          borderColor: isSelected ? ui.primary : ui.border,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={isSelected ? [ui.primarySoft, ui.surfaceElevated] : [ui.surface, ui.surface]}
                        style={styles.giftGradient}
                      >
                        {gift.icon ? (
                          <Text style={styles.giftEmoji}>{gift.icon}</Text>
                        ) : (
                          <MaterialCommunityIcons name="gift-outline" size={30} color={ui.primary} />
                        )}
                        <Text style={[styles.giftName, { color: ui.text }]} numberOfLines={1}>{gift.name}</Text>
                        <View style={styles.priceRow}>
                          {gift.currencyType === 'coins' ? (
                            <MaterialCommunityIcons name="database" size={12} color="#FACC15" />
                          ) : (
                            <MaterialCommunityIcons name="bread-slice" size={12} color="#F59E0B" />
                          )}
                          <Text style={[styles.priceText, { color: ui.text }]}>{gift.price}</Text>
                        </View>
                      </LinearGradient>

                      {isSelected ? (
                        <View style={[styles.checkDot, { backgroundColor: ui.primary }]}>
                          <MaterialIcons name="check" size={12} color="#fff" />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          <View style={[styles.footer, { borderTopColor: ui.border, backgroundColor: ui.footerBg }]}> 
            {selectedGift ? (
              <Text style={[styles.selectionText, { color: ui.subtle }]} numberOfLines={1}>
                {t('gift_picker.selected', { name: selectedGift.name, price: selectedGift.price, type: selectedGift.currencyType === 'coins' ? t('wallet.coins') : t('wallet.banhMi') })}
              </Text>
            ) : (
              <Text style={[styles.selectionText, { color: ui.subtle }]}>{t('gift_picker.select_prompt')}</Text>
            )}

            <TouchableOpacity
              disabled={!selectedGift || !canAfford}
              onPress={() => selectedGift && onSend(selectedGift.id)}
              style={styles.sendBtn}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={selectedGift && canAfford ? [ui.primary, ui.secondary] : ['#94A3B8', '#64748B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendBtnGradient}
              >
                <MaterialCommunityIcons name="gift-outline" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>{canAfford ? t('gift_picker.send_now') : t('gift_picker.insufficient')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.72,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -8 },
  },
  sheetBody: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(148,163,184,0.6)',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  balancePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryWrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 140,
  },
  giftCard: {
    width: (width - 44) / 2,
    margin: 5,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  giftGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  giftEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  giftName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
  },
  checkDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  centerBox: {
    width: width,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: 'rgba(2,6,23,0.08)',
  },
  selectionText: {
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  sendBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendBtnGradient: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
