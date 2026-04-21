import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
  Animated as RNAnimated,
  Alert,
  Easing,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import useHotSpotsData, { UIHotSpot } from '@/hooks/useHotSpotsData';
import InterestedUsersModal from '@/components/hotspots/InterestedUsersModal';
import EventInvitesModal from '@/components/hotspots/EventInvitesModal';
import { eventInviteService } from '@/services/eventInviteService';
import { LiquidGlassBackground, LiquidSurface, getLiquidPalette } from '@/components/liquid';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

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

// ==================== SUB-COMPONENTS ====================

const HotSpotCard = React.memo(({ item, onInterested, onShowInterestedUsers, onSpotPress, actionLoading, t, THEME, theme, palette }: any) => {
  const safeText = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    return fallback;
  };

  const isDark = theme === 'dark';

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <LiquidSurface
        themeMode={theme}
        borderRadius={28}
        intensity={isDark ? 10 : 20}
        style={styles.card}
      >
        <TouchableOpacity
          onPress={() => onSpotPress(item)}
          activeOpacity={0.9}
          style={{ flex: 1 }}
        >
          {/* Image Section */}
          <View style={styles.imageContainer}>
            {item.images && item.images.length > 1 ? (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={item.images}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(img, index) => `${item.id}-img-${index}`}
                  renderItem={({ item: imgUrl }) => (
                    <Image
                      source={{ uri: imgUrl }}
                      style={[styles.cardImage, { width: width - 34 }]} // Subtracting border/padding
                      contentFit="cover"
                      transition={200}
                    />
                  )}
                />
                {/* Pagination Dots */}
                <View style={styles.paginationDots}>
                  {item.images.map((_: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        { backgroundColor: 'white', opacity: 0.6 }
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <Image
                source={{ uri: item.imageUrl || item.images?.[0] }}
                style={styles.cardImage}
                contentFit="cover"
                transition={200}
              />
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
              style={styles.imageOverlay}
            />

            {/* Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.badgeGroup}>
                {item.hasCheckedIn && (
                  <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.badge}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={[styles.badgeText, { color: '#10B981' }]}>{t('hotspots.checked_in').toUpperCase()}</Text>
                  </BlurView>
                )}
                {item.isNew && (
                  <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.badge}>
                    <Ionicons name="sparkles" size={12} color="#8B5CF6" />
                    <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>{t('hotspots.new').toUpperCase()}</Text>
                  </BlurView>
                )}
                {item.isPopular && (
                  <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.badge}>
                    <Ionicons name="flame" size={12} color="#EF4444" />
                    <Text style={[styles.badgeText, { color: '#EF4444' }]}>{t('hotspots.hot').toUpperCase()}</Text>
                  </BlurView>
                )}
              </View>
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: palette.textColor }]} numberOfLines={2}>
              {safeText(item.title, 'Hot Spot')}
            </Text>
            
            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Ionicons name="pricetag-outline" size={13} color={palette.sphereGradient[0]} />
                <Text style={[styles.metaChipText, { color: palette.subtitleColor }]}>{safeText(item.category, 'General')}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Ionicons name="people-outline" size={13} color={palette.sphereGradient[0]} />
                <Text style={[styles.metaChipText, { color: palette.subtitleColor }]}>{item.interestedCount ?? 0}</Text>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={16} color={palette.subtitleColor} />
                <Text style={[styles.infoText, { color: palette.subtitleColor }]} numberOfLines={1}>
                  {safeText(item.location, t('hotspots.unknown_location'))}
                </Text>
              </View>

              {item.startTime && (
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={16} color={palette.subtitleColor} />
                  <Text style={[styles.infoText, { color: palette.subtitleColor }]}>
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
                  item.isInterested ? styles.actionButtonActive : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  { flex: 1, paddingVertical: 12 }
                ]}
                onPress={() => onInterested(item.id)}
                disabled={actionLoading[item.id]}
              >
                {item.isInterested && (
                  <LinearGradient
                    colors={palette.sphereGradient}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                {actionLoading[item.id] ? (
                  <ActivityIndicator size="small" color={item.isInterested ? "white" : palette.sphereGradient[0]} />
                ) : (
                  <>
                    <Ionicons
                      name={item.isInterested ? "heart" : "heart-outline"}
                      size={20}
                      color={item.isInterested ? "white" : palette.textColor}
                    />
                    <Text style={[
                      styles.actionText,
                      { color: item.isInterested ? "white" : palette.textColor },
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
                onPress={() => onShowInterestedUsers(item.id, safeText(item.title, 'Hot Spot'))}
              >
                {[1, 2, 3].map(i => (
                  <View key={i} style={[styles.avatar, { marginLeft: i > 1 ? -12 : 0, zIndex: 4 - i, borderColor: palette.menuBackground || 'white' }]}>
                    <LinearGradient
                      colors={palette.sphereGradient}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.avatarText}>U{i}</Text>
                  </View>
                ))}
                {(item.interestedCount ?? 0) > 3 && (
                  <View style={[styles.avatar, { marginLeft: -12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', zIndex: 0, borderColor: palette.menuBackground || 'white' }]}>
                    <Text style={[styles.avatarText, { fontSize: 11, color: palette.sphereGradient[0] }]}>
                      +{(item.interestedCount ?? 0) - 3}
                    </Text>
                  </View>
                )}
                <View style={[styles.viewMoreIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Ionicons name="chevron-forward" size={14} color={palette.sphereGradient[0]} />
                </View>
              </TouchableOpacity>

              <View style={styles.statsGroup}>
                <Text style={[styles.participantCount, { color: palette.textColor }]}>{item.interestedCount ?? 0}</Text>
                <Text style={[styles.ratingText, { fontSize: 11, marginBottom: 4, color: palette.subtitleColor }]}>{t('hotspots.interested')}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={16} color="#FBBF24" />
                    <Text style={[styles.ratingText, { color: palette.textColor }]}>{item.rating}</Text>
                  </View>
                  {item.price && (
                    <Text style={[styles.price, { color: palette.sphereGradient[0] }]}>
                      {item.price.toLocaleString('vi-VN')}{t('hotspots.currency')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </LiquidSurface>
    </Animated.View>
  );
});

const HotSpotsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const THEME = useThemedColors();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const isDark = themeContext?.isDark ?? (theme === 'dark');
  const palette = useMemo(() => themeContext?.palette || getLiquidPalette(theme), [theme, themeContext]);
  const { user } = useAuth();

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
    markInterested,
    removeInterested,
  } = useHotSpotsData();

  // Local UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showFeatured, setShowFeatured] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventTitle, setSelectedEventTitle] = useState('');
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  // Animations
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  // Load pending invites
  const loadPendingInvites = async () => {
    if (!user?.uid) return;
    try {
      const invites = await eventInviteService.getUserInvites(user.uid);
      setPendingInvitesCount(invites.length);
    } catch (error) {
      console.error('Error loading pending invites:', error);
    }
  };

  useEffect(() => {
    loadPendingInvites();
  }, [user?.uid]);

  // Handlers
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    updateFilters({ searchQuery: text, category: selectedCategory === 'all' ? undefined : selectedCategory });
  };

  const handleCategorySelect = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    updateFilters({
      category: categoryKey === 'all' ? undefined : categoryKey,
      searchQuery
    });
  };

  const handleInterested = async (hotSpotId: string) => {
    if (!user) {
      Alert.alert(t('common.login_required'), t('hotspots.login_to_interact'));
      return;
    }

    setActionLoading(prev => ({ ...prev, [hotSpotId]: true }));
    try {
      const spot = hotSpots.find(s => s.id === hotSpotId);
      if (spot?.isInterested) {
        await removeInterested(hotSpotId);
      } else {
        await markInterested(hotSpotId);
      }
    } catch (err) {
      Alert.alert(t('common.error'), t('hotspots.action_failed'));
    } finally {
      setActionLoading(prev => ({ ...prev, [hotSpotId]: false }));
    }
  };

  const handleShowInterestedUsers = (id: string, title: string) => {
    setSelectedEventId(id);
    setSelectedEventTitle(title);
    setShowInterestedModal(true);
  };

  const handleSpotPress = (spot: UIHotSpot) => {
    router.push({
      pathname: '/(screens)/hotspots/HotSpotDetailScreen',
      params: { hotSpotId: spot.id }
    });
  };

  const handleInviteAccepted = async (chatRoomId: string, eventId?: string, eventTitle?: string) => {
    await refresh();
    await loadPendingInvites();
    if (chatRoomId) {
      router.push({
        pathname: '/(screens)/hotspots/HotSpotChatScreen',
        params: {
          chatRoomId,
          hotSpotId: eventId || '',
          hotSpotTitle: eventTitle || '',
        },
      });
    }
  };

  // Filtered data for display
  const visibleHotSpots = useMemo(() => {
    if (!Array.isArray(hotSpots)) return [];

    let filtered = hotSpots;

    // Time filtering
    if (timeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(spot => {
        if (!spot.startTime) return false;
        const spotDate = new Date(spot.startTime);

        if (timeFilter === 'today') {
          return spotDate >= today && spotDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        } else if (timeFilter === 'upcoming') {
          return spotDate > now;
        }
        return true;
      });
    }

    return filtered;
  }, [hotSpots, timeFilter]);

  // ==================== RENDERS ====================
  const headerSubtitleText = (() => {
    const translated = t('hotspots.discover_interesting');
    if (!translated || translated === 'hotspots.discover_interesting' || translated.startsWith('hotspots.')) {
      return 'Discover interesting places and events';
    }
    return translated;
  })();

  const renderHeader = () => {
    const headerTranslateY = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, -20],
      extrapolate: 'clamp',
    });

    return (
      <RNAnimated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderBottomWidth: 1 }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: 'transparent' }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={palette.textColor} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: palette.textColor }]}>Hot Spots</Text>
            <Text style={[styles.headerSubtitle, { color: palette.subtitleColor }]}>{headerSubtitleText}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: 'transparent' }]}
              onPress={() => setShowInvitesModal(true)}
            >
              <Ionicons name="mail-outline" size={24} color={palette.textColor} />
              {pendingInvitesCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: palette.sphereGradient[0] }]}>
                  <Text style={styles.notificationText}>{pendingInvitesCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInner, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderRadius: 20 }]}>
            <Ionicons name="search" size={20} color={palette.subtitleColor} style={{ marginLeft: 12 }} />
            <TextInput
              style={[styles.searchInput, { color: palette.textColor }]}
              placeholder={t('hotspots.search_placeholder')}
              placeholderTextColor={palette.subtitleColor}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={palette.subtitleColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => handleCategorySelect(cat.key)}
              activeOpacity={0.8}
            >
              <LiquidSurface
                themeMode={theme}
                borderRadius={16}
                intensity={selectedCategory === cat.key ? 30 : 5}
                style={[
                  styles.categoryChip, 
                  selectedCategory === cat.key ? { backgroundColor: palette.sphereGradient[0] } : {}
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
                  <MaterialIcons
                    name={cat.icon}
                    size={18}
                    color={selectedCategory === cat.key ? "white" : palette.textColor}
                  />
                  <Text style={[styles.categoryText, { color: selectedCategory === cat.key ? "white" : palette.textColor }]}>
                    {t(cat.label)}
                  </Text>
                </View>
              </LiquidSurface>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time Filters */}
        <View style={styles.timeFilters}>
          {(['all', 'today', 'upcoming'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.timeChip, 
                timeFilter === filter && { backgroundColor: palette.sphereGradient[0] + '20' },
                { borderColor: timeFilter === filter ? palette.sphereGradient[0] : 'transparent' }
              ]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text style={[styles.timeText, { color: timeFilter === filter ? palette.sphereGradient[0] : palette.subtitleColor }, timeFilter === filter && styles.timeTextActive]}>
                {t(`hotspots.time_filters.${filter}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </RNAnimated.View>
    );
  };

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

  const renderFeaturedCard = ({ item }: { item: UIHotSpot }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleSpotPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.imageUrl || item.images?.[0] }}
        style={styles.featuredImage}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={THEME.hotSpots.gradients.overlay}
        style={styles.featuredOverlay}
      />
      <View style={styles.featuredContent}>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {item.title || 'Hot Spot'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location" size={14} color="rgba(255,255,255,0.95)" />
          <Text style={styles.featuredSubtitle} numberOfLines={1}>
            {item.location || t('hotspots.unknown_location')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListHeader = () => (
    <View>
      {/* Featured Section */}
      {featuredSpots.length > 0 && (
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('hotspots.featured')}</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowFeatured(!showFeatured)}
            >
              <Ionicons
                name={showFeatured ? "chevron-up" : "chevron-down"}
                size={24}
                color={THEME.hotSpots.text}
              />
            </TouchableOpacity>
          </View>
          {showFeatured && (
            <Animated.FlatList
              entering={FadeInDown.delay(300)}
              horizontal
              data={featuredSpots}
              renderItem={renderFeaturedCard}
              keyExtractor={item => `featured-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              snapToInterval={width * 0.75 + 16}
              decelerationRate="fast"
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={5}
            />
          )}
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={THEME.hotSpots.textSecondary} />
      <Text style={styles.emptyTitle}>{t('hotspots.no_results_title')}</Text>
      <Text style={styles.emptySubtitle}>{t('hotspots.no_results_subtitle')}</Text>
    </View>
  );

  // ==================== MAIN RENDER ====================

  if (loading && hotSpots.length === 0) {
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
      <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />
      
      {/* Fixed Header */}
      {renderHeader()}

      <RNAnimated.FlatList
        data={visibleHotSpots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HotSpotCard
            item={item}
            onInterested={handleInterested}
            onShowInterestedUsers={handleShowInterestedUsers}
            onSpotPress={handleSpotPress}
            actionLoading={actionLoading}
            t={t}
            THEME={THEME}
            theme={theme}
            palette={palette}
          />
        )}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: Platform.OS === 'ios' ? 280 : 260 }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[THEME.hotSpots.primary]}
            tintColor={THEME.hotSpots.primary}
            progressViewOffset={Platform.OS === 'ios' ? 280 : 260}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
      />

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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerDecorOrbA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -60,
    right: -40,
  },
  headerDecorOrbB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    bottom: -42,
    left: -24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
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
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  notificationText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
  },
  searchContainer: {
    marginBottom: 14,
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
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginRight: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  timeChipActive: {
    borderWidth: 1,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#1C2033',
  },
  toggleButton: {
    padding: 8,
  },
  featuredList: {
    paddingLeft: 16,
  },
  featuredCard: {
    width: width * 0.75,
    height: 188,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
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
    fontSize: 20,
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
    paddingBottom: 90,
  },
  card: {
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  imageContainer: {
    height: 320,
    position: 'relative',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    overflow: 'hidden',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(109, 91, 208, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(109, 91, 208, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  infoSection: {
    marginBottom: 20,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#656B82',
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
    backgroundColor: '#F4F5FB',
    borderColor: '#E4E7F5',
  },
  actionButtonActive: {
    borderColor: 'transparent',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionTextInactive: {
    color: '#5D647C',
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
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
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
    fontSize: 22,
    fontWeight: '900',
    color: '#222845',
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
    color: '#6C738E',
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
    borderRadius: 24,
    marginBottom: 20,
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


