import React, { useContext, useMemo, useCallback, useEffect, useState, memo } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { isDarkTheme } from '../../constants/Colors';
import { View, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { RefreshProvider, useRefresh } from '../../context/RefreshContext';
import { getLiquidPalette } from '../../components/liquid/liquidStyles';

const AnimatedText = Animated.createAnimatedComponent(Text);

const TAB_META = {
  home: {
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  explore: {
    label: 'Explore',
    activeIcon: 'search',
    inactiveIcon: 'search-outline',
  },
  chat: {
    label: 'Chat',
    activeIcon: 'chatbubble-ellipses',
    inactiveIcon: 'chatbubble-ellipses-outline',
  },
  groups: {
    label: 'Groups',
    activeIcon: 'people',
    inactiveIcon: 'people-outline',
  },
  profile: {
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
};

const springConfig = {
  damping: 18,
  stiffness: 240,
  mass: 0.9,
};

const LiquidTabItem = memo(function LiquidTabItem({
  routeName,
  focused,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  activeColor,
  inactiveColor,
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  const tabMeta = TAB_META[routeName] || {
    label: routeName,
    activeIcon: 'ellipse',
    inactiveIcon: 'ellipse-outline',
  };

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, progress]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + progress.value * 0.28,
    transform: [
      { translateY: (1 - progress.value) * 2 },
      { scale: 0.96 + progress.value * 0.06 },
    ],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.tabItemPressable}
      android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: true }}
    >
      <Animated.View style={[styles.tabItemInner, animatedContentStyle]}>
        <Ionicons
          name={focused ? tabMeta.activeIcon : tabMeta.inactiveIcon}
          size={20}
          color={focused ? activeColor : inactiveColor}
        />
        <AnimatedText style={[styles.tabLabel, animatedLabelStyle]}>
          {tabMeta.label}
        </AnimatedText>
      </Animated.View>
    </Pressable>
  );
});

