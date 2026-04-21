import React, { useMemo, useState } from 'react';
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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const ChangePasswordScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateUserPassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const palette = useMemo(
    () => ({
      text: '#EDFFF8',
      subtleText: 'rgba(237,255,248,0.78)',
      softText: 'rgba(237,255,248,0.64)',
      border: 'rgba(255,255,255,0.22)',
      inputBg: 'rgba(255,255,255,0.1)',
      inputBgFocus: 'rgba(255,255,255,0.16)',
      primary: '#9FF7D8',
      buttonStart: '#90F5D2',
      buttonEnd: '#65E7BA',
    }),
    []
  );

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('signup.password_error_min'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('signup.password_error_mismatch'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('signup.password_error_min'));
      return;
    }

    setLoading(true);
    try {
      const result = await updateUserPassword(currentPassword, newPassword);
      if (result.success) {
        Alert.alert(t('common.success'), t('settings.change_password_success', { defaultValue: 'M?t kh?u dã du?c c?p nh?t thành công' }));
        router.back();
      } else {
        Alert.alert(t('common.error'), result.msg);
      }
    } catch {
      Alert.alert(t('common.error'), t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    secure: boolean,
    onToggleSecure: () => void,
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
    placeholder: string
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
        />
        <TouchableOpacity onPress={onToggleSecure} hitSlop={10}>
          <MaterialCommunityIcons
            name={secure ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={palette.subtleText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={['#0A6C54', '#0C5D49', '#0A4C3B']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.86}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{t('settings.change_password')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.08)']} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="lock-reset" size={30} color={palette.text} />
          </View>
          <Text style={[styles.heroTitle, { color: palette.text }]}>{t('settings.change_password')}</Text>
          <Text style={[styles.heroDescription, { color: palette.subtleText }]}>
            {t('settings.change_password_desc')}
          </Text>
        </LinearGradient>

        <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.08)']} style={styles.formCard}>
          {renderInput(
            t('settings.current_password', { defaultValue: 'M?t kh?u hi?n t?i' }),
            currentPassword,
            setCurrentPassword,
            !showCurrent,
            () => setShowCurrent((prev) => !prev),
            'lock-outline',
            t('settings.current_password_placeholder', { defaultValue: 'Nh?p m?t kh?u hi?n t?i' })
          )}

          {renderInput(
            t('settings.new_password', { defaultValue: 'M?t kh?u m?i' }),
            newPassword,
            setNewPassword,
            !showNew,
            () => setShowNew((prev) => !prev),
            'lock-plus-outline',
            t('settings.new_password_placeholder', { defaultValue: 'Nh?p m?t kh?u m?i' })
          )}

          {renderInput(
            t('settings.confirm_new_password', { defaultValue: 'Xác nh?n m?t kh?u m?i' }),
            confirmPassword,
            setConfirmPassword,
            !showConfirm,
            () => setShowConfirm((prev) => !prev),
            'lock-check-outline',
            t('settings.confirm_new_password_placeholder', { defaultValue: 'Nh?p l?i m?t kh?u m?i' })
          )}

          <TouchableOpacity style={styles.submitButton} onPress={handleUpdatePassword} disabled={loading} activeOpacity={0.9}>
            <LinearGradient colors={[palette.buttonStart, palette.buttonEnd]} style={styles.submitGradient}>
              {loading ? (
                <ActivityIndicator color="#0D4A3B" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={18} color="#0D4A3B" />
                  <Text style={styles.submitText}>{t('common.save')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroDescription: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 14,
  },
  inputBlock: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  submitButton: {
    marginTop: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D4A3B',
  },
});

export default ChangePasswordScreen;
