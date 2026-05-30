import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/authContext';

import interestsData from '../../assets/data/interests.json';

import ProgressIndicator from '../../components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

const InterestsSelectionScreen = () => {
  const { t } = useTranslation();
  const { interests, setInterests, signupType } =
    useAuth();

  const [selectedInterests, setSelectedInterests] =
    useState(interests || []);

  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const insets = useSafeAreaInsets();

  const interestItems = useMemo(() => {
    if (!interestsData) return [];

    return Object.keys(interestsData).map((k) => ({
      id: k,
      label: interestsData[k],
    }));
  }, []);

  const toggleInterest = (id) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      return [...prev, id];
    });
  };

  const handleNext = () => {
    setLoading(true);

    setInterests(selectedInterests);

    setTimeout(() => {
      setLoading(false);

      router.push(
        '/signup/HometownSelectionScreen'
      );
    }, 700);
  };

  const handleSkip = () => {
    setLoading(true);

    setInterests([]);

    setTimeout(() => {
      setLoading(false);

      router.push(
        '/signup/HometownSelectionScreen'
      );
    }, 700);
  };

  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return {
        current: 5,
        total: 6,
      };
    }

    return {
      current: 7,
      total: 8,
    };
  }, [signupType]);

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
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + 220,
            },
          ]}
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
                name="heart-outline"
                size={14}
                color="#FF7AA2"
              />

              <Text style={styles.badgeText}>
                {t('signup.interests_badge')}
              </Text>
            </View>

            <Text style={styles.title}>
              {t('signup.interests_title')}
            </Text>

            <Text style={styles.subtitle}>
              {t('signup.interests_subtitle')}
            </Text>
          </View>

          {/* MAIN CARD */}

          <View style={styles.card}>
            <ProgressIndicator
              currentStep={stepInfo.current}
              totalSteps={stepInfo.total}
              signupType={signupType || 'email'}
            />

            {/* SELECTED COUNT */}

            <View style={styles.selectedBox}>
              <View style={styles.selectedDot} />

              <Text style={styles.selectedText}>
                {t('signup.selected_interests_count', { count: selectedInterests.length })}
              </Text>
            </View>

            {/* INTERESTS */}

            <View style={styles.interestsWrap}>
              {interestItems.map((item) => {
                const selected =
                  selectedInterests.includes(
                    item.id
                  );

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() =>
                      toggleInterest(item.id)
                    }
                    style={[
                      styles.chipContainer,
                      selected &&
                        styles.chipContainerActive,
                    ]}
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
                      style={styles.chip}
                    >
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="#fff"
                          style={{
                            marginRight: 6,
                          }}
                        />
                      )}

                      <Text
                        style={[
                          styles.chipText,
                          selected &&
                            styles.chipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* FIXED BOTTOM */}

        <View
          style={[
            styles.bottomArea,
            {
              paddingBottom:
                insets.bottom + 18,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={loading}
            onPress={handleNext}
            style={styles.continueButton}
          >
            <LinearGradient
              colors={['#FF4D8D', '#FF7AA2']}
              style={styles.continueGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueText}>
                    {t('signup.continue_text')}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={22}
                    color="#fff"
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={loading}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>
              {t('signup.interests_skip')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default InterestsSelectionScreen;

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
    paddingHorizontal: 10,
  },

  card: {
    width: '92%',
    backgroundColor: 'rgba(20,20,30,0.88)',
    borderRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },

  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FF7AA2',
    marginRight: 10,
  },

  selectedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  chipContainer: {
    margin: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },

  chipContainerActive: {
    shadowColor: '#FF4D8D',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  chipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
  },

  chipTextActive: {
    color: '#fff',
  },

  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,

    paddingHorizontal: 18,
    paddingTop: 16,

    backgroundColor: 'rgba(10,10,18,0.98)',

    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  continueButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },

  continueGradient: {
    height: 64,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 10,

    borderRadius: 24,
  },

  continueText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },

  skipText: {
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 18,
    fontSize: 13,
    fontWeight: '600',
  },
});