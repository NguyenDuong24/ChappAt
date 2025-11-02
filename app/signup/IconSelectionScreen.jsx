import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList, ActivityIndicator, ImageBackground, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { getStorage, ref, list, getDownloadURL } from 'firebase/storage';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const PAGE_SIZE = 9;

const IconSelectionScreen = () => {
  const { setIcon, cancelRegistration } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const logoUrl = useLogoState();

  const [icons, setIcons] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(undefined);
  const [initialLoading, setInitialLoading] = useState(true);
  const isLoadingRef = useRef(false); // Dùng ref để track loading, tránh stale closure

  const loadIcons = useCallback(async (pageToken = undefined) => {
    if (isLoadingRef.current) return;
    if (pageToken === undefined && icons.length > 0) return; // Ngăn load initial duplicate

    isLoadingRef.current = true;
    const storage = getStorage();
    const iconRef = ref(storage, 'Icons/');
    try {
      const result = await list(iconRef, { maxResults: PAGE_SIZE, pageToken });
      const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
      setIcons((prev) => [...prev, ...urls]);
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error('Error fetching icons: ', error);
    } finally {
      isLoadingRef.current = false;
      if (initialLoading) setInitialLoading(false);
    }
  }, []); // Empty deps để stable, dùng ref cho loading

  useEffect(() => {
    loadIcons();
  }, []); // Empty deps, chỉ run initial load một lần

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
      'Huỷ đăng ký?',
      'Bạn có chắc muốn huỷ đăng ký và xoá tài khoản tạm thời (nếu có)?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Huỷ & Xoá', style: 'destructive', onPress: async () => { try { await cancelRegistration({ deleteAccount: true, navigateTo: '/signin' }); } catch (_) {} } },
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
        />
      </TouchableOpacity>
    ),
    [selectedIcon, handleIconSelect]
  );

  const getItemLayout = (data, index) => ({
    length: 100,
    offset: 100 * index,
    index,
  });

  const handleEndReached = () => {
    if (nextPageToken && !isLoadingRef.current) {
      loadIcons(nextPageToken);
    }
  };

  const renderFooter = () => {
    if (!isLoadingRef.current) return null;
    return <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />;
  };

  return (
    <ImageBackground
      source={require('../../assets/images/cover.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(15,23,42,0.85)','rgba(15,23,42,0.65)']} style={styles.backdrop} />

      <View style={styles.container}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
        <Text style={styles.title}>Choose an Icon</Text>
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
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={{ marginTop: 14 }}>
          <Text style={{ color: '#ffd1d1', textDecorationLine: 'underline' }}>Huỷ đăng ký</Text>
        </TouchableOpacity>
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