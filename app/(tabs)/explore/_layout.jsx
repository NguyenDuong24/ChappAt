import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Text,
  StyleSheet,
  View,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { ThemeContext } from '../../../context/ThemeContext';
import { ExploreHeaderProvider, HEADER_HEIGHT, SCROLL_DISTANCE } from '../../../context/ExploreHeaderContext';
import useExploreData from '../../../hooks/useExploreData';
import NotificationBadge from '../../../components/common/NotificationBadge';
import { ExploreProvider, useExploreActions } from '../../../context/ExploreContext';
import { getThemeColors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import FeatureActionDrawer from '@/components/drawer/FeatureActionDrawer';
import { RevealScalableView } from '@/components/reveal';

// Import Screens
import Tab1Screen from './tab1';
import Tab2Screen from './tab2';
import Tab3Screen from './tab3';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 40;
const TAB_PADDING = 4;
const TAB_GAP = 5;
const ACTION_GAP = 6;
const FEED_TOP_SPACING = 18;

const CHIP_PRESETS = [
  {
    gradient: ['#FFF1F5', '#FFE4EF'],
    icon: 'favorite',
    iconColor: '#E11D48',
    textColor: '#8A1234',
    borderColor: 'rgba(225,29,72,0.18)',
    radius: 16,
  },
  {
    gradient: ['#FFF7ED', '#FFE8CC'],
    icon: 'local-movies',
    iconColor: '#EA580C',
    textColor: '#8A3A0A',
    borderColor: 'rgba(234,88,12,0.18)',
    radius: 16,
  },
  {
    gradient: ['#E0F2FE', '#DCFCE7'],
    icon: 'sports-esports',
    iconColor: '#0284C7',
    textColor: '#075985',
    borderColor: 'rgba(2,132,199,0.18)',
    radius: 16,
  },
  {
    gradient: ['#ECFDF5', '#D1FAE5'],
    icon: 'school',
    iconColor: '#059669',
    textColor: '#065F46',
    borderColor: 'rgba(5,150,105,0.18)',
    radius: 16,
  },
  {
    gradient: ['#EEF2FF', '#EDE9FE'],
    icon: 'tag',
    iconColor: '#7C3AED',
    textColor: '#4C1D95',
    borderColor: 'rgba(124,58,237,0.18)',
    radius: 16,
  },
];

const ACTION_PRESETS = {
  notification: '#0EA5E9',
  hotspots: '#F97316',
};

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

const TabButton = React.memo(({ label, isActive, onPress, activeColor, inactiveColor, tabWidth }) => {
  return (
    <ImpactButton onPress={onPress} style={[styles.headerTab, { width: tabWidth }, isActive && styles.headerTabActive]}>
      <Text style={[isActive ? styles.tabTextActive : styles.tabTextInactive, { color: isActive ? activeColor : inactiveColor }]} numberOfLines={1}>
        {label}
      </Text>
    </ImpactButton>
  );
});

const ExploreLayoutContent = React.memo(function ExploreLayoutContent() {
  const { t } = useTranslation();
  const { theme, isDark, palette } = useContext(ThemeContext);
  const colors = useMemo(() => getThemeColors(theme), [theme]);

  const { width } = useWindowDimensions();
  const drawerOffset = useMemo(() => Math.min(width * 0.62, 250), [width]);

  const [activeTab, setActiveTab] = useState('index');
  const [mounted, setMounted] = useState({ index: true, tab2: false, tab3: false });
  const [featureDrawer, setFeatureDrawer] = useState(null);
  const [tabsTrackWidth, setTabsTrackWidth] = useState(0);
  const onTabsLayout = useCallback((event) => {
    const nextWidth = event?.nativeEvent?.layout?.width || 0;
    if (nextWidth > 0 && Math.abs(nextWidth - tabsTrackWidth) > 1) {
      setTabsTrackWidth(nextWidth);
    }
  }, [tabsTrackWidth]);
  const tabWidth = useMemo(() => {
    if (!tabsTrackWidth) return 76;
    const trackInner = tabsTrackWidth - TAB_PADDING * 2 - TAB_GAP * 2;
    return Math.max(66, Math.floor(trackInner / 3));
  }, [tabsTrackWidth]);

  const params = useLocalSearchParams();
  const openDrawer = params.openDrawer;

  useEffect(() => {
    if (openDrawer === 'notification') {
      setFeatureDrawer('notification');
    }
  }, [openDrawer]);

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

  const isFocused = useIsFocused();
  const { notificationCount, trendingHashtags, loading, refresh: refreshData } = useExploreData(isFocused);
  const { refresh: refreshPosts, setExploreScreenActive } = useExploreActions();

  useEffect(() => {
    setExploreScreenActive?.(isFocused);
  }, [isFocused, setExploreScreenActive]);

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

    const slideTo = tabIndex * (tabWidth + TAB_GAP);

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
  }, [activeTab, tabDefs, opacityRefs, slidingAnim, fabSlidingAnim, refreshPosts, refreshData, mounted, tabWidth]);

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

  const renderActionBtn = useCallback((icon, iconLib = MaterialIcons, color, onPress, badge = 0) => {
    const IconComponent = iconLib;

    return (
      <ImpactButton onPress={onPress} style={styles.actionBtn}>
        <View style={styles.actionBtnContainer}>
          <View style={[styles.actionBtnInner, { borderColor: color + '55', backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.92)' }]}>
            <LinearGradient
              colors={[color + '24', color + '08']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionIconTintLayer}
            />
            <IconComponent name={icon} size={19} color={color} />
            {badge > 0 && <NotificationBadge count={badge} size="small" backgroundColor={color} style={styles.headerBadge} />}
          </View>
        </View>
      </ImpactButton>
    );
  }, [isDark]);

  // Stable navigation callbacks
  const goToNotifications = useCallback(() => {
    setFeatureDrawer('notification');
  }, []);
  const goToHotSpots = useCallback(() => router.push('/(screens)/hotspots/HotSpotsScreen'), []);
  const closeFeatureDrawer = useCallback(() => setFeatureDrawer(null), []);

  useEffect(() => {
    if (!featureDrawer) {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFeatureDrawer(null);
      return true;
    });
    return () => sub.remove();
  }, [featureDrawer]);

  // ⚡️ Memoized header sections to prevent re-renders
  const collapsedHeader = useMemo(() => (
    <Animated.View style={[styles.collapsedHeader, { opacity: collapsedOpacity, backgroundColor: colors.background }]} pointerEvents="box-none">
      <View style={styles.collapsedContent} pointerEvents="box-none">
        <View style={[styles.collapsedIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="explore" size={24} color={colors.tint} />
        </View>
        <View style={styles.collapsedActions} pointerEvents="box-none">
          {renderActionBtn('notifications', MaterialIcons, ACTION_PRESETS.notification, goToNotifications, notificationCount)}
          {renderActionBtn('fire', FontAwesome5, ACTION_PRESETS.hotspots, goToHotSpots)}
        </View>
      </View>
    </Animated.View>
  ), [collapsedOpacity, colors.background, colors.surface, colors.border, colors.tint, renderActionBtn, notificationCount, goToNotifications, goToHotSpots]);

  const trendingSection = useMemo(() => (
    <View style={styles.trendingSection} pointerEvents="auto">
      <View style={styles.trendingHeaderCompact}>
        <MaterialIcons name="local-fire-department" size={18} color={ACTION_PRESETS.hotspots} style={{ marginRight: 6 }} />
        <Text style={[styles.trendingTitleCompact, { color: colors.text }]}>Đang hot</Text>
      </View>
      <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hashtagScrollContent}>
        {loading ? [...Array(4)].map((_, i) => <View key={i} style={[styles.hashtagSkeletonCompact, { backgroundColor: colors.menuBackground }]} />) :
          trendingHashtags.slice(0, 10).map((item, index) => {
            const preset = CHIP_PRESETS[index % CHIP_PRESETS.length];
            return (
              <ImpactButton key={item.tag} onPress={() => router.push({ pathname: '/(screens)/social/HashtagScreen', params: { hashtag: item.tag.replace('#', '') } })} style={[styles.hashtagChipCompact, { borderRadius: preset.radius }]}>
                <LinearGradient colors={preset.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hashtagGradientCompact, { borderRadius: preset.radius, borderColor: preset.borderColor }]}>
                  <MaterialIcons name={preset.icon} size={15} color={preset.iconColor} style={{ opacity: 0.95, marginRight: 7 }} />
                  <Text style={[styles.hashtagText, { color: preset.textColor }]}>{item.tag.replace('#', '')}</Text>
                </LinearGradient>
              </ImpactButton>
            );
          })}
      </Animated.ScrollView>
    </View>
  ), [loading, trendingHashtags, colors.menuBackground, colors.text]);

  const tabButtons = useMemo(() => (
    tabDefs.map(tab => (
      <TabButton key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => handleTabPress(tab.key)} activeColor={colors.text} inactiveColor={colors.subtleText} tabWidth={tabWidth} />
    ))
  ), [tabDefs, activeTab, handleTabPress, colors.text, colors.subtleText, tabWidth]);

  const headerContextValue = useMemo(() => ({
    scrollY,
    scrollValues: {
      latest: scrollY1,
      trending: scrollY2,
      following: scrollY3
    },
    effectiveHeaderHeight: HEADER_HEIGHT + FEED_TOP_SPACING
  }), [scrollY, scrollY1, scrollY2, scrollY3]);

  return (
    <ExploreHeaderProvider value={headerContextValue}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RevealScalableView
          revealed={!!featureDrawer}
          side="left"
          scale={0.86}
          offset={drawerOffset}
          style={[styles.revealContainer, { backgroundColor: 'transparent' }]}
        >
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

          <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]} pointerEvents="box-none">
            <LinearGradient
              colors={[palette.appGradient[0], palette.appGradient[1], palette.appGradient[2] || palette.appGradient[1]]}
              style={styles.headerGradient}
            />
            <LinearGradient
              colors={[`${colors.tint}40`, `${(colors.tintLight || colors.tint)}2A`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerTintOverlay}
            />
            <LinearGradient
              colors={isDark ? ['transparent', 'rgba(0,0,0,0.20)'] : ['transparent', 'rgba(255,255,255,0.42)']}
              style={styles.headerBottomFade}
              pointerEvents="none"
            />

            {collapsedHeader}

            <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]} pointerEvents="box-none">
              <View style={styles.headerTop} pointerEvents="box-none">
                <LinearGradient
                  colors={[colors.tint, colors.tintLight || colors.tint, colors.tintDark || colors.tint]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.controlsShell}
                >
                  <View style={[styles.controlsInner, { backgroundColor: isDark ? colors.menuBackground : 'rgba(255,255,255,0.94)' }]}>
                    <View onLayout={onTabsLayout} style={[styles.headerTabsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.82)' }]} pointerEvents="auto">
                      <Animated.View style={[styles.slidingPill, { width: tabWidth, shadowColor: isDark ? colors.tint : '#7DD3FC', transform: [{ translateX: slidingAnim }], backgroundColor: isDark ? colors.surface : '#FFFFFF' }]} />
                      {tabButtons}
                    </View>
                    <View style={styles.headerActions} pointerEvents="auto">
                      {renderActionBtn('notifications', MaterialIcons, ACTION_PRESETS.notification, goToNotifications, notificationCount)}
                      {renderActionBtn('fire', FontAwesome5, ACTION_PRESETS.hotspots, goToHotSpots)}
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {trendingSection}
            </Animated.View>
          </Animated.View>

          {/* ⚡️ TAB CONTENT - No translateX, just opacity + pointerEvents */}
          <View style={styles.content}>
            <Animated.View
              style={[styles.tabPane, { opacity: opacity1, zIndex: activeTab === 'index' ? 10 : 1, backgroundColor: 'transparent' }]}
              pointerEvents={pointerEvents1}
            >
              <Tab1Screen isActive={activeTab === 'index'} />
            </Animated.View>
            <Animated.View
              style={[styles.tabPane, { opacity: opacity2, zIndex: activeTab === 'tab2' ? 10 : 1, backgroundColor: 'transparent' }]}
              pointerEvents={pointerEvents2}
            >
              {mounted.tab2 && <Tab2Screen isActive={activeTab === 'tab2'} />}
            </Animated.View>
            <Animated.View
              style={[styles.tabPane, { opacity: opacity3, zIndex: activeTab === 'tab3' ? 10 : 1, backgroundColor: 'transparent' }]}
              pointerEvents={pointerEvents3}
            >
              {mounted.tab3 && <Tab3Screen isActive={activeTab === 'tab3'} />}
            </Animated.View>
          </View>

          {/* Floating tab bar */}
          <Animated.View style={[styles.floatingActions, { opacity: fabOpacity, transform: [{ translateY: fabTranslateY }] }]} pointerEvents="box-none">
            <LinearGradient
              colors={[colors.tint, colors.tintLight || colors.tint, colors.tintDark || colors.tint]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.controlsShell}
              pointerEvents="auto"
            >
              <View style={[styles.controlsInner, { backgroundColor: isDark ? colors.menuBackground : 'rgba(255,255,255,0.94)' }]}>
                <View onLayout={onTabsLayout} style={[styles.headerTabsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.82)' }]} pointerEvents="auto">
                  <Animated.View style={[styles.slidingPill, { width: tabWidth, shadowColor: isDark ? colors.tint : '#7DD3FC', transform: [{ translateX: fabSlidingAnim }], backgroundColor: isDark ? colors.surface : '#FFFFFF' }]} />
                  {tabDefs.map(tab => <TabButton key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => handleTabPress(tab.key)} activeColor={colors.text} inactiveColor={colors.subtleText} tabWidth={tabWidth} />)}
                </View>
                <View style={styles.headerActions} pointerEvents="auto">
                  {renderActionBtn('notifications', MaterialIcons, ACTION_PRESETS.notification, goToNotifications, notificationCount)}
                  {renderActionBtn('fire', FontAwesome5, ACTION_PRESETS.hotspots, goToHotSpots)}
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </RevealScalableView>

        <FeatureActionDrawer
          visible={!!featureDrawer}
          drawerKey={featureDrawer}
          onClose={closeFeatureDrawer}
        />
      </View>
    </ExploreHeaderProvider>
  );
});

