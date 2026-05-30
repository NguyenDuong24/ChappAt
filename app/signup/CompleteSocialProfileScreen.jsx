import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { auth } from '@/firebaseConfig';

const CompleteSocialProfileScreen = () => {
  const {
    user,
    gender,
    setGender,
    name,
    age,
    setAge,
    icon,
    bio,
    cancelRegistration,
    updateUserProfile,
    register,
    educationLevel,
    university,
    job,
    email,
    password,
    hometown,
    district,
    interests,
    signupType,
    clearSignupState,
  } = useAuth();

  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [birthDate, setBirthDate] = useState(() => {
    if (age) {
      const d = new Date(age);
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date();
    d.setFullYear(d.getFullYear() - 20);
    return d;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selected) {
      setBirthDate(selected);
      setAge(selected.toISOString());
    }
  };

  const normalizeGender = (g) => {
    const s = (g || '').toString().toLowerCase().trim();

    if (['male', 'nam', 'man', 'boy', 'm'].includes(s)) {
      return 'male';
    }

    if (['female', 'nu', 'nữ', 'woman', 'girl', 'f'].includes(s)) {
      return 'female';
    }

    return '';
  };

  const getAgeNumber = (val) => {
    if (!val) return 0;

    const d = new Date(val);

    if (!Number.isNaN(d.getTime())) {
      const now = new Date();

      let years = now.getFullYear() - d.getFullYear();

      const m = now.getMonth() - d.getMonth();

      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
        years--;
      }

      return years;
    }

    return 0;
  };

  // Chỉ dùng thông tin user đã nhập/chọn trong signup.
  // Không fallback sang displayName/photoURL từ Google/email auth vì user không muốn hồ sơ bị lấy từ mail.
  const effectiveName = (name || '').trim();

  const avatarUri = icon || '';

  const normalizedGender = normalizeGender(gender);

  const ageNumber = getAgeNumber(age);

  const displayGender =
    normalizedGender === 'male'
      ? 'Nam'
      : normalizedGender === 'female'
      ? 'Nữ'
      : '---';

  const fullLocation = useMemo(() => {
    if (district && hometown) {
      return `${district}, ${hometown}`;
    }

    return hometown || '';
  }, [district, hometown]);

  const isProfileComplete = useMemo(() => {
    return Boolean(
      normalizedGender &&
        effectiveName?.trim() &&
        ageNumber > 0 &&
        avatarUri
    );
  }, [
    normalizedGender,
    effectiveName,
    ageNumber,
    avatarUri,
  ]);

  const handleGenderPress = () => {
        Alert.alert(
        t('signup.gender_selection_title'),
        '', [
          { text: t('signup.male_option'), onPress: () => setGender('male') },
          { text: t('signup.female_option'), onPress: () => setGender('female') },
          { text: t('signup.cancel_option'), style: 'cancel' },
        ])
  };

  const handleCompleteProfile = async () => {
    try {
      if (!isProfileComplete) {
        Alert.alert(
          t('signup.profile_incomplete_title'),
          t('signup.profile_incomplete_msg_2')
        );
        return;
      }

      setLoading(true);

      const profileData = {
        username: effectiveName,
        gender: normalizedGender,
        age,
        profileUrl: avatarUri,
        bio: bio || '',
        educationLevel: educationLevel || '',
        university: university || '',
        job: job || '',
        hometown: hometown || '',
        district: district || '',
        interests: interests || [],
        profileCompleted: true,
      };

      const hasSignedInUser = Boolean(
        user?.uid || auth.currentUser?.uid
      );

      if (!hasSignedInUser && (!email || !password)) {
        Alert.alert(
          'Lỗi',
          'Phiên đăng ký đã hết hạn.'
        );

        router.replace('/signup/EmailInputScreen');

        setLoading(false);
        return;
      }

      const response = hasSignedInUser
        ? await updateUserProfile(profileData)
        : await register(email, password, profileData);

      if (!response?.success) {
        Alert.alert(
          'Lỗi',
          response?.msg || 'Có lỗi xảy ra'
        );

        setLoading(false);
        return;
      }

      clearSignupState();

      router.replace('/(tabs)/home');

      Alert.alert(
        'Hoàn tất',
        'Hồ sơ của bạn đã sẵn sàng 🎉'
      );
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Lỗi',
        'Không thể hoàn tất hồ sơ'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('signup.registration_cancel_title'),
      t('signup.cancel_dialog_message'),
      [
        {
          text: t('signup.stay_option'),
          style: 'cancel',
        },
        {
          text: t('signup.exit_option'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRegistration({
                deleteAccount: signupType === 'email',
                navigateTo: '/signin',
              });
            } catch {}
          },
        },
      ]
    );
  };

  const InfoItem = ({
    icon,
    label,
    value,
    onPress,
    multiline = false,
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!onPress}
      onPress={onPress}
      style={styles.infoCard}
    >
      <View style={styles.infoLeft}>
        <LinearGradient
          colors={['#FF4D8D', '#FF77A8']}
          style={styles.infoIcon}
        >
          <Ionicons
            name={icon}
            size={18}
            color="#fff"
          />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>
            {label}
          </Text>

          <Text
            style={[
              styles.infoValue,
              multiline && {
                lineHeight: 22,
              },
            ]}
            numberOfLines={multiline ? 3 : 1}
          >
            {value || '---'}
          </Text>
        </View>
      </View>

      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color="rgba(255,255,255,0.35)"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={require('../../assets/images/cover.webp')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[
          'rgba(0,0,0,0.55)',
          'rgba(10,10,20,0.9)',
        ]}
        style={styles.overlay}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.top}>
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <View style={styles.badge}>
            <Ionicons
              name="sparkles"
              size={14}
              color="#FF77A8"
            />

          <Text style={styles.badgeText}>
            {t('signup.profile_badge_readiness')}
          </Text>
          </View>

          <Text style={styles.title}>
            Hoàn thiện hồ sơ
          </Text>

          <Text style={styles.subtitle}>
            Match để gặp, không chỉ để chat
          </Text>
        </View>

        <BlurView
          intensity={50}
          tint="dark"
          style={styles.card}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.12)',
              'rgba(255,255,255,0.03)',
            ]}
            style={styles.cardBorder}
          >
            <View style={styles.profileArea}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#FF4D8D', '#FF77A8']}
                  style={styles.avatarGlow}
                />

                <Image
                  source={{
                    uri:
                      avatarUri ||
                      'https://i.pravatar.cc/300',
                  }}
                  style={styles.avatar}
                  contentFit="cover"
                />

                <View style={styles.onlineDot} />
              </View>

              <Text style={styles.name}>
                {effectiveName || t('complete_social.not_updated')}
              </Text>

              {!!bio && (
                <Text style={styles.bio}>
                  {bio}
                </Text>
              )}
            </View>

            {/* BASIC INFO */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('signup.profile_summary_basic_section')}
              </Text>

              <InfoItem
                icon="mail-outline"
                label={t('signup.info_item_email')}
                value={email || user?.email}
              />

              <InfoItem
                icon={
                  normalizedGender === 'male'
                    ? 'male-outline'
                    : 'female-outline'
                }
                label={t('signup.info_item_gender')}
                value={displayGender}
                onPress={handleGenderPress}
              />

              <InfoItem
                icon="calendar-outline"
                label={t('signup.info_item_age')}
                value={`${ageNumber} ${t('common.years_old', { count: ageNumber })}`}
                onPress={() =>
                  setShowDatePicker(true)
                }
              />

              {!!fullLocation && (
                <InfoItem
                  icon="location-outline"
                  label={t('signup.info_item_hometown')}
                  value={fullLocation}
                  multiline
                />
              )}
            </View>

            {/* EDUCATION */}
            {(educationLevel ||
              university ||
              job) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('signup.profile_summary_education_section')}
                </Text>

                {!!educationLevel && (
                  <InfoItem
                    icon="school-outline"
                    label={t('signup.info_item_education')}
                    value={educationLevel}
                  />
                )}

                {!!university && (
                  <InfoItem
                    icon="business-outline"
                    label={t('signup.info_item_school')}
                    value={university}
                    multiline
                  />
                )}

                {!!job && (
                  <InfoItem
                    icon="briefcase-outline"
                    label={t('signup.info_item_job')}
                    value={job}
                  />
                )}
              </View>
            )}

            {/* INTERESTS */}
            {!!interests?.length && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('signup.profile_summary_interests_section')}
                </Text>

                <View style={styles.interestsWrap}>
                  {interests.map(
                    (item, index) => (
                      <View
                        key={`${item}-${index}`}
                        style={styles.interestTag}
                      >
                        <Text
                          style={
                            styles.interestText
                          }
                        >
                          {item}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

            {/* BIO */}
            {!!bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('signup.profile_summary_bio_section')}
                </Text>

                <View style={styles.bioCard}>
                  <Text style={styles.bioText}>
                    {bio}
                  </Text>
                </View>
              </View>
            )}

            {!isProfileComplete && (
              <View style={styles.warningBox}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color="#FF7DAF"
                />

                <Text style={styles.warningText}>
                  {t('signup.profile_summary_warning')}
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={loading}
              onPress={handleCompleteProfile}
              style={styles.button}
            >
              <LinearGradient
                colors={
                  loading
                    ? ['#334155', '#1E293B']
                    : ['#FF4D8D', '#FF77A8']
                }
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {t('signup.complete_profile_finish')}
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
              disabled={loading}
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                {t('signup.cancel_social_confirm')}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>

        <View style={{ height: 70 }} />
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={birthDate}
          mode="date"
          display={
            Platform.OS === 'ios'
              ? 'spinner'
              : 'default'
          }
          maximumDate={new Date()}
          minimumDate={new Date(1940, 0, 1)}
          onChange={onDateChange}
          themeVariant="dark"
        />
      )}
    </ImageBackground>
  );
};

