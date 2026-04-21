import React, { useContext, useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, BackHandler, ToastAndroid, Platform, useWindowDimensions, InteractionManager } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import ListUser from '@/components/home/ListUser';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useStateCommon } from '@/context/stateCommon';
import useHome from './useHome';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import LiquidScreen from '@/components/liquid/LiquidScreen';
import HomeHeader from '@/components/home/HomeHeader';
import { RevealScalableView } from '@/components/reveal';
import AppDrawer from '@/components/drawer/AppDrawer';
import FeatureActionDrawer from '@/components/drawer/FeatureActionDrawer';

// Premium Loading State using Skeletons
const LoadingView = ({ theme, currentThemeColors }) => (
  <View style={[styles.centerContainer, { backgroundColor: 'transparent', justifyContent: 'flex-start', paddingTop: 100 }]}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <View key={i} style={[styles.skeletonCard, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <View style={[styles.skeletonAvatar, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E2E8F0' }]} />
        <View style={styles.skeletonTextContainer}>
          <View style={[styles.skeletonLine, { width: 140, height: 18, marginBottom: 8, borderRadius: 4, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E2E8F0' }]} />
          <View style={[styles.skeletonLine, { width: 220, height: 14, marginBottom: 12, borderRadius: 4, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E2E8F0' }]} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.skeletonLine, { width: 60, height: 26, borderRadius: 13, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E2E8F0' }]} />
            <View style={[styles.skeletonLine, { width: 70, height: 26, borderRadius: 13, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E2E8F0' }]} />
          </View>
        </View>
        <View style={[styles.skeletonButton, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E2E8F0' }]} />
      </View>
    ))}
  </View>
);

// Empty State with Premium Feel
const EmptyView = ({ theme, currentThemeColors, t }) => (
  <View style={[styles.centerContainer, { backgroundColor: 'transparent' }]}>
    <View style={[styles.emptyGlassContainer, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
      <View style={[styles.emptyIconCircle, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <MaterialIcons name="person-search" size={60} color={currentThemeColors.subtleText} />
      </View>
      <Text style={[styles.emptyText, { color: currentThemeColors.text }]}>{t('home.no_users')}</Text>
      <Text style={[styles.emptySubText, { color: currentThemeColors.subtleText }]}>{t('home.no_users_desc')}</Text>
    </View>
  </View>
);

// Error State with Retry logic
const ErrorView = ({ error, onRetry, currentThemeColors, t }) => (
  <View style={[styles.centerContainer, { backgroundColor: 'transparent' }]}>
    <View style={[styles.errorGlassContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
      <MaterialIcons name="error-outline" size={50} color={Colors.warning} />
      <Text style={[styles.errorText, { color: currentThemeColors.text }]}>{error}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
        <LinearGradient colors={['#FF5F6D', '#FFC371']} style={styles.retryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.retryText}>{t('home.retry')}</Text>
          <MaterialIcons name="refresh" size={18} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </View>
);

function Home() {
  const { t } = useTranslation();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const router = useRouter();
  const { stateCommon } = useStateCommon();
  const currentThemeColors = useMemo(() =>
    Colors[theme] || Colors.light,
    [theme]
  );

  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const lastPressRef = useRef(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerTab, setDrawerTab] = useState('filter');
  const [featureDrawer, setFeatureDrawer] = useState(null);
  const drawerOffset = useMemo(() => Math.min(width * 0.62, 250), [width]);
  const revealActive = drawerVisible || !!featureDrawer;
  const { users, loading, refreshing, error, loadMore, hasMore, refresh } = useHome(isFocused);
  const activeFiltersCount = useMemo(() => {
    const f = stateCommon?.filter || {};
    let count = 0;
    if (f.gender && f.gender !== 'all') count++;
    if (f.minAge) count++;
    if (f.maxAge) count++;
    if (f.distance && f.distance !== 'all') count++;
    if (f.educationLevel) count++;
    if (f.job) count++;
    if (Array.isArray(f.interests) && f.interests.length > 0) count++;
    return count;
  }, [stateCommon?.filter]);

  const openFilterDrawer = useCallback(() => {
    setFeatureDrawer(null);
    setDrawerTab('filter');
    setDrawerVisible(true);
  }, []);

  const openSettingsDrawer = useCallback(() => {
    setFeatureDrawer(null);
    setDrawerTab('settings');
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const openFeatureDrawer = useCallback((key) => {
    setDrawerVisible(false);
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setFeatureDrawer(key);
      });
    });
  }, []);

  const closeFeatureDrawer = useCallback(() => {
    setFeatureDrawer(null);
  }, []);

  const openRadar = useCallback(() => {
    router.push('/ProximityRadar');
  }, [router]);

  // Handle Android Back Button to exit app
  useEffect(() => {
    const onBackPress = () => {
      if (!isFocused) return false;
      if (featureDrawer) {
        setFeatureDrawer(null);
        return true;
      }
      if (drawerVisible) {
        setDrawerVisible(false);
        return true;
      }
      const now = Date.now();
      if (now - lastPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastPressRef.current = now;
      ToastAndroid.show(t('home.exit_app'), ToastAndroid.SHORT);
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [drawerVisible, featureDrawer, isFocused, t]);

  const onRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const content = useMemo(() => {
    if (loading && users.length === 0) return <LoadingView theme={theme} currentThemeColors={currentThemeColors} />;
    if (error && users.length === 0) return <ErrorView error={error} onRetry={refresh} currentThemeColors={currentThemeColors} t={t} />;
    if (!loading && users.length === 0) return <EmptyView theme={theme} currentThemeColors={currentThemeColors} t={t} />;

    return (
      <ListUser
        users={users}
        refreshing={refreshing}
        onRefresh={onRefresh}
        loadMore={loadMore}
        hasMore={hasMore}
        loading={loading}
      />
    );
  }, [loading, users, error, refreshing, refresh, theme, currentThemeColors, onRefresh, loadMore, hasMore, t]);

  return (
    <LiquidScreen themeMode={theme}>
      <RevealScalableView
        revealed={revealActive}
        side="left"
        scale={0.86}
        offset={drawerOffset}
        style={styles.revealContainer}
      >
        <HomeHeader
          activeFiltersCount={activeFiltersCount}
          onOpenFilter={openFilterDrawer}
          onOpenSettings={openSettingsDrawer}
          onOpenRadar={openRadar}
        />
        <View style={styles.contentContainer}>
          <View style={styles.contentBody}>
            {content}
          </View>
        </View>
      </RevealScalableView>

      <AppDrawer
        visible={drawerVisible}
        tab={drawerTab}
        onClose={closeDrawer}
      />

      <FeatureActionDrawer
        visible={!!featureDrawer}
        drawerKey={featureDrawer}
        onClose={closeFeatureDrawer}
      />
    </LiquidScreen>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 116 : 96,
  },
  contentBody: {
    flex: 1,
  },
  revealContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  skeletonCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  skeletonTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  skeletonLine: {
    // borderRadius: 4, // defined inline now
  },
  skeletonButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 10,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  emptyGlassContainer: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    width: '85%',
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 20,
  },
  errorGlassContainer: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    width: '85%',
  },
  errorText: {
    marginVertical: 15,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 5,
    borderRadius: 25,
    overflow: 'hidden',
  },
  retryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