export default function ExploreLayout() {
  return <ExploreProvider><ExploreLayoutContent /></ExploreProvider>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  revealContainer: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1100,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGradient: { ...StyleSheet.absoluteFillObject },
  headerTintOverlay: { ...StyleSheet.absoluteFillObject },
  headerBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 },
  headerContent: { flex: 1, paddingTop: Platform.OS === 'ios' ? 55 : StatusBar.currentHeight + 15, paddingHorizontal: 14 },
  headerTop: { alignItems: 'center', marginBottom: 14, width: '100%' },
  controlsShell: {
    borderRadius: 30,
    padding: 2.5,
    overflow: 'hidden',
    width: '100%',
  },
  controlsInner: {
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    borderWidth: 0,
  },
  headerTabsContainer: { flexDirection: 'row', gap: TAB_GAP, borderRadius: 24, padding: TAB_PADDING, position: 'relative', flex: 1, marginRight: 6 },
  headerTab: { height: TAB_HEIGHT, borderRadius: TAB_HEIGHT / 2, zIndex: 2, flexShrink: 0 },
  headerTabActive: { shadowColor: '#9CC8EA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  slidingPill: { position: 'absolute', top: TAB_PADDING, left: TAB_PADDING, height: TAB_HEIGHT, borderRadius: TAB_HEIGHT / 2, zIndex: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  tabTextActive: { fontSize: 14, fontWeight: '800', letterSpacing: 0, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  tabTextInactive: { fontSize: 14, fontWeight: '700', letterSpacing: 0, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  headerActions: { flexDirection: 'row', gap: ACTION_GAP, alignItems: 'center', justifyContent: 'space-between', paddingRight: 2 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  actionBtnContainer: { width: 40, height: 40, borderRadius: 20, padding: 0, overflow: 'hidden', position: 'relative' },
  actionBtnInner: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  actionIconTintLayer: { ...StyleSheet.absoluteFillObject },
  headerBadge: { position: 'absolute', top: 4, right: 4 },
  trendingSection: { marginTop: 4, paddingHorizontal: 2, paddingVertical: 2 },
  trendingHeaderCompact: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  trendingTitleCompact: { fontSize: 17, fontWeight: '800', letterSpacing: 0 },
  hashtagScrollContent: { gap: 8, paddingRight: 16, paddingLeft: 2 },
  hashtagChipCompact: { borderRadius: 16, overflow: 'hidden', height: 36, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 2 },
  hashtagGradientCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, height: '100%', borderWidth: 1 },
  hashtagText: { fontSize: 14, fontWeight: '800', letterSpacing: 0 },
  content: { flex: 1, backgroundColor: 'transparent' },
  tabPane: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  floatingActions: { position: 'absolute', bottom: 100, left: 14, right: 14, alignItems: 'center', zIndex: 1000 },
  collapsedHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 105 : 95, zIndex: 1100, elevation: 20 },
  collapsedContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 45 : 30 },
  collapsedIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  collapsedActions: { flexDirection: 'row', gap: 8 },
  hashtagSkeletonCompact: { width: 90, height: 36, borderRadius: 18 }
});
