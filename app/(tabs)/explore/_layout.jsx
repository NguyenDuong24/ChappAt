import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { router, useSegments } from 'expo-router';
import {
  Text,
  StyleSheet,
  View,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ThemeContext } from '../../../context/ThemeContext';
import { ExploreHeaderProvider, HEADER_HEIGHT, SCROLL_DISTANCE } from '../../../context/ExploreHeaderContext';
import useExploreData from '../../../hooks/useExploreData';
import NotificationBadge from '../../../components/common/NotificationBadge';
import { ExploreProvider, useExploreActions } from '../../../context/ExploreContext';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

// Import Screens
import Tab1Screen from './tab1';
import Tab2Screen from './tab2';
import Tab3Screen from './tab3';

const { width } = Dimensions.get('window');
const TAB_WIDTH = 80;
const TAB_HEIGHT = 40;
const TAB_PADDING = 4;
const TAB_GAP = 5;

const ARTISTIC_GRADIENTS = [
  ['#8E2DE2', '#4A00E0'],
  ['#FF512F', '#DD2476'],
  ['#00B4DB', '#0083B0'],
  ['#11998e', '#38ef7d'],
  ['#F093FB', '#F5576C'],
  ['#4facfe', '#00f2fe'],
  ['#fa709a', '#fee140'],
];

// 🚀 PREMIUM TACTILE BUTTON - Lightweight version
const ImpactButton = React.memo(({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(scale, { toValue: 0.95, duration: 60, useNativeDriver: true }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start();
  }, [scale]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.85}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }], flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});

const TabButton = React.memo(({ label, isActive, onPress, inactiveColor }) => {
  return (
    <ImpactButton onPress={onPress} style={styles.headerTab}>
      <Text style={[isActive ? styles.tabTextActive : styles.tabTextInactive, { color: isActive ? '#FFF' : inactiveColor }]} numberOfLines={1}>
        {label}
      </Text>
    </ImpactButton>
  );
});

