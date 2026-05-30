import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Animated,
  Easing,
  FlatList,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { RevealSideSheet } from '@/components/reveal';
import { LiquidSurface } from '@/components/liquid';

import { useTheme } from '@/context/ThemeContext';

import { useAuth } from '@/context/authContext';

import { useStateCommon } from '@/context/stateCommon';

import { DEFAULT_FILTER } from '@/utils/filterStorage';

import {
  getInterestsArray,
  normalizeInterestsArray,
} from '@/utils/interests';

import { isDarkTheme, getThemeColors, getThemeDisplayName } from '@/constants/Colors';
import FeatureActionDrawer from './FeatureActionDrawer';

export type FeatureDrawerKey =
  | 'notification'
  | 'chatSearch'
  | 'groupSearch'
  | 'addFriend'
  | 'groupManagement'
  | 'createGroup';

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
  tab?: 'filter' | 'settings' | 'setting';
  drawerKey?: FeatureDrawerKey | null;
  paramsByKey?: Partial<Record<FeatureDrawerKey, Record<string, string>>>;
}

type FilterState = {
  gender: string;
  minAge: string;
  maxAge: string;
  distance: string;
  educationLevel: string;
  job: string;
  interests: string[];
};

const OPEN_EASING = Easing.bezier(
  0.12,
  0.94,
  0.22,
  1
);

const CLOSE_EASING = Easing.bezier(
  0.4,
  0,
  1,
  1
);

const genderOptions = [
  {
    label: 'Nam',
    value: 'male',
  },
  {
    label: 'Nữ',
    value: 'female',
  },
  {
    label: 'Tất cả',
    value: 'all',
  },
];

const normalizeFilter = (
  value: any
): FilterState => ({
  gender: value?.gender || '',
  minAge: value?.minAge || '',
  maxAge: value?.maxAge || '',
  distance: value?.distance || '',
  educationLevel:
    value?.educationLevel || '',
  job: value?.job || '',
  interests: Array.isArray(
    value?.interests
  )
    ? normalizeInterestsArray(
        value.interests
      )
    : [],
});

/*
|--------------------------------------------------------------------------
| CHIP
|--------------------------------------------------------------------------
*/

interface SelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  textColor: string;
  bg: string;
  border: string;
}

