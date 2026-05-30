import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';

import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/context/authContext';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';
import provincesData from '@/assets/data/vietnam_provinces.json';

const { width } = Dimensions.get('window');

const ITEM_WIDTH = (width - 52) / 2;

const HometownSelectionScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const {
    hometown,
    setHometown,
    district,
    setDistrict,
    signupType,
  } = useAuth();

  const [selectedProvince, setSelectedProvince] = useState(
    hometown || ''
  );

  const [selectedDistrict, setSelectedDistrict] = useState(
    district || ''
  );

  const [searchProvince, setSearchProvince] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');

  const provinces = useMemo(() => {
    if (!searchProvince.trim()) {
      return provincesData;
    }

    return provincesData.filter((item) =>
      item.name
        .toLowerCase()
        .includes(searchProvince.toLowerCase())
    );
  }, [searchProvince]);

  const districtList = useMemo(() => {
    const foundProvince = provincesData.find(
      (item) => item.name === selectedProvince
    );

    if (!foundProvince) return [];

    if (!searchDistrict.trim()) {
      return foundProvince.districts || [];
    }

    return (foundProvince.districts || []).filter((item) =>
      item.toLowerCase().includes(searchDistrict.toLowerCase())
    );
  }, [selectedProvince, searchDistrict]);

  const handleSelectProvince = useCallback((province) => {
    setSelectedProvince(province.name);

    setSelectedDistrict('');
  }, []);

  const handleSelectDistrict = useCallback((item) => {
    if (selectedDistrict === item) {
      setSelectedDistrict('');
    } else {
      setSelectedDistrict(item);
    }
  }, [selectedDistrict]);

  const handleNext = () => {
    setHometown(selectedProvince);
    setDistrict(selectedDistrict || '');

    router.push('/signup/EducationSelectionScreen');
  };

  const canContinue = !!selectedProvince;

  const renderProvinceItem = ({ item }) => {
    const isSelected = selectedProvince === item.name;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleSelectProvince(item)}
        style={[
          styles.provinceCard,
          isSelected && styles.selectedCard,
        ]}
      >
        <LinearGradient
          colors={
            isSelected
              ? ['#E91E63', '#FB7185']
              : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']
          }
          style={styles.cardGradient}
        >
          <View style={styles.cardTop}>
            <Ionicons
              name="location"
              size={20}
              color={isSelected ? '#fff' : '#FB7185'}
            />

            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#fff"
              />
            )}
          </View>

          <Text
            numberOfLines={2}
            style={[
              styles.provinceName,
              isSelected && styles.selectedText,
            ]}
          >
            {item.name}
          </Text>

          <Text
            style={[
              styles.provinceType,
              isSelected && styles.selectedSubText,
            ]}
          >
            {item.type}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderDistrictItem = ({ item }) => {
    const isSelected = selectedDistrict === item;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleSelectDistrict(item)}
        style={[
          styles.districtChip,
          isSelected && styles.selectedDistrictChip,
        ]}
      >
        <Text
          style={[
            styles.districtText,
            isSelected && styles.selectedDistrictText,
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={require('../../assets/images/cover.webp')}
        style={styles.background}
      >
        <LinearGradient
          colors={[
            'rgba(5,7,12,0.82)',
            'rgba(14,14,20,0.96)',
          ]}
          style={styles.overlay}
        />

        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={
              Platform.OS === 'ios' ? 'padding' : undefined
            }
          >
            {/* HEADER */}
            <View style={styles.header}>
              <ProgressIndicator
                currentStep={signupType === 'google' ? 3 : 5}
                totalSteps={signupType === 'google' ? 6 : 8}
              />
            </View>

            {/* TITLE */}
            <View style={styles.titleSection}>
              <View style={styles.badge}>
                <Ionicons
                  name="earth"
                  size={14}
                  color="#FB7185"
                />

                 <Text style={styles.badgeText}>
                   {t('signup.hometown_badge')}
                 </Text>
              </View>

              <Text style={styles.title}>
                {t('signup.hometown_title_2')}
              </Text>

              <Text style={styles.subtitle}>
                {t('signup.hometown_subtitle')}
              </Text>
            </View>

            {/* CONTENT */}
            <FlatList
              data={provinces}
              keyExtractor={(item) => item.name}
              numColumns={2}
              renderItem={renderProvinceItem}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={{
                justifyContent: 'space-between',
              }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  {/* SEARCH PROVINCE */}
                  <View style={styles.searchBox}>
                    <Ionicons
                      name="search"
                      size={18}
                      color="rgba(255,255,255,0.45)"
                    />

                    <TextInput
                      value={searchProvince}
                      onChangeText={setSearchProvince}
                      placeholder={t('signup.hometown_search_placeholder')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      style={styles.searchInput}
                    />
                  </View>

                  {/* DISTRICT */}
                  {!!selectedProvince && (
                    <View style={styles.districtSection}>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>
                          {t('signup.district_section_title')}
                        </Text>

                        <TouchableOpacity
                          onPress={() =>
                            setSelectedDistrict('')
                          }
                        >
                          <Text style={styles.skipText}>
                            {t('signup.hometown_skip')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.searchBox}>
                        <Ionicons
                          name="search"
                          size={18}
                          color="rgba(255,255,255,0.45)"
                        />

                        <TextInput
                          value={searchDistrict}
                          onChangeText={setSearchDistrict}
                          placeholder={t('signup.hometown_district_search_placeholder')}
                          placeholderTextColor="rgba(255,255,255,0.35)"
                          style={styles.searchInput}
                        />
                      </View>

                      <FlatList
                        data={districtList}
                        keyExtractor={(item) => item}
                        renderItem={renderDistrictItem}
                        scrollEnabled={false}
                        contentContainerStyle={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      />
                    </View>
                  )}

                  <Text style={styles.provinceTitle}>
                    {t('signup.province_title')}
                  </Text>
                </>
              }
            />

            {/* BOTTOM */}
            <BlurView
              intensity={40}
              tint="dark"
              style={styles.bottomBar}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={!canContinue}
                onPress={handleNext}
                style={[
                  styles.primaryBtn,
                  !canContinue && styles.disabledBtn,
                ]}
              >
                <LinearGradient
                  colors={
                    canContinue
                      ? ['#E91E63', '#FB7185']
                      : ['#334155', '#1E293B']
                  }
                  style={styles.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.btnText}>
                    {t('signup.continue_text')}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#fff"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  background: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },

  titleSection: {
    paddingHorizontal: 22,
    marginTop: 18,
    marginBottom: 18,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,113,133,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.18)',
    marginBottom: 18,
  },

  badgeText: {
    color: '#FB7185',
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 22,
    paddingRight: 25,
  },

  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 260,
  },

  searchBox: {
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    marginLeft: 10,
  },

  provinceTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },

  provinceCard: {
    width: ITEM_WIDTH,
    height: 120,
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 14,
  },

  selectedCard: {
    shadowColor: '#FB7185',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },

  cardGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 26,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  provinceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },

  provinceType: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },

  selectedText: {
    color: '#fff',
  },

  selectedSubText: {
    color: 'rgba(255,255,255,0.8)',
  },

  districtSection: {
    marginBottom: 24,
  },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  skipText: {
    color: '#FB7185',
    fontWeight: '700',
    fontSize: 13,
  },

  districtChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  selectedDistrictChip: {
    backgroundColor: '#FB7185',
    borderColor: '#FB7185',
  },

  districtText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    fontSize: 13,
  },

  selectedDistrictText: {
    color: '#fff',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor: 'rgba(10,10,15,0.55)',

    paddingHorizontal: 22,
    paddingTop: 18,

    paddingBottom:
      Platform.OS === 'ios' ? 55 : 45,

    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },

  primaryBtn: {
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',

    shadowColor: '#FB7185',
    shadowOpacity: 0.45,
    shadowRadius: 16,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 10,
  },

  gradientBtn: {
    flex: 1,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    gap: 10,
  },

  disabledBtn: {
    opacity: 0.55,
  },

  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default HometownSelectionScreen;