const ExploreLayoutContent = React.memo(function ExploreLayoutContent() {
  const { t, i18n } = useTranslation();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState('index');
  const [mounted, setMounted] = useState({ index: true, tab2: false, tab3: false });

  useEffect(() => {
    const timer = setTimeout(() => setMounted({ index: true, tab2: true, tab3: true }), 450);
    return () => clearTimeout(timer);
  }, []);

  // ⚡️ SIMPLIFIED ANIMATIONS - Only opacity, no translateX (removes jank)
  const opacity1 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  const opacity3 = useRef(new Animated.Value(0)).current;
  const opacityRefs = useRef({ index: opacity1, tab2: opacity2, tab3: opacity3 }).current;

  const scrollY1 = useRef(new Animated.Value(0)).current;
  const scrollY2 = useRef(new Animated.Value(0)).current;
  const scrollY3 = useRef(new Animated.Value(0)).current;
  const scrollYRefs = useRef({ index: scrollY1, tab2: scrollY2, tab3: scrollY3 }).current;
  const scrollY = scrollYRefs[activeTab];

  const slidingAnim = useRef(new Animated.Value(0)).current;
  const fabSlidingAnim = useRef(new Animated.Value(0)).current;

  const { notificationCount, trendingHashtags, loading, refresh: refreshData } = useExploreData();
  const { refresh: refreshPosts } = useExploreActions();

  // No longer needed as we use individual refs
  // const scrollY = useRef(new Animated.Value(0)).current;

  const tabDefs = useMemo(() => [
    { key: 'index', label: t('social.latest') },
    { key: 'tab2', label: t('social.trending') },
    { key: 'tab3', label: t('social.follow') || 'Theo dõi' },
  ], [t]);

  const handleTabPress = useCallback((tabName) => {
    if (activeTab === tabName) {
      // Double-tap = refresh
      refreshPosts(tabName === 'index' ? 'latest' : tabName === 'tab2' ? 'trending' : 'following');
      refreshData();
      return;
    }

    const tabIndex = tabDefs.findIndex(t => t.key === tabName);
    if (tabIndex === -1) return;

    // Ensure tab is mounted immediately if selected
    if (!mounted[tabName]) {
      setMounted(prev => ({ ...prev, [tabName]: true }));
    }

    const slideTo = tabIndex * (TAB_WIDTH + TAB_GAP);

    // ⚡️ Faster Cross-Fade (120ms parallel)
    // No translateY/translateX on heavy content during transition
    Animated.parallel([
      Animated.spring(slidingAnim, {
        toValue: slideTo,
        damping: 24,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.spring(fabSlidingAnim, {
        toValue: slideTo,
        damping: 24,
        stiffness: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacityRefs[activeTab], {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityRefs[tabName], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Deferred state update to let animations kick off
    requestAnimationFrame(() => {
      setActiveTab(tabName);
    });
  }, [activeTab, tabDefs, opacityRefs, slidingAnim, fabSlidingAnim, refreshPosts, refreshData, mounted]);

  // Scroll-based header animations
  const headerTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE], outputRange: [0, -SCROLL_DISTANCE], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.4, SCROLL_DISTANCE], outputRange: [1, 0.2, 0], extrapolate: 'clamp' });
  const collapsedOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.7, SCROLL_DISTANCE], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const fabOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.8, SCROLL_DISTANCE], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const fabTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE], outputRange: [120, 0], extrapolate: 'clamp' });

  // ⚡️ Stable pointerEvents based on activeTab
  const pointerEvents1 = activeTab === 'index' ? 'auto' : 'none';
  const pointerEvents2 = activeTab === 'tab2' ? 'auto' : 'none';
  const pointerEvents3 = activeTab === 'tab3' ? 'auto' : 'none';

  const renderActionBtn = useCallback((icon, iconLib = MaterialIcons, color, gradColors, onPress, badge = 0) => {
    const IconComponent = iconLib;
    const finalGrad = gradColors || [color, color];

    return (
      <ImpactButton onPress={onPress} style={styles.actionBtn}>
        <View style={styles.actionBtnContainer}>
          <LinearGradient
            colors={theme === 'dark' ? ['rgba(255,255,255,0.12)', 'transparent'] : ['rgba(255,255,255,0.6)', 'transparent']}
            style={styles.rimLight}
          />
          <View style={[styles.actionBtnInner, { borderColor: color + '30', backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.7)' }]}>
            <LinearGradient
              colors={[finalGrad[0] + '12', finalGrad[1] + '05']}
              style={StyleSheet.absoluteFill}
            />
            <IconComponent name={icon} size={20} color={color} />
            {badge > 0 && <NotificationBadge count={badge} size="small" backgroundColor={color} style={styles.headerBadge} />}
          </View>
        </View>
      </ImpactButton>
    );
  }, [theme]);

  // Stable navigation callbacks
  const goToNotifications = useCallback(() => router.push('/(screens)/social/NotificationsScreen'), []);
  const goToHotSpots = useCallback(() => router.push('/(screens)/hotspots/HotSpotsScreen'), []);

  // ⚡️ Memoized header sections to prevent re-renders
  const collapsedHeader = useMemo(() => (
    <Animated.View style={[styles.collapsedHeader, { opacity: collapsedOpacity, backgroundColor: theme === 'dark' ? '#0f172aF5' : '#ffffffF5' }]} pointerEvents="box-none">
      <View style={styles.collapsedContent} pointerEvents="box-none">
        <View style={[styles.collapsedIcon, { backgroundColor: colors.tint }]}>
          <MaterialIcons name="explore" size={24} color="#FFF" />
        </View>
        <View style={styles.collapsedActions} pointerEvents="box-none">
          {renderActionBtn('notifications', MaterialIcons, colors.tint, [colors.tint, '#a855f7'], goToNotifications, notificationCount)}
          {renderActionBtn('fire', FontAwesome5, '#f97316', ['#f97316', '#fb923c'], goToHotSpots)}
        </View>
      </View>
    </Animated.View>
  ), [collapsedOpacity, theme, colors.tint, renderActionBtn, notificationCount, goToNotifications, goToHotSpots]);

  const trendingSection = useMemo(() => (
    <View style={styles.trendingSection} pointerEvents="auto">
      <View style={styles.trendingHeaderCompact}>
        <FontAwesome5 name="fire" size={16} color="#f97316" style={{ marginRight: 8 }} />
        <Text style={[styles.trendingTitleCompact, { color: colors.text }]}>{t('social.trending_now')}</Text>
      </View>
      <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hashtagScrollContent}>
        {loading ? [...Array(4)].map((_, i) => <View key={i} style={[styles.hashtagSkeletonCompact, { backgroundColor: colors.cardBackground }]} />) :
          trendingHashtags.slice(0, 10).map((item, index) => {
            const grad = ARTISTIC_GRADIENTS[index % ARTISTIC_GRADIENTS.length];
            return (
              <ImpactButton key={item.tag} onPress={() => router.push({ pathname: '/(screens)/social/HashtagScreen', params: { hashtag: item.tag.replace('#', '') } })} style={styles.hashtagChipCompact}>
                <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hashtagGradientCompact}>
                  <FontAwesome5 name="hashtag" size={10} color="#FFF" style={{ opacity: 0.7, marginRight: 4 }} />
                  <Text style={styles.hashtagText}>{item.tag.replace('#', '')}</Text>
                </LinearGradient>
              </ImpactButton>
            );
          })}
      </Animated.ScrollView>
    </View>
  ), [loading, trendingHashtags, colors.text, colors.cardBackground, t]);

  const tabButtons = useMemo(() => (
    tabDefs.map(tab => (
      <TabButton key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => handleTabPress(tab.key)} inactiveColor={colors.mutedText} />
    ))
  ), [tabDefs, activeTab, handleTabPress, colors.mutedText]);

  const headerContextValue = useMemo(() => ({
    scrollY,
    scrollValues: {
      latest: scrollY1,
      trending: scrollY2,
      following: scrollY3
    },
    effectiveHeaderHeight: HEADER_HEIGHT
  }), [scrollY, scrollY1, scrollY2, scrollY3]);

  return (
    <ExploreHeaderProvider value={headerContextValue}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]} pointerEvents="box-none">
          <LinearGradient colors={theme === 'dark' ? ['#020617', '#1e293b'] : ['#f1f5f9', '#ffffff']} style={styles.headerGradient} />

          {collapsedHeader}

          <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]} pointerEvents="box-none">
            <View style={styles.headerTop} pointerEvents="box-none">
              <View style={styles.headerTabsContainer} pointerEvents="auto">
                <Animated.View style={[styles.slidingPill, { shadowColor: colors.tint, transform: [{ translateX: slidingAnim }] }]}>
                  <LinearGradient colors={[colors.tint, '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabGradientFill} />
                </Animated.View>
                {tabButtons}
              </View>
              <View style={styles.headerActions} pointerEvents="auto">
                {renderActionBtn('notifications', MaterialIcons, colors.tint, [colors.tint, '#a855f7'], goToNotifications, notificationCount)}
                {renderActionBtn('fire', FontAwesome5, '#f97316', ['#f97316', '#fb923c'], goToHotSpots)}
              </View>
            </View>

            {trendingSection}
          </Animated.View>
        </Animated.View>

        {/* ⚡️ TAB CONTENT - No translateX, just opacity + pointerEvents */}
        <View style={styles.content}>
          <Animated.View
            style={[styles.tabPane, { opacity: opacity1, zIndex: activeTab === 'index' ? 10 : 1 }]}
            pointerEvents={pointerEvents1}
          >
            <Tab1Screen isActive={activeTab === 'index'} />
          </Animated.View>
          <Animated.View
            style={[styles.tabPane, { opacity: opacity2, zIndex: activeTab === 'tab2' ? 10 : 1 }]}
            pointerEvents={pointerEvents2}
          >
            {mounted.tab2 && <Tab2Screen isActive={activeTab === 'tab2'} />}
          </Animated.View>
          <Animated.View
            style={[styles.tabPane, { opacity: opacity3, zIndex: activeTab === 'tab3' ? 10 : 1 }]}
            pointerEvents={pointerEvents3}
          >
            {mounted.tab3 && <Tab3Screen isActive={activeTab === 'tab3'} />}
          </Animated.View>
        </View>

        {/* Floating tab bar */}
        <Animated.View style={[styles.floatingActions, { opacity: fabOpacity, transform: [{ translateY: fabTranslateY }] }]} pointerEvents="box-none">
          <View style={[styles.fabContainer, { backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)', borderColor: colors.borderLight }]} pointerEvents="auto">
            <View style={styles.headerTabsContainer} pointerEvents="auto">
              <Animated.View style={[styles.slidingPill, { shadowColor: colors.tint, transform: [{ translateX: fabSlidingAnim }] }]}>
                <LinearGradient colors={[colors.tint, '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabGradientFill} />
              </Animated.View>
              {tabDefs.map(tab => <TabButton key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => handleTabPress(tab.key)} inactiveColor={colors.mutedText} />)}
            </View>
            <View style={[styles.fabDivider, { backgroundColor: theme === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(0, 0, 0, 0.1)' }]} />
            <View style={styles.fabActions} pointerEvents="auto">
              {renderActionBtn('notifications', MaterialIcons, colors.tint, [colors.tint, '#a855f7'], goToNotifications, notificationCount)}
              {renderActionBtn('fire', FontAwesome5, '#f97316', ['#ff4d4d', '#f97316'], goToHotSpots)}
            </View>
          </View>
        </Animated.View>
      </View>
    </ExploreHeaderProvider>
  );
});

export default function ExploreLayout() {
  return <ExploreProvider><ExploreLayoutContent /></ExploreProvider>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 260 : 250, zIndex: 100 },
  headerGradient: { ...StyleSheet.absoluteFillObject },
  headerContent: { flex: 1, paddingTop: Platform.OS === 'ios' ? 55 : StatusBar.currentHeight + 15, paddingHorizontal: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTabsContainer: { flexDirection: 'row', gap: TAB_GAP, backgroundColor: 'rgba(148, 163, 184, 0.15)', borderRadius: 30, padding: TAB_PADDING, position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerTab: { width: TAB_WIDTH, height: TAB_HEIGHT, borderRadius: TAB_HEIGHT / 2, zIndex: 2, flexShrink: 0 },
  slidingPill: { position: 'absolute', top: TAB_PADDING, left: TAB_PADDING, width: TAB_WIDTH, height: TAB_HEIGHT, borderRadius: TAB_HEIGHT / 2, zIndex: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  tabGradientFill: { flex: 1, borderRadius: 20 },
  tabTextActive: { fontSize: 13, fontWeight: '900', letterSpacing: -0.1, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  tabTextInactive: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  actionBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  actionBtnContainer: { width: 44, height: 44, borderRadius: 22, padding: 1, overflow: 'hidden', position: 'relative' },
  rimLight: { ...StyleSheet.absoluteFillObject, borderRadius: 22, opacity: 0.6 },
  actionBtnInner: { flex: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  headerBadge: { position: 'absolute', top: 4, right: 4 },
  trendingSection: { marginTop: 15 },
  trendingHeaderCompact: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  trendingTitleCompact: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  hashtagScrollContent: { gap: 10, paddingRight: 40, paddingLeft: 4 },
  hashtagChipCompact: { borderRadius: 22, overflow: 'hidden', height: 40 },
  hashtagGradientCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, height: '100%' },
  hashtagText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  content: { flex: 1 },
  tabPane: { ...StyleSheet.absoluteFillObject },
  floatingActions: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  fabContainer: { flexDirection: 'row', padding: 6, borderRadius: 45, gap: 10, borderWidth: 1, elevation: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30 },
  fabDivider: { width: 1.5, height: 28, borderRadius: 1, marginHorizontal: 2 },
  fabActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  collapsedHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 105 : 95, zIndex: 150, elevation: 20 },
  collapsedContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 45 : 30 },
  collapsedIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  collapsedActions: { flexDirection: 'row', gap: 8 },
  hashtagSkeletonCompact: { width: 95, height: 40, borderRadius: 20 }
});
