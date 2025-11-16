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
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

const SCROLL_DISTANCE = Platform.OS === 'ios' ? 280 - 70 : 260 - 60;

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
    onPress={onPress}
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
        <Text style={[styles.fabTextInactive, { color: tab.inactiveColor }]}>{tab.label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default function ExploreLayout() {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState('tab1');
  
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

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      setIsCollapsed(value >= SCROLL_DISTANCE * 0.6);
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const effectiveHeaderHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [Platform.OS === 'ios' ? 280 : 260, Platform.OS === 'ios' ? 70 : 60],
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
      activeColor: colors.primary,
      gradient: (colors.gradients && colors.gradients.neon) ? colors.gradients.neon : ['#f093fb', '#f5576c'],
      inactiveColor: colors.mutedText,
    },
    { 
      key: 'tab2', 
      label: 'Phổ Biến',
      activeColor: colors.error,
      gradient: (colors.gradients && colors.gradients.neon) ? colors.gradients.neon : ['#f093fb', '#f5576c'],
      inactiveColor: colors.mutedText,
    },
    { 
      key: 'tab3', 
      label: 'Theo Dõi',
      activeColor: colors.success,
      gradient: (colors.gradients && colors.gradients.neon) ? colors.gradients.neon : ['#f093fb', '#f5576c'],
      inactiveColor: colors.mutedText,
    },
  ];

  const gradients = [
    Array.isArray(colors.gradientBackground) ? colors.gradientBackground : ['#667eea', '#764ba2'],
    Array.isArray(colors.gradientCard) ? colors.gradientCard : (theme === 'dark' ? ['#1E293B', '#334155'] : ['#FFFFFF', '#F8FAFC']),
    Array.isArray(colors.gradientHotSpotsPrimary) ? colors.gradientHotSpotsPrimary : ['#FF6B35', '#F7931E'],
    ['#43e97b', '#38f9d7'],
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
    { useNativeDriver: false }
  );

  return (
    <ExploreProvider>
      <ExploreHeaderProvider value={{ scrollY, handleScroll, effectiveHeaderHeight }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                ? ['#1a1a2e', '#16213e'] 
                : ['#4facfe', '#00f2fe']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            />
            
            <View
              style={[
                styles.glassOverlay,
                {
                  backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)'
                }
              ]}
              pointerEvents="none"
            />

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
                      colors={colors.gradientBackground}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.collapsedIconGradient}
                    >
                      <MaterialIcons name="explore" size={ICON_SIZE} color={colors.headerText} />
                    </LinearGradient>
                  </View>
                </Animated.View>
                
                <View style={styles.collapsedActions}>
                  <TouchableOpacity 
                    style={styles.collapsedActionBtn}
                    onPress={() => router.push('/NotificationsScreen')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.notificationGlass}> 
                      <LinearGradient
                        colors={(colors.gradients && colors.gradients.neon) ? colors.gradients.neon : ['#f093fb', '#f5576c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.notificationBorder}
                      >
                        <View style={[styles.collapsedActionInner, { backgroundColor: colors.cardBackground }]}>
                          <MaterialIcons name="notifications" size={ICON_SIZE} color={colors.highlightText} />
                        </View>
                      </LinearGradient>
                      <NotificationBadge 
                        count={notificationCount}
                        size="small"
                        backgroundColor={colors.highlightText}
                        style={styles.collapsedBadge}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.collapsedActionBtn}
                    onPress={() => router.push('/HotSpotsScreen')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.notificationGlass}> 
                      <LinearGradient
                        colors={['#ff7e5f', '#feb47b']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.notificationBorder}
                      >
                        <View style={[styles.collapsedActionInner, { backgroundColor: colors.cardBackground }]}>
                          <MaterialIcons name="local-fire-department" size={ICON_SIZE} color={colors.hotSpotsIcon} />
                        </View>
                      </LinearGradient>
                    </View>
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
                            textStyle={[styles.headerTabTextActive, { color: colors.headerText }]}
                            inactiveStyle={[styles.headerTabInactive, { backgroundColor: colors.cardBackground + 'CC' }]}
                            activeGradientStyle={styles.headerTabGradient}
                          />
                        );
                      })}
                    </View>
                  </View>
                  
                  <View style={styles.headerActions}>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => router.push('/NotificationsScreen')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.notificationGlass}>
                        <LinearGradient
                          colors={(colors.gradients && colors.gradients.neon) ? colors.gradients.neon : ['#f093fb', '#f5576c']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.notificationBorder}
                        >
                          <View style={[styles.notificationInner, { backgroundColor: colors.cardBackground }]}>
                            <MaterialIcons name="notifications" size={ICON_SIZE} color={colors.highlightText} />
                          </View>
                        </LinearGradient>
                      </View>
                      <NotificationBadge 
                        count={notificationCount}
                        size="medium"
                        backgroundColor={colors.highlightText}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => router.push('/HotSpotsScreen')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.notificationGlass}>
                        <LinearGradient
                          colors={['#ff7e5f', '#feb47b']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.notificationBorder}
                        >
                          <View style={[styles.notificationInner, { backgroundColor: colors.cardBackground }]}>
                            <MaterialIcons name="local-fire-department" size={ICON_SIZE} color={colors.hotSpotsIcon} />
                          </View>
                        </LinearGradient>
                      </View>
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
                      onPress={refreshData}
                      activeOpacity={0.7}
                      style={styles.refreshBtnCompact}
                    >
                      <MaterialIcons name="refresh" size={18} color={colors.subtleText} />
                    </TouchableOpacity>
                  </View>

                  {error && (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="error-outline" size={16} color={colors.error} />
                      <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={1}>
                        {error.includes('storage/retry-limit-exceeded') ? 'Network timeout - tap to retry' : 'Tap to retry'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.hashtagGridCompact}>
                    {loading ? (
                      [...Array(4)].map((_, i) => (
                        <View 
                          key={i} 
                          style={[styles.hashtagSkeletonCompact, { backgroundColor: colors.cardBackground }]} 
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
                              activeOpacity={0.8}
                              accessibilityRole="button"
                              accessibilityLabel={`Xem hashtag ${displayTag}`}
                            >
                              <LinearGradient
                                colors={gradients[index % gradients.length]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.hashtagGradientCompact}
                              >
                                <Text style={[styles.hashtagTextCompact, { color: '#FFFFFF' }]}>{displayTag}</Text>
                                <View style={styles.hashtagMetaCompact}>
                                  <MaterialIcons name="trending-up" size={8} color="#FFFFFF" />
                                  <Text style={[styles.hashtagCountCompact, { color: '#FFFFFF' }]}>{formatCount(count)}</Text>
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
              style={[
                styles.fabContainer, 
                { 
                  backgroundColor: theme === 'dark' ? 'rgba(26, 31, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: colors.borderLight 
                }
              ]}
              pointerEvents="auto"
            >
              {tabs.map((tab) => (
                <TabButton
                  key={tab.key}
                  tab={tab}
                  isActive={activeTab === tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  style={styles.fabTab}
                  textStyle={[styles.fabTextActive, { color: colors.headerText }]}
                  inactiveStyle={[styles.fabTabInactive, { backgroundColor: colors.cardBackground }]}
                />
              ))}

              <TouchableOpacity 
                style={styles.fabIcon}
                onPress={() => router.push('/NotificationsScreen')}
                activeOpacity={0.8}
              >
                <View style={styles.notificationGlass}>
                  <LinearGradient
                    colors={(colors.gradients && colors.gradients.neon) ? colors.gradients.neon : ['#f093fb', '#f5576c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.notificationBorder}
                  >
                    <View style={[styles.notificationInner, { backgroundColor: colors.cardBackground }]}>
                      <MaterialIcons name="notifications" size={ICON_SIZE} color={colors.highlightText} />
                    </View>
                  </LinearGradient>
                </View>
                <NotificationBadge 
                  count={notificationCount}
                  size="medium"
                  backgroundColor={colors.highlightText}
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.fabIcon}
                onPress={() => router.push('/HotSpotsScreen')}
                activeOpacity={0.8}
              >
                <View style={styles.notificationGlass}>
                  <LinearGradient
                    colors={['#ff7e5f', '#feb47b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.notificationBorder}
                  >
                    <View style={[styles.notificationInner, { backgroundColor: colors.cardBackground }]}>
                      <MaterialIcons name="local-fire-department" size={ICON_SIZE} color={colors.hotSpotsIcon} />
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.content}>
            <Animated.View style={[styles.contentInner, { backgroundColor: colors.background }]}> 
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
    height: Platform.OS === 'ios' ? 280 : 260,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    elevation: 15,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.95,
  },
  
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backdropFilter: 'blur(15px)',
  },
  
  collapsedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 70 : 60,
    zIndex: 5,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: Colors.primary,
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
    shadowColor: Colors.primary,
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
    overflow: 'visible',
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
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  
  collapsedBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  
  headerContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 68 : (StatusBar.currentHeight || 24) + 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
    position: 'relative',
    zIndex: 2,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: 'transparent',
  },

  headerTabGradient: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: 'transparent',
  },

  headerTabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  headerActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  
  actionBtn: {
    borderRadius: 24,
    overflow: 'visible',
    position: 'relative',
  },

  actionBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  
  trendingSection: {
    marginBottom: 12,
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
    shadowColor: Colors.primary,
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
    elevation: 30,
  },
  
  fabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
  },
  
  fabIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'visible',
    position: 'relative',
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
    fontSize: 13,
    fontWeight: '700',
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
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  
  notificationGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'relative',
    shadowColor: Colors.secondary,
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
});