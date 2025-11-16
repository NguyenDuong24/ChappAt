import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import ChatListHeader from '../../../components/chat/ChatListHeader';
import { ThemeContext } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedStatusBar from '../../../components/common/ThemedStatusBar';

const StackLayout = () => {
  const theme = useContext(ThemeContext)?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {/* Consistent ThemedStatusBar with translucent for gradient header */}
      <ThemedStatusBar translucent />
      
      {/* Modern Chat Header with theme-aware gradient */}
      <LinearGradient
        colors={theme === 'dark' 
          ? ['#1a1a2e', '#16213e'] 
          : ['#4facfe', '#00f2fe']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <ChatListHeader />
      </LinearGradient>

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    // paddingTop provided by insets.top for consistent safe area (status bar translucent)
    paddingBottom: 8,
  },
});

export default StackLayout;
