import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Text,
  StyleSheet,
  View,
  StatusBar,
  TouchableOpacity,
  Animated,
  Platform,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useIsFocused } from '@react-navigation/native';
import { ThemeContext } from '../../../context/ThemeContext';
import { ExploreHeaderProvider, HEADER_HEIGHT, SCROLL_DISTANCE } from '../../../context/ExploreHeaderContext';
import useExploreData from '../../../hooks/useExploreData';
import NotificationBadge from '../../../components/common/NotificationBadge';
import { ExploreProvider, useExploreActions } from '../../../context/ExploreContext';
import { getThemeColors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import AppDrawer from '@/components/drawer/AppDrawer';
import { RevealScalableView } from '@/components/reveal';
import { useRefresh } from '@/context/RefreshContext';

// Import Screens
import Tab1Screen from './tab1';
import Tab2Screen from './tab2';
import Tab3Screen from './tab3';

const TAB_HEIGHT = 40;
const TAB_PADDING = 4;
const TAB_GAP = 5;
const ACTION_GAP = 6;
const FEED_TOP_SPACING = 18;

// 🎨 SẮC NÉT & RỰC RỠ PRESETS: Chữ đậm, màu tương phản cực cao không lo bị chìm
const CHIP_PRESETS = [
  {
    gradient: ['rgba(255, 228, 230, 0.95)', 'rgba(255, 241, 242, 0.85)'], // Nền hồng mịn rực rỡ
    darkGradient: ['rgba(76, 5, 25, 0.85)', 'rgba(29, 4, 10, 0.75)'],
    icon: 'favorite',
    iconColor: '#E11D48',
    iconBg: 'rgba(225, 29, 72, 0.12)',
    darkIconBg: 'rgba(225, 29, 72, 0.25)',
    textColor: '#9F1239',       // Chữ đỏ hồng đậm đà sắc nét
    darkTextColor: '#FFE4E6',   // Chữ sáng bật lên ở chế độ tối
    borderColor: '#FDA4AF',
    darkBorderColor: 'rgba(244, 63, 94, 0.35)',
  },
  {
    gradient: ['rgba(255, 237, 213, 0.95)', 'rgba(255, 247, 237, 0.85)'], // Nền cam ấm
    darkGradient: ['rgba(67, 20, 7, 0.85)', 'rgba(28, 12, 4, 0.75)'],
    icon: 'local-movies',
    iconColor: '#EA580C',
    iconBg: 'rgba(234, 88, 12, 0.12)',
    darkIconBg: 'rgba(234, 88, 12, 0.25)',
    textColor: '#9A3412',       // Chữ cam cháy tương phản cao
    darkTextColor: '#FFEDD5',
    borderColor: '#FED7AA',
    darkBorderColor: 'rgba(249, 115, 22, 0.35)',
  },
  {
    gradient: ['rgba(224, 242, 254, 0.95)', 'rgba(240, 249, 255, 0.85)'], // Nền xanh neon dịu
    darkGradient: ['rgba(8, 47, 73, 0.85)', 'rgba(3, 27, 46, 0.75)'],
    icon: 'sports-esports',
    iconColor: '#0284C7',
    iconBg: 'rgba(2, 132, 199, 0.12)',
    darkIconBg: 'rgba(2, 132, 199, 0.25)',
    textColor: '#075985',       // Chữ xanh dương đậm cực rõ nét
    darkTextColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    darkBorderColor: 'rgba(14, 165, 233, 0.35)',
  },
  {
    gradient: ['rgba(209, 250, 229, 0.95)', 'rgba(240, 253, 244, 0.85)'], // Nền lục bảo
    darkGradient: ['rgba(4, 47, 31, 0.85)', 'rgba(2, 27, 18, 0.75)'],
    icon: 'school',
    iconColor: '#059669',
    iconBg: 'rgba(5, 150, 105, 0.12)',
    darkIconBg: 'rgba(5, 150, 105, 0.25)',
    textColor: '#065F46',       // Chữ xanh lá đậm đà
    darkTextColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    darkBorderColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    gradient: ['rgba(243, 232, 255, 0.95)', 'rgba(245, 243, 255, 0.85)'], // Nền tím hoàng gia
    darkGradient: ['rgba(48, 12, 117, 0.85)', 'rgba(19, 6, 48, 0.75)'],
    icon: 'tag',
    iconColor: '#7C3AED',
    iconBg: 'rgba(124, 58, 237, 0.12)',
    darkIconBg: 'rgba(124, 58, 237, 0.25)',
    textColor: '#5B21B6',       // Chữ tím đậm đà tinh tế
    darkTextColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    darkBorderColor: 'rgba(139, 92, 246, 0.35)',
  },
];

const ACTION_PRESETS = {
  notification: '#0EA5E9',
  hotspots: '#F97316',
};

function formatHashtagCount(count) {
  const value = Number(count || 0);
  if (!Number.isFinite(value) || value <= 0) return 'Mới nổi';
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M lượt`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K lượt`;
  return `${value} lượt`;
}

// 🚀 PREMIUM TACTILE BUTTON
const ImpactButton = React.memo(({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(scale, { toValue: 0.96, duration: 50, useNativeDriver: true }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 240, friction: 10 }).start();
  }, [scale]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.9}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }], flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});
ImpactButton.displayName = 'ImpactButton';

const TabButton = React.memo(({ label, isActive, onPress, activeColor, inactiveColor, tabWidth }) => {
  return (
    <ImpactButton onPress={onPress} style={[styles.headerTab, { width: tabWidth }, isActive && styles.headerTabActive]}>
      <Text style={[isActive ? styles.tabTextActive : styles.tabTextInactive, { color: isActive ? activeColor : inactiveColor }]} numberOfLines={1}>
        {label}
      </Text>
    </ImpactButton>
  );
});
TabButton.displayName = 'TabButton';

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

  const tab1Ref = useRef(null);
  const tab2Ref = useRef(null);
  const tab3Ref = useRef(null);
  
  const tab1OffsetRef = useRef(0);
  const tab2OffsetRef = useRef(0);
  const tab3OffsetRef = useRef(0);

  const { registerRefreshHandler } = useRefresh();

  const handleTab1Scroll = useCallback((event) => {
    tab1OffsetRef.current = event?.nativeEvent?.contentOffset?.y || 0;
  }, []);

  const handleTab2Scroll = useCallback((event) => {
    tab2OffsetRef.current = event?.nativeEvent?.contentOffset?.y || 0;
  }, []);

  const handleTab3Scroll = useCallback((event) => {
    tab3OffsetRef.current = event?.nativeEvent?.contentOffset?.y || 0;
  }, []);

  const handleExploreTabPress = useCallback(() => {
    if (activeTab === 'index') {
      if (tab1OffsetRef.current > 8) {
        tab1Ref.current?.scrollToOffset?.({ offset: 0, animated: true });
      } else {
        refreshPosts?.('latest');
        refreshData?.();
      }
    } else if (activeTab === 'tab2') {
      if (tab2OffsetRef.current > 8) {
        tab2Ref.current?.scrollToOffset?.({ offset: 0, animated: true });
      } else {
        refreshPosts?.('trending');
        refreshData?.();
      }
    } else if (activeTab === 'tab3') {
      if (tab3OffsetRef.current > 8) {
        tab3Ref.current?.scrollToOffset?.({ offset: 0, animated: true });
      } else {
        refreshPosts?.('following');
        refreshData?.();
      }
    }
  }, [activeTab, refreshPosts, refreshData]);

  useEffect(() => {
    if (registerRefreshHandler) {
      registerRefreshHandler('explore', handleExploreTabPress);
    }
  }, [registerRefreshHandler, handleExploreTabPress]);

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

  const tabDefs = useMemo(() => [
    { key: 'index', label: t('social.latest') !== 'social.latest' ? t('social.latest') : 'Mới nhất' },
    { key: 'tab2', label: t('social.trending') !== 'social.trending' ? t('social.trending') : 'Xu hướng' },
    { key: 'tab3', label: t('social.following') !== 'social.following' ? t('social.following') : 'Theo dõi' },
  ], [t]);

  const handleTabPress = useCallback((tabName) => {
    if (activeTab === tabName) {
      refreshPosts(tabName === 'index' ? 'latest' : tabName === 'tab2' ? 'trending' : 'following');
      refreshData();
      return;
    }

    const tabIndex = tabDefs.findIndex(t => t.key === tabName);
    if (tabIndex === -1) return;

    if (!mounted[tabName]) {
      setMounted(prev => ({ ...prev, [tabName]: true }));
    }

    const slideTo = tabIndex * (tabWidth + TAB_GAP);

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

    requestAnimationFrame(() => {
      setActiveTab(tabName);
    });
  }, [activeTab, tabDefs, opacityRefs, slidingAnim, fabSlidingAnim, refreshPosts, refreshData, mounted, tabWidth]);

  const headerTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE], outputRange: [0, -SCROLL_DISTANCE], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.4, SCROLL_DISTANCE], outputRange: [1, 0.2, 0], extrapolate: 'clamp' });
  const collapsedOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.7, SCROLL_DISTANCE], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const fabOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE * 0.8, SCROLL_DISTANCE], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const fabTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_DISTANCE], outputRange: [120, 0], extrapolate: 'clamp' });

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

  // 🔥 THIẾT KẾ MỚI "ĐANG HOT": Cực kỳ sắc nét, rõ màu, chuẩn giao diện cao cấp như image_7570a3.png
  const trendingSection = useMemo(() => (
    <View style={styles.trendingSection} pointerEvents="auto">
      <View style={styles.trendingHeaderCompact}>
        <LinearGradient 
          colors={['#FF6B00', '#FF2E00']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.trendingHeaderIcon}
        >
          <MaterialIcons name="local-fire-department" size={15} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.trendingTitleCompact, { color: colors.text }]}>Đang hot</Text>
      </View>

      <Animated.ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.hashtagScrollContent}
        decelerationRate="fast"
      >
        {loading ? 
          [...Array(4)].map((_, i) => <View key={i} style={[styles.hashtagSkeletonCompact, { backgroundColor: colors.menuBackground }]} />) 
          :
          trendingHashtags.slice(0, 10).map((item, index) => {
            const preset = CHIP_PRESETS[index % CHIP_PRESETS.length];
            const cleanTag = item.tag.replace('#', '');
            
            // Lấy cấu hình màu sắc tương ứng theo chế độ Light/Dark
            const currentGradient = isDark ? preset.darkGradient : preset.gradient;
            const currentTextColor = isDark ? preset.darkTextColor : preset.textColor;
            const currentBorder = isDark ? preset.darkBorderColor : preset.borderColor;
            const currentIconBg = isDark ? preset.darkIconBg : preset.iconBg;
            
            return (
              <ImpactButton 
                key={item.tag} 
                onPress={() => router.push({ pathname: '/(screens)/social/HashtagScreen', params: { hashtag: cleanTag } })} 
                style={[styles.hashtagChipCompact, { borderColor: currentBorder }]}
              >
                <LinearGradient 
                  colors={currentGradient} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={styles.hashtagGradientCompact}
                >
                  <View style={[styles.hashtagIconContainer, { backgroundColor: currentIconBg }]}>
                    <MaterialIcons name={preset.icon} size={18} color={preset.iconColor} />
                  </View>
                  
                  <View style={styles.hashtagCopy}>
                    <Text style={[styles.hashtagText, { color: currentTextColor }]} numberOfLines={1}>
                      #{cleanTag}
                    </Text>
                    <Text style={[styles.hashtagMeta, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)' }]} numberOfLines={1}>
                      {formatHashtagCount(item.count)}
                    </Text>
                  </View>
                </LinearGradient>
              </ImpactButton>
            );
          })
        }
      </Animated.ScrollView>
    </View>
  ), [loading, trendingHashtags, colors.menuBackground, colors.text, isDark]);

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
    effectiveHeaderHeight: HEADER_HEIGHT + FEED_TOP_SPACING - 20
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

          <View style={styles.content}>
            <Animated.View
              style={[styles.tabPane, { opacity: opacity1, zIndex: activeTab === 'index' ? 10 : 1, backgroundColor: 'transparent' }]}
              pointerEvents={pointerEvents1}
            >
              <Tab1Screen ref={tab1Ref} isActive={activeTab === 'index'} onScroll={handleTab1Scroll} />
            </Animated.View>
            <Animated.View
              style={[styles.tabPane, { opacity: opacity2, zIndex: activeTab === 'tab2' ? 10 : 1, backgroundColor: 'transparent' }]}
              pointerEvents={pointerEvents2}
            >
              {mounted.tab2 && <Tab2Screen ref={tab2Ref} isActive={activeTab === 'tab2'} onScroll={handleTab2Scroll} />}
            </Animated.View>
            <Animated.View
              style={[styles.tabPane, { opacity: opacity3, zIndex: activeTab === 'tab3' ? 10 : 1, backgroundColor: 'transparent' }]}
              pointerEvents={pointerEvents3}
            >
              {mounted.tab3 && <Tab3Screen ref={tab3Ref} isActive={activeTab === 'tab3'} onScroll={handleTab3Scroll} />}
            </Animated.View>
          </View>

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

        <AppDrawer
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
    height: HEADER_HEIGHT-20,
    zIndex: 1100,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGradient: { ...StyleSheet.absoluteFillObject },
  headerTintOverlay: { ...StyleSheet.absoluteFillObject },
  headerBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 },
  headerContent: { flex: 1, paddingTop: Platform.OS === 'ios' ? 55 : StatusBar.currentHeight + 13, paddingHorizontal: 14 },
  headerTop: { alignItems: 'center', marginBottom: 0, width: '100%' },
  controlsShell: {
    borderRadius: 32,
    padding: 2,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.34)',
  },
  controlsInner: {
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 8,
    borderWidth: 0,
  },
  headerTabsContainer: { flexDirection: 'row', gap: 4, borderRadius: 26, padding: 4, position: 'relative', flex: 1, marginRight: 0, overflow: 'hidden' },
  headerTab: { height: 42, borderRadius: 21, zIndex: 2, flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  headerTabActive: { shadowColor: '#BAE6FD', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 7 },
  slidingPill: { position: 'absolute', top: 4, left: 4, height: 42, borderRadius: 21, zIndex: 1, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 7 },
  tabTextActive: { fontSize: 13.5, fontWeight: '900', letterSpacing: -0.2, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  tabTextInactive: { fontSize: 13.5, fontWeight: '700', letterSpacing: -0.1, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, opacity: 0.72 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end', paddingRight: 2 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  actionBtnContainer: { width: 40, height: 40, borderRadius: 20, padding: 0, overflow: 'hidden', position: 'relative' },
  actionBtnInner: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  actionIconTintLayer: { ...StyleSheet.absoluteFillObject },
  headerBadge: { position: 'absolute', top: 4, right: 4 },
  
  // 💎 CSS ĐANG HOT ĐƯỢC LÀM MỚI TOÀN BỘ - CHUẨN SẮC NÉT
  trendingSection: { 
    marginTop: 16, 
    paddingHorizontal: 2, 
    paddingVertical: 4 
  },
  trendingHeaderCompact: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    paddingHorizontal: 4
  },
  trendingHeaderIcon: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 8,
    shadowColor: '#FF2E00', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 5, 
  },
  trendingTitleCompact: { 
    fontSize: 16, 
    fontWeight: '900', 
    letterSpacing: -0.4
  },
  hashtagScrollContent: { 
    gap: 12, 
    paddingRight: 24, 
    paddingLeft: 4, 
    paddingBottom: 4 
  },
  hashtagChipCompact: { 
    borderRadius: 18, 
    overflow: 'hidden', 
    height: 54, 
    width: 142, // Tăng thêm kích thước để chữ hiển thị trọn vẹn, không bị cụm từ "..."
    borderWidth: 1,
  },
  hashtagGradientCompact: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: '100%', 
    width: '100%', 
    paddingHorizontal: 10,
  },
  hashtagIconContainer: { 
    width: 32, 
    height: 32, 
    borderRadius: 12, // Bo góc giống hệt như trong hình ảnh tham khảo image_7570a3.png
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 10,
  },
  hashtagCopy: { 
    flex: 1, 
    minWidth: 0, 
    justifyContent: 'center',
  },
  hashtagText: { 
    fontSize: 14, 
    fontWeight: '900', // Đẩy độ dày font lên cao nhất để nét chữ rõ ràng
    letterSpacing: -0.2,
  },
  hashtagMeta: { 
    marginTop: 2, 
    fontSize: 11, 
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  hashtagSkeletonCompact: { 
    width: 142, 
    height: 54, 
    borderRadius: 18,
    opacity: 0.6
  },

  content: { flex: 1, backgroundColor: 'transparent' },
  tabPane: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  floatingActions: { position: 'absolute', bottom: 100, left: 14, right: 14, alignItems: 'center', zIndex: 1000 },
  collapsedHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 105 : 95, zIndex: 1100, elevation: 20 },
  collapsedContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 45 : 30 },
  collapsedIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  collapsedActions: { flexDirection: 'row', gap: 8 },
});
