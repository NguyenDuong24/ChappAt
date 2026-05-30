import React, { memo, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

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
  currencyType?: 'coins' | 'banhMi';
  icon?: string;
}

interface GiftMessageProps {
  gift: GiftPayload;
  senderName?: string;
  isCurrentUser: boolean;
  themeColors: ThemeColors;
}

function GiftMessage({ gift, senderName, isCurrentUser, themeColors }: GiftMessageProps) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const emojiRotate = useRef(new Animated.Value(0)).current;
  const emojiBounce = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(-100)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const cardRotate = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(cardRotate, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.spring(emojiScale, {
          toValue: 1,
          tension: 55,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(emojiRotate, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    loops.push(Animated.loop(
      Animated.sequence([
        Animated.timing(emojiBounce, {
          toValue: -5,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(emojiBounce, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ));

    loops.push(Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 400,
          duration: 2600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.delay(1800),
      ])
    ));

    loops.push(Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ));

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [cardRotate, emojiBounce, emojiRotate, emojiScale, fadeAnim, glowAnim, scaleAnim, shineAnim]);
  const rarity = useMemo(() => gift ? getRarity(gift.price) : 'common', [gift?.price]);

  // Determine rarity level based on price
  const getRarity = (price: number) => {
    if (price >= 2000) return 'legendary';
    if (price >= 500) return 'epic';
    if (price >= 100) return 'rare';
    return 'common';
  };



  const getRarityStyles = (level: string) => {
    switch (level) {
      case 'legendary':
        return {
          colors: ['#FF0080', '#7928CA', '#0070F3'] as const,
          glow: ['rgba(255, 0, 128, 0.5)', 'rgba(121, 40, 202, 0.5)', 'rgba(0, 112, 243, 0.5)'] as const,
          priceColors: ['#000000', '#333333'] as const,
          particle: 'ðŸ’Ž',
          shadow: '#7928CA'
        };
      case 'epic':
        return {
          colors: ['#FFD700', '#FFA500', '#FF8C00'] as const,
          glow: ['rgba(255, 215, 0, 0.5)', 'rgba(255, 165, 0, 0.5)', 'rgba(255, 140, 0, 0.5)'] as const,
          priceColors: ['#FFD700', '#FFA500'] as const,
          particle: 'ðŸŒŸ',
          shadow: '#FFA500'
        };
      case 'rare':
        return {
          colors: ['#00D2FF', '#3A7BD5', '#00D2FF'] as const,
          glow: ['rgba(0, 210, 255, 0.5)', 'rgba(58, 123, 213, 0.5)', 'rgba(0, 210, 255, 0.5)'] as const,
          priceColors: ['#00D2FF', '#3A7BD5'] as const,
          particle: 'ðŸ’§',
          shadow: '#3A7BD5'
        };
      default:
        return {
          colors: ['#FFE6F0', '#FFF5FA', '#FFE6F0'] as const,
          glow: ['rgba(255, 105, 180, 0.3)', 'rgba(255, 182, 193, 0.3)', 'rgba(255, 105, 180, 0.3)'] as const,
          priceColors: ['#FF69B4', '#FFB6C1'] as const,
          particle: 'âœ¨',
          shadow: '#FF69B4'
        };
    }
  };

  const rarityStyle = getRarityStyles(rarity);

  const note = isCurrentUser
    ? t('chat.gift_note_self')
    : t('chat.gift_note_other', { senderName: senderName || t('chat.unknown_user') });

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1.4, 0.6],
  });

  const emojiRotateValue = emojiRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const cardRotateValue = cardRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '0deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3],
  });

  const particle1Y = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const particle2Y = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -40],
  });

  const particle3Y = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -35],
  });

  const particleOpacity = particleAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [1, 1, 0.5, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }, { rotate: cardRotateValue }],
      }}
    >
      {/* Outer glow */}
      <Animated.View style={[styles.outerGlow, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={rarityStyle.glow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>

      <LinearGradient
        colors={rarityStyle.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { shadowColor: rarityStyle.shadow }]}
      >
        {/* Animated background particles */}
        <Animated.Text
          style={[
            styles.particle,
            { left: 30, opacity: particleOpacity, transform: [{ translateY: particle1Y }] },
          ]}
        >
          {rarityStyle.particle}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.particle,
            { right: 40, opacity: particleOpacity, transform: [{ translateY: particle2Y }] },
          ]}
        >
          {rarityStyle.particle}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.particle,
            { left: '50%', opacity: particleOpacity, transform: [{ translateY: particle3Y }] },
          ]}
        >
          {rarityStyle.particle}
        </Animated.Text>

        {/* Shine overlay */}
        <Animated.View
          style={[
            styles.shineOverlay,
            { transform: [{ translateX: shineAnim }] },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shine}
          />
        </Animated.View>

        {/* Enhanced sparkles */}
        <Animated.Text
          style={[
            styles.sparkle,
            styles.sparkle1,
            {
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }, { rotate: '15deg' }],
            },
          ]}
        >
          âœ¨
        </Animated.Text>
        <Animated.Text
          style={[
            styles.sparkle,
            styles.sparkle2,
            {
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }, { rotate: '-15deg' }],
            },
          ]}
        >
          ðŸ’«
        </Animated.Text>
        <Animated.Text
          style={[
            styles.sparkle,
            styles.sparkle3,
            {
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }],
            },
          ]}
        >
          â­
        </Animated.Text>
        <Animated.Text
          style={[
            styles.sparkle,
            styles.sparkle4,
            {
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }],
            },
          ]}
        >
          âœ¨
        </Animated.Text>

        <View style={styles.row}>
          {/* Animated emoji with glow */}
          <View style={styles.emojiContainer}>
            <Animated.View style={[styles.emojiGlow, { opacity: glowOpacity, backgroundColor: rarityStyle.glow[0] }]} />
            <Animated.Text
              style={[
                styles.emoji,
                {
                  transform: [
                    { scale: emojiScale },
                    { translateY: emojiBounce },
                    { rotate: emojiRotateValue },
                  ],
                },
              ]}
            >
              {gift.icon || 'ðŸŽ'}
            </Animated.Text>
          </View>

          <View style={styles.info}>
            <Text style={[styles.title, { color: rarity === 'common' ? themeColors.text : '#FFFFFF' }]} numberOfLines={1}>
              {gift.name}
            </Text>
            <Text style={[styles.subtitle, { color: rarity === 'common' ? themeColors.subtleText : 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
              {note}
            </Text>
          </View>

          {/* Enhanced price badge */}
          <View style={styles.priceBadge}>
            <Animated.View style={[styles.priceGlow, { opacity: glowOpacity }]} />
            <LinearGradient
              colors={rarityStyle.priceColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.priceGradient}
            >
              <Text style={[styles.priceText, { color: '#FFFFFF' }]}>
                {gift.currencyType === 'coins' ? 'ðŸ’Ž' : 'ðŸ¥–'} {gift.price}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 21,
    zIndex: -1,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 21,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  particle: {
    position: 'absolute',
    fontSize: 16,
    top: 20,
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    left: -50,
    width: 80,
    height: '100%',
    zIndex: 10,
  },
  shine: {
    flex: 1,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 18,
    zIndex: 5,
  },
  sparkle1: {
    top: 8,
    right: 12,
  },
  sparkle2: {
    bottom: 8,
    left: 12,
  },
  sparkle3: {
    top: 8,
    left: '45%',
  },
  sparkle4: {
    bottom: 8,
    right: '40%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    position: 'relative',
    marginRight: 16,
  },
  emojiGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 40,
    zIndex: -1,
  },
  emoji: {
    fontSize: 56,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  priceBadge: {
    position: 'relative',
    borderRadius: 22,
    overflow: 'hidden',
  },
  priceGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: 'rgba(255, 215, 0, 0.4)',
    borderRadius: 26,
    zIndex: -1,
  },
  priceGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
export default memo(GiftMessage);


