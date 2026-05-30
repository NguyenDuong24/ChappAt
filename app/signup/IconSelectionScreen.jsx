// Premium Avatar Selection Screen - Modern UI Upgrade
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ImageBackground,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { getAuth } from 'firebase/auth';
import { storage } from '@/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressIndicator from '@/components/signup/ProgressIndicator';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLUMN_COUNT = 3;
const SPACING = 14;
const ITEM_SIZE = (width - SPACING * (COLUMN_COUNT + 1) - 10) / COLUMN_COUNT;

const PAGE_SIZE = 18;
const MAX_ICON_COUNT = 54;
const CACHE_KEY = 'cached_icons_list_v4';

const MemoizedIconItem = memo(
  ({ item, isSelected, onSelect, index, shouldAnimate }) => {
    const animatedScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        {
          scale: withSpring(isSelected ? 1.06 : 1, {
            damping: 14,
            stiffness: 180,
          }),
        },
      ],
    }));

    const Wrapper = shouldAnimate ? Animated.View : View;
    const enteringProp = shouldAnimate
      ? FadeInDown.delay(index * 40).springify()
      : undefined;

    return (
      <Wrapper entering={enteringProp} style={styles.iconContainer}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onSelect(item)}
          style={[
            styles.iconWrapper,
            isSelected && styles.selectedIconWrapper,
          ]}
        >
          <Animated.View style={[styles.innerContent, animatedStyle]}>
            <Image
              source={{ uri: item }}
              style={styles.icon}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />

            <LinearGradient
              colors={
                isSelected
                  ? ['transparent', 'rgba(233,30,99,0.55)']
                  : ['transparent', 'rgba(0,0,0,0.25)']
              }
              style={styles.iconGradient}
            />

            {isSelected && (
              <View style={styles.selectedOverlay}>
                <BlurView
                  intensity={35}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.checkBadge}>
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color="#fff"
                  />
                </View>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Wrapper>
    );
  }
);

const IconSkeleton = () => (
  <View style={styles.skeletonGrid}>
    {[...Array(12)].map((_, index) => (
      <View key={index} style={styles.skeletonItem} />
    ))}
  </View>
);

