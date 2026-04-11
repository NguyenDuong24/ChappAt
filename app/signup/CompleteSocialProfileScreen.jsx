import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const CompleteSocialProfileScreen = () => {
  const {
    user, gender, name, age, icon, bio,
    cancelRegistration, updateUserProfile,
    educationLevel, university, job, email,
    signupType, clearSignupState,
  } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const logoUrl = useLogoState();
  const [loading, setLoading] = useState(false);

  const normalizeGender = (g) => {
    const s = (g || '').toString().toLowerCase().trim();
    if (['male', 'nam', 'man', 'boy', 'm'].includes(s)) return 'male';
    if (['female', 'nu', 'nữ', 'woman', 'girl', 'f'].includes(s)) return 'female';
    return '';
  };

  const getAgeNumber = (val) => {
    if (val == null) return 0;
    if (val instanceof Date) {
      const now = new Date();
      let years = now.getFullYear() - val.getFullYear();
      const m = now.getMonth() - val.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < val.getDate())) years--;
      return years > 0 ? years : 0;
    }
    if (typeof val === 'number') return val > 0 ? val : 0;
    const str = String(val);
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
      return years > 0 ? years : 0;
    }
    const num = Number(str);
    return Number.isFinite(num) && num > 0 ? num : 0;
  };

  const avatarUri = icon || user?.photoURL || '';
  const normalizedGender = normalizeGender(gender);
  const displayGender = normalizedGender === 'male'
    ? t('signup.male')
    : normalizedGender === 'female'
      ? t('signup.female')
      : t('complete_social.not_updated');
  const ageNumber = getAgeNumber(age);
  const displayAge = ageNumber > 0 ? ageNumber : t('complete_social.not_updated');

  const isProfileComplete = Boolean(
    normalizedGender && (name && name.trim().length > 0) && ageNumber > 0 && !!avatarUri
  );

  const handleCompleteProfile = async () => {
    try {
      if (!isProfileComplete) {
        const missing = [];
        if (!normalizedGender) missing.push(t('complete_social.field_gender'));
        if (!name || !name.trim()) missing.push(t('complete_social.field_name'));
        if (!(ageNumber > 0)) missing.push(t('complete_social.field_age'));
        if (!avatarUri) missing.push(t('complete_social.field_avatar'));
        Alert.alert(t('complete_social.missing_title'), t('complete_social.missing_message', { fields: missing.join(', ') }));
        return;
      }

      setLoading(true);

      const profileData = {
        username: name,
        gender: normalizedGender,
        age,
        profileUrl: avatarUri,
        bio: bio || '',
        educationLevel: educationLevel || '',
        university: university || '',
        job: job || '',
        profileCompleted: true,
      };

      const response = await updateUserProfile(profileData);
      if (!response?.success) {
        Alert.alert(t('common.error'), response?.msg || t('complete_social.update_error'));
        setLoading(false);
        return;
      }

      clearSignupState();
      router.replace('/(tabs)/home');
      Alert.alert(t('complete_social.completed_title'), t('complete_social.completed_message'));
    } catch (error) {
      console.error('Error completing profile:', error);
      Alert.alert(t('common.error'), t('complete_social.complete_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('signup.cancel_title'),
      t('complete_social.cancel_confirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRegistration({ deleteAccount: signupType === 'email', navigateTo: '/signin' });
            } catch {}
          },
        },
      ]
    );
  };

  const InfoRow = ({ icon, label, value, iconColor = '#9370db' }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.infoIconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <ImageBackground source={require('../../assets/images/cover.png')} style={styles.background} resizeMode="cover">
      <LinearGradient colors={['rgba(147,112,219,0.85)', 'rgba(255,20,147,0.85)']} style={styles.backdrop} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {logoUrl ? (
            <View style={styles.logoContainer}>
              <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" />
              <View style={styles.logoGlow} />
            </View>
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="heart" size={40} color="#fff" />
            </View>
          )}
          <View style={styles.headerBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
            <Text style={styles.badgeText}>{t('complete_social.final_step')}</Text>
          </View>
          <Text style={styles.title}>{t('complete_social.confirm_title')}</Text>
          <Text style={styles.subtitle}>{t('complete_social.confirm_subtitle')}</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            {avatarUri ? (
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: avatarUri }} style={styles.profileImage} contentFit="cover" />
                <View style={styles.avatarBorder} />
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                <Ionicons name="person" size={50} color="#ccc" />
              </View>
            )}
            <Text style={styles.profileName}>{name || user?.displayName || t('complete_social.not_updated')}</Text>
            {bio ? <Text style={styles.profileBio}>{bio}</Text> : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>{t('complete_social.personal_info')}</Text>

            <InfoRow icon="mail" label={t('complete_social.email')} value={email || user?.email || t('complete_social.not_updated')} iconColor="#3b82f6" />
            <InfoRow
              icon={normalizedGender === 'male' ? 'male' : 'female'}
              label={t('complete_social.gender')}
              value={displayGender}
              iconColor={normalizedGender === 'male' ? '#3b82f6' : '#ec4899'}
            />
            <InfoRow icon="calendar" label={t('complete_social.age')} value={displayAge} iconColor="#8b5cf6" />

            {(educationLevel || university || job) && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>{t('complete_social.education_career')}</Text>

                {educationLevel ? <InfoRow icon="school" label={t('complete_social.education_level')} value={educationLevel} iconColor="#10b981" /> : null}
                {university ? <InfoRow icon="business" label={t('complete_social.university')} value={university} iconColor="#f59e0b" /> : null}
                {job ? <InfoRow icon="briefcase" label={t('complete_social.job')} value={job} iconColor="#ef4444" /> : null}
              </>
            )}
          </View>
        </View>

        {!isProfileComplete && (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle" size={24} color="#fbbf24" />
            <Text style={styles.warningText}>{t('complete_social.warning_required_fields')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.completeButton, (!isProfileComplete || loading) && styles.disabledButton]}
          onPress={handleCompleteProfile}
          disabled={!isProfileComplete || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isProfileComplete && !loading ? ['#ff1493', '#9370db'] : ['#94a3b8', '#64748b']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={24} color="#fff" />
                <Text style={styles.completeButtonText}>{t('complete_social.complete_and_start')}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} disabled={loading}>
          <Ionicons name="close-circle-outline" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={styles.cancelButtonText}>{t('complete_social.cancel_signup')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    opacity: 0.3,
    top: 0,
    left: 0,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,136,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.3)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBorder: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: '#ff1493',
    top: -4,
    left: -4,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  infoSection: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 10,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '700',
    maxWidth: '45%',
    textAlign: 'right',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  warningText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    lineHeight: 20,
  },
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#ff1493',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  disabledButton: {
    shadowOpacity: 0.2,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default CompleteSocialProfileScreen;
