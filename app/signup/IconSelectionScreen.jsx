// Premium Avatar Selection Screen
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, ImageBackground, Alert, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { getStorage, ref, list, getDownloadURL } from 'firebase/storage';
import { useLogoState } from '@/context/LogoStateContext';
import { Colors } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = 12;
const ITEM_SIZE = (width - (SPACING * (COLUMN_COUNT + 1))) / COLUMN_COUNT;
const PAGE_SIZE = 30; // Increased load size for better flow
const CACHE_KEY = 'cached_icons_list_v2';

// Highly Optimized Icon Item Component
const MemoizedIconItem = memo(({ item, isSelected, onSelect, index, isGallery, isUploading, shouldAnimate }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isSelected ? 1.08 : 1) }],
  }));

  // Only animate initial batch or special items to prevent lag on rapid scroll
  const Wrapper = shouldAnimate ? Animated.View : View;
  const enteringProp = shouldAnimate ? FadeInDown.delay(index % 12 * 40).duration(400) : undefined;

  if (isGallery) {
    return (
      <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.iconContainer}>
        <TouchableOpacity
          onPress={() => onSelect(item)}
          activeOpacity={0.7}
          style={styles.galleryWrapper}
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={styles.galleryContent}>
              <View style={styles.galleryCircle}>
                <Ionicons name="camera" size={30} color="white" />
              </View>
              <Text style={styles.galleryLabel}>Tải ảnh</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Wrapper entering={enteringProp} style={styles.iconContainer}>
      <TouchableOpacity
        onPress={() => onSelect(item)}
        activeOpacity={0.8}
        style={[styles.iconWrapper, isSelected && styles.selectedIconWrapper]}
      >
        <Animated.View style={[styles.innerContent, animatedStyle]}>
          <Image
            source={{ uri: item }}
            style={styles.icon}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <BlurView intensity={20} style={StyleSheet.absoluteFill} />
              <Ionicons name="checkmark-circle" size={28} color="#6366f1" />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Wrapper>
  );
});

const IconSkeleton = () => (
  <View style={styles.skeletonGrid}>
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
      <View key={i} style={styles.skeletonItem} />
    ))}
  </View>
);

