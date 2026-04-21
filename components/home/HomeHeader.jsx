import React, { memo, useMemo } from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import { LinearGradient } from 'expo-linear-gradient';

const HeaderParticles = memo(() => {
  const particleStyles = useMemo(
    () =>
      [...Array(6)].map((_, i) => ({
        left: `${18 + i * 14}%`,
        top: `${28 + (i % 2) * 38}%`,
        opacity: 0.25 + i * 0.1,
      })),
    []
  );

  return (
    <View style={styles.particlesContainer} pointerEvents="none">
      {particleStyles.map((style, index) => (
        <View key={index} style={[styles.particle, style]} />
      ))}
    </View>
  );
});

import { useTheme } from '@/context/ThemeContext';

const HomeHeader = ({
  activeFiltersCount = 0,
  onOpenFilter,
  onOpenSettings,
  onOpenRadar,
}) => {
  const { palette, isDark } = useTheme();
  
  const iconColor = isDark ? '#FFF' : '#111';
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={palette.appGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <HeaderParticles />

        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.circleButton} onPress={onOpenFilter} activeOpacity={0.86}>
            <MaterialIcons name="tune" size={22} color={iconColor} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={[styles.appTitle, { color: palette.textColor }]}>ChapAt</Text>
            <Text style={[styles.appSubtitle, { color: palette.textColor, opacity: 0.8 }]}>Discover people around you</Text>
          </View>

          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.circleButton} onPress={onOpenSettings} activeOpacity={0.86}>
              <MaterialIcons name="menu" size={22} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={onOpenRadar}
              activeOpacity={0.86}
            >
              <Entypo name="rss" size={19} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 6,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 24),
    paddingBottom: 13,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: '#001A13',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
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
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5A6F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#F2FFF9',
    letterSpacing: 0.7,
  },
  appSubtitle: {
    fontSize: 12,
    color: 'rgba(242,255,249,0.85)',
    marginTop: -1,
  },
});

export default HomeHeader;
