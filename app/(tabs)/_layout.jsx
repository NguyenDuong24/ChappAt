import React, { useContext, useMemo, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Entypo, Ionicons, FontAwesome, Feather } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { Colors } from '../../constants/Colors';
import { View, StyleSheet } from 'react-native';

export default function TabsLayout() {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const router = useRouter();

  const currentThemeColors = useMemo(() => {
    return theme === 'dark' ? Colors.dark : Colors.light;
  }, [theme]);



  const screenOptions = useMemo(() => ({
    tabBarShowLabel: false,
    tabBarStyle: {
      backgroundColor: currentThemeColors.background,
      borderTopColor: currentThemeColors.border || 'transparent',
    },
    tabBarActiveTintColor: Colors.primary,
    tabBarInactiveTintColor: currentThemeColors.text,
    freezeOnBlur: false, // Keep tabs active for instant switching
    lazy: false, // Preload all tabs
    detachInactiveScreens: false, // Keep screens attached for instant switching
    animationEnabled: false, // Disable animations for faster tab switching
    tabBarHideOnKeyboard: true,
  }), [currentThemeColors]);

  const renderHomeIcon = useCallback(({ focused, color }) => (
    <View style={styles.iconContainer}>
      <Ionicons
        name="home"
        size={focused ? 22 : 20}
        color={color}
      />
      {focused && <View style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
    </View>
  ), []);

  const renderExploreIcon = useCallback(({ focused, color }) => (
    <View style={styles.iconContainer}>
      <Feather
        name="globe"
        size={focused ? 22 : 20}
        color={color}
      />
      {focused && <View style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
    </View>
  ), []);

  const renderChatIcon = useCallback(({ focused, color }) => (
    <View style={styles.iconContainer}>
      <Entypo
        name="chat"
        size={focused ? 22 : 20}
        color={color}
      />
      {focused && <View style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
    </View>
  ), []);

  const renderGroupsIcon = useCallback(({ focused, color }) => (
    <View style={styles.iconContainer}>
      <Ionicons
        name="people"
        size={focused ? 22 : 20}
        color={color}
      />
      {focused && <View style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
    </View>
  ), []);

  const renderProfileIcon = useCallback(({ focused, color }) => (
    <View style={styles.iconContainer}>
      <FontAwesome
        name="user-circle-o"
        size={focused ? 22 : 20}
        color={color}
      />
      {focused && <View style={[styles.indicator, { backgroundColor: Colors.primary }]} />}
    </View>
  ), []);

  return (
    <Tabs
      screenOptions={screenOptions}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: renderHomeIcon,
          headerShown: false,
          unmountOnBlur: false,
          freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false,
          tabBarIcon: renderExploreIcon,
          unmountOnBlur: false,
          freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          headerShown: false,
          tabBarIcon: renderChatIcon,
          unmountOnBlur: false,
          freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          headerShown: false,
          tabBarIcon: renderGroupsIcon,
          unmountOnBlur: false,
          freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const isFocused = state.routes[state.index].name === route.name;

            if (isFocused) {
              e.preventDefault();
              router.replace('/(tabs)/profile');
            }
          }
        })}
        options={{
          headerShown: false,
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40, // Fixed height to prevent layout shifts
    width: 40,
  },
  indicator: {
    height: 3,
    width: 20,
    marginTop: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
});
