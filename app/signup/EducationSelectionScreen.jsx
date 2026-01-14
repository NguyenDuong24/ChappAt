import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert, ImageBackground, ActivityIndicator, SectionList, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/authContext';
import schoolsData from '../../assets/model/schools_hcm.json';
import educationData from '@/assets/data/educationData.json';

const educationLevels = educationData.educationLevels;
const jobs = educationData.jobs;

const EducationSelectionScreen = () => {
  const { educationLevel, setEducationLevel, university, setUniversity, job, setJob, isOnboarding } = useAuth();
  const [customLevel, setCustomLevel] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [customJob, setCustomJob] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(educationLevel);
  const [selectedUniversity, setSelectedUniversity] = useState(university);
  const [selectedJob, setSelectedJob] = useState(job);
  const [universitiesList, setUniversitiesList] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [loading, setLoading] = useState(false);
  const [schoolSections, setSchoolSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (educationLevel && !educationLevels.some(e => e.label === educationLevel)) {
      setSelectedLevel('Khác');
      setCustomLevel(educationLevel);
    } else if (!educationLevel) {
      setSelectedLevel(null);
    }
    if (university && !universitiesList.some(u => u.label === university) && universitiesList.length > 0) {
      setSelectedUniversity('Khác');
      setCustomUniversity(university);
    } else if (!university) {
      setSelectedUniversity(null);
    }
    if (job && !jobs.some(j => j.label === job)) {
      setSelectedJob('Khác');
      setCustomJob(job);
    } else if (!job) {
      setSelectedJob(null);
    }
  }, [universitiesList]);

  useEffect(() => {
    const uniList = schoolsData.universities.map(u => ({ label: u.name, icon: 'school', code: u.code }));
    const colList = schoolsData.colleges.map(c => ({ label: c.name, icon: 'library', code: c.code }));
    const allSchools = [...uniList, ...colList, { label: 'Khác', icon: 'ellipsis-horizontal', code: 'other' }];
    setUniversitiesList(allSchools);
    setLoadingUniversities(false);

    const sections = [
      { title: 'Đại học', data: uniList },
      { title: 'Cao đẳng', data: colList },
      { title: 'Khác', data: [{ label: 'Khác', icon: 'ellipsis-horizontal', code: 'other' }] }
    ];
    setSchoolSections(sections);
    setFilteredSections(sections);
  }, []);

  const handleSelectLevel = (item) => {
    if (selectedLevel === item.label) {
      setSelectedLevel(null);
      setEducationLevel('');
      setCustomLevel('');
    } else {
      setSelectedLevel(item.label);
      if (item.label !== 'Khác') {
        setCustomLevel('');
        setEducationLevel(item.label);
      }
    }
  };

  const handleSelectUniversity = (item) => {
    if (selectedUniversity === item.label) {
      setSelectedUniversity(null);
      setUniversity('');
      setCustomUniversity('');
    } else {
      setSelectedUniversity(item.label);
      if (item.label !== 'Khác') {
        setCustomUniversity('');
        setUniversity(item.label);
      }
    }
  };

  const handleSelectJob = (item) => {
    if (selectedJob === item.label) {
      setSelectedJob(null);
      setJob('');
      setCustomJob('');
    } else {
      setSelectedJob(item.label);
      if (item.label !== 'Khác') {
        setCustomJob('');
        setJob(item.label);
      }
    }
  };

  const handleSearchUniversity = (text) => {
    setSearchText(text);
    if (text) {
      const filtered = schoolSections.map(section => ({
        ...section,
        data: section.data.filter(item => item.label.toLowerCase().includes(text.toLowerCase()))
      })).filter(section => section.data.length > 0);
      setFilteredSections(filtered);
    } else {
      setFilteredSections(schoolSections);
    }
  };

  const validateAndNext = () => {
    let finalLevel = selectedLevel;
    let finalUniversity = selectedUniversity;
    let finalJob = selectedJob;

    if (selectedLevel === 'Khác') {
      if (!customLevel.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập trình độ học vấn nếu chọn "Khác"');
        return;
      }
      finalLevel = customLevel.trim();
    }

    if (selectedLevel === 'Cao đẳng/Đại học' && selectedUniversity === 'Khác') {
      if (!customUniversity.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập trường đại học nếu chọn "Khác"');
        return;
      }
      finalUniversity = customUniversity.trim();
    }

    if (selectedJob === 'Khác') {
      if (!customJob.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập nghề nghiệp nếu chọn "Khác"');
        return;
      }
      finalJob = customJob.trim();
    }

    setLoading(true);
    setEducationLevel(finalLevel);
    if (selectedLevel === 'Cao đẳng/Đại học' || selectedLevel === 'Khác') {
      setUniversity(finalUniversity);
    } else {
      setUniversity('');
    }
    if (selectedJob) {
      setJob(finalJob);
    }

    setTimeout(() => {
      setLoading(false);
      router.push('/signup/CompleteSocialProfileScreen');
    }, 1000);
  };

  const isNextEnabled = selectedLevel &&
    (selectedLevel !== 'Cao đẳng/Đại học' || selectedUniversity) &&
    (selectedLevel !== 'Khác' || customLevel.trim()) &&
    (selectedUniversity !== 'Khác' || customUniversity.trim()) &&
    (!selectedJob || selectedJob !== 'Khác' || customJob.trim());

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(147,112,219,0.85)', 'rgba(255,20,147,0.85)']}
        style={styles.backdrop}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Hồ sơ của bạn</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Education Level Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trình độ học vấn</Text>
            <View style={styles.optionsGrid}>
              {educationLevels.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.optionButton,
                    selectedLevel === item.label && styles.selectedOption
                  ]}
                  onPress={() => handleSelectLevel(item)}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={selectedLevel === item.label ? '#fff' : '#9370db'}
                  />
                  <Text style={[
                    styles.optionText,
                    selectedLevel === item.label && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedLevel === 'Khác' && (
              <TextInput
                style={styles.customInput}
                placeholder="Nhập trình độ học vấn của bạn..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={customLevel}
                onChangeText={setCustomLevel}
              />
            )}
          </View>

          {/* University Section - Only if College/University is selected */}
          {(selectedLevel === 'Cao đẳng/Đại học' || selectedLevel === 'Khác') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trường học</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm trường học..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={searchText}
                  onChangeText={handleSearchUniversity}
                />
              </View>

              <View style={styles.schoolListContainer}>
                {loadingUniversities ? (
                  <ActivityIndicator color="#fff" style={{ margin: 20 }} />
                ) : (
                  <SectionList
                    sections={filteredSections}
                    keyExtractor={(item, index) => item.label + index}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.schoolItem,
                          selectedUniversity === item.label && styles.selectedSchoolItem
                        ]}
                        onPress={() => handleSelectUniversity(item)}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={selectedUniversity === item.label ? '#fff' : '#9370db'}
                        />
                        <Text style={[
                          styles.schoolItemText,
                          selectedUniversity === item.label && styles.selectedSchoolItemText
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                    renderSectionHeader={({ section: { title } }) => (
                      <Text style={styles.sectionHeader}>{title}</Text>
                    )}
                    stickySectionHeadersEnabled={false}
                    scrollEnabled={false}
                  />
                )}
              </View>

              {selectedUniversity === 'Khác' && (
                <TextInput
                  style={styles.customInput}
                  placeholder="Nhập tên trường của bạn..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={customUniversity}
                  onChangeText={setCustomUniversity}
                />
              )}
            </View>
          )}

          {/* Job Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nghề nghiệp (Tùy chọn)</Text>
            <View style={styles.optionsGrid}>
              {jobs.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.optionButton,
                    selectedJob === item.label && styles.selectedOption
                  ]}
                  onPress={() => handleSelectJob(item)}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={selectedJob === item.label ? '#fff' : '#9370db'}
                  />
                  <Text style={[
                    styles.optionText,
                    selectedJob === item.label && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedJob === 'Khác' && (
              <TextInput
                style={styles.customInput}
                placeholder="Nhập nghề nghiệp của bạn..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={customJob}
                onChangeText={setCustomJob}
              />
            )}
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={[styles.nextButton, !isNextEnabled && styles.disabledButton]}
            onPress={validateAndNext}
            disabled={!isNextEnabled || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>Tiếp tục</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
    opacity: 0.9,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#9370db',
    borderColor: '#fff',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4a4a',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#fff',
  },
  customInput: {
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 16,
  },
  schoolListContainer: {
    maxHeight: 300,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9370db',
  },
  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 10,
  },
  selectedSchoolItem: {
    backgroundColor: '#9370db',
  },
  schoolItemText: {
    fontSize: 14,
    color: '#4a4a4a',
    flex: 1,
  },
  selectedSchoolItemText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#ff1493',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 15,
    gap: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: 'rgba(255,20,147,0.5)',
    opacity: 0.7,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EducationSelectionScreen;