import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  InteractionManager,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ThemeContext, useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/authContext';
import { useStateCommon } from '@/context/stateCommon';
import { getThemeDisplayName, getThemeColors, isDarkTheme } from '@/constants/Colors';
import { DEFAULT_FILTER } from '@/utils/filterStorage';
import { getInterestsArray, normalizeInterestsArray } from '@/utils/interests';
import educationData from '@/assets/data/educationData.json';
import { RevealSideSheet } from '@/components/reveal';
import { LiquidSurface, getLiquidPalette, LiquidGlassBackground } from '@/components/liquid';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

type DrawerTab = 'filter' | 'settings';
export type FeatureDrawerKey =
  | 'notification'
  | 'chatSearch'
  | 'groupSearch'
  | 'addFriend'
  | 'groupManagement'
  | 'createGroup';

interface AppDrawerProps {
  visible: boolean;
  tab: DrawerTab;
  onClose: () => void;
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

const distanceOptions = ['1', '5', '10', '25', '50', '100', 'all'];
const genderOptions = [
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
  { label: 'Tất cả', value: 'all' },
];
const educationOptions = (educationData?.educationLevels || []).slice(0, 5);
const jobOptions = (educationData?.jobs || []).slice(0, 8);

const normalizeFilter = (value: any): FilterState => ({
  gender: value?.gender || '',
  minAge: value?.minAge || '',
  maxAge: value?.maxAge || '',
  distance: value?.distance || '',
  educationLevel: value?.educationLevel || '',
  job: value?.job || '',
  interests: Array.isArray(value?.interests) ? normalizeInterestsArray(value.interests) : [],
});

const DrawerSection = ({ title, children, textColor }: { title: string; children: React.ReactNode, textColor: string }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: textColor }]}>{title.toUpperCase()}</Text>
    {children}
  </View>
);