const SelectChip = memo(
  ({
    label,
    selected,
    onPress,
    textColor,
    bg,
    border,
  }: SelectChipProps) => {
    const scale = useRef(
      new Animated.Value(1)
    ).current;

    const animatePress = (
      value: number
    ) => {
      Animated.spring(scale, {
        toValue: value,
        damping: 18,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={{
          transform: [{ scale }],
        }}
      >
        <Pressable
          onPress={onPress}
          onPressIn={() =>
            animatePress(0.96)
          }
          onPressOut={() =>
            animatePress(1)
          }
          style={[
            styles.chip,
            {
              backgroundColor: selected
                ? textColor
                : bg,
              borderColor: selected
                ? textColor
                : border,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.chipLabel,
              {
                color: selected
                  ? '#FFF'
                  : textColor,
              },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }
);

/*
|--------------------------------------------------------------------------
| SECTION
|--------------------------------------------------------------------------
*/

const DrawerSection = memo(
  ({
    title,
    textColor,
    children,
  }: {
    title: string;
    textColor: string;
    children: React.ReactNode;
  }) => {
    return (
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: textColor,
            },
          ]}
        >
          {title.toUpperCase()}
        </Text>

        {children}
      </View>
    );
  }
);

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

const AppDrawer = ({
  visible,
  onClose,
  tab = 'filter',
  drawerKey = null,
  paramsByKey,
}: AppDrawerProps) => {
  const { t } = useTranslation();
  const router = useRouter();

  const { user, logout } = useAuth();

  const {
    theme,
    isDark,
    palette,
    themes,
    toggleTheme,
    setTheme,
  } = useTheme();

  const {
    stateCommon,
    setStateCommon,
  } = useStateCommon();

  // Fallback helper
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  const interestItems = useMemo(
    () => getInterestsArray().slice(0, 28),
    []
  );

  const [filterDraft, setFilterDraft] =
    useState<FilterState>(() =>
      normalizeFilter({
        ...DEFAULT_FILTER,
        ...(stateCommon?.filter || {}),
      })
    );

  const isSettings = tab === 'settings' || tab === 'setting';

  /*
  |--------------------------------------------------------------------------
  | COLORS
  |--------------------------------------------------------------------------
  */

  const textColor = palette.textColor;

  const subTextColor =
    palette.subtitleColor;

  const glassBg = isDark
    ? 'rgba(255,255,255,0.07)'
    : 'rgba(255,255,255,0.72)';

  const glassBorder =
    palette.menuBorder;

  /*
  |--------------------------------------------------------------------------
  | ROOT ANIMATION
  |--------------------------------------------------------------------------
  */

  const drawerOpacity = useRef(
    new Animated.Value(0)
  ).current;

  const drawerTranslateX = useRef(
    new Animated.Value(-120)
  ).current;

  const drawerScale = useRef(
    new Animated.Value(0.975)
  ).current;

  const drawerMask = useRef(
    new Animated.Value(0)
  ).current;

  /*
  |--------------------------------------------------------------------------
  | CONTENT ANIMATION
  |--------------------------------------------------------------------------
  */

  const contentOpacity = useRef(
    new Animated.Value(0)
  ).current;

  const contentTranslateY =
    useRef(
      new Animated.Value(24)
    ).current;

  /*
  |--------------------------------------------------------------------------
  | OPEN / CLOSE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    if (visible) {
      drawerOpacity.setValue(0);

      drawerTranslateX.setValue(
        -120
      );

      drawerScale.setValue(0.975);

      drawerMask.setValue(0);

      contentOpacity.setValue(0);

      contentTranslateY.setValue(
        24
      );

      InteractionManager.runAfterInteractions(
        () => {
          if (!mounted) return;

          /*
          |--------------------------------------------------------------------------
          | MAIN DRAWER
          |--------------------------------------------------------------------------
          */

          Animated.parallel([
            Animated.timing(
              drawerOpacity,
              {
                toValue: 1,
                duration: 700,
                easing:
                  OPEN_EASING,
                useNativeDriver: true,
              }
            ),

            Animated.timing(
              drawerTranslateX,
              {
                toValue: 0,
                duration: 900,
                easing:
                  OPEN_EASING,
                useNativeDriver: true,
              }
            ),

            Animated.timing(
              drawerScale,
              {
                toValue: 1,
                duration: 900,
                easing:
                  OPEN_EASING,
                useNativeDriver: true,
              }
            ),

            Animated.timing(
              drawerMask,
              {
                toValue: 1,
                duration: 1050,
                easing:
                  OPEN_EASING,
                useNativeDriver: true,
              }
            ),
          ]).start();

          /*
          |--------------------------------------------------------------------------
          | CONTENT
          |--------------------------------------------------------------------------
          */

          Animated.parallel([
            Animated.timing(
              contentOpacity,
              {
                toValue: 1,
                duration: 780,
                delay: 120,
                easing:
                  OPEN_EASING,
                useNativeDriver: true,
              }
            ),

            Animated.timing(
              contentTranslateY,
              {
                toValue: 0,
                duration: 900,
                delay: 120,
                easing:
                  OPEN_EASING,
                useNativeDriver: true,
              }
            ),
          ]).start();
        }
      );
    } else {
      Animated.parallel([
        Animated.timing(
          drawerOpacity,
          {
            toValue: 0,
            duration: 240,
            easing:
              CLOSE_EASING,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          drawerTranslateX,
          {
            toValue: -70,
            duration: 260,
            easing:
              CLOSE_EASING,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          drawerScale,
          {
            toValue: 0.985,
            duration: 260,
            easing:
              CLOSE_EASING,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          contentOpacity,
          {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }
        ),
      ]).start();
    }

    return () => {
      mounted = false;
    };
  }, [visible]);

  /*
  |--------------------------------------------------------------------------
  | SYNC
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (visible) {
      setFilterDraft(
        normalizeFilter({
          ...DEFAULT_FILTER,
          ...(stateCommon?.filter ||
            {}),
        })
      );
    }
  }, [visible]);

  /*
  |--------------------------------------------------------------------------
  | ACTIONS
  |--------------------------------------------------------------------------
  */

  const toggleInterest =
    useCallback((id: string) => {
      setFilterDraft((prev) => ({
        ...prev,

        interests:
          prev.interests.includes(id)
            ? prev.interests.filter(
                (x) => x !== id
              )
            : [...prev.interests, id],
      }));
    }, []);

  const applyFilter =
    useCallback(() => {
      setStateCommon({
        filter: {
          ...filterDraft,
        },
      });

      onClose();
    }, [filterDraft]);

  const clearFilter =
    useCallback(() => {
      const cleared =
        normalizeFilter(
          DEFAULT_FILTER
        );

      setFilterDraft(cleared);

      setStateCommon({
        filter: cleared,
      });
    }, []);

  const handleMenuPress = useCallback((route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 200);
  }, [onClose, router]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      tf('settings.logout_title', 'Đăng xuất'),
      tf('settings.logout_confirm', 'Bạn có chắc muốn đăng xuất?'),
      [
        { text: tf('common.cancel', 'Hủy'), style: 'cancel' },
        {
          text: tf('settings.logout_action', 'Đăng xuất'),
          style: 'destructive',
          onPress: async () => {
            onClose();
            try {
              await logout();
            } catch (e) {
              console.error('Logout error:', e);
            }
          },
        },
      ]
    );
  }, [logout, onClose, tf]);

  const menuItems = useMemo(() => [
    {
      icon: 'account-edit-outline',
      label: tf('settings.edit_profile', 'Chỉnh sửa hồ sơ'),
      route: '/(tabs)/profile/EditProfile',
    },
    {
      icon: 'cog-outline',
      label: tf('settings.system_settings', 'Cài đặt'),
      route: '/(tabs)/profile/settings',
    },
  ], [tf]);

  /*
  |--------------------------------------------------------------------------
  | RENDER INTEREST
  |--------------------------------------------------------------------------
  */

  const renderInterest = useCallback(
    ({ item }: any) => {
      const selected =
        filterDraft.interests.includes(
          item.id
        );

      return (
        <SelectChip
          label={item.label}
          selected={selected}
          textColor={textColor}
          bg={glassBg}
          border={glassBorder}
          onPress={() =>
            toggleInterest(item.id)
          }
        />
      );
    },
    [
      filterDraft.interests,
      textColor,
      glassBg,
      glassBorder,
    ]
  );

  if (drawerKey) {
    return (
      <FeatureActionDrawer
        visible={visible}
        drawerKey={drawerKey}
        onClose={onClose}
        paramsByKey={paramsByKey}
      />
    );
  }

  return (
    <RevealSideSheet
      visible={visible}
      onClose={onClose}
      side="left"
      widthRatio={0.88}
      maxWidth={460}
      contentMountDelayMs={0}
      panelStyle={{
        backgroundColor:
          'transparent',
      }}
    >
      <Animated.View
        style={[
          styles.root,
          {
            opacity: drawerOpacity,

            transform: [
              {
                translateX:
                  drawerTranslateX,
              },

              {
                scale:
                  drawerScale,
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            flex: 1,

            opacity: drawerMask,

            transform: [
              {
                scale:
                  drawerMask.interpolate(
                    {
                      inputRange: [
                        0,
                        1,
                      ],

                      outputRange: [
                        0.985,
                        1,
                      ],
                    }
                  ),
              },
            ],
          }}
        >
          <LiquidSurface
            themeMode={theme}
            borderRadius={34}
            intensity={
              isDarkTheme(theme)
                ? 40
                : 56
            }
            style={
              styles.outerContainer
            }
          >
            <Animated.View
              style={[
                styles.contentWrap,
                {
                  opacity:
                    contentOpacity,

                  transform: [
                    {
                      translateY:
                        contentTranslateY,
                    },
                  ],
                },
              ]}
            >
              {/* HEADER */}

              <View
                style={styles.header}
              >
                <View
                  style={styles.userRow}
                >
                  <View
                    style={[
                      styles.userDot,
                      {
                        backgroundColor:
                          glassBg,

                        borderColor:
                          glassBorder,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    {user?.profileUrl || user?.photoURL || user?.avatarUrl ? (
                      <Image
                        source={{ uri: user.profileUrl || user.photoURL || user.avatarUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="account-circle-outline"
                        size={30}
                        color={textColor}
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.userNameContainer
                    }
                  >
                    <Text
                      style={[
                        styles.welcomeText,
                        {
                          color:
                            subTextColor,
                        },
                      ]}
                    >
                      {tf('common.hello', 'Xin chào')},
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.userNameText,
                        {
                          color:
                            textColor,
                        },
                      ]}
                    >
                      {user?.displayName ||
                        user?.username ||
                        'SaiGon Match'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.closeButton,

                    {
                      backgroundColor:
                        glassBg,

                      borderColor:
                        glassBorder,

                      opacity: pressed
                        ? 0.84
                        : 1,

                      transform: [
                        {
                          scale:
                            pressed
                              ? 0.95
                              : 1,
                        },
                      ],
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={textColor}
                  />
                </Pressable>
              </View>

              {/* SCROLL */}

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={
                  styles.scrollContent
                }
                showsVerticalScrollIndicator={
                  false
                }
                bounces
                overScrollMode="never"
                keyboardShouldPersistTaps="handled"
              >
                {isSettings ? (
                  <View style={{ paddingTop: 10, gap: 4 }}>
                    {menuItems.map((item) => (
                      <Pressable
                        key={item.label}
                        onPress={() => handleMenuPress(item.route)}
                        style={({ pressed }) => [
                          styles.menuItem,
                          {
                            backgroundColor: glassBg,
                            borderColor: glassBorder,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <View style={styles.menuIconWrap}>
                          <MaterialCommunityIcons name={item.icon as any} size={22} color={textColor} />
                        </View>
                        <Text style={[styles.menuLabel, { color: textColor }]}>
                          {item.label}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={subTextColor} />
                      </Pressable>
                    ))}

                    {/* QUICK SWITCH & THEME LIST */}
                    <View
                      style={[
                        styles.themeSelectorContainer,
                        {
                          backgroundColor: glassBg,
                          borderColor: glassBorder,
                        },
                      ]}
                    >
                      <View style={styles.themeSelectorHeader}>
                        <MaterialCommunityIcons name="palette-outline" size={22} color={textColor} />
                        <Text style={[styles.themeLabel, { color: textColor }]}>
                          {tf('settings.theme', 'Giao diện')}
                        </Text>
                        <Switch
                          value={isDark}
                          onValueChange={toggleTheme}
                          trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#11936F' }}
                          thumbColor={isDark ? '#E5FFF4' : '#FFFFFF'}
                        />
                      </View>

                      {/* Theme Options */}
                      <Text style={[styles.themeCategoryTitle, { color: subTextColor }]}>
                        {tf('settings.theme_light', 'Chế độ Sáng')}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.themeScrollContent}
                        style={styles.themeScroll}
                      >
                        {themes.filter(t => !isDarkTheme(t)).map((themeKey) => {
                          const colors = getThemeColors(themeKey);
                          const isSelected = theme === themeKey;
                          return (
                            <TouchableOpacity
                              key={themeKey}
                              onPress={() => setTheme(themeKey)}
                              style={[
                                styles.themePill,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: isSelected ? colors.tint : glassBorder,
                                  borderWidth: isSelected ? 1.5 : 1,
                                }
                              ]}
                            >
                              <View style={[styles.themeColorDot, { backgroundColor: colors.tint }]} />
                              <Text style={[styles.themeLabelText, { color: colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                                {getThemeDisplayName(themeKey)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <Text style={[styles.themeCategoryTitle, { color: subTextColor, marginTop: 8 }]}>
                        {tf('settings.theme_dark', 'Chế độ Tối')}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.themeScrollContent}
                        style={styles.themeScroll}
                      >
                        {themes.filter(t => isDarkTheme(t)).map((themeKey) => {
                          const colors = getThemeColors(themeKey);
                          const isSelected = theme === themeKey;
                          return (
                            <TouchableOpacity
                              key={themeKey}
                              onPress={() => setTheme(themeKey)}
                              style={[
                                styles.themePill,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: isSelected ? colors.tint : glassBorder,
                                  borderWidth: isSelected ? 1.5 : 1,
                                }
                              ]}
                            >
                              <View style={[styles.themeColorDot, { backgroundColor: colors.tint }]} />
                              <Text style={[styles.themeLabelText, { color: colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                                {getThemeDisplayName(themeKey)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <Pressable
                      onPress={handleLogout}
                      style={({ pressed }) => [
                        styles.logoutButton,
                        {
                          opacity: pressed ? 0.86 : 1,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
                      <Text style={styles.logoutText}>
                        {tf('settings.logout', 'Đăng xuất')}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {/* GENDER */}
                    <DrawerSection
                      title={tf('filter.gender', 'Giới tính')}
                      textColor={subTextColor}
                    >
                      <View style={styles.chipRow}>
                        {genderOptions.map((item) => (
                          <SelectChip
                            key={item.value}
                            label={item.label}
                            selected={filterDraft.gender === item.value}
                            textColor={textColor}
                            bg={glassBg}
                            border={glassBorder}
                            onPress={() =>
                              setFilterDraft((prev) => ({
                                ...prev,
                                gender: prev.gender === item.value ? '' : item.value,
                              }))
                            }
                          />
                        ))}
                      </View>
                    </DrawerSection>

                    {/* AGE */}
                    <DrawerSection
                      title={tf('filter.age', 'Tuổi')}
                      textColor={subTextColor}
                    >
                      <View style={styles.inputRow}>
                        <TextInput
                          value={filterDraft.minAge}
                          onChangeText={(value) =>
                            setFilterDraft((prev) => ({
                              ...prev,
                              minAge: value,
                            }))
                          }
                          placeholder="18"
                          placeholderTextColor={subTextColor}
                          keyboardType="number-pad"
                          style={[
                            styles.input,
                            {
                              color: textColor,
                              borderColor: glassBorder,
                              backgroundColor: glassBg,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.inputDivider,
                            {
                              backgroundColor: subTextColor,
                            },
                          ]}
                        />
                        <TextInput
                          value={filterDraft.maxAge}
                          onChangeText={(value) =>
                            setFilterDraft((prev) => ({
                              ...prev,
                              maxAge: value,
                            }))
                          }
                          placeholder="99"
                          placeholderTextColor={subTextColor}
                          keyboardType="number-pad"
                          style={[
                            styles.input,
                            {
                              color: textColor,
                              borderColor: glassBorder,
                              backgroundColor: glassBg,
                            },
                          ]}
                        />
                      </View>
                    </DrawerSection>

                    {/* INTEREST */}
                    <DrawerSection
                      title={tf('filter.interests', 'Sở thích')}
                      textColor={subTextColor}
                    >
                      <FlatList
                        data={interestItems}
                        renderItem={renderInterest}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        scrollEnabled={false}
                        removeClippedSubviews={Platform.OS === 'android'}
                        columnWrapperStyle={{
                          gap: 10,
                          marginBottom: 10,
                        }}
                        contentContainerStyle={{
                          paddingBottom: 4,
                        }}
                      />
                    </DrawerSection>
                  </>
                )}
              </ScrollView>

              {/* FOOTER */}

              {!isSettings && (
              <View
                style={styles.footer}
              >
                <Pressable
                  onPress={
                    clearFilter
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.clearButton,

                    {
                      backgroundColor:
                        glassBg,

                      borderColor:
                        glassBorder,

                      opacity: pressed
                        ? 0.84
                        : 1,

                      transform: [
                        {
                          scale:
                            pressed
                              ? 0.97
                              : 1,
                        },
                      ],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.clearText,
                      {
                        color:
                          textColor,
                      },
                    ]}
                  >
                    Reset
                  </Text>
                </Pressable>

                <Pressable
                  onPress={
                    applyFilter
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.applyButton,

                    {
                      opacity: pressed
                        ? 0.9
                        : 1,

                      transform: [
                        {
                          scale:
                            pressed
                              ? 0.98
                              : 1,
                        },
                      ],
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.applyText
                    }
                  >
                    Apply
                  </Text>
                </Pressable>
              </View>
              )}
            </Animated.View>
          </LiquidSurface>
        </Animated.View>
      </Animated.View>
    </RevealSideSheet>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,

    backfaceVisibility:
      'hidden',
  },

  outerContainer: {
    flex: 1,

    overflow: 'hidden',

    backgroundColor:
      'rgba(255,255,255,0.72)',

    shadowColor: '#000',

    shadowOpacity: 0.08,

    shadowRadius: 30,

    shadowOffset: {
      width: 0,
      height: 16,
    },

    elevation: 10,
  },

  contentWrap: {
    flex: 1,

    paddingTop: 28,

    paddingHorizontal: 18,

    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    marginBottom: 20,
  },

  userRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 14,

    flex: 1,
  },

  userDot: {
    width: 60,

    height: 60,

    borderRadius: 22,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,
  },

  userNameContainer: {
    flex: 1,
  },

  welcomeText: {
    fontSize: 12,

    fontWeight: '700',

    opacity: 0.7,
  },

  userNameText: {
    fontSize: 20,

    fontWeight: '900',
  },

  closeButton: {
    width: 46,

    height: 46,

    borderRadius: 18,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  section: {
    marginBottom: 26,
  },

  sectionTitle: {
    fontSize: 10,

    fontWeight: '900',

    letterSpacing: 2,

    marginBottom: 14,

    opacity: 0.7,
  },

  chipRow: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 10,
  },

  chip: {
    minHeight: 46,

    borderRadius: 18,

    paddingHorizontal: 18,

    borderWidth: 1,

    alignItems: 'center',

    justifyContent: 'center',
  },

  chipLabel: {
    fontSize: 13,

    fontWeight: '800',
  },

  inputRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 14,
  },

  input: {
    flex: 1,

    height: 56,

    borderRadius: 18,

    paddingHorizontal: 18,

    borderWidth: 1,

    fontSize: 16,

    fontWeight: '800',
  },

  inputDivider: {
    width: 12,

    height: 2,

    borderRadius: 2,

    opacity: 0.5,
  },

  footer: {
    flexDirection: 'row',

    gap: 12,

    marginTop: 12,
  },

  clearButton: {
    flex: 0.35,

    height: 58,

    borderRadius: 18,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,
  },

  clearText: {
    fontSize: 14,

    fontWeight: '900',
  },

  applyButton: {
    flex: 0.65,

    height: 58,

    borderRadius: 20,

    alignItems: 'center',

    justifyContent: 'center',

    overflow: 'hidden',

    backgroundColor:
      '#11936F',

    shadowColor: '#11936F',

    shadowOpacity: 0.18,

    shadowRadius: 18,

    shadowOffset: {
      width: 0,
      height: 10,
    },
  },

  applyText: {
    color: '#FFF',

    fontSize: 15,

    fontWeight: '900',
  },
  menuItem: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  menuIconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  logoutButton: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    marginTop: 16,
    marginBottom: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '900',
  },
  themeSelectorContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  themeSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginLeft: 14,
  },
  themeCategoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 2,
  },
  themeScroll: {
    marginBottom: 8,
  },
  themeScrollContent: {
    gap: 8,
    paddingRight: 10,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  themeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeLabelText: {
    fontSize: 12,
  },
});

export default memo(AppDrawer);