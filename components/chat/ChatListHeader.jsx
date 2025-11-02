import React, { useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const ChatListHeader = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const toggleDrawer = () => {
    if (drawerVisible) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setDrawerVisible(false));
    } else {
      setDrawerVisible(true);
      Animated.timing(animation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={theme === 'dark' 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#667eea', '#764ba2', '#f093fb']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.particlesContainer}>
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  opacity: Math.random() * 0.5 + 0.3,
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.header}>
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="chat" size={28} color="white" />
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Trò chuyện</Text>
              <Text style={styles.subtitle}>✨ Kết nối với bạn bè</Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={toggleDrawer}
            >
              <MaterialIcons name="more-vert" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {drawerVisible && (
        <>
          <TouchableWithoutFeedback onPress={toggleDrawer}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.dropdown, { 
            opacity: animation, 
            transform: [{ 
              translateY: animation.interpolate({ 
                inputRange: [0, 1], 
                outputRange: [-10, 0] 
              }) 
            }] 
          }]}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                toggleDrawer();
                router.push('/AddFriend');
              }}
            >
              <View style={styles.dropdownIconContainer}>
                <Ionicons name="person-add" size={20} color="#667eea" />
              </View>
              <Text style={styles.dropdownText}>Thêm bạn</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                toggleDrawer();
                router.push('/SearchMessageScreen');
              }}
            >
              <View style={styles.dropdownIconContainer}>
                <MaterialIcons name="search" size={20} color="#667eea" />
              </View>
              <Text style={styles.dropdownText}>Tìm kiếm tin nhắn</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  headerGradient: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 16,
    minHeight: 64,
    position: 'relative',
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
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
    marginLeft: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    top: 85,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingVertical: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
    marginHorizontal: 16,
  },
});

export default ChatListHeader;