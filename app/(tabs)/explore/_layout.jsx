import React, { useContext, useEffect, useRef, useState } from 'react';
import { Tabs, router, useSegments } from 'expo-router';
import { 
  Text, 
  StyleSheet, 
  View, 
  StatusBar, 
  Dimensions, 
  TouchableOpacity, 
  Animated, 
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '../../../context/ThemeContext';
import { ExploreHeaderProvider } from '../../../context/ExploreHeaderContext';
import { Link } from 'expo-router';
import useExploreData, { formatCount } from '../../../hooks/useExploreData';
import NotificationBadge from '../../../components/common/NotificationBadge';
import { ExploreProvider } from '../../../context/ExploreContext';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2', 
  accent: '#f093fb',
  success: '#4facfe',
  warning: '#f43f5e',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  
  dark: {
    bg: '#0a0a0a',
    surface: '#111827',
    card: '#1f2937',
    cardElevated: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    border: '#374151',
    borderLight: '#4b5563'
  },
  
  light: {
    bg: '#ffffff',
    surface: '#f8fafc',
    card: '#ffffff',
    cardElevated: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    border: '#e2e8f0',
    borderLight: '#f1f5f9'
  }
};

const HEADER_HEIGHT = Platform.OS === 'ios' ? 280 : 260;
const COLLAPSED_HEIGHT = Platform.OS === 'ios' ? 70 : 60;
const SCROLL_DISTANCE = HEADER_HEIGHT - COLLAPSED_HEIGHT;

const ICON_SIZE = 24;

const BUTTON_STYLES = {
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  }),
};

const ICON_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 4,
};

