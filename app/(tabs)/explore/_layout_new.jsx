import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function ExploreLayout() {
  const [activeTab, setActiveTab] = useState('tab1');
  const segments = useSegments();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Kiểm tra xem có phải đang ở HashtagScreen không
  const shouldShowTabs = !segments.includes('HashtagScreen');

  useEffect(() => {
    // Animate tab visibility changes
    if (shouldShowTabs) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShowTabs]);

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    
    // Add micro-interaction animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {/* Modern Glassmorphism Header */}
      <Animated.View style={[
        styles.modernHeader,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        {/* Floating Background Elements */}
        <Animated.View style={[
          styles.floatingElement1,
          { transform: [{ rotate: '15deg' }, { scale: scaleAnim }] }
        ]} />
        <Animated.View style={[
          styles.floatingElement2,
          { transform: [{ rotate: '-10deg' }, { scale: scaleAnim }] }
        ]} />
        
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modernHeader}
        >
          <BlurView intensity={20} tint="light" style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.iconWrapper}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)']}
                  style={styles.iconContainer}
                >
                  <MaterialIcons name="explore" size={32} color="white" />
                </LinearGradient>
              </View>
              
              <View style={styles.titleSection}>
                <Text style={styles.mainTitle}>Khám Phá</Text>
                <Text style={styles.subtitle}>
                  ✨ Những khoảnh khắc đáng nhớ
                </Text>
              </View>
              
              <TouchableOpacity style={styles.searchButton}>
                <MaterialIcons name="search" size={24} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          </BlurView>
          
          {/* Bottom Fade Effect */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.05)']}
            style={styles.bottomFade}
          />
        </LinearGradient>
      </Animated.View>

      {/* Premium Tab Section */}
      {shouldShowTabs && (
        <Animated.View style={[
          styles.premiumTabSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[
                styles.premiumTab, 
                activeTab === 'tab1' && styles.activePremiumTab
              ]}
              onPress={() => handleTabPress('tab1')}
            >
              <LinearGradient
                colors={activeTab === 'tab1' 
                  ? ['#667eea', '#764ba2'] 
                  : ['transparent', 'transparent']
                }
                style={styles.tabGradient}
              >
                <MaterialIcons 
                  name="schedule" 
                  size={18} 
                  color={activeTab === 'tab1' ? 'white' : '#9CA3AF'} 
                />
                <Text style={[
                  styles.premiumTabText, 
                  activeTab === 'tab1' && styles.activePremiumTabText
                ]}>
                  Mới Nhất
                </Text>
                {activeTab === 'tab1' && <View style={styles.activeIndicator} />}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.premiumTab, 
                activeTab === 'tab2' && styles.activePremiumTab
              ]}
              onPress={() => handleTabPress('tab2')}
            >
              <LinearGradient
                colors={activeTab === 'tab2' 
                  ? ['#667eea', '#764ba2'] 
                  : ['transparent', 'transparent']
                }
                style={styles.tabGradient}
              >
                <MaterialIcons 
                  name="trending-up" 
                  size={18} 
                  color={activeTab === 'tab2' ? 'white' : '#9CA3AF'} 
                />
                <Text style={[
                  styles.premiumTabText, 
                  activeTab === 'tab2' && styles.activePremiumTabText
                ]}>
                  Phổ Biến
                </Text>
                {activeTab === 'tab2' && <View style={styles.activeIndicator} />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <Tabs
        screenOptions={{
          tabBarStyle: shouldShowTabs ? {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 0,
            backgroundColor: 'transparent',
          } : { display: 'none' }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarButton: () => null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="HashtagScreen"
          options={{
            tabBarButton: () => null,
            headerShown: false,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  
  // Modern Header Styles
  modernHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  floatingElement1: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  floatingElement2: {
    position: 'absolute',
    bottom: -15,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
  },
  headerContent: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'space-between',
  },
  iconWrapper: {
    marginRight: 15,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  titleSection: {
    flex: 1,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  
  // Premium Tab Section
  premiumTabSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(15, 15, 35, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumTab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
  },
  premiumTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  activePremiumTabText: {
    color: 'white',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    width: 20,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 2,
    transform: [{ translateX: -10 }],
  },
  
  // Content
  content: {
    flex: 1,
  },
});