const IconSelectionScreen = () => {
  const { t } = useTranslation();

  const { setIcon, signupType } = useAuth();

  const router = useRouter();
  const params = useLocalSearchParams();

  const [icons, setIcons] = useState([]);
  const [selectedIcon, setSelectedIcon] = useState(null);

  const [nextPageToken, setNextPageToken] = useState(undefined);

  const [initialLoading, setInitialLoading] = useState(true);

  const isLoadingRef = useRef(false);

  const loadIcons = useCallback(
    async (pageToken = undefined) => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;

      try {
        if (pageToken === undefined) {
          const cached = await AsyncStorage.getItem(CACHE_KEY);

          if (cached) {
            const { items, token } = JSON.parse(cached);

            const cachedIcons = Array.isArray(items)
              ? items.filter((item) => item !== 'GALLERY_PICKER')
              : [];

            if (cachedIcons.length > 0) {
              setIcons(cachedIcons.slice(0, MAX_ICON_COUNT));

              setNextPageToken(
                cachedIcons.length >= MAX_ICON_COUNT
                  ? undefined
                  : token
              );

              setInitialLoading(false);

              isLoadingRef.current = false;

              return;
            }
          }
        }

        const BUCKET =
          storage.app.options.storageBucket ||
          'dating-app-1bb49.appspot.com';

        const PREFIX = 'Icons/';

        let apiUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?prefix=${encodeURIComponent(
          PREFIX
        )}&delimiter=%2F&maxResults=${PAGE_SIZE}`;

        if (pageToken) {
          apiUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
        }

        let headers = {};

        try {
          const auth = getAuth();
          const currentUser = auth.currentUser;

          if (currentUser) {
            const idToken = await currentUser.getIdToken();

            headers['Authorization'] = `Firebase ${idToken}`;
          }
        } catch (e) {}

        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
          const errorBody = await response.text();

          throw new Error(
            `Storage REST API error ${response.status}: ${errorBody}`
          );
        }

        const data = await response.json();

        const items = data.items || [];

        const urls = items.map((item) => {
          const encodedName = encodeURIComponent(item.name);

          return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedName}?alt=media`;
        });

        let newIcons;

        if (pageToken === undefined) {
          newIcons = urls.slice(0, MAX_ICON_COUNT);

          AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              items: newIcons,
              token:
                newIcons.length >= MAX_ICON_COUNT
                  ? undefined
                  : data.nextPageToken,
            })
          ).catch(() => {});
        } else {
          newIcons = [...icons, ...urls].slice(0, MAX_ICON_COUNT);
        }

        setIcons(newIcons);

        setNextPageToken(
          newIcons.length >= MAX_ICON_COUNT
            ? undefined
            : data.nextPageToken
        );
      } catch (error) {
        console.log('❌ Error fetching icons:', error.message);

        if (icons.length === 0) {
          setIcons([]);
        }
      } finally {
        isLoadingRef.current = false;
        setInitialLoading(false);
      }
    },
    [icons]
  );

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
      router.push('/signup/InterestsSelectionScreen');
    }
  }, [params.redirectTo]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <MemoizedIconItem
        item={item}
        index={index}
        isSelected={selectedIcon === item}
        onSelect={handleIconSelect}
        shouldAnimate={index < 12}
      />
    ),
    [selectedIcon, handleIconSelect]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={require('../../assets/images/cover.webp')}
        style={styles.background}
      >
        <LinearGradient
          colors={[
            'rgba(5,7,12,0.78)',
            'rgba(12,14,24,0.92)',
          ]}
          style={styles.overlay}
        />

        <SafeAreaView style={{ flex: 1 }}>
          {/* HEADER */}
          <View style={styles.header}>
            {params.isEditing === 'true' ? (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.progressWrap}>
                <ProgressIndicator
                  currentStep={signupType === 'google' ? 4 : 6}
                  totalSteps={signupType === 'google' ? 6 : 8}
                />
              </View>
            )}
          </View>

          {/* TITLE */}
          <Animated.View
            entering={FadeInDown.duration(700)}
            style={styles.titleSection}
          >
            <View style={styles.badge}>
              <Ionicons
                name="sparkles"
                size={14}
                color="#FB7185"
              />

              <Text style={styles.badgeText}>
                {t('signup.icon_badge')}
              </Text>
            </View>

            <Text style={styles.mainTitle}>
              {t('signup.icon_screen_title')}
            </Text>

            <Text style={styles.subTitle}>
              {t('signup.icon_screen_subtitle')}
            </Text>
          </Animated.View>

          {/* LIST */}
          <View style={styles.listWrapper}>
            {initialLoading ? (
              <IconSkeleton />
            ) : (
              <FlatList
                data={icons}
                keyExtractor={(item) => item}
                numColumns={COLUMN_COUNT}
                renderItem={renderItem}
                contentContainerStyle={styles.flatListContent}
                showsVerticalScrollIndicator={false}
                onEndReached={() =>
                  nextPageToken &&
                  !isLoadingRef.current &&
                  loadIcons(nextPageToken)
                }
                onEndReachedThreshold={0.5}
                initialNumToRender={18}
                maxToRenderPerBatch={18}
                windowSize={10}
                removeClippedSubviews
              />
            )}
          </View>

          {/* BOTTOM ACTION */}
          <BlurView
            intensity={45}
            tint="dark"
            style={styles.bottomBar}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!selectedIcon}
              onPress={handleNext}
              style={[
                styles.primaryBtn,
                !selectedIcon && styles.disabledBtn,
              ]}
            >
              <LinearGradient
                colors={
                  selectedIcon
                    ? ['#E91E63', '#FB7185']
                    : ['#334155', '#1E293B']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.btnText}>
                  {params.isEditing === 'true'
                    ? t('signup.save_changes_button')
                    : t('common.next', { defaultValue: 'Tiếp tục' })}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

// CHỈ THAY CÁC STYLE NÀY TRONG FILE CỦA BẠN

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  background: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },

  progressWrap: {
    width: '100%',
    alignItems: 'center',
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  titleSection: {
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 24,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,113,133,0.12)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.18)',
    marginBottom: 18,
  },

  badgeText: {
    color: '#FB7185',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 1,
  },

  mainTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },

  subTitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 22,
    paddingRight: 20,
  },

  listWrapper: {
    flex: 1,
  },

  flatListContent: {
    paddingHorizontal: SPACING / 2,

    // tăng khoảng trống để không bị button che
    paddingBottom: 240,
  },

  iconContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SPACING / 2,
  },

  iconWrapper: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  selectedIconWrapper: {
    borderColor: '#FB7185',
    borderWidth: 2.5,
    shadowColor: '#FB7185',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },

  innerContent: {
    flex: 1,
  },

  icon: {
    width: '100%',
    height: '100%',
  },

  iconGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },

  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
  },

  checkBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FB7185',
    justifyContent: 'center',
    alignItems: 'center',
  },

  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING / 2,
  },

  skeletonItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 28,
    margin: SPACING / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // ===== BOTTOM BUTTON =====
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    // blur đẹp hơn
    backgroundColor: 'rgba(10,10,15,0.55)',

    paddingHorizontal: 22,
    paddingTop: 18,

    // tăng cao để không bị tab bar che
    paddingBottom: Platform.OS === 'ios' ? 55 : 50,

    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',

    overflow: 'hidden',
  },

  primaryBtn: {
    // button cao hơn
    height: 72,

    borderRadius: 36,
    overflow: 'hidden',

    shadowColor: '#FB7185',
    shadowOpacity: 0.45,
    shadowRadius: 16,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 10,
  },

  gradientBtn: {
    flex: 1,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    gap: 10,
  },

  disabledBtn: {
    opacity: 0.55,
  },

  btnText: {
    color: '#fff',

    // chữ lớn hơn
    fontSize: 18,

    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default IconSelectionScreen;