import React, { useContext, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, BackHandler, ToastAndroid, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import ListUser from '@/components/home/ListUser';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import useHome from './useHome';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DeferredComponent from '@/components/DeferredComponent';
import { useRefresh } from '@/context/RefreshContext';

// Memoized loading component
const LoadingView = memo(({ theme, currentThemeColors }) => (
  <View style={styles.loadingContainer}>
    <LinearGradient
      colors={theme === 'dark'
        ? ['#1a1a2e', '#16213e']
        : ['#f8fafc', '#e2e8f0']
      }
      style={styles.loadingGradient}
    >
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
          Đang tìm kiếm người dùng...
        </Text>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </LinearGradient>
  </View>
));

// Memoized empty state component
const EmptyView = memo(({ currentThemeColors }) => (
  <View style={styles.emptyContainer}>
    <MaterialIcons name="people-outline" size={80} color={currentThemeColors.subtleText} />
    <Text style={[styles.emptyTitle, { color: currentThemeColors.text }]}>
      Không tìm thấy người dùng
    </Text>
    <Text style={[styles.emptySubtitle, { color: currentThemeColors.subtleText }]}>
      Thử điều chỉnh bộ lọc hoặc kéo xuống để làm mới
    </Text>
  </View>
));

// Memoized error component
const ErrorView = memo(({ error, currentThemeColors, onRetry }) => (
  <View style={[styles.errorContainer, { backgroundColor: currentThemeColors.surface }]}>
    <MaterialIcons name="error-outline" size={24} color="#ff4757" />
    <Text style={[styles.errorText, { color: currentThemeColors.text }]}>
      {error}
    </Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Thử lại</Text>
    </TouchableOpacity>
  </View>
));

const Home = memo(function Home() {
  const { user } = useAuth();
  const theme = useContext(ThemeContext)?.theme || 'light';
  const currentThemeColors = useMemo(() =>
    theme === 'dark' ? Colors.dark : Colors.light,
    [theme]
  );
  const isFocused = useIsFocused();

  // Only fetch data when tab is focused
  const { getUsers, users, loading, refreshing, handleRefresh, error, loadMore, hasMore } = useHome(isFocused);

  // State for back button handling
  const backPressedOnce = useRef(false);

  const { registerRefreshHandler } = useRefresh();

  // Memoized retry handler
  const handleRetry = useCallback(() => {
    getUsers(true);
  }, [getUsers]);

  useEffect(() => {
    if (registerRefreshHandler) {
      registerRefreshHandler('home', handleRefresh);
    }
  }, [registerRefreshHandler, handleRefresh]);

  // Back button handler effect
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isFocused) {
        return false;
      }

      if (backPressedOnce.current) {
        BackHandler.exitApp();
        return true;
      }

      backPressedOnce.current = true;
      ToastAndroid.show('Nhấn lại lần nữa để thoát', ToastAndroid.SHORT);

      setTimeout(() => {
        backPressedOnce.current = false;
      }, 2000);

      return true;
    });

    return () => backHandler.remove();
  }, [isFocused]);

  // Determine which content to render
  const content = useMemo(() => {
    if (loading) {
      return <LoadingView theme={theme} currentThemeColors={currentThemeColors} />;
    }

    if (users.length === 0) {
      return <EmptyView currentThemeColors={currentThemeColors} />;
    }

    return (
      <ListUser
        users={users}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        activeTab="home"
        loadMore={loadMore}
        hasMore={hasMore}
      />
    );
  }, [loading, users, refreshing, handleRefresh, theme, currentThemeColors, loadMore, hasMore]);

  return (
    <DeferredComponent>
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        {error && (
          <ErrorView
            error={error}
            currentThemeColors={currentThemeColors}
            onRetry={handleRetry}
          />
        )}

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {content}
        </View>
      </View>
    </DeferredComponent>
  );
});

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: '#667eea',
  },
  dot1: { opacity: 0.6 },
  dot2: { opacity: 0.8 },
  dot3: { opacity: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4757',
  },
  errorText: {
    flex: 1,
    marginHorizontal: 12,
  },
  retryButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
});
