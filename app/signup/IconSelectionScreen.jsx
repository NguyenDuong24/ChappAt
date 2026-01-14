import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, ImageBackground, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { getStorage, ref, list, getDownloadURL } from 'firebase/storage';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 21;

const IconSelectionScreen = () => {
  const { t } = useTranslation();
  const { setIcon, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const logoUrl = useLogoState();

  // Dynamic step calculation (this is the final profile step)
  const stepInfo = useMemo(() => {
    if (signupType === 'google') {
      return { current: 4, total: 4 };
    }
    return { current: 6, total: 6 };
  }, [signupType]);

  const [icons, setIcons] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(undefined);
  const [initialLoading, setInitialLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const hasLoadedInitial = useRef(false);

  const loadIcons = useCallback(async (pageToken = undefined) => {
    if (isLoadingRef.current) return;
    if (pageToken === undefined && hasLoadedInitial.current) {
      return;
    }

    isLoadingRef.current = true;
    const storage = getStorage();
    const iconRef = ref(storage, 'Icons/');
    try {
      const result = await list(iconRef, { maxResults: PAGE_SIZE, pageToken });
      const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
      setIcons((prev) => [...prev, ...urls]);
      setNextPageToken(result.nextPageToken);
      if (pageToken === undefined) hasLoadedInitial.current = true;
    } catch (error) {
      console.error('Error fetching icons: ', error);
    } finally {
      isLoadingRef.current = false;
      if (initialLoading) setInitialLoading(false);
    }
  }, [initialLoading]);

  useEffect(() => {
    loadIcons();
  }, []);

  const handleIconSelect = useCallback(
    (icon) => {
      setSelectedIcon(icon);
      setIcon(icon);
    },
    [setIcon]
  );

  const handleNext = useCallback(() => {
    if (params.redirectTo === 'EditProfile') {
      router.back();
    } else {
      router.push('/signup/EducationSelectionScreen');
    }
  }, [router, params.redirectTo]);

  const handleCancel = () => {
    Alert.alert(
      t('signup.cancel_title'),
      t('signup.cancel_message'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('signup.cancel_confirm'), style: 'destructive', onPress: async () => { try { await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' }); } catch (_) { } } },
      ]
    );
  };

  const memoizedIcons = useMemo(() => icons, [icons]);

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity onPress={() => handleIconSelect(item)} activeOpacity={0.85}>
        <Image
          source={{ uri: item }}
          style={[
            styles.icon,
            selectedIcon === item && styles.selectedIcon,
          ]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    ),
    [selectedIcon, handleIconSelect]
  );

  const getItemLayout = useCallback((data, index) => ({
    length: 100,
    offset: 100 * Math.floor(index / 3),
    index,
  }), []);

  const handleEndReached = useCallback(() => {
    if (nextPageToken && !isLoadingRef.current) {
      loadIcons(nextPageToken);
    }
  }, [nextPageToken, loadIcons]);

  const renderFooter = useCallback(() => {
    if (!isLoadingRef.current) return null;
    return <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />;
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.container}>
        {params.isEditing === 'true' ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10 }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t('common.back')}</Text>
          </TouchableOpacity>
        ) : (
          <ProgressIndicator
            currentStep={stepInfo.current}
            totalSteps={stepInfo.total}
            signupType={signupType || 'email'}
          />
        )}

        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" />
        ) : (
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        )}
        <Text style={styles.title}>{t('signup.icon_title')}</Text>
        {initialLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <FlatList
            data={memoizedIcons}
            keyExtractor={(item) => item}
            numColumns={3}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.iconContainer}
            extraData={selectedIcon}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        )}
        <TouchableOpacity
          style={[styles.nextButton, !selectedIcon && styles.disabledButton]}
          onPress={handleNext}
          disabled={!selectedIcon}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>{params.isEditing === 'true' ? t('common.save') : t('common.next')}</Text>
        </TouchableOpacity>

        {params.isEditing !== 'true' && (
          <TouchableOpacity onPress={handleCancel} style={{ marginTop: 14 }}>
            <Text style={{ color: '#ffd1d1', textDecorationLine: 'underline' }}>{t('signup.cancel_registration')}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  iconContainer: {
    marginVertical: 20,
  },
  icon: {
    width: 80,
    height: 80,
    margin: 10,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectedIcon: {
    borderColor: Colors.primary,
    borderWidth: 5,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#475569',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default IconSelectionScreen;