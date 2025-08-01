import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Text, ScrollView } from 'react-native';
import { Appbar, Avatar, Button, TextInput, Chip } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useStateCommon } from '../../context/stateCommon.jsx';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const HomeHeader = () => {
  const router = useRouter();
  const { stateCommon, setStateCommon } = useStateCommon();
  const { user } = useAuth();
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const { width } = Dimensions.get('window');

  // Storage constants
  const DEFAULT_FILTER = { gender: '', minAge: '', maxAge: '' };

  // Helper functions
  const getFilterSummary = (filter) => {
    const parts = [];
    
    if (filter.gender) {
      const genderText = filter.gender === 'male' ? 'Nam' : 
                       filter.gender === 'female' ? 'Nữ' : 'Tất cả';
      parts.push(`Giới tính: ${genderText}`);
    }
    
    if (filter.minAge || filter.maxAge) {
      const ageText = `Tuổi: ${filter.minAge || 'Không giới hạn'} - ${filter.maxAge || 'Không giới hạn'}`;
      parts.push(ageText);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Chưa chọn bộ lọc nào';
  };

  const getActiveFiltersCountUtil = (filter) => {
    let count = 0;
    if (filter.gender && filter.gender !== 'all') count++;
    if (filter.minAge) count++;
    if (filter.maxAge) count++;
    return count;
  };

  // Load filter from global state when component mounts  
  useEffect(() => {
    if (stateCommon?.filter) {
      setSelectedGender(stateCommon.filter.gender || '');
      setMinAge(stateCommon.filter.minAge || '');
      setMaxAge(stateCommon.filter.maxAge || '');
      console.log('� Filter state loaded from global state');
    }
  }, [stateCommon?.filter]);




  const loadSavedFilters = async () => {
    try {
      const savedFilter = await loadFilterPreferences();
      
      // Update local state
      setSelectedGender(savedFilter.gender || '');
      setMinAge(savedFilter.minAge || '');
      setMaxAge(savedFilter.maxAge || '');
      
      // Update global state
      setStateCommon((prev) => ({
        ...prev,
        filter: savedFilter,
      }));
      
      console.log('� Filter state restored from storage');
    } catch (error) {
      console.error('❌ Error loading saved filters:', error);
    }
  };

  useEffect(() => {
    if (filterVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [filterVisible]);

  const toggleFilter = () => {
    setFilterVisible(!filterVisible);
  };

  const getActiveFiltersCount = () => {
    return getActiveFiltersCountUtil({ 
      gender: selectedGender, 
      minAge: minAge, 
      maxAge: maxAge 
    });
  };

  const clearFilters = () => {
    // Update local state
    setSelectedGender('');
    setMinAge('');
    setMaxAge('');
    
    // Update global state
    setStateCommon((prev) => ({
      ...prev,
      filter: DEFAULT_FILTER,
    }));
    
    setFilterVisible(false);
    console.log('🗑️ Filters cleared');
  };

  const applyFilters = () => {
    const newFilter = {
      gender: selectedGender,
      minAge: minAge,
      maxAge: maxAge,
    };

    // Update global state
    setStateCommon((prev) => ({
      ...prev,
      filter: newFilter,
    }));
    
    console.log(`✅ Filter applied: Giới tính = ${selectedGender}, Tuổi = ${minAge}-${maxAge}`);
    setFilterVisible(false);
  };

  const handleGenderSelect = (gender) => {
    setSelectedGender(selectedGender === gender ? '' : gender);
  };

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={theme === 'dark' 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#667eea', '#764ba2', '#f093fb']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Floating particles effect background */}
        <View style={styles.particlesContainer}>
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  animationDelay: `${i * 0.5}s`,
                }
              ]}
            />
          ))}
        </View>
        
        <View style={styles.headerContent}>
          {/* Left Section - Filter Button */}
          <TouchableOpacity 
            style={[styles.filterButton, getActiveFiltersCount() > 0 && styles.filterButtonActive]}
            onPress={toggleFilter}
          >
            <MaterialIcons name="tune" size={24} color="white" />
            {getActiveFiltersCount() > 0 && (
              <Animated.View style={[styles.filterBadge, { transform: [{ scale: 1.1 }] }]}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>

          {/* Center Section - App Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>ChapAt</Text>
            <Text style={styles.appSubtitle}>Kết nối mọi người 💬</Text>
          </View>

          {/* Right Section - Scan Button */}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => router.push({ pathname: '/DeviceScan' })}
          >
            <Entypo name="rss" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Modern Filter Panel */}
      {filterVisible && (
        <Animated.View 
          style={[
            styles.filterOverlay,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
            <View style={[styles.filterPanel, { backgroundColor: currentThemeColors.surface || currentThemeColors.background }]}>
              {/* Filter Header */}
              <View style={styles.filterHeader}>
                <View style={styles.filterTitleContainer}>
                  <MaterialIcons name="filter-list" size={24} color={currentThemeColors.tint || '#667eea'} />
                  <Text style={[styles.filterTitle, { color: currentThemeColors.text }]}>
                    Bộ lọc tìm kiếm
                  </Text>
                </View>
                <TouchableOpacity onPress={toggleFilter} style={styles.closeFilterButton}>
                  <MaterialIcons name="close" size={24} color={currentThemeColors.text} />
                </TouchableOpacity>
              </View>

              {/* Gender Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                  Giới tính
                </Text>
                <View style={styles.genderChips}>
                  <Chip 
                    selected={selectedGender === 'male'}
                    onPress={() => handleGenderSelect('male')}
                    style={[styles.genderChip, selectedGender === 'male' && styles.selectedChip]}
                    textStyle={{ color: selectedGender === 'male' ? 'white' : currentThemeColors.text }}
                    icon="account"
                  >
                    Nam
                  </Chip>
                  <Chip 
                    selected={selectedGender === 'female'}
                    onPress={() => handleGenderSelect('female')}
                    style={[styles.genderChip, selectedGender === 'female' && styles.selectedChip]}
                    textStyle={{ color: selectedGender === 'female' ? 'white' : currentThemeColors.text }}
                    icon="account-outline"
                  >
                    Nữ
                  </Chip>
                  <Chip 
                    selected={selectedGender === 'all'}
                    onPress={() => handleGenderSelect('all')}
                    style={[styles.genderChip, selectedGender === 'all' && styles.selectedChip]}
                    textStyle={{ color: selectedGender === 'all' ? 'white' : currentThemeColors.text }}
                    icon="account-group"
                  >
                    Tất cả
                  </Chip>
                </View>
              </View>

              {/* Age Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                  Độ tuổi
                </Text>
                <View style={styles.ageInputsContainer}>
                  <View style={styles.ageInputWrapper}>
                    <Text style={[styles.ageLabel, { color: currentThemeColors.subtleText }]}>Từ</Text>
                    <TextInput
                      value={minAge}
                      placeholder="18"
                      onChangeText={setMinAge}
                      keyboardType="numeric"
                      style={styles.ageInput}
                      mode="outlined"
                      dense
                      theme={{ 
                        colors: { 
                          primary: '#667eea',
                          outline: currentThemeColors.border || '#E2E8F0'
                        } 
                      }}
                    />
                  </View>
                  <View style={styles.ageSeparator}>
                    <MaterialIcons name="remove" size={20} color={currentThemeColors.subtleText} />
                  </View>
                  <View style={styles.ageInputWrapper}>
                    <Text style={[styles.ageLabel, { color: currentThemeColors.subtleText }]}>Đến</Text>
                    <TextInput
                      value={maxAge}
                      placeholder="65"
                      onChangeText={setMaxAge}
                      keyboardType="numeric"
                      style={styles.ageInput}
                      mode="outlined"
                      dense
                      theme={{ 
                        colors: { 
                          primary: '#667eea',
                          outline: currentThemeColors.border || '#E2E8F0'
                        } 
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.filterActions}>
                <Button 
                  mode="outlined" 
                  onPress={clearFilters}
                  style={[styles.clearButton, { borderColor: currentThemeColors.border || '#E2E8F0' }]}
                  labelStyle={{ color: currentThemeColors.text }}
                  icon="delete-outline"
                >
                  Xóa bộ lọc
                </Button>
                <Button 
                  mode="contained" 
                  onPress={applyFilters}
                  style={styles.applyButton}
                  labelStyle={styles.applyButtonLabel}
                  icon="filter-list"
                  contentStyle={{ height: 50 }}
                >
                  🔍 ÁP DỤNG
                </Button>
              </View>
              
              {/* Filter Preview */}
              <View style={styles.filterPreview}>
                <Text style={[styles.previewText, { color: currentThemeColors.subtleText }]}>
                  {getFilterSummary({ 
                    gender: selectedGender, 
                    minAge: minAge, 
                    maxAge: maxAge 
                  })}
                </Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: 44, // Status bar height
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
    opacity: 0.6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    position: 'relative',
    zIndex: 1,
  },
  
  // Filter Button
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ scale: 1.05 }],
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Title Section
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'System', // Use system font for better rendering
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  
  // Scan Button
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  // Filter Panel
  filterOverlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    maxHeight: 500,
  },
  filterScrollView: {
    maxHeight: 500,
  },
  filterPanel: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  
  // Filter Header
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeFilterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  
  // Filter Sections
  filterSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
  
  // Gender Chips
  genderChips: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  genderChip: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  selectedChip: {
    backgroundColor: '#667eea',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  
  // Age Inputs
  ageInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ageInputWrapper: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '500',
  },
  ageInput: {
    backgroundColor: 'transparent',
  },
  ageSeparator: {
    alignItems: 'center',
    marginTop: 20,
  },
  
  // Action Buttons
  filterActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  clearButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
  },
  applyButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#667eea',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  applyButtonLabel: {
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  
  // Filter Preview
  filterPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(103, 110, 234, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  previewText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default HomeHeader;
