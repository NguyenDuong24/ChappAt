import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, BackHandler, useWindowDimensions, View } from 'react-native';
import ChatListHeader from '@/components/chat/ChatListHeader';
import ThemedStatusBar from '@/components/common/ThemedStatusBar';
import FeatureActionDrawer from '@/components/drawer/FeatureActionDrawer';
import { RevealScalableView } from '@/components/reveal';
import { useTheme } from '@/context/ThemeContext';
import { LiquidScreen } from '@/components/liquid';

const StackLayout = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [featureDrawer, setFeatureDrawer] = useState(null);
  
  const drawerOffset = useMemo(() => Math.min(width * 0.62, 250), [width]);
  const isDrawerVisible = featureDrawer !== null;
  
  const openSearchDrawer = useCallback(() => setFeatureDrawer('chatSearch'), []);
  const openAddFriendDrawer = useCallback(() => setFeatureDrawer('addFriend'), []);
  const closeFeatureDrawer = useCallback(() => setFeatureDrawer(null), []);

  useEffect(() => {
    if (!isDrawerVisible) return;
    
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFeatureDrawer(null);
      return true;
    });
    return () => sub.remove();
  }, [isDrawerVisible]);

  return (
    <LiquidScreen themeMode={theme} style={styles.container}>
      <RevealScalableView
        revealed={isDrawerVisible}
        side="left"
        scale={0.86}
        offset={drawerOffset}
        style={styles.revealContainer}
      >
        <View style={[styles.innerContent, { backgroundColor: 'transparent' }]}>
          <ThemedStatusBar translucent />
          <ChatListHeader
            onOpenSearchDrawer={openSearchDrawer}
            onOpenAddFriendDrawer={openAddFriendDrawer}
          />
          <View style={styles.stackWrapper}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 200,
                gestureEnabled: true,
                freezeOnBlur: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
            </Stack>
          </View>
        </View>
      </RevealScalableView>

      <FeatureActionDrawer
        visible={isDrawerVisible}
        drawerKey={featureDrawer}
        onClose={closeFeatureDrawer}
      />
    </LiquidScreen>
  );
};

export default StackLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  revealContainer: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    overflow: 'hidden',
  },
  stackWrapper: {
    flex: 1,
  },
});
