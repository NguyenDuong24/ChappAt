import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Image, ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';

const LoginScreen = () => {
  // state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const ringStyle = { transform: [{ rotate: ringRotate.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] }) }] };

  return (
    <ImageBackground source={require('../../assets/images/cover.png')} style={styles.bg} resizeMode="cover">
      <View style={styles.dim} />
      <LinearGradient colors={["#335dff30","#8228ff25","#00ffc815"]} style={styles.aura} start={{x:0,y:0}} end={{x:1,y:1}} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1, width:'100%' }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps='handled'>
          <Animated.View style={[styles.outerCard,{ opacity: fadeAnim, transform:[{ translateY: slideAnim }] }]}>          
            <LinearGradient colors={["#ffffff40","#ffffff08"]} style={styles.borderLayer} locations={[0,1]}>
              <View style={[styles.blurWrap, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                <View style={styles.inner}>
                  <View style={styles.header}>
                    <View style={styles.logoWrap}>
                      <Animated.View style={[styles.glow,{ transform:[{ scale: glowScale }], opacity: glowOpacity }]} />
                      <Animated.View style={[styles.ring, ringStyle]} />
                      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
                    </View>
                    <Text style={styles.brand}>ChappAt</Text>
                  </View>
                  <Text style={styles.title}>Welcome Back</Text>
                  <Text style={styles.subtitle}>Sign in to continue</Text>

                  <View style={styles.form}>
                    <TextInput
                      label="Email"
                      value={email}
                      onChangeText={(t)=>{setEmail(t); if(error) setError('');}}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="email-outline" size={20} color="#9ecbff" />} />}
                      theme={{ colors:{ primary:'#81a8ff', text:'#fff', placeholder:'rgba(255,255,255,0.5)' } }}
                      mode="outlined"
                      textColor="#fff"
                    />
                    <TextInput
                      label="Password"
                      value={password}
                      onChangeText={(t)=>{setPassword(t); if(error) setError('');}}
                      secureTextEntry={!showPassword}
                      left={<TextInput.Icon icon={() => <MaterialCommunityIcons name="lock-outline" size={20} color="#9ecbff" />} />}
                      right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={()=>setShowPassword(!showPassword)} forceTextInputFocus={false} color="#fff" />}
                      style={styles.input}
                      theme={{ colors:{ primary:'#81a8ff', text:'#fff', placeholder:'rgba(255,255,255,0.5)' } }}
                      mode="outlined"
                      textColor="#fff"
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.9} onPress={handleLogin} disabled={loading}>
                      <LinearGradient colors={['#5d9dff','#4f72ff']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.btnPrimaryGrad}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Login</Text>}
                        <Animated.View pointerEvents='none' style={[styles.shimmer,{ opacity: shimmerAnim.interpolate({ inputRange:[0,0.5,1], outputRange:[0,0.55,0] }), transform:[{ translateX: shimmerAnim.interpolate({ inputRange:[0,1], outputRange:[-140,140] })}] }]} />
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.forgot} onPress={()=>{}}>
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.separatorRow}>
                    <View style={styles.sepLine} />
                    <Text style={styles.sepText}>OR</Text>
                    <View style={styles.sepLine} />
                  </View>
                  <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} activeOpacity={0.92} disabled={googleLoading}>
                    {googleLoading ? <ActivityIndicator color="#1a1d21" /> : <>
                      <View style={styles.googleIconWrap}><AntDesign name='google' size={22} color='#4285F4' /></View>
                      <Text style={styles.googleText}>Continue with Google</Text>
                    </>}
                  </TouchableOpacity>
                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={goSignup}><Text style={styles.signUpLink}>  Sign Up</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg:{ flex:1, width:'100%' },
  dim:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(5,10,22,0.55)' },
  aura:{ position:'absolute', width:'90%', height:'70%', borderRadius:50, opacity:0.45, alignSelf:'center', top:'15%' },
  scroll:{ flexGrow:1, alignItems:'center', justifyContent:'center', paddingVertical:40 },
  outerCard:{ width:'90%', maxWidth:440 },
  borderLayer:{ borderRadius:34, padding:1.2 },
  blurWrap:{ borderRadius:33, overflow:'hidden' },
  inner:{ borderRadius:33, paddingVertical:40, paddingHorizontal:30, backgroundColor:'rgba(18,26,40,0.55)' },
  header:{ alignItems:'center', marginBottom:10 },
  logoWrap:{ width:96, height:96, borderRadius:26, alignItems:'center', justifyContent:'center' },
  glow:{ position:'absolute', width:140, height:140, borderRadius:70, backgroundColor:'#4f8bff55' },
  ring:{ position:'absolute', width:128, height:128, borderRadius:64, borderWidth:2, borderColor:'#4f8bff40' },
  logo:{ width:82, height:82, borderRadius:22, resizeMode:'contain' },
  brand:{ fontSize:18, letterSpacing:3, fontWeight:'700', color:'#b5d8ff', textTransform:'uppercase' },
  title:{ fontSize:30, fontWeight:'800', color:'#fff', marginTop:8, textAlign:'center', letterSpacing:0.5 },
  subtitle:{ fontSize:15, color:'rgba(255,255,255,0.72)', marginTop:8, marginBottom:30, textAlign:'center', fontWeight:'500' },
  form:{ width:'100%' },
  input:{ marginBottom:16, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:16 },
  error:{ color:'#ff6b6b', fontSize:13, marginBottom:6, fontWeight:'600' },
  btnPrimary:{ marginTop:4, borderRadius:20, overflow:'hidden' },
  btnPrimaryGrad:{ paddingVertical:16, alignItems:'center', borderRadius:20, overflow:'hidden' },
  btnPrimaryText:{ color:'#fff', fontSize:17, fontWeight:'700', letterSpacing:0.5 },
  shimmer:{ position:'absolute', top:0, bottom:0, width:120, backgroundColor:'#ffffff55', borderRadius:20 },
  forgot:{ marginTop:16, alignSelf:'center' },
  forgotText:{ color:'#81a8ff', fontSize:13, fontWeight:'600' },
  separatorRow:{ flexDirection:'row', alignItems:'center', width:'100%', marginVertical:28 },
  sepLine:{ flex:1, height:1, backgroundColor:'rgba(255,255,255,0.18)' },
  sepText:{ marginHorizontal:12, color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:'700', letterSpacing:1.5 },
  googleBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#fff', paddingVertical:15, borderRadius:18, width:'100%', shadowColor:'#000', shadowOpacity:0.2, shadowRadius:22, shadowOffset:{ width:0, height:8 }, elevation:6 },
  googleIconWrap:{ width:34, height:34, borderRadius:10, backgroundColor:'#f2f5ff', alignItems:'center', justifyContent:'center', marginRight:14 },
  googleText:{ fontSize:15.5, fontWeight:'600', color:'#1a1d21' },
  footerRow:{ flexDirection:'row', marginTop:34, justifyContent:'center', alignItems:'center' },
  footerText:{ color:'rgba(255,255,255,0.68)', fontSize:13, fontWeight:'500' },
  signUpLink:{ color:'#b5d8ff', fontSize:13, fontWeight:'700', textDecorationLine:'underline' }
});

export default LoginScreen;
