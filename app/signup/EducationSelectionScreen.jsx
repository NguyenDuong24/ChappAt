import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert, ImageBackground, ActivityIndicator, SectionList, ScrollView } from 'react-native';
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

    if (selectedUniversity === 'Khác') {
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
    setUniversity(finalUniversity);
    if (selectedJob) {
      setJob(finalJob);
    }

    setTimeout(() => {
      setLoading(false);
      router.push('/signup/CompleteSocialProfileScreen');
    }, 1000);
  };

  const isNextEnabled = selectedLevel && selectedUniversity &&
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
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="school" size={24} color="#fff" />
              <Text style={styles.sectionTitle}>Trình độ học vấn</Text>
            </View>
            <View style={styles.gridContainer}>
              {educationLevels.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.gridItem, selectedLevel === item.label && styles.gridItemSelected]}
                  onPress={() => handleSelectLevel(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, selectedLevel === item.label && styles.iconContainerSelected]}>
                    <Ionicons 
                      name={item.icon} 
                      size={28} 
                      color={selectedLevel === item.label ? '#fff' : '#9370db'} 
                    />
                  </View>
                  <Text style={[styles.gridItemText, selectedLevel === item.label && styles.gridItemTextSelected]}>
                    {item.label}
                  </Text>
                  {selectedLevel === item.label && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {selectedLevel === 'Khác' && (
              <TextInput
                style={styles.input}
                placeholder="VD: Cử nhân, Kỹ sư..."
                placeholderTextColor="#999"
                value={customLevel}
                onChangeText={setCustomLevel}
              />
            )}
          </View>

          {/* University Section - Only show for Cao đẳng or Đại học */}
          {(selectedLevel === 'Cao đẳng/Đại học') && (
            <View style={styles.section}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="business" size={24} color="#fff" />
                <Text style={styles.sectionTitle}>Trường học</Text>
              </View>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm trường..."
                  placeholderTextColor="#999"
                  value={searchText}
                  onChangeText={handleSearchUniversity}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearchUniversity('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {loadingUniversities ? (
                <ActivityIndicator size="large" color="#fff" style={styles.loader} />
              ) : (
                <View style={styles.universityList}>
                  <SectionList
                    sections={filteredSections}
                    keyExtractor={(item) => item.code}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.listItem, selectedUniversity === item.label && styles.listItemSelected]}
                        onPress={() => handleSelectUniversity(item)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.listIconContainer, selectedUniversity === item.label && styles.listIconContainerSelected]}>
                          <Ionicons 
                            name={item.icon} 
                            size={22} 
                            color={selectedUniversity === item.label ? '#fff' : '#9370db'} 
                          />
                        </View>
                        <Text style={[styles.listItemText, selectedUniversity === item.label && styles.listItemTextSelected]}>
                          {item.label}
                        </Text>
                        {selectedUniversity === item.label && (
                          <Ionicons name="checkmark-circle" size={24} color="#00ff88" />
                        )}
                      </TouchableOpacity>
                    )}
                    renderSectionHeader={({ section: { title } }) => (
                      <View style={styles.listSectionHeader}>
                        <Text style={styles.listSectionHeaderText}>{title}</Text>
                      </View>
                    )}
                    stickySectionHeadersEnabled={false}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                    nestedScrollEnabled={false}
                  />
                </View>
              )}
              {selectedUniversity === 'Khác' && (
                <TextInput
                  style={styles.input}
                  placeholder="VD: Đại học Bách Khoa..."
                  placeholderTextColor="#999"
                  value={customUniversity}
                  onChangeText={setCustomUniversity}
                />
              )}
            </View>
          )}

          {/* Job Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="briefcase" size={24} color="#fff" />
              <Text style={styles.sectionTitle}>Nghề nghiệp</Text>
            </View>
            <View style={styles.gridContainer}>
              {jobs.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.gridItem, selectedJob === item.label && styles.gridItemSelected]}
                  onPress={() => handleSelectJob(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, selectedJob === item.label && styles.iconContainerSelected]}>
                    <Ionicons 
                      name={item.icon} 
                      size={28} 
                      color={selectedJob === item.label ? '#fff' : '#9370db'} 
                    />
                  </View>
                  <Text style={[styles.gridItemText, selectedJob === item.label && styles.gridItemTextSelected]}>
                    {item.label}
                  </Text>
                  {selectedJob === item.label && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {selectedJob === 'Khác' && (
              <TextInput
                style={styles.input}
                placeholder="VD: Freelancer, Nghệ sĩ..."
                placeholderTextColor="#999"
                value={customJob}
                onChangeText={setCustomJob}
              />
            )}
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.buttonContainer, !isNextEnabled && styles.buttonDisabled]}
            disabled={!isNextEnabled || loading}
            onPress={validateAndNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isNextEnabled ? ['#ff1493', '#9370db'] : ['#ccc', '#999']}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Tiếp tục</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    ...StyleSheet.absoluteFillObject 
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '31%',
    marginHorizontal: '1%',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 110,
  },
  gridItemSelected: {
    backgroundColor: 'rgba(255,20,147,0.95)',
    borderColor: '#fff',
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(147,112,219,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 16,
  },
  gridItemTextSelected: {
    color: '#fff',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 14,
  },
  clearButton: {
    padding: 4,
  },
  universityList: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 400,
  },
  listSectionHeader: {
    backgroundColor: 'rgba(147,112,219,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  listSectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9370db',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listItemSelected: {
    backgroundColor: 'rgba(255,20,147,0.1)',
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(147,112,219,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listIconContainerSelected: {
    backgroundColor: 'rgba(255,20,147,0.2)',
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  listItemTextSelected: {
    color: '#ff1493',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginTop: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  loader: {
    marginVertical: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(147,112,219,0.95)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
});

export default EducationSelectionScreen;