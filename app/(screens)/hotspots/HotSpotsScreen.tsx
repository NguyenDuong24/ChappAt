import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Alert,
  Easing,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import useHotSpotsData, { UIHotSpot } from '@/hooks/useHotSpotsData';
import InterestedUsersModal from '@/components/hotspots/InterestedUsersModal';
import EventInvitesModal from '@/components/hotspots/EventInvitesModal';
import { eventInviteService } from '@/services/eventInviteService';

const { width } = Dimensions.get('window');

// ==================== TYPES ====================
interface Category {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  gradient: readonly [string, string];
}

type TimeFilter = 'all' | 'today' | 'upcoming';
type ViewMode = 'card' | 'list';

// ==================== CONSTANTS ====================
const CATEGORIES: Category[] = [
  { key: 'all', label: 'hotspots.categories.all', icon: 'apps', gradient: ['#8B5CF6', '#EC4899'] },
  { key: 'event', label: 'hotspots.categories.event', icon: 'event', gradient: ['#F59E0B', '#EF4444'] },
  { key: 'place', label: 'hotspots.categories.place', icon: 'place', gradient: ['#10B981', '#059669'] },
  { key: 'food', label: 'hotspots.categories.food', icon: 'restaurant', gradient: ['#F97316', '#DC2626'] },
  { key: 'entertainment', label: 'hotspots.categories.entertainment', icon: 'celebration', gradient: ['#06B6D4', '#3B82F6'] },
];

const TIME_FILTERS = [
  { key: 'all' as const, label: 'hotspots.time_filters.all' },
  { key: 'today' as const, label: 'hotspots.time_filters.today' },
  { key: 'upcoming' as const, label: 'hotspots.time_filters.upcoming' }
];

