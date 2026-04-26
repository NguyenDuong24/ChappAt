import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { getLiquidPalette } from '@/components/liquid';

// Memoized particles component
const HeaderParticles = memo(() => {
  // Pre-compute particle styles to avoid recalculation on re-render
  const particleStyles = useMemo(() =>
    [...Array(6)].map((_, i) => ({
      left: `${20 + i * 15}%`,
      top: `${30 + (i % 2) * 40}%`,
      opacity: 0.3 + (i * 0.1),
    })),
    []);

  return (
    <View style={styles.particlesContainer}>
      {particleStyles.map((style, i) => (
        <View key={i} style={[styles.particle, style]} />
      ))}
    </View>
  );
});

const ChatListHeader = ({
  onOpenSearchDrawer,
  onOpenAddFriendDrawer,
}) => {
  const { theme, isDark, palette } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const liquidPalette = useMemo(() => getLiquidPalette(theme), [theme]);
  const iconColor = palette.textColor;
  const buttonBg = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.72)';
  const buttonBorder = palette.menuBorder;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={liquidPalette.appGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <HeaderParticles />

        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <View style={[styles.iconContainer, { backgroundColor: buttonBg, borderColor: buttonBorder }]}>
              <MaterialCommunityIcons name="chat-processing" size={26} color="#8B5CF6" />
            </View>
            <View style={styles.titleSection}>
              <Text style={[styles.title, { color: iconColor }]}>{t('chat.title')}</Text>
              <Text style={[styles.subtitle, { color: liquidPalette.subtitleColor }]}>{t('chat.list_header_subtitle')}</Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: buttonBg, borderColor: buttonBorder }]}
              onPress={() => {
                if (onOpenSearchDrawer) {
                  onOpenSearchDrawer();
                  return;
                }
                router.push('/SearchMessageScreen');
              }}
            >
              <MaterialIcons name="search" size={24} color="#0EA5E9" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { marginLeft: 12, backgroundColor: buttonBg, borderColor: buttonBorder }]}
              onPress={() => {
                if (onOpenAddFriendDrawer) {
                  onOpenAddFriendDrawer();
                  return;
                }
                router.push('/AddFriend');
              }}
            >
              <Ionicons name="person-add" size={22} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    elevation: 5,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24),
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 10,
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    position: 'relative',
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

export default ChatListHeader;
