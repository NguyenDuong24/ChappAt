import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground,
  ActivityIndicator,
  SectionList,
  ScrollView,
  StatusBar,
} from 'react-native';

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../context/authContext';

import schoolsData from '../../assets/model/schools_hcm.json';
import educationData from '@/assets/data/educationData.json';

import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

const educationBaseLevels = educationData.educationLevels;
const jobs = educationData.jobs;

const EducationSelectionScreen = () => {
  const { t } = useTranslation();
  const {
    educationLevel,
    setEducationLevel,
    university,
    setUniversity,
    job,
    setJob,
    signupType,
  } = useAuth();

  const deliveredT = t;

  const [customLevel, setCustomLevel] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [customJob, setCustomJob] = useState('');

  const [selectedLevel, setSelectedLevel] = useState(educationLevel);
  const [selectedUniversity, setSelectedUniversity] = useState(university);
  const [selectedJob, setSelectedJob] = useState(job);

  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [schoolSections, setSchoolSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  const router = useRouter();

  useEffect(() => {
    const uniList = schoolsData.universities.map((u) => ({
      label: u.name,
      icon: 'school-outline',
      code: u.code,
    }));

    const colList = schoolsData.colleges.map((c) => ({
      label: c.name,
      icon: 'library-outline',
      code: c.code,
    }));

    const sections = [
      {
        title: deliveredT('signup.education_university_title'),
        data: uniList,
      },
      {
        title: deliveredT('signup.education_college_title'),
        data: colList,
      },
      {
        title: deliveredT('signup.education_other_title'),
        data: [
          {
            label: deliveredT('signup.education_other_label'),
            icon: 'ellipsis-horizontal',
            code: 'other',
          },
        ],
      },
    ];

    setSchoolSections(sections);
    setFilteredSections(sections);

    if (
      educationLevel &&
      !educationBaseLevels.some((e) => e.label === educationLevel)
    ) {
      setSelectedLevel(deliveredT('signup.education_other_label'));
      setCustomLevel(educationLevel);
    }

    if (
      university &&
      ![...uniList, ...colList].some(
        (u) => u.label === university
      )
    ) {
      setSelectedUniversity(deliveredT('signup.education_other_label'));
      setCustomUniversity(university);
    }

    if (
      job &&
      !jobs.some((j) => j.label === job)
    ) {
      setSelectedJob(deliveredT('signup.education_other_label'));
      setCustomJob(job);
    }
  }, []);

  const handleSelectLevel = (item) => {
    if (selectedLevel === item.label) {
      setSelectedLevel(null);
      setEducationLevel('');
      return;
    }

    setSelectedLevel(item.label);

    if (item.label !== deliveredT('signup.education_other_label')) {
      setCustomLevel('');
      setEducationLevel(item.label);
    }
  };

  const handleSelectUniversity = (item) => {
    if (selectedUniversity === item.label) {
      setSelectedUniversity(null);
      setUniversity('');
      return;
    }

    setSelectedUniversity(item.label);

    if (item.label !== deliveredT('signup.education_other_label')) {
      setCustomUniversity('');
      setUniversity(item.label);
    }
  };

const handleSelectJob = (item) => {
    if (selectedJob === item.label) {
      setSelectedJob(null);
      setJob('');
      return;
    }

    setSelectedJob(item.label);

    if (item.label !== deliveredT('signup.education_other_label')) {
      setCustomJob('');
      setJob(item.label);
    }
  };

  const handleSearchUniversity = (text) => {
    setSearchText(text);

    if (!text.trim()) {
      setFilteredSections(schoolSections);
      return;
    }

    const filtered = schoolSections
      .map((section) => ({
        ...section,
        data: section.data.filter((item) =>
          item.label
            .toLowerCase()
            .includes(text.toLowerCase())
        ),
      }))
      .filter((section) => section.data.length > 0);

    setFilteredSections(filtered);
  };

  const validateAndNext = () => {
    let finalLevel = selectedLevel;
    let finalUniversity = selectedUniversity;
    let finalJob = selectedJob;

    if (selectedLevel === deliveredT('signup.education_other_label')) {
      if (!customLevel.trim()) {
        Alert.alert(
          deliveredT('signup.error'),
          deliveredT('signup.error_education_required')
        );

        return;
      }

      finalLevel = customLevel.trim();
    }

    if (
      (selectedLevel !== null && selectedLevel !== deliveredT('signup.education_other_label') ) &&
      selectedUniversity === deliveredT('signup.education_other_label')
    ) {
      if (!customUniversity.trim()) {
        Alert.alert(
          deliveredT('signup.error'),
          deliveredT('signup.error_university_required')
        );

        return;
      }

      finalUniversity = customUniversity.trim();
    }

    if (selectedJob === deliveredT('signup.education_other_label')) {
      if (!customJob.trim()) {
        Alert.alert(
          deliveredT('signup.error'),
          deliveredT('signup.error_job_required')
        );

        return;
      }

      finalJob = customJob.trim();
    }

    setLoading(true);

    setEducationLevel(finalLevel);

    // Any explicitly chosen non-default level should save the university value
    if (selectedLevel && selectedLevel !== deliveredT('signup.education_other_label')) {
      setUniversity(finalUniversity);
    }

    if (selectedJob) {
      setJob(finalJob);
    }

    setTimeout(() => {
      setLoading(false);

      router.push(
        '/signup/CompleteSocialProfileScreen'
      );
    }, 700);
  };

  const isNextEnabled =
    selectedLevel &&
    (selectedLevel !== deliveredT('signup.education_other_label') || Boolean(customLevel.trim())) &&
    (!selectedUniversity || selectedUniversity !== deliveredT('signup.education_other_label') || Boolean(customUniversity.trim())) &&
    (!selectedJob || selectedJob !== deliveredT('signup.education_other_label') || Boolean(customJob.trim()));

  return (
    <ImageBackground
      source={require('../../assets/images/cover.webp')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.overlay} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />

          <View style={styles.badge}>
            <Ionicons
              name="school-outline"
              size={14}
              color="#FF7AA2"
            />

            <Text style={styles.badgeText}>
              {deliveredT('signup.education_badge')}
            </Text>
          </View>

          <Text style={styles.title}>
            {deliveredT('signup.education_title')}
          </Text>

          <Text style={styles.subtitle}>
            {deliveredT('signup.education_subtitle')}
          </Text>
        </View>

        {/* CARD */}

        <View style={styles.card}>
          <ProgressIndicator
            currentStep={
              signupType === 'google' ? 6 : 8
            }
            totalSteps={
              signupType === 'google' ? 6 : 8
            }
            signupType={signupType || 'email'}
          />

          {/* EDUCATION */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {deliveredT('signup.education_required_label')}
            </Text>

            <View style={styles.grid}>
              {educationBaseLevels.map((item) => {
                const selected =
                  selectedLevel === item.label;

                return (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.85}
                    style={[
                      styles.optionCard,
                      selected &&
                        styles.optionCardActive,
                    ]}
                    onPress={() =>
                      handleSelectLevel(item)
                    }
                  >
                      <LinearGradient
                        colors={
                          selected
                            ? [
                                '#FF4D8D',
                                '#FF7AA2',
                              ]
                            : [
                                'rgba(255,255,255,0.06)',
                                'rgba(255,255,255,0.03)',
                              ]
                        }
                        style={styles.optionGradient}
                      >
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={
                            selected
                              ? '#fff'
                              : 'rgba(255,255,255,0.5)'
                          }
                        />

                        <Text
                          style={[
                            styles.optionText,
                            selected &&
                              styles.optionTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedLevel === deliveredT('signup.education_other_label') && (
                <TextInput
                  style={styles.input}
                  placeholder={deliveredT('signup.education_custom_placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={customLevel}
                  onChangeText={setCustomLevel}
                />
              )}
            </View>

            {/* UNIVERSITY */}

            {(selectedLevel ===
              deliveredT('signup.edu_college_uni_label') ||
              selectedLevel === deliveredT('signup.education_other_label')) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {deliveredT('signup.university_label')}
                </Text>

                <View style={styles.searchBox}>
                  <Ionicons
                    name="search"
                    size={18}
                    color="rgba(255,255,255,0.4)"
                  />

                  <TextInput
                    style={styles.searchInput}
                    placeholder={deliveredT('signup.university_search_placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={searchText}
                    onChangeText={
                      handleSearchUniversity
                    }
                  />
                </View>

                <View style={styles.schoolWrap}>
                  <SectionList
                    sections={filteredSections}
                    keyExtractor={(item, index) =>
                      item.label + index
                    }
                    stickySectionHeadersEnabled={
                      false
                    }
                    scrollEnabled={false}
                    renderSectionHeader={({
                      section,
                    }) => (
                      <Text
                        style={styles.schoolHeader}
                      >
                        {section.title}
                      </Text>
                    )}
                    renderItem={({ item }) => {
                      const selected =
                        selectedUniversity ===
                        item.label;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.schoolItem,
                            selected &&
                              styles.schoolItemActive,
                          ]}
                          onPress={() =>
                            handleSelectUniversity(
                              item
                            )
                          }
                        >
                          <Ionicons
                            name={item.icon}
                            size={18}
                            color={
                              selected
                                ? '#fff'
                                : 'rgba(255,255,255,0.45)'
                            }
                          />

                          <Text
                            style={[
                              styles.schoolText,
                              selected &&
                                styles.schoolTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>

                          {selected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#fff"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>

                {selectedUniversity === deliveredT('signup.education_other_label') && (
                  <TextInput
                    style={styles.input}
                    placeholder={deliveredT('signup.university_custom_placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={customUniversity}
                    onChangeText={
                      setCustomUniversity
                    }
                  />
                )}
              </View>
            )}

            {/* JOB */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {deliveredT('signup.job_label')}
              </Text>

              <View style={styles.grid}>
                {jobs.map((item) => {
                  const selected =
                    selectedJob === item.label;

                  return (
                    <TouchableOpacity
                      key={item.label}
                      activeOpacity={0.85}
                      style={[
                        styles.optionCard,
                        selected &&
                          styles.optionCardActive,
                      ]}
                      onPress={() =>
                        handleSelectJob(item)
                      }
                    >
                      <LinearGradient
                        colors={
                          selected
                            ? [
                                '#FF4D8D',
                                '#FF7AA2',
                              ]
                            : [
                                'rgba(255,255,255,0.06)',
                                'rgba(255,255,255,0.03)',
                              ]
                        }
                        style={styles.optionGradient}
                      >
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={
                            selected
                              ? '#fff'
                              : 'rgba(255,255,255,0.5)'
                          }
                        />

                        <Text
                          style={[
                            styles.optionText,
                            selected &&
                              styles.optionTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedJob === deliveredT('signup.education_other_label') && (
                <TextInput
                  style={styles.input}
                  placeholder={deliveredT('signup.job_placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={customJob}
                  onChangeText={setCustomJob}
                />
              )}
            </View>

            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* BOTTOM BUTTON */}

        <View style={styles.bottomArea}>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!isNextEnabled || loading}
            onPress={validateAndNext}
            style={styles.continueButton}
          >
            <LinearGradient
              colors={
                !isNextEnabled
                  ? ['#334155', '#1E293B']
                  : ['#FF4D8D', '#FF7AA2']
              }
              style={styles.continueGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueText}>
                    {deliveredT('signup.continue_text')}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#fff"
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={loading}
            onPress={() => {
              setEducationLevel('');
              setUniversity('');
              setJob('');

              router.push(
                '/signup/CompleteSocialProfileScreen'
              );
            }}
          >
            <Text style={styles.skipText}>
              {deliveredT('signup.skip_label')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default EducationSelectionScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,7,12,0.72)',
  },

  scrollContent: {
    paddingTop: 60,
    paddingBottom: 180,
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  logo: {
    width: 130,
    height: 75,
    marginBottom: 22,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,122,162,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,162,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 18,
  },

  badgeText: {
    color: '#FF7AA2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
  },

  card: {
    width: '92%',
    backgroundColor: 'rgba(20,20,30,0.88)',
    borderRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  section: {
    marginTop: 28,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  optionCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 22,
    overflow: 'hidden',
  },

  optionCardActive: {
    shadowColor: '#FF4D8D',
    shadowOpacity: 0.35,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },

  optionGradient: {
    minHeight: 92,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
  },

  optionText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  optionTextActive: {
    color: '#fff',
  },

  input: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontSize: 15,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },

  searchInput: {
    flex: 1,
    height: 54,
    color: '#fff',
    marginLeft: 10,
    fontSize: 15,
  },

  schoolWrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  schoolHeader: {
    color: '#FF7AA2',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },

  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },

  schoolItemActive: {
    backgroundColor: '#FF4D8D',
  },

  schoolText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  schoolTextActive: {
    color: '#fff',
  },

  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom:
      Platform.OS === 'ios' ? 34 : 18,
    backgroundColor: 'rgba(10,10,18,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  continueButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },

  continueGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  continueText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },

  skipText: {
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
  },
});                        