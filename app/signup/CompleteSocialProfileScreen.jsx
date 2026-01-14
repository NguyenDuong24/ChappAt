import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const CompleteSocialProfileScreen = () => {
  const {
    user, gender, name, age, icon, bio,
    cancelRegistration, updateUserProfile,
    educationLevel, university, job, email, password,
    signupType, clearSignupState
  } = useAuth();
  const router = useRouter();
  const logoUrl = useLogoState();
  const [loading, setLoading] = useState(false);

  // Helpers
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
    if (!isNaN(d.getTime())) {
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
  const displayGender = normalizedGender === 'male' ? 'Nam' : normalizedGender === 'female' ? 'Nữ' : 'Chưa cập nhật';
  const ageNumber = getAgeNumber(age);
  const displayAge = ageNumber > 0 ? ageNumber : 'Chưa cập nhật';

  const isProfileComplete = Boolean(
    normalizedGender && (name && name.trim().length > 0) && ageNumber > 0 && !!avatarUri
  );

  const handleCompleteProfile = async () => {
    try {
      if (!isProfileComplete) {
        const missing = [];
        if (!normalizedGender) missing.push('giới tính');
        if (!name || !name.trim()) missing.push('tên');
        if (!(ageNumber > 0)) missing.push('tuổi');
        if (!avatarUri) missing.push('ảnh đại diện');
        Alert.alert('Thiếu thông tin', `Vui lòng cập nhật: ${missing.join(', ')}`);
        return;
      }

      setLoading(true);

      // For both social and email signup, user is already authenticated - just update profile
      // (Email users are created at PasswordInputScreen now)
      console.log('📱 Completing signup profile...');

      const profileData = {
        username: name,
        gender: normalizedGender,
        age: age,
        profileUrl: avatarUri,
        bio: bio || '',
        educationLevel: educationLevel || '',
        university: university || '',
        job: job || '',
        profileCompleted: true,
      };

      const response = await updateUserProfile(profileData);
      if (!response?.success) {
        Alert.alert('Lỗi', response?.msg || 'Không thể cập nhật hồ sơ');
        setLoading(false);
        return;
      }

      console.log('✅ Profile completed successfully');
      clearSignupState();
      router.replace('/(tabs)/home');
      Alert.alert('Hoàn thành!', 'Hồ sơ của bạn đã được cập nhật thành công!');
    } catch (error) {
      console.error('Error completing profile:', error);
      Alert.alert('Lỗi', 'Không thể hoàn thành đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Huỷ đăng ký?',
      'Bạn có chắc muốn huỷ quá trình đăng ký?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Huỷ',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRegistration({ deleteAccount: signupType === 'email', navigateTo: '/signin' });
            } catch (_) { }
          }
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
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(147,112,219,0.85)', 'rgba(255,20,147,0.85)']}
        style={styles.backdrop}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
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
            <Text style={styles.badgeText}>Bước cuối cùng</Text>
          </View>
          <Text style={styles.title}>Xác nhận thông tin</Text>
          <Text style={styles.subtitle}>Kiểm tra và hoàn thành hồ sơ của bạn</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar Section */}
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
            <Text style={styles.profileName}>{name || user?.displayName || 'Chưa cập nhật'}</Text>
            {bio && <Text style={styles.profileBio}>{bio}</Text>}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

            <InfoRow
              icon="mail"
              label="Email"
              value={email || user?.email || 'Chưa cập nhật'}
              iconColor="#3b82f6"
            />
            <InfoRow
              icon={normalizedGender === 'male' ? 'male' : 'female'}
              label="Giới tính"
              value={displayGender}
              iconColor={normalizedGender === 'male' ? '#3b82f6' : '#ec4899'}
            />
            <InfoRow
              icon="calendar"
              label="Tuổi"
              value={displayAge}
              iconColor="#8b5cf6"
            />

            {/* Education & Career Section */}
            {(educationLevel || university || job) && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Học vấn & Nghề nghiệp</Text>

                {educationLevel && (
                  <InfoRow
                    icon="school"
                    label="Trình độ"
                    value={educationLevel}
                    iconColor="#10b981"
                  />
                )}
                {university && (
                  <InfoRow
                    icon="business"
                    label="Trường học"
                    value={university}
                    iconColor="#f59e0b"
                  />
                )}
                {job && (
                  <InfoRow
                    icon="briefcase"
                    label="Nghề nghiệp"
                    value={job}
                    iconColor="#ef4444"
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* Warning if incomplete */}
        {!isProfileComplete && (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle" size={24} color="#fbbf24" />
            <Text style={styles.warningText}>
              Vui lòng hoàn thành tất cả thông tin bắt buộc trước khi tiếp tục
            </Text>
          </View>
        )}

        {/* Action Buttons */}
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
                <Text style={styles.completeButtonText}>Hoàn thành và bắt đầu</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} disabled={loading}>
          <Ionicons name="close-circle-outline" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={styles.cancelButtonText}>Huỷ đăng ký</Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
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