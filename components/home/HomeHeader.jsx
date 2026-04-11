import React, { useState, useContext, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Text, ScrollView, StatusBar, Platform, Modal, Alert, FlatList, InteractionManager } from 'react-native';
import { Button, TextInput, Chip } from 'react-native-paper';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useStateCommon } from '@/context/stateCommon';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { saveFilterPreferences, loadFilterPreferences } from '@/utils/filterStorage';
import schoolsData from '../../assets/model/schools_hcm.json';
import educationData from '@/assets/data/educationData.json';
import { getInterestsArray, getLabelForInterest, getIdForInterest, normalizeInterestsArray } from '@/utils/interests';
import { useTranslation } from 'react-i18next';
import { useIsPremium } from '@/hooks/useIsPremium';

const educationLevels = educationData.educationLevels;
const jobs = educationData.jobs;
const allSchools = [
  ...schoolsData.universities.map((u) => ({ label: u.name, value: u.name, code: u.code })),
  ...schoolsData.colleges.map((c) => ({ label: c.name, value: c.name, code: c.code })),
  { label: 'Khac', value: 'Khac', code: 'OTHER' },
];

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

const VipBadge = memo(({ currentThemeColors }) => (
  <View style={[styles.vipBadge, { backgroundColor: '#FFF9C4' }]}>
    <MaterialCommunityIcons name="crown" size={12} color="#F59E0B" />
    <Text style={[styles.vipBadgeText, { color: '#F59E0B' }]}>VIP</Text>
  </View>
));