const IconSelectionScreen = () => {
  const { t } = useTranslation();
  const { user, setIcon, cancelRegistration, signupType } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const logoUrl = useLogoState();

  const [icons, setIcons] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(undefined);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadingCustom, setUploadingCustom] = useState(false);
  const isLoadingRef = useRef(false);

  const loadIcons = useCallback(async (pageToken = undefined) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      // First load: try from cache to instant show
      if (pageToken === undefined) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { items, token } = JSON.parse(cached);
          if (items && items.length > 0) {
            setIcons(items);
            setNextPageToken(token);
            setInitialLoading(false);
            // Background refresh could happen here if needed, but icons rarely change
            isLoadingRef.current = false;
            return;
          }
        }
      }

      const storage = getStorage();
      const iconRef = ref(storage, 'Icons/');
      const result = await list(iconRef, { maxResults: PAGE_SIZE, pageToken });
      const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));

      let newIcons;
      if (pageToken === undefined) {
        newIcons = ['GALLERY_PICKER', ...urls];

        // Save first batch to cache for next time
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          items: newIcons,
          token: result.nextPageToken
        })).catch(e => console.log('Cache save err:', e));
      } else {
        newIcons = [...icons, ...urls];
      }

      setIcons(newIcons);
      setNextPageToken(result.nextPageToken);

    } catch (error) {
      console.error('Error fetching icons:', error);
    } finally {
      isLoadingRef.current = false;
      setInitialLoading(false);
    }
  }, [icons]); // Depend on icons for continuation

  useEffect(() => {
    loadIcons();
  }, []);

  const handleCustomPick = async () => {
    const { pickImage, uploadFile } = await import('@/utils/fileUpload');
    try {
      const result = await pickImage();
      if (result) {
        setUploadingCustom(true);
        const path = `users/${user.uid}/avatar_${Date.now()}.jpg`;
        const downloadURL = await uploadFile(result, path);
        setSelectedIcon(downloadURL);
        setIcon(downloadURL);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    } finally {
      setUploadingCustom(false);
    }
  };

  const handleIconSelect = useCallback((icon) => {
    if (icon === 'GALLERY_PICKER') {
      handleCustomPick();
    } else {
      setSelectedIcon(icon);
      setIcon(icon);
    }
  }, [user?.uid]);

  const handleNext = useCallback(() => {
    if (params.redirectTo === 'EditProfile') {
      router.back();
    } else {
      router.push('/signup/EducationSelectionScreen');
    }
  }, [params.redirectTo]);

  const renderItem = useCallback(({ item, index }) => (
    <MemoizedIconItem
      item={item}
      index={index}
      isSelected={selectedIcon === item}
      onSelect={handleIconSelect}
      isGallery={item === 'GALLERY_PICKER'}
      isUploading={uploadingCustom}
      shouldAnimate={index < 15} // Only animate the first visible batch
    />
  ), [selectedIcon, handleIconSelect, uploadingCustom]);

  return (
    <View style={styles.container}>
      <ImageBackground source={require('../../assets/images/cover.png')} style={styles.background}>
        <LinearGradient colors={['rgba(10,10,20,0.9)', 'rgba(20,20,40,0.95)']} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          {params.isEditing === 'true' ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="white" />
            </TouchableOpacity>
          ) : (
            <ProgressIndicator currentStep={signupType === 'google' ? 4 : 6} totalSteps={signupType === 'google' ? 4 : 6} />
          )}
        </View>

        <Animated.View entering={FadeInDown.duration(800)} style={styles.titleSection}>
          <Text style={styles.mainTitle}>{t('signup.icon_title')}</Text>
          <Text style={styles.subTitle}>Khám phá kho biểu tượng độc đáo hoặc tải lên ảnh riêng của bạn</Text>
        </Animated.View>

        <View style={styles.listWrapper}>
          {initialLoading ? (
            <IconSkeleton />
          ) : (
            <FlatList
              data={icons}
              keyExtractor={(item) => (item === 'GALLERY_PICKER' ? 'PICKER' : item)}
              numColumns={COLUMN_COUNT}
              renderItem={renderItem}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
              onEndReached={() => nextPageToken && !isLoadingRef.current && loadIcons(nextPageToken)}
              onEndReachedThreshold={0.5}
              initialNumToRender={18}
              maxToRenderPerBatch={18}
              windowSize={11}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
            />
          )}
        </View>

        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedIcon && styles.disabledBtn]}
            onPress={handleNext}
            disabled={!selectedIcon}
          >
            <LinearGradient
              colors={selectedIcon ? ['#818cf8', '#6366f1'] : ['#334155', '#1e293b']}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.btnText}>{params.isEditing === 'true' ? 'Lưu thay đổi' : 'Tiếp tục'}</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, height: 110 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  titleSection: { paddingHorizontal: 24, marginBottom: 20 },
  mainTitle: { fontSize: 34, fontWeight: '900', color: 'white', letterSpacing: -1 },
  subTitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 22 },
  listWrapper: { flex: 1 },
  flatListContent: { paddingHorizontal: SPACING, paddingBottom: 150 },
  iconContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SPACING / 2,
  },
  iconWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  innerContent: { flex: 1 },
  icon: { width: '100%', height: '100%' },
  selectedIconWrapper: { borderColor: '#6366f1', borderWidth: 2.5 },
  selectedOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  galleryWrapper: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryContent: { alignItems: 'center' },
  galleryCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  galleryLabel: { color: '#818cf8', fontWeight: '700', fontSize: 13 },

  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING },
  skeletonItem: { width: ITEM_SIZE, height: ITEM_SIZE, margin: SPACING / 2, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  primaryBtn: { height: 60, borderRadius: 30, overflow: 'hidden', elevation: 8, shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 10 },
  gradientBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  disabledBtn: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 18, fontWeight: '800' },
});

export default IconSelectionScreen;