import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Text, ScrollView, StatusBar, Platform, Modal } from 'react-native';
import { Appbar, Avatar, Button, TextInput, Chip } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useStateCommon } from '../../context/stateCommon.jsx';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { saveFilterPreferences, loadFilterPreferences, getActiveFiltersCount as getActiveFiltersCountFromStorage } from '@/utils/filterStorage';
import schoolsData from '../../assets/model/schools_hcm.json';
import educationData from '@/assets/data/educationData.json';

const educationLevels = educationData.educationLevels;
const jobs = educationData.jobs;

const HomeHeader = () => {
  const router = useRouter();
  const { stateCommon, setStateCommon } = useStateCommon();
  const { user } = useAuth();
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedEducationLevel, setSelectedEducationLevel] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [universitiesList, setUniversitiesList] = useState([]);
  const [universitySearch, setUniversitySearch] = useState('');

  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // Animation values
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const { width, height } = Dimensions.get('window');

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

    if (filter.job) {
      parts.push(`Nghề nghiệp: ${filter.job}`);
    }

    if (filter.educationLevel) {
      parts.push(`Trình độ: ${filter.educationLevel}`);
    }

    if (filter.university) {
      parts.push(`Trường: ${filter.university}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Chưa chọn bộ lọc nào';
  };

  const getActiveFiltersCountUtil = (filter) => {
    let count = 0;
    if (filter.gender && filter.gender !== 'all') count++;
    if (filter.minAge) count++;
    if (filter.maxAge) count++;
    if (filter.job) count++;
    if (filter.educationLevel) count++;
    if (filter.university) count++;
    return count;
  };

  // Load filter from global state when component mounts
  useEffect(() => {
    if (stateCommon?.filter) {
      const { gender, minAge, maxAge, job, educationLevel, university } = stateCommon.filter;
      setSelectedGender(gender || '');
      setMinAge(minAge || '');
      setMaxAge(maxAge || '');
      setSelectedJob(job || '');
      setSelectedEducationLevel(educationLevel || '');
      setSelectedUniversity(university || '');
    }
  }, [stateCommon?.filter]);

  // Load filter from storage if context not populated yet
  useEffect(() => {
    (async () => {
      if (!stateCommon?.filter) {
        const saved = await loadFilterPreferences();
        setStateCommon({ filter: saved });
      }
    })();
  }, []);

  // Load universities list
  useEffect(() => {
    const uniList = schoolsData.universities.map(u => ({ label: u.name, value: u.name, code: u.code }));
    const colList = schoolsData.colleges.map(c => ({ label: c.name, value: c.name, code: c.code }));
    const allSchools = [...uniList, ...colList, { label: 'Khác', value: 'Khác', code: 'OTHER' }];
    setUniversitiesList(allSchools);
  }, []);

  const filteredUniversities = universitiesList.filter(u => u.label.toLowerCase().includes(universitySearch.toLowerCase()));

  const toggleFilter = () => {
    setFilterVisible(!filterVisible);
  };

  const getActiveFiltersCount = () => {
    return getActiveFiltersCountUtil({ 
      gender: selectedGender, 
      minAge: minAge, 
      maxAge: maxAge,
      job: selectedJob,
      educationLevel: selectedEducationLevel,
      university: selectedUniversity
    });
  };

  const clearFilters = () => {
    setSelectedGender('');
    setMinAge('');
    setMaxAge('');
    setSelectedJob('');
    setSelectedEducationLevel('');
    setSelectedUniversity('');
    setUniversitySearch('');
    
    const cleared = { gender: '', minAge: '', maxAge: '', job: '', educationLevel: '', university: '' };
    setStateCommon({
      filter: { ...cleared }
    });
    // persist
    saveFilterPreferences(cleared);
    
    setFilterVisible(false);
  };

  const applyFilters = () => {
    const newFilter = {
      gender: selectedGender,
      minAge: minAge,
      maxAge: maxAge,
      job: selectedJob,
      educationLevel: selectedEducationLevel,
      university: selectedUniversity,
    };

    setStateCommon({
      filter: { ...newFilter }
    });
    // persist
    saveFilterPreferences(newFilter);
    
    setFilterVisible(false);
  };

  const handleGenderSelect = (gender) => {
    setSelectedGender(selectedGender === gender ? '' : gender);
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
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
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
        <View style={styles.particlesContainer}>
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  opacity: Math.random() * 0.5 + 0.3, // Random opacity for variety
                }
              ]}
            />
          ))}
        </View>
        
        <View style={styles.headerContent}>
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

          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>ChapAt</Text>
            <Text style={styles.appSubtitle}>Kết nối mọi người 💬</Text>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
          >
            <Entypo name="rss" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Modal
        visible={filterVisible}
        animationType="none"
        transparent={true}
        onRequestClose={toggleFilter}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity 
            style={styles.backdropTouchable}
            onPress={toggleFilter}
            activeOpacity={0.5}
          />
          <Animated.View 
            style={[
              styles.filterPanel,
              {
                backgroundColor: currentThemeColors.surface || currentThemeColors.background,
                maxHeight: height - 32,
              },
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
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
                    icon="gender-male"
                  >
                    Nam
                  </Chip>
                  <Chip 
                    selected={selectedGender === 'female'}
                    onPress={() => handleGenderSelect('female')}
                    style={[styles.genderChip, selectedGender === 'female' && styles.selectedChip]}
                    textStyle={{ color: selectedGender === 'female' ? 'white' : currentThemeColors.text }}
                    icon="gender-female"
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
                          outline: currentThemeColors.border || '#E2E8F0',
                          text: currentThemeColors.text,
                          placeholder: currentThemeColors.subtleText,
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
                          outline: currentThemeColors.border || '#E2E8F0',
                          text: currentThemeColors.text,
                          placeholder: currentThemeColors.subtleText,
                        } 
                      }}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                  Trình độ học vấn
                </Text>
                <View style={styles.educationChips}>
                  {educationLevels.map((level) => (
                    <Chip 
                      key={level.value}
                      selected={selectedEducationLevel === level.value}
                      onPress={() => setSelectedEducationLevel(selectedEducationLevel === level.value ? '' : level.value)}
                      style={[styles.educationChip, selectedEducationLevel === level.value && styles.selectedChip]}
                      textStyle={{ color: selectedEducationLevel === level.value ? 'white' : currentThemeColors.text }}
                    >
                      {level.label}
                    </Chip>
                  ))}
                </View>
              </View>

              {selectedEducationLevel === 'Cao đẳng/Đại học' && (
                <View style={styles.filterSection}>
                  <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                    Trường học
                  </Text>
                  <View style={styles.searchContainer}>
                    <TextInput
                      placeholder="Tìm kiếm trường..."
                      value={universitySearch}
                      onChangeText={setUniversitySearch}
                      style={styles.searchInput}
                      mode="outlined"
                      dense
                      theme={{ 
                        colors: { 
                          primary: '#667eea',
                          outline: currentThemeColors.border || '#E2E8F0',
                          text: currentThemeColors.text,
                          placeholder: currentThemeColors.subtleText,
                        } 
                      }}
                    />
                    {universitySearch.length > 0 && (
                      <TouchableOpacity
                        style={styles.clearSearchButton}
                        onPress={() => setUniversitySearch('')}
                      >
                        <MaterialIcons name="clear" size={20} color={currentThemeColors.subtleText} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView 
                    style={styles.universityList} 
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {filteredUniversities.length > 0 ? (
                      filteredUniversities.map((university) => (
                        <TouchableOpacity
                          key={university.code}
                          style={[styles.universityItem, selectedUniversity === university.value && styles.selectedUniversityItem]}
                          onPress={() => setSelectedUniversity(selectedUniversity === university.value ? '' : university.value)}
                        >
                          <Text style={[styles.universityText, { color: selectedUniversity === university.value ? 'white' : currentThemeColors.text }]}>
                            {university.label}
                          </Text>
                          {selectedUniversity === university.value && (
                            <MaterialIcons name="check" size={20} color="white" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noResultsContainer}>
                        <Text style={[styles.noResultsText, { color: currentThemeColors.subtleText }]}>
                          Không tìm thấy trường nào
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                  Nghề nghiệp
                </Text>
                <View style={styles.jobChips}>
                  {jobs.map((job) => (
                    <Chip 
                      key={job.value}
                      selected={selectedJob === job.value}
                      onPress={() => setSelectedJob(selectedJob === job.value ? '' : job.value)}
                      style={[styles.jobChip, selectedJob === job.value && styles.selectedChip]}
                      textStyle={{ color: selectedJob === job.value ? 'white' : currentThemeColors.text }}
                    >
                      {job.label}
                    </Chip>
                  ))}
                </View>
              </View>

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
                  icon="check-circle"
                  contentStyle={{ height: 50 }}
                >
                  ÁP DỤNG
                </Button>
              </View>
              
              <View style={styles.filterPreview}>
                <Text style={[styles.previewText, { color: currentThemeColors.subtleText }]}>
                  {getFilterSummary({ 
                    gender: selectedGender, 
                    minAge: minAge, 
                    maxAge: maxAge,
                    job: selectedJob,
                    educationLevel: selectedEducationLevel,
                    university: selectedUniversity
                  })}
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 20) + 10,
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    position: 'relative',
    zIndex: 1,
  },
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
    fontFamily: 'System',
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 20,
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  filterSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
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
    borderRadius: 30, // Softer rounded corners
  },
  selectedChip: {
    backgroundColor: '#667eea',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
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
    marginBottom: 8, // Reduced margin for tighter layout
    fontWeight: '500',
  },
  ageInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  ageSeparator: {
    alignItems: 'center',
    marginTop: 20,
  },
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
    justifyContent: 'center',
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
  educationChips: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  educationChip: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    borderRadius: 30, // Softer rounded corners
  },
  jobChips: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  jobChip: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    borderRadius: 30, // Softer rounded corners
  },
  universityChips: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  universityChip: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    borderRadius: 30, // Softer rounded corners
  },
  searchInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
    marginBottom: 12,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  universityList: {
    maxHeight: 150,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 8,
  },
  universityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  selectedUniversityItem: {
    backgroundColor: '#667eea',
  },
  universityText: {
    fontSize: 16,
    flex: 1,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});

export default HomeHeader;