export default CompleteSocialProfileScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#05060A',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  content: {
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: 'center',
  },

  top: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 26,
  },

  logoWrap: {
    marginBottom: 24,
  },

  logo: {
    width: 130,
    height: 78,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,119,168,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,119,168,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 18,
  },

  badgeText: {
    color: '#FF77A8',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 1,
  },

  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  card: {
    width: '92%',
    borderRadius: 34,
    overflow: 'hidden',
  },

  cardBorder: {
    padding: 1,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  profileArea: {
    alignItems: 'center',
    paddingTop: 34,
    paddingBottom: 24,
    paddingHorizontal: 22,
  },

  avatarContainer: {
    width: 126,
    height: 126,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  avatarGlow: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 999,
    opacity: 0.5,
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 999,
  },

  onlineDot: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#111827',
  },

  name: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },

  bio: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  section: {
    paddingHorizontal: 18,
    marginBottom: 24,
  },

  sectionTitle: {
    color: '#FF77A8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 14,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 12,
  },

  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  infoLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },

  infoValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 230,
  },

  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  interestTag: {
    backgroundColor: 'rgba(255,119,168,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,119,168,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 10,
  },

  interestText: {
    color: '#FF9AC0',
    fontSize: 13,
    fontWeight: '700',
  },

  bioCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 18,
  },

  bioText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 24,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,119,168,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,119,168,0.18)',
    marginHorizontal: 18,
    padding: 14,
    borderRadius: 18,
    marginBottom: 24,
  },

  warningText: {
    color: '#FF7DAF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
  },

  button: {
    marginHorizontal: 18,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#FF4D8D',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 12,
  },

  buttonGradient: {
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },

  cancelButton: {
    alignItems: 'center',
    paddingBottom: 26,
  },

  cancelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});