function LiquidGlassTabBar({ state, descriptors, navigation, insets, theme }) {
  const [barWidth, setBarWidth] = useState(0);
  const sliderTranslateX = useSharedValue(0);
  const sliderWidth = useSharedValue(0);
  const enableBlur = Platform.OS === 'ios';

  const palette = useMemo(() => {
    const p = getLiquidPalette(theme);
    const themeIsDark = isDarkTheme(theme);
    return {
      ...p,
      bezelGradient: theme === 'midnight' ? ['#0F172A', '#0D1117', '#1E293B'] : 
                    theme === 'emerald' ? ['#064E3B', '#022C22', '#065F56'] :
                    theme === 'sunset' ? ['#451A03', '#2B140A', '#452A20'] :
                    theme === 'dark' ? ['#1E3A5F', '#0A192F', '#0D1B2A'] :
                    ['#E1E8F0', '#C0CBD9', '#D1D9E6'],
      bezelStroke: theme === 'midnight' ? 'rgba(99, 102, 241, 0.35)' :
                   theme === 'emerald' ? 'rgba(16, 185, 129, 0.35)' :
                   theme === 'sunset' ? 'rgba(245, 158, 11, 0.35)' :
                   theme === 'dark' ? 'rgba(100, 180, 255, 0.35)' :
                   'rgba(150, 190, 220, 0.45)',
      activePill: !themeIsDark ? 
                 ['rgba(14, 165, 233, 0.2)', 'rgba(14, 165, 233, 0.05)'] :
                 ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.02)'],
      sphereGradient: p.sphereGradient,
      sphereGlow: p.glowTop[0] || 'rgba(0,0,0,0.1)',
      baseGradient: p.appGradient, // Use app gradient as base for tab glass glass
      innerStroke: p.menuBorder,
      activeColor: p.textColor,
      inactiveColor: p.subtitleColor,
    };
  }, [theme]);

  const isDarkBase = isDarkTheme(theme);

  // Tab 2 has flex 1.2, others have flex 1. Total flex = 5.2
  // We calculate position based on this proportional layout
  useEffect(() => {
    if (!barWidth) return;
    
    const totalFlex = 5.2;
    const unitWidth = (barWidth - 16) / totalFlex; // -16 for padding
    
    let targetX = 8;
    let targetWidth = unitWidth;

    if (state.index === 0) {
      targetX = 8;
    } else if (state.index === 1) {
      targetX = 8 + unitWidth;
    } else if (state.index === 2) {
      targetX = 8 + 2 * unitWidth;
      targetWidth = unitWidth * 1.2;
    } else if (state.index === 3) {
      targetX = 8 + 3.2 * unitWidth;
    } else if (state.index === 4) {
      targetX = 8 + 4.2 * unitWidth;
    }

    sliderTranslateX.value = withSpring(targetX + 4, springConfig);
    sliderWidth.value = withSpring(targetWidth - 8, springConfig);
  }, [barWidth, state.index]);

  const activePillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderTranslateX.value }],
    width: sliderWidth.value,
  }));

  const bottomOffset = Platform.OS === 'ios' ? Math.max(insets.bottom - 4, 8) : 12;

  return (
    <View pointerEvents="box-none" style={[styles.tabHost, { bottom: bottomOffset }]}>
      <View style={[styles.tabBezel, { borderColor: palette.bezelStroke }]}>
        <LinearGradient
          colors={palette.bezelGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View
          style={[styles.tabGlass]}
          onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        >
          <LinearGradient
            colors={palette.baseGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          
          {enableBlur ? (
            <BlurView
              intensity={isDarkBase ? 35 : 25}
              tint={isDarkBase ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDarkBase ? 'rgba(10,24,36,0.85)' : 'rgba(240,248,255,0.85)' }]} />
          )}

          <View pointerEvents="none" style={[styles.innerStroke, { borderColor: palette.innerStroke }]} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
            style={styles.topShine}
          />

          {/* Active indicator (pill) - Hidden for center sphere */}
          {state.index !== 2 && (
            <Animated.View style={[styles.activePill, activePillStyle]}>
              <LinearGradient
                colors={palette.activePill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.activePillTopLine} />
            </Animated.View>
          )}

          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = state.index === index;
              const isCenter = index === 2;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              if (isCenter) {
                return (
                  <Pressable key={route.key} onPress={onPress} style={styles.centerTabContainer}>
                    <View style={[styles.sphereContainer, focused && { shadowColor: palette.sphereGlow, shadowOpacity: 0.6, shadowRadius: 15 }]}>
                      <LinearGradient
                        colors={palette.sphereGradient}
                        start={{ x: 0.2, y: 0.2 }}
                        end={{ x: 0.8, y: 0.8 }}
                        style={styles.liquidSphere}
                      />
                      <LinearGradient
                        colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']}
                        style={styles.sphereHighlight}
                      />
                      <View style={styles.sphereIcon}>
                        <Ionicons 
                          name={focused ? TAB_META[route.name]?.activeIcon : TAB_META[route.name]?.inactiveIcon} 
                          size={24} 
                          color="#FFF" 
                        />
                      </View>
                    </View>
                  </Pressable>
                );
              }

              return (
                <LiquidTabItem
                  key={route.key}
                  routeName={route.name}
                  focused={focused}
                  onPress={onPress}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarButtonTestID}
                  activeColor={palette.activeColor}
                  inactiveColor={palette.inactiveColor}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function TabsLayoutContent() {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const router = useRouter();
  const { triggerRefresh } = useRefresh();

  const screenOptions = useMemo(() => ({
    tabBarShowLabel: false,
    headerShown: false,
    tabBarStyle: {
      position: 'absolute',
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      height: 0,
    },
    freezeOnBlur: true,
    lazy: true,
    sceneContainerStyle: { backgroundColor: 'transparent' },
    contentStyle: { backgroundColor: 'transparent' },
  }), []);

  const createTabListeners = useCallback((tabName, onFocusedPress) => ({ navigation, route }) => ({
    tabPress: (e) => {
      const state = navigation.getState();
      const isFocused = state.routes[state.index].name === route.name;
      if (isFocused) {
        e.preventDefault();
        triggerRefresh(tabName);
        onFocusedPress?.();
      }
    },
  }), [triggerRefresh]);

  return (
    <Tabs
      screenOptions={screenOptions}
      tabBar={(props) => <LiquidGlassTabBar {...props} theme={theme} />}
    >
      <Tabs.Screen name="home" listeners={createTabListeners('home')} />
      <Tabs.Screen name="explore" listeners={createTabListeners('explore')} />
      <Tabs.Screen name="chat" listeners={createTabListeners('chat')} />
      <Tabs.Screen name="groups" listeners={createTabListeners('groups')} />
      <Tabs.Screen name="profile" listeners={createTabListeners('profile', () => router.replace('/(tabs)/profile'))} />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <RefreshProvider>
      <TabsLayoutContent />
    </RefreshProvider>
  );
}

const styles = StyleSheet.create({
  tabHost: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  tabBezel: {
    width: '100%',
    height: 74,
    borderRadius: 37,
    padding: 3,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tabGlass: {
    flex: 1,
    borderRadius: 34,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    borderWidth: 1,
  },
  topShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 8,
  },
  tabItemPressable: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  activePill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden', // Added to fix the square background issue
  },
  activePillTopLine: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  centerTabContainer: {
    flex: 1.2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sphereContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  liquidSphere: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
  },
  sphereHighlight: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sphereIcon: {
    zIndex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
