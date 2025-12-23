import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Memoized particles component
const HeaderParticles = memo(() => {
  // Pre-compute particle styles to avoid recalculation on re-render
  const particleStyles = useMemo(() =>
    [...Array(6)].map((_, i) => ({
      left: `${20 + i * 15}%`,
      top: `${30 + (i % 2) * 40}%`,
      opacity: 0.3 + (i * 0.1),
    })),
    []);

  return (
    <View style={styles.particlesContainer}>
      {particleStyles.map((style, i) => (
        <View key={i} style={[styles.particle, style]} />
      ))}
    </View>
  );
});

const ChatListHeader = () => {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#4facfe', '#00f2fe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <HeaderParticles />

        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="chat-processing" size={26} color="white" />
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Trò chuyện</Text>
              <Text style={styles.subtitle}>✨ Kết nối bạn bè</Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/SearchMessageScreen')}
            >
              <MaterialIcons name="search" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { marginLeft: 12 }]}
              onPress={() => router.push('/AddFriend')}
            >
              <Ionicons name="person-add" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    elevation: 5,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24),
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 10,
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    position: 'relative',
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatListHeader;