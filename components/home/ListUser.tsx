import { useRouter } from 'expo-router';
import React, { useContext, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Colors } from '@/constants/Colors';

import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserCard from './UserCard';

// Constants for optimization
const ITEM_HEIGHT = 120; // Approximate height of each user card

function ListUser({ users, onRefresh, refreshing, activeTab = 'home' }: any) {
  const { location } = React.useContext(LocationContext);
  const insets = useSafeAreaInsets();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const { user: viewer } = useAuth();
  const viewerShowOnline = viewer?.showOnlineStatus !== false;

  // Memoized render function
  const renderUserItem = useCallback(({ item, index }: any) => (
    <UserCard
      item={item}
      index={index}
      location={location}
      activeTab={activeTab}
      currentThemeColors={currentThemeColors}
      viewerShowOnline={viewerShowOnline}
    />
  ), [location, activeTab, currentThemeColors, viewerShowOnline]);

  // Optimize FlatList with getItemLayout
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  // Memoize filtered users with stable reference
  const filteredUsers = useMemo(() =>
    users.filter((user: any) =>
      user.username &&
      user.username !== 'Unknown User' &&
      user.profileUrl &&
      user.age !== null &&
      user.age !== undefined &&
      user.gender
    ),
    [users]
  );

  // Stable key extractor
  const keyExtractor = useCallback((item: any) => item.id || item.uid, []);

  // Memoize content container style
  const contentContainerStyle = useMemo(() => [
    styles.listContainer,
    {
      backgroundColor: currentThemeColors.background,
      flexGrow: 1,
      paddingTop: insets.top + 80
    }
  ], [currentThemeColors.background, insets.top]);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={['#667eea']}
      tintColor="#667eea"
    />
  ), [refreshing, onRefresh]);

  return (
    <FlatList
      data={filteredUsers}
      renderItem={renderUserItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      contentContainerStyle={contentContainerStyle}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      maxToRenderPerBatch={4}
      windowSize={7}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={100}
      // Additional optimizations
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
      // Reduce memory usage
      scrollEventThrottle={16}
    />
  );
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(ListUser);

const styles = StyleSheet.create({
  listContainer: { paddingTop: 8, paddingBottom: 16 },
});
