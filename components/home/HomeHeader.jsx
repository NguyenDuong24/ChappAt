import React, { useState, useContext, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Text, ScrollView, StatusBar, Platform, Modal } from 'react-native';
import { Button, TextInput, Chip } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useStateCommon } from '@/context/stateCommon';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { saveFilterPreferences, loadFilterPreferences } from '@/utils/filterStorage';
import schoolsData from '../../assets/model/schools_hcm.json';
import educationData from '@/assets/data/educationData.json';
import { getInterestsArray, getLabelForInterest, getIdForInterest, normalizeInterestsArray } from '@/utils/interests';
import { useTranslation } from 'react-i18next';

const educationLevels = educationData.educationLevels;
const jobs = educationData.jobs;

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

const HomeHeader = () => {
  const { t } = useTranslation();
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
  const [selectedInterests, setSelectedInterests] = useState([]);

  const theme = useContext(ThemeContext)?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // Animation values
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const { width, height } = Dimensions.get('window');

  // Interest items as { id, label } - memoized
  const interestItems = useMemo(() => getInterestsArray(), []);

  // Memoized helper functions
  const getFilterSummary = useCallback((filter) => {
    const parts = [];

    if (filter.gender) {
      const genderText = filter.gender === 'male' ? t('signup.male') :
        filter.gender === 'female' ? t('signup.female') : t('common.all');
      parts.push(t('filter.summary_gender', { gender: genderText }));
    }

    if (filter.minAge || filter.maxAge) {
      const ageText = t('filter.summary_age', {
        min: filter.minAge || t('common.all'),
        max: filter.maxAge || t('common.all')
      });
      parts.push(ageText);
    }

    if (filter.job) {
      parts.push(t('filter.summary_job', { job: filter.job }));
    }

    if (filter.educationLevel) {
      parts.push(t('filter.summary_education', { education: filter.educationLevel }));
    }

    if (filter.university) {
      parts.push(t('filter.summary_university', { university: filter.university }));
    }

    if (filter.interests && Array.isArray(filter.interests) && filter.interests.length > 0) {
      const labels = filter.interests.slice(0, 3).map(getLabelForInterest);
      parts.push(t('filter.summary_interests', {
        interests: labels.join(', ') + (filter.interests.length > 3 ? '...' : '')
      }));
    }

    return parts.length > 0 ? parts.join(' • ') : t('filter.no_filters');
  }, [t]);

  const getActiveFiltersCountUtil = useCallback((filter) => {
    let count = 0;
    if (filter.gender && filter.gender !== 'all') count++;
    if (filter.minAge) count++;
    if (filter.maxAge) count++;
    if (filter.job) count++;
    if (filter.educationLevel) count++;
    if (filter.university) count++;
    if (filter.interests && Array.isArray(filter.interests) && filter.interests.length > 0) count++;
    return count;
  }, []);

  // Load filter from global state when component mounts
  useEffect(() => {
    if (stateCommon?.filter) {
      const { gender, minAge, maxAge, job, educationLevel, university, interests } = stateCommon.filter;
      setSelectedGender(gender || '');
      setMinAge(minAge || '');
      setMaxAge(maxAge || '');
      setSelectedJob(job || '');
      setSelectedEducationLevel(educationLevel || '');
      setSelectedUniversity(university || '');
      setSelectedInterests(Array.isArray(interests) ? normalizeInterestsArray(interests) : (interests ? [getIdForInterest(interests)] : []));
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

  // Load universities list - memoized
  useEffect(() => {
    const uniList = schoolsData.universities.map(u => ({ label: u.name, value: u.name, code: u.code }));
    const colList = schoolsData.colleges.map(c => ({ label: c.name, value: c.name, code: c.code }));
    const allSchools = [...uniList, ...colList, { label: 'Khác', value: 'Khác', code: 'OTHER' }];
    setUniversitiesList(allSchools);
  }, []);

  // Memoized filtered universities
  const filteredUniversities = useMemo(() =>
    universitiesList.filter(u => u.label.toLowerCase().includes(universitySearch.toLowerCase())),
    [universitiesList, universitySearch]
  );

  const toggleFilter = useCallback(() => {
    setFilterVisible(v => !v);
  }, []);

  const handleGenderSelect = useCallback((gender) => {
    setSelectedGender(prev => prev === gender ? '' : gender);
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    return getActiveFiltersCountUtil({
      gender: selectedGender,
      minAge: minAge,
      maxAge: maxAge,
      job: selectedJob,
      educationLevel: selectedEducationLevel,
      university: selectedUniversity,
      interests: selectedInterests,
    });
  }, [selectedGender, minAge, maxAge, selectedJob, selectedEducationLevel, selectedUniversity, selectedInterests, getActiveFiltersCountUtil]);

  const clearFilters = useCallback(() => {
    setSelectedGender('');
    setMinAge('');
    setMaxAge('');
    setSelectedJob('');
    setSelectedEducationLevel('');
    setSelectedUniversity('');
    setUniversitySearch('');
    setSelectedInterests([]);

    const cleared = { gender: '', minAge: '', maxAge: '', job: '', educationLevel: '', university: '', interests: [] };
    setStateCommon({ filter: { ...cleared } });
    saveFilterPreferences(cleared);

    setFilterVisible(false);
  }, [setStateCommon]);

  const applyFilters = useCallback(() => {
    const newFilter = {
      gender: selectedGender,
      minAge: minAge,
      maxAge: maxAge,
      job: selectedJob,
      educationLevel: selectedEducationLevel,
      university: selectedUniversity,
      interests: selectedInterests,
    };

    setStateCommon({ filter: { ...newFilter } });
    saveFilterPreferences(newFilter);
    setFilterVisible(false);
  }, [selectedGender, minAge, maxAge, selectedJob, selectedEducationLevel, selectedUniversity, selectedInterests, setStateCommon]);

  const toggleArrayItem = useCallback((array, item) => {
    return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
  }, []);

  const handleInterestToggle = useCallback((id) => {
    setSelectedInterests(prev => toggleArrayItem(prev, id));
  }, [toggleArrayItem]);

  const handleEducationSelect = useCallback((value) => {
    setSelectedEducationLevel(prev => prev === value ? '' : value);
  }, []);

  const handleJobSelect = useCallback((value) => {
    setSelectedJob(prev => prev === value ? '' : value);
  }, []);

  const handleUniversitySelect = useCallback((value) => {
    setSelectedUniversity(prev => prev === value ? '' : value);
  }, []);

  // Animation effect
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
  }, [filterVisible, slideAnim, fadeAnim, scaleAnim]);

  const navigateToProximityRadar = useCallback(() => {
    router.push('/ProximityRadar');
  }, [router]);

  // Memoize current filter summary
  const filterSummary = useMemo(() => getFilterSummary({
    gender: selectedGender,
    minAge: minAge,
    maxAge: maxAge,
    job: selectedJob,
    educationLevel: selectedEducationLevel,
    university: selectedUniversity,
    interests: selectedInterests,
  }), [selectedGender, minAge, maxAge, selectedJob, selectedEducationLevel, selectedUniversity, selectedInterests, getFilterSummary]);

  // Memoize active filter count
  const activeFiltersCount = useMemo(() => getActiveFiltersCount(), [getActiveFiltersCount]);

  return (
    <View style={styles.container}>
      {/* Modern Header with Theme-Aware Gradient */}
      <LinearGradient
        colors={theme === 'dark'
          ? ['#1a1a2e', '#16213e']
          : ['#4facfe', '#00f2fe']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <HeaderParticles />

        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
            onPress={toggleFilter}
          >
            <MaterialIcons name="tune" size={24} color="white" />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>ChapAt</Text>
            <Text style={styles.appSubtitle}>{t('home.subtitle')}</Text>
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={navigateToProximityRadar}
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
                maxHeight: height - 100,
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
            <View style={styles.filterHeader}>
              <View style={styles.filterTitleContainer}>
                <MaterialIcons name="filter-list" size={24} color={currentThemeColors.tint || '#667eea'} />
                <Text style={[styles.filterTitle, { color: currentThemeColors.text }]}>
                  {t('filter.title')}
                </Text>
              </View>
              <TouchableOpacity onPress={toggleFilter} style={styles.closeFilterButton}>
                <MaterialIcons name="close" size={24} color={currentThemeColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={styles.filterScrollView}
            >
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                  {t('filter.gender')}
                </Text>
                <View style={styles.genderChips}>
                  <Chip
                    selected={selectedGender === 'male'}
                    onPress={() => handleGenderSelect('male')}
                    style={[styles.genderChip, selectedGender === 'male' && styles.selectedChip]}
                    textStyle={{ color: selectedGender === 'male' ? 'white' : currentThemeColors.text }}
                    icon="gender-male"
                  >
                    {t('signup.male')}
                  </Chip>
                  <Chip
                    selected={selectedGender === 'female'}
                    onPress={() => handleGenderSelect('female')}
                    style={[styles.genderChip, selectedGender === 'female' && styles.selectedChip]}
                    textStyle={{ color: selectedGender === 'female' ? 'white' : currentThemeColors.text }}
                    icon="gender-female"
                  >
                    {t('signup.female')}
                  </Chip>
                  <Chip
                    selected={selectedGender === 'all'}
                    onPress={() => handleGenderSelect('all')}
                    style={[styles.genderChip, selectedGender === 'all' && styles.selectedChip]}
                    textStyle={{ color: selectedGender === 'all' ? 'white' : currentThemeColors.text }}
                    icon="account-group"
                  >
                    {t('common.all')}
                  </Chip>
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                  {t('filter.age')}
                </Text>
                <View style={styles.ageInputsContainer}>
                  <View style={styles.ageInputWrapper}>
                    <Text style={[styles.ageLabel, { color: currentThemeColors.subtleText }]}>{t('filter.age_from')}</Text>
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
                    <Text style={[styles.ageLabel, { color: currentThemeColors.subtleText }]}>{t('filter.age_to')}</Text>
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
                  {t('filter.education')}
                </Text>
                <View style={styles.educationChips}>
                  {educationLevels.map((level) => (
                    <Chip
                      key={level.value}
                      selected={selectedEducationLevel === level.value}
                      onPress={() => handleEducationSelect(level.value)}
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
                    {t('filter.university')}
                  </Text>
                  <View style={styles.searchContainer}>
                    <TextInput
                      placeholder={t('filter.search_university')}
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
                          onPress={() => handleUniversitySelect(university.value)}
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
                          {t('filter.no_university')}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                  {t('filter.job')}
                </Text>
                <View style={styles.jobChips}>
                  {jobs.map((job) => (
                    <Chip
                      key={job.value}
                      selected={selectedJob === job.value}
                      onPress={() => handleJobSelect(job.value)}
                      style={[styles.jobChip, selectedJob === job.value && styles.selectedChip]}
                      textStyle={{ color: selectedJob === job.value ? 'white' : currentThemeColors.text }}
                    >
                      {job.label}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>{t('filter.interests')}</Text>
                <View style={styles.interestsChips}>
                  {interestItems.map((it) => (
                    <Chip
                      key={it.id}
                      selected={selectedInterests.includes(it.id)}
                      onPress={() => handleInterestToggle(it.id)}
                      style={[styles.interestChip, selectedInterests.includes(it.id) && styles.selectedChip]}
                      textStyle={{ color: selectedInterests.includes(it.id) ? 'white' : currentThemeColors.text }}
                    >
                      {it.label}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.filterPreview}>
                <Text style={[styles.previewText, { color: currentThemeColors.subtleText }]}>
                  {filterSummary}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <Button
                mode="outlined"
                onPress={clearFilters}
                style={[styles.clearButton, { borderColor: currentThemeColors.border || '#E2E8F0' }]}
                labelStyle={{ color: currentThemeColors.text }}
                icon="delete-outline"
              >
                {t('filter.clear')}
              </Button>
              <Button
                mode="contained"
                onPress={applyFilters}
                style={styles.applyButton}
                labelStyle={styles.applyButtonLabel}
                icon="check-circle"
                contentStyle={{ height: 50 }}
              >
                {t('filter.apply')}
              </Button>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
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
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24),
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
    borderRadius: 30,
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
    gap: 12,
  },
  ageInputWrapper: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  ageInput: {
    height: 40,
    backgroundColor: 'transparent',
  },
  ageSeparator: {
    marginTop: 20,
  },
  educationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  educationChip: {
    marginBottom: 4,
    borderRadius: 20,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  searchInput: {
    height: 40,
    backgroundColor: 'transparent',
  },
  clearSearchButton: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  universityList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 4,
  },
  universityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedUniversityItem: {
    backgroundColor: '#667eea',
  },
  universityText: {
    fontSize: 14,
    flex: 1,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  jobChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jobChip: {
    marginBottom: 4,
    borderRadius: 20,
  },
  interestsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    marginBottom: 4,
    borderRadius: 20,
  },
  filterPreview: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  previewText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  clearButton: {
    flex: 1,
    borderRadius: 12,
  },
  applyButton: {
    flex: 1.5,
    borderRadius: 12,
    backgroundColor: '#667eea',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  applyButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  filterScrollView: {
    flexGrow: 0,
  },
});

export default HomeHeader;