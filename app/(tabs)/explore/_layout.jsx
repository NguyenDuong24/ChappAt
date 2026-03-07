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
  InteractionManager,
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
const TAB_WIDTH = 80; // Safer width for all devices
const TAB_HEIGHT = 40;
const TAB_PADDING = 4;
const TAB_GAP = 5; // Clearer separation

const ARTISTIC_GRADIENTS = [
  ['#8E2DE2', '#4A00E0'],
  ['#FF512F', '#DD2476'],
  ['#00B4DB', '#0083B0'],
  ['#11998e', '#38ef7d'],
  ['#F093FB', '#F5576C'],
  ['#4facfe', '#00f2fe'],
  ['#fa709a', '#fee140'],
];

// 🚀 PREMIUM TACTILE BUTTON
const ImpactButton = React.memo(({ children, onPress, style, glowColor }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scale, { toValue: 0.94, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start();
  };

  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9} style={style}>
      <Animated.View
        renderToHardwareTextureAndroid={true}
        style={[
          { transform: [{ scale }], flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
          glowColor ? { shadowColor: glowColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 } : {}
        ]}
      >
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

  const toggleLanguage = useCallback(() => {
    const nextLang = i18n.language.startsWith('vi') ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
  }, [i18n]);

  const segments = useSegments();
  const [activeTab, setActiveTab] = useState('index');
  const [mounted, setMounted] = useState({ index: true, tab2: false, tab3: false });

  useEffect(() => {
    const timer = setTimeout(() => setMounted({ index: true, tab2: true, tab3: true }), 450);
    return () => clearTimeout(timer);
  }, []);

  const tabRef1 = useRef(null);
  const tabRef2 = useRef(null);
  const tabRef3 = useRef(null);
  const tabAnims = {
    opacity1: useRef(new Animated.Value(1)).current, opacity2: useRef(new Animated.Value(0)).current, opacity3: useRef(new Animated.Value(0)).current,
    transX1: useRef(new Animated.Value(0)).current, transX2: useRef(new Animated.Value(20)).current, transX3: useRef(new Animated.Value(20)).current,
  };

  const slidingAnim = useRef(new Animated.Value(0)).current;
  const fabSlidingAnim = useRef(new Animated.Value(0)).current;

  const { notificationCount, trendingHashtags, loading, refresh: refreshData } = useExploreData();
  const { refresh: refreshPosts } = useExploreActions();

  const scrollY = useRef(new Animated.Value(0)).current;

  const tabDefs = useMemo(() => [
    { key: 'index', label: t('social.latest') },
    { key: 'tab2', label: t('social.trending') },
    { key: 'tab3', label: t('social.follow') || 'Theo dõi' },
  ], [t]);

  const handleTabPress = useCallback((tabName, isSyncOnly = false) => {
    const tabIndex = tabDefs.findIndex(t => t.key === tabName);
    const currentIndex = tabDefs.findIndex(t => t.key === activeTab);
    if (tabIndex === -1) return;

    if (!isSyncOnly && activeTab === tabName) {
      refreshPosts(tabName === 'index' ? 'latest' : tabName === 'tab2' ? 'trending' : 'following');
      refreshData();
      return;
    }

    const slideTo = tabIndex * (TAB_WIDTH + TAB_GAP);
    const isForward = tabIndex > currentIndex;

    // ⚡️ ZERO-LAG NATIVE SWITCH: Bypass React entirely for the visual change
    // Using setNativeProps allows us to command the OS to change visibility & depth 
    // even if the JS thread is 100% blocked by data loading.
    const updateNativeTab = (ref, isTarget) => {
      if (ref.current) {
        ref.current.setNativeProps({
          style: {
            zIndex: isTarget ? 10 : 1,
            // Force hardware acceleration during transition
            renderToHardwareTextureAndroid: true,
            shouldRasterizeIOS: true
          },
          pointerEvents: isTarget ? 'auto' : 'none'
        });
      }
    };

    updateNativeTab(tabRef1, tabName === 'index');
    updateNativeTab(tabRef2, tabName === 'tab2');
    updateNativeTab(tabRef3, tabName === 'tab3');

    const springConfig = { damping: 22, stiffness: 140, mass: 1, useNativeDriver: true };
    const fadeConfig = { duration: 180, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true };

    Animated.parallel([
      Animated.spring(slidingAnim, { toValue: slideTo, ...springConfig }),
      Animated.spring(fabSlidingAnim, { toValue: slideTo, ...springConfig }),
      Animated.timing(tabAnims.opacity1, { ...fadeConfig, toValue: tabName === 'index' ? 1 : 0 }),
      Animated.timing(tabAnims.opacity2, { ...fadeConfig, toValue: tabName === 'tab2' ? 1 : 0 }),
      Animated.timing(tabAnims.opacity3, { ...fadeConfig, toValue: tabName === 'tab3' ? 1 : 0 }),
      Animated.timing(tabAnims[`transX${currentIndex + 1}`], { toValue: isForward ? -25 : 25, ...fadeConfig }),
      Animated.timing(tabAnims[`transX${tabIndex + 1}`], { toValue: 0, ...fadeConfig }),
    ]).start();

    setActiveTab(tabName);

    // 💡 Separation of Concerns: Update UI state first, then navigate in the next tick
    // This prevents the JS thread from being blocked by the router while trying to update the tab bar visuals.
    if (!isSyncOnly) {
      setTimeout(() => {
        const routeName = tabName === 'index' ? '/(tabs)/explore' : `/(tabs)/explore/${tabName}`;
        router.push(routeName);
      }, 0);
    }
  }, [activeTab, tabDefs, tabAnims]);

  useEffect(() => {
    const lastSegment = segments[segments.length - 1] || 'index';
    const newTab = (lastSegment === 'tab2' || lastSegment === 'tab3') ? lastSegment : 'index';
    if (activeTab !== newTab) {
      handleTabPress(newTab, true);
    }
  }, [segments]);

  const headerTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE], outputRange: [0, -SCROLL_DISTANCE], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.4, SCROLL_DISTANCE], outputRange: [1, 0.2, 0], extrapolate: 'clamp' });
  const collapsedOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.7, SCROLL_DISTANCE], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const fabOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.8, SCROLL_DISTANCE], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const fabTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE], outputRange: [120, 0], extrapolate: 'clamp' });

  const renderActionBtn = (icon, iconLib = MaterialIcons, color, glow, onPress, badge = 0) => {
    const IconComponent = iconLib;
    return (
      <ImpactButton onPress={onPress} style={styles.actionBtn} glowColor={glow}>
        <View style={[styles.notificationGlass, { borderColor: color + '40' }]}>
          <View style={[styles.notificationInner, { backgroundColor: theme === 'dark' ? '#0f172a' : '#FFF' }]}>
            <IconComponent name={icon} size={20} color={color} />
            {badge > 0 && <NotificationBadge count={badge} size="small" backgroundColor={color} style={styles.headerBadge} />}
          </View>
        </View>
      </ImpactButton>
    );
  };

  return (
    <ExploreHeaderProvider value={{ scrollY, handleScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }), effectiveHeaderHeight: HEADER_HEIGHT }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]} pointerEvents="box-none">
          <LinearGradient colors={theme === 'dark' ? ['#020617', '#1e293b'] : ['#f1f5f9', '#ffffff']} style={styles.headerGradient} />

          <Animated.View style={[styles.collapsedHeader, { opacity: collapsedOpacity, backgroundColor: theme === 'dark' ? '#0f172aF5' : '#ffffffF5' }]} pointerEvents="box-none">
            <View style={styles.collapsedContent} pointerEvents="box-none">
              <View style={[styles.collapsedIcon, { backgroundColor: colors.tint }]}>
                <MaterialIcons name="explore" size={24} color="#FFF" />
              </View>
              <View style={styles.collapsedActions} pointerEvents="box-none">
                {renderActionBtn('notifications', MaterialIcons, colors.tint, colors.tint, () => router.push('/(screens)/social/NotificationsScreen'), notificationCount)}
                {renderActionBtn('fire', FontAwesome5, '#f97316', '#f97316', () => router.push('/(screens)/hotspots/HotSpotsScreen'))}
              </View>
            </View>
          </Animated.View>

          {useMemo(() => (
            <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]} pointerEvents="box-none">
              <View style={styles.headerTop} pointerEvents="box-none">
                <View style={styles.headerTabsContainer} pointerEvents="auto">
                  <Animated.View style={[styles.slidingPill, { shadowColor: colors.tint, transform: [{ translateX: slidingAnim }] }]}>
                    <LinearGradient colors={[colors.tint, '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabGradientFill} />
                  </Animated.View>
                  {tabDefs.map(tab => (
                    <TabButton key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => handleTabPress(tab.key)} inactiveColor={colors.mutedText} />
                  ))}
                </View>
                <View style={styles.headerActions} pointerEvents="auto">
                  {renderActionBtn('notifications', MaterialIcons, colors.tint, colors.tint, () => router.push('/(screens)/social/NotificationsScreen'), notificationCount)}
                  {renderActionBtn('fire', FontAwesome5, '#f97316', '#fb923c', () => router.push('/(screens)/hotspots/HotSpotsScreen'))}
                </View>
              </View>

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
            </Animated.View>
          ), [activeTab, notificationCount, loading, trendingHashtags, colors, theme, slidingAnim, tabDefs])}
        </Animated.View>

        <View style={styles.content}>
          <Animated.View
            ref={tabRef1}
            style={[StyleSheet.absoluteFill, { opacity: tabAnims.opacity1, transform: [{ translateX: tabAnims.transX1 }] }]}
            renderToHardwareTextureAndroid={true}
          >
            <Tab1Screen isActive={activeTab === 'index'} />
          </Animated.View>
          <Animated.View
            ref={tabRef2}
            style={[StyleSheet.absoluteFill, { opacity: tabAnims.opacity2, transform: [{ translateX: tabAnims.transX2 }] }]}
            renderToHardwareTextureAndroid={true}
          >
            {mounted.tab2 && <Tab2Screen isActive={activeTab === 'tab2'} />}
          </Animated.View>
          <Animated.View
            ref={tabRef3}
            style={[StyleSheet.absoluteFill, { opacity: tabAnims.opacity3, transform: [{ translateX: tabAnims.transX3 }] }]}
            renderToHardwareTextureAndroid={true}
          >
            {mounted.tab3 && <Tab3Screen isActive={activeTab === 'tab3'} />}
          </Animated.View>
        </View>

        <Animated.View style={[styles.floatingActions, { opacity: fabOpacity, transform: [{ translateY: fabTranslateY }] }]} pointerEvents="box-none">
          {useMemo(() => (
            <View style={[styles.fabContainer, { backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)', borderColor: colors.borderLight }]} pointerEvents="auto">
              <View style={styles.headerTabsContainer} pointerEvents="auto">
                <Animated.View style={[styles.slidingPill, { shadowColor: colors.tint, transform: [{ translateX: fabSlidingAnim }] }]}>
                  <LinearGradient colors={[colors.tint, '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabGradientFill} />
                </Animated.View>
                {tabDefs.map(tab => <TabButton key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => handleTabPress(tab.key)} inactiveColor={colors.mutedText} />)}
              </View>
              <View style={styles.fabActions} pointerEvents="auto">
                {renderActionBtn('notifications', MaterialIcons, colors.tint, colors.tint, () => router.push('/(screens)/social/NotificationsScreen'), notificationCount)}
                {renderActionBtn('fire', FontAwesome5, '#f97316', '#f97316', () => router.push('/(screens)/hotspots/HotSpotsScreen'))}
              </View>
            </View>
          ), [activeTab, notificationCount, colors, theme, fabSlidingAnim, tabDefs])}
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
  headerActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionBtn: { width: 40, height: 40, borderRadius: 20, flexShrink: 0, overflow: 'hidden' },
  notificationGlass: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  notificationInner: { width: '100%', height: '100%', borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerBadge: { position: 'absolute', top: 3, right: 3 },
  trendingSection: { marginTop: 15 },
  trendingHeaderCompact: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  trendingTitleCompact: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  hashtagScrollContent: { gap: 10, paddingRight: 40, paddingLeft: 4 },
  hashtagChipCompact: { borderRadius: 22, overflow: 'hidden', height: 40 },
  hashtagGradientCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, height: '100%' },
  hashtagText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  content: { flex: 1 },
  floatingActions: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  fabContainer: { flexDirection: 'row', padding: 6, borderRadius: 45, gap: 8, borderWidth: 1, elevation: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.4, shadowRadius: 25 },
  fabDivider: { width: 1, height: 24, backgroundColor: 'rgba(148, 163, 184, 0.3)', marginHorizontal: 2 },
  fabActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  collapsedHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 105 : 95, zIndex: 150, elevation: 20 },
  collapsedContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 45 : 30 },
  collapsedIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  collapsedActions: { flexDirection: 'row', gap: 10 },
  hashtagSkeletonCompact: { width: 95, height: 40, borderRadius: 20 }
});