const HomeHeader = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { stateCommon, setStateCommon } = useStateCommon();
  const { user } = useAuth();
  const { isPremium } = useIsPremium();
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedEducationLevel, setSelectedEducationLevel] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedDistance, setSelectedDistance] = useState('');
  const [universitySearch, setUniversitySearch] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [deferredFilterReady, setDeferredFilterReady] = useState(false);
  const [showAllInterests, setShowAllInterests] = useState(false);

  const theme = useContext(ThemeContext)?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // Animation values
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const { height } = Dimensions.get('window');

  // Interest items as { id, label } - memoized
  const interestItems = useMemo(() => getInterestsArray(), []);
  const visibleInterestItems = useMemo(
    () => (showAllInterests ? interestItems : interestItems.slice(0, 24)),
    [interestItems, showAllInterests]
  );

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

    if (filter.distance && filter.distance !== 'all') {
      parts.push(t('filter.summary_distance', { distance: filter.distance }));
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
    if (filter.distance && filter.distance !== 'all') count++;
    if (filter.interests && Array.isArray(filter.interests) && filter.interests.length > 0) count++;
    return count;
  }, []);

  // Load filter from global state when component mounts
  useEffect(() => {
    if (stateCommon?.filter) {
      const { gender, minAge, maxAge, job, educationLevel, university, distance, interests } = stateCommon.filter;
      setSelectedGender(gender || '');
      setMinAge(minAge || '');
      setMaxAge(maxAge || '');
      setSelectedJob(job || '');
      setSelectedEducationLevel(educationLevel || '');
      setSelectedUniversity(university || '');
      setSelectedDistance(distance || '');
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

  const normalizedUniversitySearch = useMemo(
    () => universitySearch.trim().toLowerCase(),
    [universitySearch]
  );

  // Keep search render light by capping initial result count.
  const filteredUniversities = useMemo(() => {
    const source = normalizedUniversitySearch
      ? allSchools.filter((u) => u.label.toLowerCase().includes(normalizedUniversitySearch))
      : allSchools;
    return source.slice(0, 80);
  }, [normalizedUniversitySearch]);

  const paperInputTheme = useMemo(() => ({
    colors: {
      primary: '#667eea',
      outline: currentThemeColors.border || '#E2E8F0',
      text: currentThemeColors.text,
      placeholder: currentThemeColors.subtleText,
    }
  }), [currentThemeColors.border, currentThemeColors.text, currentThemeColors.subtleText]);

  const sectionCardStyle = useMemo(() => ({
    backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.55)' : '#F8FAFC',
    borderColor: theme === 'dark' ? 'rgba(148,163,184,0.24)' : '#E2E8F0',
  }), [theme]);

  const toggleFilter = useCallback(() => {
    setFilterVisible((v) => {
      const next = !v;
      if (!next) {
        setShowAllInterests(false);
      }
      return next;
    });
  }, []);

  const checkVipAccess = useCallback(() => {
    if (!isPremium) {
      Alert.alert(
        t('common.vip_required_title') || 'Yêu cầu VIP',
        t('common.vip_required_message') || 'Tính năng này chỉ dành cho thành viên VIP. Vui lòng nâng cấp để sử dụng!',
        [
          { text: t('common.cancel') || 'Hủy', style: 'cancel' },
          {
            text: t('common.upgrade') || 'Nâng cấp', onPress: () => {
              setFilterVisible(false);
              router.push('/(screens)/store/StoreScreen');
            }
          }
        ]
      );
      return false;
    }
    return true;
  }, [isPremium, t, router]);

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
      distance: selectedDistance,
      interests: selectedInterests,
    });
  }, [selectedGender, minAge, maxAge, selectedJob, selectedEducationLevel, selectedUniversity, selectedDistance, selectedInterests, getActiveFiltersCountUtil]);

  const clearFilters = useCallback(() => {
    setSelectedGender('');
    setMinAge('');
    setMaxAge('');
    setSelectedJob('');
    setSelectedEducationLevel('');
    setSelectedUniversity('');
    setSelectedDistance('');
    setUniversitySearch('');
    setSelectedInterests([]);

    const cleared = { gender: '', minAge: '', maxAge: '', job: '', educationLevel: '', university: '', distance: '', interests: [] };
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
      distance: selectedDistance,
      interests: selectedInterests,
    };

    setStateCommon({ filter: { ...newFilter } });
    saveFilterPreferences(newFilter);
    setFilterVisible(false);
  }, [selectedGender, minAge, maxAge, selectedJob, selectedEducationLevel, selectedUniversity, selectedDistance, selectedInterests, setStateCommon]);

  const toggleArrayItem = useCallback((array, item) => {
    return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
  }, []);

  const handleInterestToggle = useCallback((id) => {
    if (!checkVipAccess()) return;
    setSelectedInterests(prev => toggleArrayItem(prev, id));
  }, [toggleArrayItem, checkVipAccess]);

  const handleEducationSelect = useCallback((value) => {
    if (!checkVipAccess()) return;
    setSelectedEducationLevel(prev => prev === value ? '' : value);
  }, [checkVipAccess]);

  const handleJobSelect = useCallback((value) => {
    if (!checkVipAccess()) return;
    setSelectedJob(prev => prev === value ? '' : value);
  }, [checkVipAccess]);

  const handleUniversitySelect = useCallback((value) => {
    if (!checkVipAccess()) return;
    setSelectedUniversity(prev => prev === value ? '' : value);
  }, [checkVipAccess]);

  const handleDistanceSelect = useCallback((value) => {
    if (!checkVipAccess()) return;
    setSelectedDistance(prev => prev === value ? '' : value);
  }, [checkVipAccess]);

  const renderUniversityItem = useCallback(({ item }) => {
    const isSelected = selectedUniversity === item.value;
    return (
      <TouchableOpacity
        style={[styles.universityItem, isSelected && styles.selectedUniversityItem]}
        onPress={() => handleUniversitySelect(item.value)}
      >
        <Text style={[styles.universityText, { color: isSelected ? 'white' : currentThemeColors.text }]}>
          {item.label}
        </Text>
        {isSelected && (
          <MaterialIcons name="check" size={20} color="white" />
        )}
      </TouchableOpacity>
    );
  }, [selectedUniversity, handleUniversitySelect, currentThemeColors.text]);

  useEffect(() => {
    let task;
    if (filterVisible) {
      setDeferredFilterReady(false);
      task = InteractionManager.runAfterInteractions(() => {
        setDeferredFilterReady(true);
      });
    } else {
      setDeferredFilterReady(false);
      setShowAllInterests(false);
    }

    return () => {
      if (task?.cancel) task.cancel();
    };
  }, [filterVisible]);

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
    distance: selectedDistance,
    interests: selectedInterests,
  }), [selectedGender, minAge, maxAge, selectedJob, selectedEducationLevel, selectedUniversity, selectedDistance, selectedInterests, getFilterSummary]);

  // Memoize active filter count
  const activeFiltersCount = useMemo(() => getActiveFiltersCount(), [getActiveFiltersCount]);
  const activeFilterText = useMemo(
    () => (activeFiltersCount > 0 ? `${activeFiltersCount} filter` : t('filter.no_filters')),
    [activeFiltersCount, t]
  );

  return (
    <View style={styles.container}>
      {/* Modern Header with Theme-Aware Gradient */}
      <LinearGradient
        colors={theme === 'dark'
          ? ['#101426', '#1a1f3a']
          : ['#3b82f6', '#06b6d4']
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
            <View style={styles.filterStatePill}>
              <MaterialIcons name="tune" size={12} color="rgba(255,255,255,0.95)" />
              <Text style={styles.filterStateText}>{activeFilterText}</Text>
            </View>
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
            <View style={styles.sheetHandle} />
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
              <View style={[styles.filterSection, sectionCardStyle]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                    {t('filter.gender')}
                  </Text>
                </View>
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

              <View style={[styles.filterSection, sectionCardStyle]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                    {t('filter.age')}
                  </Text>
                </View>
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
                      theme={paperInputTheme}
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
                      theme={paperInputTheme}
                    />
                  </View>
                </View>
              </View>

              {deferredFilterReady ? (
                <>
                  <View style={[styles.filterSection, sectionCardStyle]}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                        {t('filter.distance_title')}
                      </Text>
                      <VipBadge currentThemeColors={currentThemeColors} />
                    </View>
                    <View style={styles.distanceChips}>
                      {['1', '5', '10', '50', '100', 'all'].map((dist) => (
                        <Chip
                          key={dist}
                          selected={selectedDistance === dist}
                          onPress={() => handleDistanceSelect(dist)}
                          style={[styles.distanceChip, selectedDistance === dist && styles.selectedChip]}
                          textStyle={{ color: selectedDistance === dist ? 'white' : currentThemeColors.text }}
                        >
                          {dist === 'all' ? t('common.all') : `${dist} km`}
                        </Chip>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.filterSection, sectionCardStyle]}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                        {t('filter.education')}
                      </Text>
                      <VipBadge currentThemeColors={currentThemeColors} />
                    </View>
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
                    <View style={[styles.filterSection, sectionCardStyle]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                          {t('filter.university')}
                        </Text>
                        <VipBadge currentThemeColors={currentThemeColors} />
                      </View>
                      <View style={styles.searchContainer}>
                        <TextInput
                          placeholder={t('filter.search_university')}
                          value={universitySearch}
                          onChangeText={setUniversitySearch}
                          style={styles.searchInput}
                          mode="outlined"
                          dense
                          theme={paperInputTheme}
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
                      <View style={styles.universityList}>
                        {filteredUniversities.length > 0 ? (
                          <FlatList
                            data={filteredUniversities}
                            keyExtractor={(item) => item.code}
                            renderItem={renderUniversityItem}
                            initialNumToRender={12}
                            maxToRenderPerBatch={16}
                            windowSize={8}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            removeClippedSubviews={Platform.OS === 'android'}
                          />
                        ) : (
                          <View style={styles.noResultsContainer}>
                            <Text style={[styles.noResultsText, { color: currentThemeColors.subtleText }]}>
                              {t('filter.no_university')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  <View style={[styles.filterSection, sectionCardStyle]}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                        {t('filter.job')}
                      </Text>
                      <VipBadge currentThemeColors={currentThemeColors} />
                    </View>
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

                  <View style={[styles.filterSection, sectionCardStyle]}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                        {t('filter.interests')}
                      </Text>
                      <VipBadge currentThemeColors={currentThemeColors} />
                    </View>
                    <View style={styles.interestsChips}>
                      {visibleInterestItems.map((it) => (
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
                    {interestItems.length > 24 && (
                      <TouchableOpacity
                        style={styles.moreInterestsButton}
                        onPress={() => setShowAllInterests((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.moreInterestsText, { color: currentThemeColors.tint || '#667eea' }]}>
                          {showAllInterests ? 'Thu gon' : 'Xem them'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.deferLoadingContainer}>
                  <MaterialIcons name="hourglass-top" size={18} color={currentThemeColors.subtleText} />
                  <Text style={[styles.deferLoadingText, { color: currentThemeColors.subtleText }]}>Dang tai bo loc...</Text>
                </View>
              )}

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
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    height: 56,
    position: 'relative',
    zIndex: 1,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
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
    gap: 2,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'System',
  },
  appSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.2,
  },
  filterStatePill: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  filterStateText: {
    color: 'rgba(255,255,255,0.96)',
    fontSize: 11,
    fontWeight: '600',
  },
  scanButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
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
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.24)',
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.65)',
    marginBottom: 14,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.22)',
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  closeFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  filterSection: {
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  vipBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  genderChips: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  genderChip: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 999,
    minHeight: 38,
  },
  selectedChip: {
    backgroundColor: '#5B6EE1',
    borderColor: '#5B6EE1',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#5B6EE1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
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
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    minHeight: 36,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  searchInput: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  universityList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    backgroundColor: '#FFFFFF',
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
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    minHeight: 36,
  },
  interestsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    marginBottom: 4,
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    minHeight: 36,
  },
  moreInterestsButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(102,126,234,0.1)',
  },
  moreInterestsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deferLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  deferLoadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterPreview: {
    marginTop: 8,
    padding: 14,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.24)',
  },
  previewText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  clearButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  applyButton: {
    flex: 1.5,
    borderRadius: 14,
    backgroundColor: '#5B6EE1',
    elevation: 6,
    shadowColor: '#5B6EE1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  applyButtonLabel: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  filterScrollView: {
    flexGrow: 0,
  },
  distanceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceChip: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
});

export default HomeHeader;


