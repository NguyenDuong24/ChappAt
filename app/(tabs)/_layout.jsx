import React, { useContext, useMemo, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Entypo, Ionicons, FontAwesome, Feather } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { Colors } from '../../constants/Colors';
import { View, StyleSheet, Platform } from 'react-native';
import { RefreshProvider, useRefresh } from '../../context/RefreshContext';

function TabsLayoutContent() {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const router = useRouter();
  const { triggerRefresh } = useRefresh();

  const currentThemeColors = useMemo(() => {
    return theme === 'dark' ? Colors.dark : Colors.light;
  }, [theme]);



  const screenOptions = useMemo(() => ({
    tabBarShowLabel: false,
    tabBarStyle: {
      backgroundColor: currentThemeColors.background,
      borderTopColor: currentThemeColors.border || 'transparent',
      height: Platform.OS === 'ios' ? 88 : 60,
      paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    },
    tabBarActiveTintColor: Colors.primary,
    tabBarInactiveTintColor: currentThemeColors.text,
    freezeOnBlur: true,
    lazy: true,
    animation: 'shift',
    animationEnabled: true,
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
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const isFocused = state.routes[state.index].name === route.name;

            if (isFocused) {
              e.preventDefault();
              triggerRefresh('home');
            }
          }
        })}
        options={{
          tabBarIcon: renderHomeIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="explore"
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const isFocused = state.routes[state.index].name === route.name;

            if (isFocused) {
              e.preventDefault();
              triggerRefresh('explore');
            }
          }
        })}
        options={{
          headerShown: false,
          tabBarIcon: renderExploreIcon,
        }}
      />
      <Tabs.Screen
        name="chat"
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const isFocused = state.routes[state.index].name === route.name;

            if (isFocused) {
              e.preventDefault();
              triggerRefresh('chat');
            }
          }
        })}
        options={{
          headerShown: false,
          tabBarIcon: renderChatIcon,
        }}
      />
      <Tabs.Screen
        name="groups"
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const isFocused = state.routes[state.index].name === route.name;

            if (isFocused) {
              e.preventDefault();
              triggerRefresh('groups');
            }
          }
        })}
        options={{
          headerShown: false,
          tabBarIcon: renderGroupsIcon,
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
              triggerRefresh('profile');
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

export default function TabsLayout() {
  return (
    <RefreshProvider>
      <TabsLayoutContent />
    </RefreshProvider>
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