const TabButton = ({ tab, isActive, onPress, style, textStyle, inactiveStyle, activeGradientStyle }) => (
  <TouchableOpacity 
    style={style}
    onPressIn={onPress}
    activeOpacity={0.8}
  >
    {isActive ? (
      <LinearGradient
        colors={tab.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={activeGradientStyle || styles.fabTabGradient}
      >
        <Text style={textStyle}>{tab.label}</Text>
      </LinearGradient>
    ) : (
      <View style={inactiveStyle}>
        <Text style={styles.fabTextInactive}>{tab.label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default function ExploreLayout() {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState('tab1');
  
  // Use real data instead of hard-coded
  const { 
    notificationCount, 
    trendingHashtags, 
    loading, 
    error,
    refresh: refreshData 
  } = useExploreData();
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track collapse state to control pointer events for collapsedHeader
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      setIsCollapsed(value >= SCROLL_DISTANCE * 0.6);
    });
    return () => {
      // @ts-ignore removeListener accepts id
      scrollY.removeListener(id);
    };
  }, [scrollY]);

  const effectiveHeaderHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [HEADER_HEIGHT, COLLAPSED_HEIGHT],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    const currentSegment = segments[segments.length - 1];
    if (currentSegment === 'tab1' || currentSegment === 'tab2' || currentSegment === 'tab3') {
      setActiveTab(currentSegment);
    }
  }, [segments]);



  const handleTabPress = (tabName) => {
    setActiveTab(tabName);
    router.push(`/(tabs)/explore/${tabName}`);
  };



  const tabs = [
    { 
      key: 'tab1', 
      label: 'Mới Nhất',
      activeColor: COLORS.primary,
      gradient: ['#667eea', '#764ba2']
    },
    { 
      key: 'tab2', 
      label: 'Phổ Biến',
      activeColor: COLORS.warning,
      gradient: ['#f43f5e', '#DC2626']
    },
    { 
      key: 'tab3', 
      label: 'Theo Dõi',
      activeColor: COLORS.success,
      gradient: ['#4facfe', '#00f2fe']
    },
  ];

  const gradients = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7']
  ];

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const collapsedOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE * 0.6, SCROLL_DISTANCE],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });

  const iconScale = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [1, 0.6],
    extrapolate: 'clamp',
  });

  const fabOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const fabTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [200, 0],
    extrapolate: 'clamp',
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
    }
  );

  return (
    <ExploreProvider>
      <ExploreHeaderProvider value={{ scrollY, handleScroll, effectiveHeaderHeight }}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          <StatusBar 
            barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
            backgroundColor="transparent"
            translucent
          />
          
          <Animated.View 
            style={[
              styles.header,
              { 
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: headerTranslateY }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={theme === 'dark' 
                ? ['#667eea', '#764ba2', '#f093fb'] 
                : ['#667eea', '#764ba2', '#4facfe']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            />
            
            <View style={[styles.glassOverlay, { backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.85)' : 'rgba(248, 250, 252, 0.85)' }]} pointerEvents="none" />

            <Animated.View 
              style={[
                styles.collapsedHeader,
                { 
                  opacity: collapsedOpacity,
                  backgroundColor: colors.surface + '95'
                }
              ]}
              pointerEvents={isCollapsed ? 'auto' : 'none'}
            >
              <View style={styles.collapsedContent}>
                <Animated.View 
                  style={{ transform: [{ scale: iconScale }] }}
                >
                  <View style={styles.collapsedIcon}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.collapsedIconGradient}
                    >
                      <MaterialIcons name="explore" size={ICON_SIZE} color="white" />
                    </LinearGradient>
                  </View>
                </Animated.View>
                
                <View style={styles.collapsedActions}>
                  <TouchableOpacity 
                    style={styles.collapsedActionBtn}
                    onPressIn={() => router.push('/NotificationsScreen')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.notificationGlass}> 
                      <LinearGradient
                        colors={['#f093fb', '#f5576c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.notificationBorder}
                      >
                        <View style={[styles.collapsedActionInner, { backgroundColor: colors.card }]}>
                          <MaterialIcons name="notifications" size={ICON_SIZE} color="#f093fb" />
                        </View>
                      </LinearGradient>
                      <NotificationBadge 
                        count={notificationCount}
                        size="small"
                        backgroundColor="#f093fb"
                        style={styles.collapsedBadge}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.collapsedActionBtn}
                    onPressIn={() => router.push('/HotSpotsScreen')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.warning, '#DC2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.collapsedActionBtnGradient}
                    >
                      <MaterialIcons name="local-fire-department" size={ICON_SIZE} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            <View style={styles.headerContent}>
              <Animated.View 
                style={{ opacity: headerOpacity }}
              >
                <View style={styles.headerTop}>
                  <View style={styles.titleSection}>
                    <View style={styles.headerTabsContainer}>
                      {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;

                        return (
                          <TabButton
                            key={tab.key}
                            tab={tab}
                            isActive={isActive}
                            onPress={() => handleTabPress(tab.key)}
                            style={styles.headerTab}
                            textStyle={styles.headerTabTextActive}
                            inactiveStyle={[styles.headerTabInactive, { backgroundColor: colors.card + 'CC' }]}
                            activeGradientStyle={styles.headerTabGradient}
                          />
                        );
                      })}
                    </View>
                  </View>
                  
                  <View style={styles.headerActions}>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPressIn={() => router.push('/NotificationsScreen')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.notificationGlass}>
                        <LinearGradient
                          colors={['#f093fb', '#f5576c']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.notificationBorder}
                        >
                          <View style={[styles.notificationInner, { backgroundColor: colors.card }]}>
                            <MaterialIcons name="notifications" size={ICON_SIZE} color="#f093fb" />
                          </View>
                        </LinearGradient>
                      </View>
                      <NotificationBadge 
                        count={notificationCount}
                        size="medium"
                        backgroundColor="#f093fb"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPressIn={() => router.push('/HotSpotsScreen')}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[COLORS.warning, '#DC2626']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.actionBtnGradient}
                      >
                        <MaterialIcons name="local-fire-department" size={ICON_SIZE} color="white" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>

              <Animated.View 
                style={{ opacity: headerOpacity }}
              >
                <View style={styles.trendingSection}>
                  <View style={styles.trendingHeaderCompact}>
                    <Text style={[styles.trendingTitleCompact, { color: colors.text }]}>Trending Now</Text>
                    <TouchableOpacity 
                      onPressIn={refreshData}
                      activeOpacity={0.7}
                      style={styles.refreshBtnCompact}
                    >
                      <MaterialIcons name="refresh" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {error && (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={16} color={Colors.error} />
                      <Text style={[styles.errorText, { color: Colors.error }]} numberOfLines={1}>
                        {error.includes('storage/retry-limit-exceeded') ? 'Network timeout - tap to retry' : 'Tap to retry'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.hashtagGridCompact}>
                    {loading ? (
                      [...Array(4)].map((_, i) => (
                        <View 
                          key={i} 
                          style={[styles.hashtagSkeletonCompact, { backgroundColor: colors.card }]} 
                        />
                      ))
                    ) : null}
                    {!loading ? (
                      trendingHashtags.map((item, index) => {
                        const displayTag = item.tag || '#hashtag';
                        const cleanTag = displayTag.replace(/^#/, '').trim();
                        const count = item.count || 0;

                        return (
                          <Link
                            key={displayTag || `hashtag_${index}`}
                            href={{ pathname: '/HashtagScreen', params: { hashtag: cleanTag } }}
                            asChild
                          >
                            <TouchableOpacity
                              style={styles.hashtagChipCompact}
                              disabled={!cleanTag}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPressIn={() => {}}
                              activeOpacity={0.8}
                              accessibilityRole="button"
                              accessibilityLabel={`Xem hashtag ${displayTag}`}
                            >
                              <LinearGradient
                                colors={gradients[index % 4]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.hashtagGradientCompact}
                              >
                                <Text style={styles.hashtagTextCompact}>{displayTag}</Text>
                                <View style={styles.hashtagMetaCompact}>
                                  <MaterialIcons name="trending-up" size={8} color="white" />
                                  <Text style={styles.hashtagCountCompact}>{formatCount(count)}</Text>
                                </View>
                              </LinearGradient>
                            </TouchableOpacity>
                          </Link>
                        );
                      })
                    ) : null}
                  </View>
                </View>
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.floatingActions,
              {
                opacity: fabOpacity,
                transform: [{ translateY: fabTranslateY }]
              }
            ]}
            pointerEvents="box-none"
          >
            <View 
              style={[styles.fabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
              pointerEvents="auto"
            >
              {tabs.map((tab) => (
                <TabButton
                  key={tab.key}
                  tab={tab}
                  isActive={activeTab === tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  style={styles.fabTab}
                  textStyle={styles.fabTextActive}
                  inactiveStyle={[styles.fabTabInactive, { backgroundColor: colors.card }]}
                />
              ))}

              <TouchableOpacity 
                style={styles.fabIcon}
                onPressIn={() => router.push('/NotificationsScreen')}
                activeOpacity={0.8}
              >
                <View style={styles.notificationGlass}>
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.notificationBorder}
                  >
                    <View style={[styles.notificationInner, { backgroundColor: colors.card }]}>
                      <MaterialIcons name="notifications" size={ICON_SIZE} color="#f093fb" />
                    </View>
                  </LinearGradient>
                </View>
                <NotificationBadge 
                  count={notificationCount}
                  size="medium"
                  backgroundColor="#f093fb"
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.fabIcon}
                onPressIn={() => router.push('/HotSpotsScreen')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.warning, '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fabGradient}
                >
                  <MaterialIcons name="local-fire-department" size={ICON_SIZE} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.content}>
            <Animated.View style={styles.contentInner}>
              <Tabs 
                screenOptions={{ 
                  tabBarStyle: { display: 'none' }, 
                  headerShown: false,
                  lazy: true,
                  swipeEnabled: false
                }}
              >
                <Tabs.Screen name="index" options={{ tabBarButton: () => null }} />
                <Tabs.Screen name="tab1" options={{ tabBarButton: () => null }} />
                <Tabs.Screen name="tab2" options={{ tabBarButton: () => null }} />
                <Tabs.Screen name="tab3" options={{ tabBarButton: () => null }} />
              </Tabs>
            </Animated.View>
          </View>
        </View>
      </ExploreHeaderProvider>
    </ExploreProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 10,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.95,
  },
  
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(15px)',
  },
  
  collapsedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: COLLAPSED_HEIGHT,
    zIndex: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  
  collapsedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
  },
  
  collapsedIcon: {
    marginRight: 12,
  },
  
  collapsedIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  
  collapsedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  
  collapsedActionBtn: {
    borderRadius: 21,
    overflow: 'visible', // avoid clipping small badge in collapsed header
  },

  collapsedActionBorder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  collapsedActionInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  collapsedActionBtnGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  
  collapsedBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: COLORS.accent,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  
  collapsedBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },
  
  headerContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 68 : (StatusBar.currentHeight || 24) + 28, // compact top padding
    paddingHorizontal: 24,
    paddingBottom: 20,
    position: 'relative',
    zIndex: 2,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // compact spacing
  },
  
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  headerTabsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  
  headerTab: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent', // tab mặc định không có background
  },

  headerTabGradient: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: undefined, // chỉ dùng LinearGradient cho tab active
  },

  headerTabInactive: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: 'transparent', // tab inactive không có background
  },

  headerTabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.3,
  },

  headerTabTextInactive: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  
  headerActions: {
    flexDirection: 'row',
    gap: 4, // giảm khoảng cách giữa các icon
    alignItems: 'center',
  },
  
  actionBtn: {
    borderRadius: 24,
    overflow: 'visible', // allow badge to overflow (Android clip workaround)
    position: 'relative', // anchor badge absolutely
  },

  actionBtnGlass: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
    shadowColor: '#f093fb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  actionBtnBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  actionBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  actionBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },

  trendingSection: {
    marginBottom: 12, // compact
  },

  trendingHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  trendingTitleCompact: {
    fontSize: 16,
    fontWeight: '700',
  },

  refreshBtnCompact: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  hashtagGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  hashtagChipCompact: {
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
    minWidth: '45%',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  hashtagGradientCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hashtagTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },

  hashtagMetaCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },

  hashtagCountCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },

  hashtagSkeletonCompact: {
    borderRadius: 16,
    height: 32,
    flex: 1,
    minWidth: '45%',
    opacity: 0.6,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },

  errorText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  
  content: {
    flex: 1,
    zIndex: 1,
  },
  
  contentInner: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  
  floatingActions: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    right: 20,
    left: 20,
    zIndex: 100,
    elevation: 30, // ensure overlay is above for Android hit testing
  },
  
  fabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  fabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'visible',
    position: 'relative', // allow absolute badge positioning
  },
  
  fabTab: {
    minWidth: 70,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },

  fabTabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fabTabInactive: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  fabTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.3,
  },

  fabTextInactive: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  
  fabGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  
  fabGlass: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
    shadowColor: '#f093fb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: 'transparent', // Removed white background
    overflow: 'visible',
  },

  notificationGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'relative',
    shadowColor: '#f093fb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  
  notificationBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  
  notificationInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
});