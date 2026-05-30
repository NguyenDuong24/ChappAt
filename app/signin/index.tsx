import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';

const LoginScreen = () => {
  // state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.35)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();

    Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1.25, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.12, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        ])
      ])
    ).start();
    Animated.loop(Animated.timing(ringRotate, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email & password required'); return; }
    setError('');
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.success) setError(res.msg || 'Login failed');
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    await loginWithGoogle({ forceChooseAccount: true });
    setGoogleLoading(false);
  };

  const goSignup = () => router.push('/signup/EmailInputScreen');

  const ringStyle = { transform: [{ rotate: ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };

  return (
    <ImageBackground source={require('../../assets/images/cover.webp')} style={styles.bg} resizeMode="cover">
      <View style={styles.dim} />
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.langBtn}>
          <Text style={styles.langText}>VI</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps='handled' showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <Image source={require('@/assets/images/logo.png')} style={styles.mainLogo} contentFit="contain" />
            <Text style={styles.brandSubtitle}>KẾT NỐI TỪ TRÁI TIM</Text>
            <View style={styles.heartDivider}>
              <View style={styles.divLine} />
              <MaterialCommunityIcons name="heart" size={14} color="#FB7185" style={{ marginHorizontal: 8 }} />
              <View style={styles.divLine} />
            </View>
          </View>

          <Animated.View style={[styles.outerCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.02)"]} style={styles.borderLayer}>
              <View style={styles.blurWrap}>
                <View style={styles.inner}>
                  <Text style={styles.title}>
                    Chào mừng <Text style={styles.titleHighlight}>trở lại</Text>
                  </Text>
                  <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình kết nối</Text>

                  <View style={styles.form}>
                    <TextInput
                      placeholder="Email"
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="email-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                      theme={{ colors: { primary: '#FB7185', text: '#fff', placeholder: 'rgba(255,255,255,0.4)', outline: 'rgba(255,255,255,0.1)' } }}
                      mode="outlined"
                      textColor="#fff"
                      outlineStyle={{ borderRadius: 18, borderWidth: 1 }}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <TextInput
                      placeholder="Mật khẩu"
                      value={password}
                      onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
                      secureTextEntry={!showPassword}
                      left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-outline" size={20} color="rgba(255,255,255,0.6)" />} />}
                      right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} forceTextInputFocus={false} color="rgba(255,255,255,0.6)" />}
                      style={styles.input}
                      theme={{ colors: { primary: '#FB7185', text: '#fff', placeholder: 'rgba(255,255,255,0.4)', outline: 'rgba(255,255,255,0.1)' } }}
                      mode="outlined"
                      textColor="#fff"
                      outlineStyle={{ borderRadius: 18, borderWidth: 1 }}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />

                    <View style={styles.optionsRow}>
                      <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
                        <MaterialCommunityIcons 
                          name={rememberMe ? "record-circle-outline" : "circle-outline"} 
                          size={20} 
                          color={rememberMe ? "#FB7185" : "rgba(255,255,255,0.4)"} 
                        />
                        <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { }}>
                        <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                      </TouchableOpacity>
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85} onPress={handleLogin} disabled={loading}>
                      <LinearGradient colors={['#E91E63', '#FB7185']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnPrimaryGrad}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                          <View style={styles.btnContent}>
                            <Text style={styles.btnPrimaryText}>Đăng nhập</Text>
                            <AntDesign name="arrow-right" size={20} color="#fff" style={styles.btnIcon} />
                          </View>
                        )}
                        <Animated.View pointerEvents='none' style={[styles.shimmer, { opacity: shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 0] }), transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-180, 180] }) }] }]} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.separatorRow}>
                    <View style={styles.sepLine} />
                    <Text style={styles.sepText}>HOẶC</Text>
                    <View style={styles.sepLine} />
                  </View>

                  <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} activeOpacity={0.9} disabled={googleLoading}>
                    {googleLoading ? <ActivityIndicator color="#1a1d21" /> : <>
                      <AntDesign name='google' size={20} color='#EA4335' />
                      <Text style={styles.googleText}>Tiếp tục với Google</Text>
                    </>}
                  </TouchableOpacity>

                </View>
              </View>
            </LinearGradient>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Chưa có tài khoản?</Text>
              <TouchableOpacity onPress={goSignup} style={styles.signupBtn}>
                <Text style={styles.signUpLink}> Đăng ký ngay</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#FB7185" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%' },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,7,12,0.45)' },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60 },
  headerRight: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  langBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  langText: { color: '#fff', fontSize: 13, fontWeight: '700', marginRight: 4 },
  logoContainer: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  mainLogo: { width: 180, height: 100 },
  brandSubtitle: { fontSize: 13, color: '#fff', letterSpacing: 4, marginTop: 10, fontWeight: '500', opacity: 0.9 },
  heartDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  divLine: { width: 25, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  outerCard: { width: '92%', maxWidth: 400 },
  borderLayer: { borderRadius: 32, padding: 1 },
  blurWrap: { borderRadius: 31, overflow: 'hidden', backgroundColor: 'rgba(28, 22, 34, 0.85)' },
  inner: { paddingVertical: 35, paddingHorizontal: 25 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
  titleHighlight: { color: '#FB7185', fontWeight: '400', fontStyle: 'italic' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10, marginBottom: 30, textAlign: 'center', lineHeight: 20 },
  form: { width: '100%' },
  input: { marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.03)', height: 58 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 24 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginLeft: 8 },
  forgotText: { color: '#FB7185', fontSize: 13, fontWeight: '500' },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 15, textAlign: 'center', fontWeight: '600' },
  btnPrimary: { borderRadius: 30, overflow: 'hidden', height: 58, shadowColor: '#FB7185', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  btnPrimaryGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 100, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ skewX: '-20deg' }] },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  btnIcon: { marginLeft: 10 },
  separatorRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 30 },
  sepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  sepText: { marginHorizontal: 15, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', height: 58, borderRadius: 20, width: '100%' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#1a1d21', marginLeft: 12 },
  footerRow: { flexDirection: 'row', marginTop: 40, justifyContent: 'center', alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  signupBtn: { flexDirection: 'row', alignItems: 'center' },
  signUpLink: { color: '#FB7185', fontSize: 14, fontWeight: '700' }
});

export default LoginScreen;