const AppDrawer = ({ visible, tab, onClose }: AppDrawerProps) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const themeContext = useContext(ThemeContext);
  const { theme, isDark, palette, themes } = useTheme();
  const { stateCommon, setStateCommon } = useStateCommon();
  const interestItems = useMemo(() => getInterestsArray().slice(0, 28), []);
  const themeOptions = useMemo(
    () => themes.map((id) => ({ id, palette: getLiquidPalette(id as any), colors: getThemeColors(id) })),
    [themes]
  );

  const getThemeIcon = useCallback((themeId: string) => {
    const normalized = themeId.toLowerCase();
    if (normalized.includes('light')) return 'brightness-6';
    if (normalized.includes('dark')) return 'brightness-4';
    if (normalized.includes('midnight')) return 'owl';
    if (normalized.includes('emerald')) return 'leaf';
    if (normalized.includes('sunset')) return 'weather-sunset';
    if (normalized.includes('liquid')) return 'water-percent';
    if (normalized.includes('forest')) return 'tree';
    if (normalized.includes('ocean')) return 'waves';
    if (normalized.includes('rose') || normalized.includes('sakura')) return 'flower';
    if (normalized.includes('volcanic')) return 'fire';
    return 'palette';
  }, []);

  const [isFilterContentReady, setIsFilterContentReady] = useState(false);
  const [filterDraft, setFilterDraft] = useState<FilterState>(() =>
    normalizeFilter({ ...DEFAULT_FILTER, ...(stateCommon?.filter || {}) })
  );

  const textColor = palette.textColor;
  const subtextColor = palette.subtitleColor;
  const glassPanelBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const glassBorder = palette.menuBorder;
  const sectionTitleColor = palette.subtitleColor;

  useEffect(() => {
    if (visible) {
      setFilterDraft(normalizeFilter({ ...DEFAULT_FILTER, ...(stateCommon?.filter || {}) }));
    }
  }, [visible, stateCommon?.filter]);

  useEffect(() => {
    if (!visible || tab !== 'filter') {
      setIsFilterContentReady(false);
      return;
    }

    setIsFilterContentReady(false);
    const task = InteractionManager.runAfterInteractions(() => {
      setIsFilterContentReady(true);
    });

    return () => {
      task.cancel();
    };
  }, [tab, visible]);

  const toggleInterest = useCallback((interestId: string) => {
    setFilterDraft((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }));
  }, []);

  const applyFilter = useCallback(() => {
    setStateCommon({ filter: { ...filterDraft } });
    onClose();
  }, [filterDraft, onClose, setStateCommon]);

  const clearFilter = useCallback(() => {
    const cleared = normalizeFilter(DEFAULT_FILTER);
    setFilterDraft(cleared);
    setStateCommon({ filter: { ...cleared } });
  }, [setStateCommon]);

  const navigateFromDrawer = useCallback((path: string, mode: 'push' | 'replace' = 'push') => {
    onClose();
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        try {
          if (mode === 'replace') {
            router.replace(path as any);
          } else {
            router.push(path as any);
          }
        } catch (error) {
          console.log('Drawer navigation failed:', path, error);
        }
      });
    });
  }, [onClose, router]);

  const signOutFromDrawer = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      onClose();
    }
  }, [logout, onClose]);

  const changeLanguage = useCallback((lng: string) => {
    i18n.changeLanguage(lng);
  }, [i18n]);

  const settingsActions = useMemo(
    () => [
      { icon: 'account-edit-outline', label: t('settings.edit_profile'), onPress: () => navigateFromDrawer('/(tabs)/profile/EditProfile') },
      { icon: 'shield-account-outline', label: t('settings.privacy'), onPress: () => navigateFromDrawer('/(screens)/user/PrivacySettingsScreen') },
      { icon: 'wallet-outline', label: t('settings.wallet'), onPress: () => navigateFromDrawer('/(tabs)/profile/CoinWalletScreen') },
      { icon: 'crown-outline', label: t('settings.store'), onPress: () => navigateFromDrawer('/(screens)/store/StoreScreen') },
    ],
    [navigateFromDrawer, t]
  );

  return (
    <RevealSideSheet
      visible={visible}
      onClose={onClose}
      side="left"
      widthRatio={0.9}
      maxWidth={480}
    >
      <LiquidSurface
        themeMode={theme}
        borderRadius={40}
        intensity={isDarkTheme(theme) ? 44 : 58}
        style={styles.outerContainer}
      >
        <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />

        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.userRow}>
              <View style={[styles.userDot, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                <MaterialCommunityIcons name="account-circle-outline" size={28} color={textColor} />
              </View>
              <View style={styles.userNameContainer}>
                <Text style={[styles.welcomeText, { color: subtextColor }]}>{t('common.hello')},</Text>
                <Text numberOfLines={1} style={[styles.userNameText, { color: textColor }]}>
                  {user?.displayName || user?.username || 'ChappAt User'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
              <BlurView intensity={isDarkTheme(theme) ? 30 : 50} tint={isDarkTheme(theme) ? 'dark' : 'light'} style={styles.closeBlur}>
                <MaterialCommunityIcons name="close" size={20} color={textColor} />
              </BlurView>
            </TouchableOpacity>
          </View>

          {tab === 'filter' ? (
            <>
              {!isFilterContentReady ? (
                <View style={styles.filterLoadingWrap}>
                  <MaterialCommunityIcons name="tune-variant" size={28} color={subtextColor} />
                  <Text style={[styles.filterLoadingText, { color: subtextColor }]}>Syncing filter controls...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                  <DrawerSection title={t('filter.gender')} textColor={sectionTitleColor}>
                    <View style={styles.chipRow}>
                      {genderOptions.map((item) => {
                        const selected = filterDraft.gender === item.value;
                        return (
                          <TouchableOpacity
                            key={item.value}
                            activeOpacity={0.85}
                            onPress={() =>
                              setFilterDraft((prev) => ({
                                ...prev,
                                gender: prev.gender === item.value ? '' : item.value,
                              }))
                            }
                            style={[
                              styles.chip, 
                              { backgroundColor: glassPanelBg, borderColor: glassBorder }, 
                              selected && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.2)' : 'rgba(11,33,36,0.1)', borderColor: textColor }
                            ]}
                          >
                            <Text style={[styles.chipLabel, { color: textColor }]}>{item.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </DrawerSection>

                  <DrawerSection title={t('filter.age')} textColor={sectionTitleColor}>
                    <View style={styles.inputRow}>
                      <TextInput
                        value={filterDraft.minAge}
                        onChangeText={(value) => setFilterDraft((prev) => ({ ...prev, minAge: value }))}
                        placeholder="18"
                        placeholderTextColor={sectionTitleColor}
                        keyboardType="number-pad"
                        style={[styles.input, { color: textColor, borderColor: glassBorder, backgroundColor: glassPanelBg }]}
                      />
                      <View style={[styles.inputDivider, { backgroundColor: sectionTitleColor }]} />
                      <TextInput
                        value={filterDraft.maxAge}
                        onChangeText={(value) => setFilterDraft((prev) => ({ ...prev, maxAge: value }))}
                        placeholder="99"
                        placeholderTextColor={sectionTitleColor}
                        keyboardType="number-pad"
                        style={[styles.input, { color: textColor, borderColor: glassBorder, backgroundColor: glassPanelBg }]}
                      />
                    </View>
                  </DrawerSection>

                  <DrawerSection title={t('filter.distance')} textColor={sectionTitleColor}>
                    <View style={styles.chipRow}>
                      {distanceOptions.map((value) => {
                        const selected = filterDraft.distance === value;
                        return (
                          <TouchableOpacity
                            key={value}
                            activeOpacity={0.85}
                            onPress={() =>
                              setFilterDraft((prev) => ({
                                ...prev,
                                distance: prev.distance === value ? '' : value,
                              }))
                            }
                            style={[
                              styles.chip, 
                              { backgroundColor: glassPanelBg, borderColor: glassBorder }, 
                              selected && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.2)' : 'rgba(11,33,36,0.1)', borderColor: textColor }
                            ]}
                          >
                            <Text style={[styles.chipLabel, { color: textColor }]}>{value === 'all' ? 'All' : `${value}km`}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </DrawerSection>

                  <DrawerSection title={t('filter.education')} textColor={sectionTitleColor}>
                    <View style={styles.chipRow}>
                      {educationOptions.map((item: any) => {
                        const selected = filterDraft.educationLevel === item.value;
                        return (
                          <TouchableOpacity
                            key={item.value}
                            activeOpacity={0.85}
                            onPress={() =>
                              setFilterDraft((prev) => ({
                                ...prev,
                                educationLevel: prev.educationLevel === item.value ? '' : item.value,
                              }))
                            }
                            style={[
                              styles.chip, 
                              { backgroundColor: glassPanelBg, borderColor: glassBorder }, 
                              selected && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.2)' : 'rgba(11,33,36,0.1)', borderColor: textColor }
                            ]}
                          >
                            <Text numberOfLines={1} style={[styles.chipLabel, { color: textColor }]}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </DrawerSection>

                  <DrawerSection title={t('filter.interests')} textColor={sectionTitleColor}>
                    <View style={styles.chipRow}>
                      {interestItems.map((item) => {
                        const selected = filterDraft.interests.includes(item.id);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.85}
                            onPress={() => toggleInterest(item.id)}
                            style={[
                              styles.chip, 
                              { backgroundColor: glassPanelBg, borderColor: glassBorder }, 
                              selected && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.2)' : 'rgba(11,33,36,0.1)', borderColor: textColor }
                            ]}
                          >
                            <Text numberOfLines={1} style={[styles.chipLabel, { color: textColor }]}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </DrawerSection>
                </ScrollView>
              )}

              <View style={styles.footerActions}>
                <TouchableOpacity activeOpacity={0.8} onPress={clearFilter} style={[styles.clearButton, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                  <Text style={[styles.clearText, { color: textColor }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} onPress={applyFilter} style={[styles.applyButton, { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.92)' : 'rgba(11,43,36,0.95)' }]}>
                  <Text style={[styles.applyText, { color: theme === 'dark' ? '#0A4A3A' : '#FFFFFF' }]}>Apply Changes</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <DrawerSection title={t('settings.quick_menu')} textColor={sectionTitleColor}>
                <View style={styles.settingsList}>
                  {settingsActions.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      activeOpacity={0.8}
                      onPress={item.onPress}
                      style={[styles.settingsItem, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}
                    >
                      <View style={styles.settingsIcon}>
                        <MaterialCommunityIcons name={item.icon as any} size={22} color={textColor} />
                      </View>
                      <Text style={[styles.settingsLabel, { color: textColor }]}>{item.label}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={sectionTitleColor} />
                    </TouchableOpacity>
                  ))}
                </View>
              </DrawerSection>

              <DrawerSection title={t('settings.preferences')} textColor={sectionTitleColor}>
                <Text style={[styles.subLabel, { color: sectionTitleColor }]}>{t('settings.app_theme' as any)}</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.themeScroll}
                >
                  {themeOptions.map((item) => {
                    const isSelected = theme === item.id;
                    const themeTint = item.colors?.tint || item.palette?.primary || textColor;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        onPress={() => themeContext?.setTheme(item.id as any)}
                        style={[
                          styles.themeChip,
                          { backgroundColor: isSelected ? item.palette.menuBackground : glassPanelBg, borderColor: isSelected ? themeTint : glassBorder }
                        ]}
                      >
                         <MaterialCommunityIcons 
                          name={getThemeIcon(item.id) as any} 
                          size={20} 
                          color={isSelected ? themeTint : textColor} 
                        />
                        <Text style={[styles.themeLabel, { color: isSelected ? themeTint : textColor }]}>
                          {getThemeDisplayName(item.id)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={[styles.settingsItem, { backgroundColor: glassPanelBg, borderColor: glassBorder, marginTop: 12 }]}>
                   <View style={styles.settingsIcon}>
                     <MaterialCommunityIcons name="translate" size={22} color={textColor} />
                   </View>
                   <Text style={[styles.settingsLabel, { color: textColor }]}>{t('settings.language')} ({i18n.language.toUpperCase()})</Text>
                   <View style={styles.langSwitchRow}>
                      <TouchableOpacity onPress={() => changeLanguage('vi')} style={[styles.langDot, i18n.language === 'vi' && { backgroundColor: textColor }]}>
                        <Text style={[styles.langDotText, { color: i18n.language === 'vi' ? (theme === 'dark' ? '#0A4A3A' : '#FFFFFF') : textColor }]}>VI</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeLanguage('en')} style={[styles.langDot, i18n.language === 'en' && { backgroundColor: textColor }]}>
                        <Text style={[styles.langDotText, { color: i18n.language === 'en' ? (theme === 'dark' ? '#0A4A3A' : '#FFFFFF') : textColor }]}>EN</Text>
                      </TouchableOpacity>
                   </View>
                </View>
              </DrawerSection>

              <DrawerSection title={t('settings.about')} textColor={sectionTitleColor}>
                 <View style={[styles.settingsItem, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                    <View style={styles.settingsIcon}>
                        <MaterialCommunityIcons name="information-outline" size={22} color={textColor} />
                    </View>
                    <Text style={[styles.settingsLabel, { color: textColor }]}>App Version</Text>
                    <Text style={[styles.versionText, { color: subtextColor }]}>v2.0.4-gold</Text>
                 </View>
              </DrawerSection>

              <Pressable
                onPress={signOutFromDrawer}
                style={({ pressed }) => [
                  styles.signOut, 
                  { backgroundColor: theme === 'dark' ? 'rgba(255,107,107,0.12)' : 'rgba(230,230,230,0.5)', borderColor: theme === 'dark' ? 'rgba(255,107,107,0.4)' : '#E6394644' },
                  pressed && { opacity: 0.7, scale: 0.985 }
                ]}
              >
                <MaterialCommunityIcons name="logout-variant" size={20} color={theme === 'dark' ? '#FF8E8E' : '#E63946'} />
                <Text style={[styles.signOutText, { color: theme === 'dark' ? '#FF8E8E' : '#E63946' }]}>{t('settings.sign_out')}</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </LiquidSurface>
    </RevealSideSheet>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  userDot: {
    width: 60,
    height: 60,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  userNameContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.8,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  filterLoadingWrap: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  filterLoadingText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 14,
    letterSpacing: 2,
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  input: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  inputDivider: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
    opacity: 0.4,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },
  clearButton: {
    flex: 0.35,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '900',
  },
  applyButton: {
    flex: 0.65,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  applyText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  settingsList: {
    gap: 12,
  },
  settingsItem: {
    minHeight: 64,
    borderRadius: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
  },
  settingsIcon: {
    width: 32,
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  langSwitchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langDot: {
    width: 36,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langDotText: {
    fontSize: 11,
    fontWeight: '900',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.6,
  },
  signOut: {
    marginTop: 16,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
    opacity: 0.5,
  },
  themeScroll: {
    paddingRight: 40,
    paddingVertical: 4,
    gap: 10,
  },
  themeChip: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default React.memo(AppDrawer);
