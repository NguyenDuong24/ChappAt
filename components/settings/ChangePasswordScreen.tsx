import React, { useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { useTheme } from '@/context/ThemeContext';
import { getLiquidPalette } from '@/components/liquid';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length < 6) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (password.length >= 12 && score >= 3) return 'strong';
  if (password.length >= 8 && score >= 2) return 'good';
  return 'fair';
};

const strengthConfig = {
  weak:   { label: 'Yếu',       color: '#FF6B7F', bars: 1 },
  fair:   { label: 'Trung bình', color: '#F6C966', bars: 2 },
  good:   { label: 'Tốt',       color: '#59E0B1', bars: 3 },
  strong: { label: 'Rất mạnh',  color: '#2FE0AC', bars: 4 },
};

const ChangePasswordScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateUserPassword, user } = useAuth();
  const { theme, isDark, palette: contextPalette } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  const palette = useMemo(() => {
    const lp = contextPalette || getLiquidPalette(theme);
    const bg = lp.appGradient || ['#0A6C54', '#0C5D49', '#0A4C3B'];
    return {
      text:        lp.textColor,
      subtleText:  lp.subtitleColor,
      softText:    isDark ? 'rgba(255,255,248,0.62)' : 'rgba(11,33,36,0.62)',
      border:      lp.menuBorder || (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)'),
      inputBg:     isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.04)',
      cardGlass:   ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.07)'] as [string, string],
      bg:          bg as [string, string, ...string[]],
      primary:     lp.primary || '#9FF7D8',
      btnStart:    isDark ? '#90F5D2' : lp.primary,
      btnEnd:      isDark ? '#65E7BA' : lp.secondary,
    };
  }, [theme, isDark, contextPalette]);

  const strength: PasswordStrength | null = newPassword.length > 0
    ? getPasswordStrength(newPassword) : null;

  // Check if this is an email/password user
  const isEmailUser = useMemo(() => {
    if (!user?.providerData) return true;
    return (user.providerData as any[]).some((p: any) => p.providerId === 'password');
  }, [user]);

  const handleUpdatePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        t('common.error', { defaultValue: 'Lỗi' }),
        t('settings.fill_all_fields', { defaultValue: 'Vui lòng nhập đầy đủ thông tin' })
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t('common.error', { defaultValue: 'Lỗi' }),
        t('signup.password_error_mismatch', { defaultValue: 'Mật khẩu mới không khớp' })
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        t('common.error', { defaultValue: 'Lỗi' }),
        t('signup.password_error_min', { defaultValue: 'Mật khẩu phải có ít nhất 6 ký tự' })
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        t('common.error', { defaultValue: 'Lỗi' }),
        t('settings.password_same', { defaultValue: 'Mật khẩu mới phải khác mật khẩu hiện tại' })
      );
      return;
    }

    setLoading(true);
    try {
      const result = await updateUserPassword(currentPassword, newPassword);
      if (result.success) {
        Alert.alert(
          t('common.success', { defaultValue: 'Thành công' }),
          t('settings.change_password_success', { defaultValue: 'Mật khẩu đã được cập nhật thành công' }),
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(t('common.error', { defaultValue: 'Lỗi' }), result.msg || t('common.error_generic', { defaultValue: 'Đã xảy ra lỗi' }));
      }
    } catch {
      Alert.alert(t('common.error', { defaultValue: 'Lỗi' }), t('common.error_generic', { defaultValue: 'Đã xảy ra lỗi' }));
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, updateUserPassword, t, router]);

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    secure: boolean,
    onToggleSecure: () => void,
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
    placeholder: string,
    autoFocus?: boolean
  ) => (
    <View style={styles.inputBlock}>
      <Text style={[styles.label, { color: palette.softText }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: palette.border, backgroundColor: palette.inputBg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.subtleText} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: palette.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.softText}
          secureTextEntry={secure}
          autoFocus={autoFocus}
          autoComplete="off"
        />
        <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons
            name={secure ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={palette.subtleText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isEmailUser) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={palette.bg} style={StyleSheet.absoluteFillObject} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { borderColor: palette.border, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.86}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>{t('settings.change_password', { defaultValue: 'Đổi mật khẩu' })}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredMessage}>
          <MaterialCommunityIcons name="google" size={48} color={palette.subtleText} />
          <Text style={[styles.centeredTitle, { color: palette.text }]}>
            {t('settings.social_login_no_password', { defaultValue: 'Tài khoản đăng nhập qua mạng xã hội' })}
          </Text>
          <Text style={[styles.centeredDesc, { color: palette.subtleText }]}>
            {t('settings.social_login_no_password_desc', { defaultValue: 'Tài khoản của bạn sử dụng đăng nhập qua Google hoặc mạng xã hội, không cần mật khẩu riêng.' })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={palette.bg} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { borderColor: palette.border, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}
          activeOpacity={0.86}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{t('settings.change_password', { defaultValue: 'Đổi mật khẩu' })}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Hero card */}
        <LinearGradient colors={palette.cardGlass} style={[styles.heroCard, { borderColor: palette.border }]}>
          <View style={[styles.heroIcon, { borderColor: palette.border, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
            <MaterialCommunityIcons name="lock-reset" size={30} color={palette.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: palette.text }]}>{t('settings.change_password', { defaultValue: 'Đổi mật khẩu' })}</Text>
          <Text style={[styles.heroDescription, { color: palette.subtleText }]}>
            {t('settings.change_password_desc', { defaultValue: 'Tạo mật khẩu mạnh để bảo vệ tài khoản của bạn' })}
          </Text>
        </LinearGradient>

        {/* Form card */}
        <LinearGradient colors={palette.cardGlass} style={[styles.formCard, { borderColor: palette.border }]}>
          {renderInput(
            t('settings.current_password', { defaultValue: 'Mật khẩu hiện tại' }),
            currentPassword,
            setCurrentPassword,
            !showCurrent,
            () => setShowCurrent(p => !p),
            'lock-outline',
            t('settings.current_password_placeholder', { defaultValue: 'Nhập mật khẩu hiện tại' })
          )}

          {renderInput(
            t('settings.new_password', { defaultValue: 'Mật khẩu mới' }),
            newPassword,
            setNewPassword,
            !showNew,
            () => setShowNew(p => !p),
            'lock-plus-outline',
            t('settings.new_password_placeholder', { defaultValue: 'Nhập mật khẩu mới' })
          )}

          {/* Password strength */}
          {strength && (
            <View style={styles.strengthWrapper}>
              <View style={styles.strengthBars}>
                {([1, 2, 3, 4] as const).map(bar => (
                  <View
                    key={bar}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          bar <= strengthConfig[strength].bars
                            ? strengthConfig[strength].color
                            : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strengthConfig[strength].color }]}>
                {strengthConfig[strength].label}
              </Text>
            </View>
          )}

          {/* Password tips */}
          {newPassword.length > 0 && newPassword.length < 12 && (
            <View style={[styles.tipBox, { backgroundColor: isDark ? 'rgba(246,201,102,0.10)' : 'rgba(246,201,102,0.12)', borderColor: 'rgba(246,201,102,0.3)' }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={14} color="#F6C966" style={{ marginRight: 6 }} />
              <Text style={[styles.tipText, { color: '#F6C966' }]}>
                {t('settings.password_tip', { defaultValue: 'Mật khẩu mạnh có ít nhất 12 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt' })}
              </Text>
            </View>
          )}

          {renderInput(
            t('settings.confirm_new_password', { defaultValue: 'Xác nhận mật khẩu mới' }),
            confirmPassword,
            setConfirmPassword,
            !showConfirm,
            () => setShowConfirm(p => !p),
            'lock-check-outline',
            t('settings.confirm_new_password_placeholder', { defaultValue: 'Nhập lại mật khẩu mới' })
          )}

          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <View style={styles.matchRow}>
              <MaterialCommunityIcons
                name={newPassword === confirmPassword ? 'check-circle-outline' : 'close-circle-outline'}
                size={14}
                color={newPassword === confirmPassword ? '#2FE0AC' : '#FF6B7F'}
              />
              <Text style={[styles.matchText, { color: newPassword === confirmPassword ? '#2FE0AC' : '#FF6B7F' }]}>
                {newPassword === confirmPassword
                  ? t('settings.password_match', { defaultValue: 'Mật khẩu khớp' })
                  : t('settings.password_no_match', { defaultValue: 'Mật khẩu không khớp' })}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, (loading || !currentPassword || !newPassword || !confirmPassword) && { opacity: 0.6 }]}
            onPress={handleUpdatePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            activeOpacity={0.9}
          >
            <LinearGradient colors={[palette.btnStart, palette.btnEnd]} style={styles.submitGradient}>
              {loading ? (
                <ActivityIndicator color={isDark ? '#0D4A3B' : '#fff'} />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={18} color={isDark ? '#0D4A3B' : '#fff'} />
                  <Text style={[styles.submitText, { color: isDark ? '#0D4A3B' : '#fff' }]}>
                    {t('common.save', { defaultValue: 'Lưu thay đổi' })}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Security tips */}
        <LinearGradient colors={palette.cardGlass} style={[styles.tipsCard, { borderColor: palette.border }]}>
          <Text style={[styles.tipsTitle, { color: palette.text }]}>
            {t('settings.security_tips_title', { defaultValue: '🛡️ Mẹo bảo mật' })}
          </Text>
          {[
            t('settings.tip1', { defaultValue: 'Không dùng lại mật khẩu từ tài khoản khác' }),
            t('settings.tip2', { defaultValue: 'Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt' }),
            t('settings.tip3', { defaultValue: 'Thay đổi mật khẩu định kỳ 3-6 tháng một lần' }),
            t('settings.tip4', { defaultValue: 'Không chia sẻ mật khẩu với bất kỳ ai' }),
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: palette.primary }]} />
              <Text style={[styles.tipText2, { color: palette.subtleText }]}>{tip}</Text>
            </View>
          ))}
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { fontSize: 19, fontWeight: '800' },
  headerSpacer: { width: 38 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  heroTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  heroDescription: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 2,
  },
  inputBlock: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14 },
  strengthWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
    marginTop: -4,
  },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: { fontSize: 11, fontWeight: '700' },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    marginBottom: 10,
  },
  tipText: { fontSize: 11, lineHeight: 16, flex: 1 },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    marginTop: -4,
  },
  matchText: { fontSize: 11, fontWeight: '600' },
  submitButton: {
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: { fontSize: 15, fontWeight: '800' },
  tipsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  tipText2: { fontSize: 12, lineHeight: 18, flex: 1 },
  centeredMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  centeredTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  centeredDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

export default ChangePasswordScreen;