// ==================== MAIN COMPONENT ====================
const HotSpotsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  // ==================== STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showFeatured, setShowFeatured] = useState(true);

  // Modal states
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventTitle, setSelectedEventTitle] = useState('');

  // Action loading states
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // ==================== HOOKS ====================
  const {
    hotSpots,
    featuredSpots,
    loading,
    refreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    updateFilters,
    joinHotSpot,
    markInterested,
    removeInterested,
    checkIn,
    toggleFavorite
  } = useHotSpotsData();

  // ==================== THEME ====================
  const THEME = useMemo(() => ({
    colors: {
      primary: Colors.primary,
      secondary: Colors.secondary,
      accent: Colors.accent,
      background: currentThemeColors.background,
      surface: currentThemeColors.surface,
      surfaceLight: currentThemeColors.cardBackground,
      text: currentThemeColors.text,
      textSecondary: currentThemeColors.subtleText,
      textTertiary: currentThemeColors.mutedText,
      error: Colors.error,
      success: Colors.success,
      warning: Colors.warning,
      border: currentThemeColors.border,
      cardBg: currentThemeColors.cardBackground,
      gradients: {
        primary: ['#8B5CF6', '#EC4899', '#F59E0B'] as const,
        secondary: ['#06B6D4', '#3B82F6', '#8B5CF6'] as const,
        success: ['#10B981', '#059669'] as const,
        warning: ['#F59E0B', '#EF4444'] as const,
        card: (theme === 'dark'
          ? ['rgba(30, 41, 59, 0.95)', 'rgba(51, 65, 85, 0.6)']
          : ['rgba(255, 255, 255, 0.95)', 'rgba(248, 250, 252, 0.6)']) as [string, string],
        overlay: (theme === 'dark'
          ? ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.85)']
          : ['rgba(255, 255, 255, 0)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']) as [string, string, string],
      }
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 10,
      md: 16,
      lg: 20,
      xl: 24,
    },
  }), [theme, currentThemeColors]);

  // ==================== EFFECTS ====================

  // Initial animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Update filters when category or search changes
  useEffect(() => {
    const filters = {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      searchQuery: searchQuery.trim() || undefined,
      sortBy: 'popular' as const
    };
    updateFilters(filters);
  }, [selectedCategory, searchQuery, updateFilters]);

  // Load pending invites
  useEffect(() => {
    if (user?.uid) {
      loadPendingInvites();
    }
  }, [user?.uid]);

  // ==================== HANDLERS ====================

  const loadPendingInvites = async () => {
    if (!user?.uid) return;
    try {
      const invites = await eventInviteService.getUserInvites(user.uid);
      setPendingInvitesCount(invites.length);
    } catch (error) {
      console.error('Error loading pending invites:', error);
    }
  };

  const handleSpotPress = (spot: UIHotSpot) => {
    router.push({
      pathname: '/(screens)/hotspots/HotSpotDetailScreen',
      params: { hotSpotId: spot.id }
    });
  };

  const handleCheckIn = async (spotId: string) => {
    if (actionLoading[spotId]) return;

    setActionLoading(prev => ({ ...prev, [spotId]: true }));
    try {
      await checkIn(spotId);
      await refresh();
      Alert.alert(t('common.success') + '! ✅', t('hotspots.check_in_success'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('hotspots.error_check_in'));
    } finally {
      setActionLoading(prev => ({ ...prev, [spotId]: false }));
    }
  };

  const handleInterested = async (spotId: string) => {
    if (actionLoading[spotId]) return;

    setActionLoading(prev => ({ ...prev, [spotId]: true }));
    try {
      const spot = hotSpots.find(s => s.id === spotId);
      if (spot?.isInterested) {
        await removeInterested(spotId);
        Alert.alert(t('hotspots.uninterested_success'), t('hotspots.uninterested_desc'));
      } else {
        await markInterested(spotId);
        Alert.alert(t('common.success') + '! 💜', t('hotspots.interested_success'));
      }
      await refresh();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.error_generic'));
    } finally {
      setActionLoading(prev => ({ ...prev, [spotId]: false }));
    }
  };

  const handleGoTogether = async (spotId: string) => {
    if (actionLoading[spotId]) return;

    setActionLoading(prev => ({ ...prev, [spotId]: true }));
    try {
      await joinHotSpot(spotId);
      await refresh();
      Alert.alert(t('common.success') + '! 🎉', t('hotspots.join_success'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.error_generic'));
    } finally {
      setActionLoading(prev => ({ ...prev, [spotId]: false }));
    }
  };

  const handleFavorite = async (spotId: string) => {
    if (actionLoading[spotId]) return;

    setActionLoading(prev => ({ ...prev, [spotId]: true }));
    try {
      await toggleFavorite(spotId);
      await refresh();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.error_generic'));
    } finally {
      setActionLoading(prev => ({ ...prev, [spotId]: false }));
    }
  };

  const handleShowInterestedUsers = (eventId: string, eventTitle: string) => {
    setSelectedEventId(eventId);
    setSelectedEventTitle(eventTitle);
    setShowInterestedModal(true);
  };

  const handleShowInvites = () => {
    setShowInvitesModal(true);
  };

  const handleInviteAccepted = (chatRoomId: string, eventId?: string, eventTitle?: string) => {
    router.push({
      pathname: '/(screens)/hotspots/HotSpotChatScreen',
      params: {
        chatRoomId,
        hotSpotId: eventId || selectedEventId,
        hotSpotTitle: eventTitle || selectedEventTitle,
      },
    });
  };

  // ==================== COMPUTED VALUES ====================

  const visibleHotSpots = useMemo(() => {
    if (!Array.isArray(hotSpots)) return [];
    if (timeFilter === 'all') return hotSpots;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return hotSpots.filter((spot) => {
      if (!spot?.startTime) return false;
      const spotTime = new Date(spot.startTime);

      if (timeFilter === 'today') {
        return spotTime >= startOfToday && spotTime <= endOfToday;
      } else { // upcoming
        return spotTime > endOfToday;
      }
    });
  }, [hotSpots, timeFilter]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  // ==================== HELPER FUNCTIONS ====================

  const safeText = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    return fallback;
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={THEME.colors.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header Content */}
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🔥 {t('hotspots.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('hotspots.subtitle')}</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleShowInvites}
          >
            <Ionicons name="mail-outline" size={22} color="white" />
            {pendingInvitesCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{pendingInvitesCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
            style={styles.searchGradient}
          >
            <View style={styles.searchInner}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.9)" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('hotspots.search_placeholder')}
                placeholderTextColor="rgba(255,255,255,0.65)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close" size={18} color="white" />
                </TouchableOpacity>
              ) : null}
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
            >
              {isActive ? (
                <LinearGradient
                  colors={cat.gradient as any}
                  style={styles.categoryChip}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name={cat.icon} size={18} color="white" />
                  <Text style={styles.categoryText}>{t(cat.label)}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.categoryChip, styles.categoryChipInactive]}>
                  <MaterialIcons name={cat.icon} size={18} color="rgba(255,255,255,0.85)" />
                  <Text style={[styles.categoryText, styles.categoryTextInactive]}>{t(cat.label)}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Time Filters */}
      <View style={styles.timeFilters}>
        {TIME_FILTERS.map(filter => {
          const isActive = timeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.timeChip, isActive && styles.timeChipActive]}
              onPress={() => setTimeFilter(filter.key)}
            >
              <Text style={[styles.timeText, isActive && styles.timeTextActive]}>
                {t(filter.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderFeaturedCard = ({ item }: { item: UIHotSpot }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleSpotPress(item)}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.featuredImage} />
      <LinearGradient
        colors={THEME.colors.gradients.overlay}
        style={styles.featuredOverlay}
      />
      <View style={styles.featuredContent}>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {safeText(item.title, 'Hot Spot')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location" size={14} color="rgba(255,255,255,0.95)" />
          <Text style={styles.featuredSubtitle} numberOfLines={1}>
            {safeText(item.location, t('hotspots.unknown_location'))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHotSpotCard = ({ item }: { item: UIHotSpot }) => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSpotPress(item)}
        activeOpacity={0.95}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
          <LinearGradient
            colors={THEME.colors.gradients.overlay}
            style={styles.imageOverlay}
          />

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.badgeGroup}>
              {item.hasCheckedIn && (
                <LinearGradient colors={['#10B981', '#059669']} style={styles.badge}>
                  <Ionicons name="checkmark-circle" size={12} color="white" />
                  <Text style={styles.badgeText}>{t('hotspots.checked_in').toUpperCase()}</Text>
                </LinearGradient>
              )}
              {item.isNew && (
                <LinearGradient colors={['#10B981', '#059669']} style={styles.badge}>
                  <Ionicons name="sparkles" size={12} color="white" />
                  <Text style={styles.badgeText}>{t('hotspots.new').toUpperCase()}</Text>
                </LinearGradient>
              )}
              {item.isPopular && (
                <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.badge}>
                  <Ionicons name="flame" size={12} color="white" />
                  <Text style={styles.badgeText}>{t('hotspots.hot').toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>


          </View>
        </View>

        {/* Content Section */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {safeText(item.title, 'Hot Spot')}
          </Text>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={THEME.colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {safeText(item.location, t('hotspots.unknown_location'))}
              </Text>
            </View>

            {item.startTime && (
              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color={THEME.colors.textSecondary} />
                <Text style={styles.infoText}>
                  {new Date(item.startTime).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons - Only Interested */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                item.isInterested ? styles.actionButtonActive : styles.actionButtonInactive,
                { flex: 1, paddingVertical: 12 }
              ]}
              onPress={() => handleInterested(item.id)}
              disabled={actionLoading[item.id]}
            >
              {item.isInterested && (
                <LinearGradient
                  colors={['#EC4899', '#BE185D']}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {actionLoading[item.id] ? (
                <ActivityIndicator size="small" color={item.isInterested ? "white" : THEME.colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name={item.isInterested ? "heart" : "heart-outline"}
                    size={20}
                    color={item.isInterested ? "white" : THEME.colors.secondary}
                  />
                  <Text style={[
                    styles.actionText,
                    item.isInterested ? styles.actionTextActive : styles.actionTextInactive,
                    { fontSize: 15 }
                  ]}>
                    {item.isInterested ? t('hotspots.already_interested') : t('hotspots.interested')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Participants Section */}
          <View style={styles.participantsSection}>
            <TouchableOpacity
              style={styles.avatarStack}
              onPress={() => handleShowInterestedUsers(item.id, safeText(item.title, 'Hot Spot'))}
            >
              {[1, 2, 3].map(i => (
                <View key={i} style={[styles.avatar, { marginLeft: i > 1 ? -12 : 0, zIndex: 4 - i }]}>
                  <LinearGradient
                    colors={THEME.colors.gradients.primary}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.avatarText}>U{i}</Text>
                </View>
              ))}
              {(item.interestedCount ?? 0) > 3 && (
                <View style={[styles.avatar, { marginLeft: -12, backgroundColor: THEME.colors.surfaceLight, zIndex: 0 }]}>
                  <Text style={[styles.avatarText, { fontSize: 11, color: THEME.colors.primary }]}>
                    +{(item.interestedCount ?? 0) - 3}
                  </Text>
                </View>
              )}
              <View style={styles.viewMoreIndicator}>
                <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
              </View>
            </TouchableOpacity>

            <View style={styles.statsGroup}>
              <Text style={styles.participantCount}>{item.interestedCount ?? 0}</Text>
              <Text style={[styles.ratingText, { fontSize: 11, marginBottom: 4 }]}>{t('hotspots.interested')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.rating}>
                  <Ionicons name="star" size={16} color="#FBBF24" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
                {item.price && (
                  <Text style={styles.price}>
                    {item.price.toLocaleString('vi-VN')}{t('hotspots.currency')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={THEME.colors.textTertiary} />
      <Text style={styles.emptyTitle}>{t('hotspots.no_results')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('hotspots.no_results_desc')}
      </Text>
    </View>
  );

  const renderLoadingSkeleton = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '80%' }]} />
        <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      </View>
    </View>
  );

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.05)', 'rgba(236, 72, 153, 0.05)', 'rgba(245, 158, 11, 0.05)']}
          style={StyleSheet.absoluteFill}
        />
        {renderHeader()}
        <FlatList
          data={[1, 2, 3, 4]}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={renderLoadingSkeleton}
          contentContainerStyle={[styles.listContent, { paddingTop: Platform.OS === 'ios' ? 280 : 260 }]}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.04)', 'rgba(236, 72, 153, 0.04)', 'rgba(245, 158, 11, 0.04)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Fixed Header */}
      {renderHeader()}

      {/* Main Content */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 280 : 260 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
            progressViewOffset={Platform.OS === 'ios' ? 280 : 260}
          />
        }
      >
        {/* Featured Section */}
        {featuredSpots.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🌟 {t('hotspots.featured')}</Text>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowFeatured(!showFeatured)}
              >
                <Ionicons
                  name={showFeatured ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={THEME.colors.text}
                />
              </TouchableOpacity>
            </View>
            {showFeatured && (
              <FlatList
                horizontal
                data={featuredSpots}
                renderItem={renderFeaturedCard}
                keyExtractor={item => `featured-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                snapToInterval={width * 0.85 + THEME.spacing.md}
                decelerationRate="fast"
              />
            )}
          </View>
        )}

        {/* Hot Spots List */}
        <View style={styles.listContent}>
          {visibleHotSpots.length > 0 ? (
            visibleHotSpots.map(item => (
              <View key={item.id}>
                {renderHotSpotCard({ item })}
              </View>
            ))
          ) : (
            renderEmptyState()
          )}
        </View>
      </Animated.ScrollView>

      {/* Modals */}
      <InterestedUsersModal
        visible={showInterestedModal}
        onClose={() => setShowInterestedModal(false)}
        eventId={selectedEventId}
        eventTitle={selectedEventTitle}
      />

      <EventInvitesModal
        visible={showInvitesModal}
        onClose={() => {
          setShowInvitesModal(false);
          loadPendingInvites();
        }}
        onInviteAccepted={handleInviteAccepted}
      />
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 40 : (StatusBar.currentHeight || 20) + 5,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  notificationText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
  },
  searchContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  searchGradient: {
    borderRadius: 20,
    padding: 2,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 18,
    paddingHorizontal: 24,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesScroll: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    borderRadius: 24,
    minHeight: 36,
    gap: 8,
  },
  categoryChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  categoryTextInactive: {
    color: 'rgba(255,255,255,0.85)',
  },
  timeFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  timeChipActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  timeTextActive: {
    color: '#8B5CF6',
  },
  featuredSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  toggleButton: {
    padding: 8,
  },
  featuredList: {
    paddingLeft: 16,
  },
  featuredCard: {
    width: width * 0.75,
    height: 180,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuredSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    height: 260,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  badgeRow: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 16,
    lineHeight: 28,
  },
  infoSection: {
    marginBottom: 24,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1.5,
    minHeight: 44,
  },
  actionButtonInactive: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  actionButtonActive: {
    borderColor: 'transparent',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionTextInactive: {
    color: '#666',
  },
  actionTextActive: {
    color: 'white',
  },
  participantsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
  viewMoreIndicator: {
    marginLeft: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statsGroup: {
    alignItems: 'flex-end',
  },
  participantCount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#333',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 96,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  skeletonCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  skeletonImage: {
    height: 260,
    backgroundColor: '#e0e0e0',
  },
  skeletonContent: {
    padding: 24,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
});

export default HotSpotsScreen;
