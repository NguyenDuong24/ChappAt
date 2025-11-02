import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
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
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import useHotSpotsData, { UIHotSpot } from '@/hooks/useHotSpotsData';
import InterestedUsersModal from '@/components/hotspots/InterestedUsersModal';
import EventInvitesModal from '@/components/hotspots/EventInvitesModal';
import { eventInviteService } from '@/services/eventInviteService';
import { EventMatch } from '@/types/eventInvites';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

// Enhanced Shimmer with pulse effect
const Shimmer: React.FC<{ style?: any }> = ({ style }) => {
  const translate = useRef(new Animated.Value(-1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 1500,
        easing: Easing.ease,
        useNativeDriver: true,
      })
    );
    
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );

    shimmer.start();
    pulse.start();
    return () => {
      shimmer.stop();
      pulse.stop();
    };
  }, []);

  const translateX = translate.interpolate({ 
    inputRange: [-1, 1], 
    outputRange: [-width, width] 
  });

  return (
    <Animated.View style={[{ overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }, style, { opacity }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: width * 0.7, height: '100%' }}
        />
      </Animated.View>
    </Animated.View>
  );
};

// Enhanced skeleton with more details
const SkeletonCard: React.FC = () => {
  return (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 20,
      marginBottom: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
    }}>
      <Shimmer style={{ height: 240 }} />
      <View style={{ padding: 20 }}>
        <Shimmer style={{ height: 24, borderRadius: 12, marginBottom: 12, width: '85%' }} />
        <Shimmer style={{ height: 16, borderRadius: 8, marginBottom: 8, width: '65%' }} />
        <Shimmer style={{ height: 16, borderRadius: 8, marginBottom: 20, width: '50%' }} />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Shimmer style={{ height: 44, flex: 1, borderRadius: 12 }} />
          <Shimmer style={{ height: 44, flex: 1, borderRadius: 12 }} />
          <Shimmer style={{ height: 44, flex: 1, borderRadius: 12 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: -8 }}>
            {[1,2,3].map(i => (
              <Shimmer key={i} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ))}
          </View>
          <Shimmer style={{ height: 20, width: 80, borderRadius: 10 }} />
        </View>
      </View>
    </View>
  );
};

const HotSpotsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

  const safeText = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object') {
      console.warn('Attempting to render object as text:', value);
      return fallback;
    }
    return fallback;
  };
  
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFeatured, setShowFeatured] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
  const [userMatches, setUserMatches] = useState<{[eventId: string]: EventMatch}>({});
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const categories = [
    { key: 'all', label: 'Tất cả', icon: 'apps' as const, gradient: ['#8B5CF6', '#EC4899'] as const },
    { key: 'event', label: 'Sự kiện', icon: 'event' as const, gradient: ['#F59E0B', '#EF4444'] as const },
    { key: 'place', label: 'Địa điểm', icon: 'place' as const, gradient: ['#10B981', '#059669'] as const },
    { key: 'food', label: 'Ẩm thực', icon: 'restaurant' as const, gradient: ['#F97316', '#DC2626'] as const },
    { key: 'entertainment', label: 'Giải trí', icon: 'celebration' as const, gradient: ['#06B6D4', '#3B82F6'] as const },
  ];

  const THEME = {
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
      info: Colors.info,
      hotSpotsPrimary: currentThemeColors.hotSpotsPrimary || Colors.warning,
      hotSpotsSecondary: currentThemeColors.hotSpotsSecondary || Colors.secondary,
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
  };

  useEffect(() => {
    const filters = {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      searchQuery: searchQuery.trim() || undefined,
      sortBy: 'popular' as const
    };
    updateFilters(filters);
  }, [selectedCategory, searchQuery, updateFilters]);

  useEffect(() => {
    if (user?.uid) {
      loadUserMatches();
      loadPendingInvites();
    }
  }, [user?.uid]);

  const loadUserMatches = async () => {
    if (!user?.uid) return;
    try {
      const matches: {[eventId: string]: EventMatch} = {};
      for (const event of hotSpots) {
        const match = await eventInviteService.getUserEventMatch(event.id, user.uid);
        if (match) matches[event.id] = match;
      }
      setUserMatches(matches);
    } catch (error) {
      console.error('Error loading user matches:', error);
    }
  };

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
      pathname: '/HotSpotDetailScreen',
      params: { hotSpotId: spot.id }
    });
  };

  const handleCheckIn = async (spotId: string) => {
    if (actionLoading[spotId]) return;
    setActionLoading(prev => ({ ...prev, [spotId]: true }));
    try {
      await checkIn(spotId);
      await refresh(); // Refresh data to update UI
      Alert.alert('Thành công', 'Đã check-in thành công!');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể check-in.');
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
        await eventInviteService.removeInterest(spotId, user?.uid || '');
        Alert.alert('Thành công', 'Đã bỏ quan tâm');
      } else {
        await eventInviteService.markInterested(spotId, user?.uid || '');
        Alert.alert('Thành công', 'Đã đánh dấu quan tâm! 💜');
      }
      await refresh(); // Refresh data to update UI
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật.');
    } finally {
      setActionLoading(prev => ({ ...prev, [spotId]: false }));
    }
  };

  const handleGoTogether = async (spotId: string) => {
    if (actionLoading[spotId]) return;
    setActionLoading(prev => ({ ...prev, [spotId]: true }));
    try {
      await joinHotSpot(spotId);
      await refresh(); // Refresh data to update UI
      Alert.alert('Thành công', 'Đã tham gia!');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tham gia.');
    } finally {
      setActionLoading(prev => ({ ...prev, [spotId]: false }));
    }
  };

  const handleFavorite = async (spotId: string) => {
    if (actionLoading[spotId]) return;
    setActionLoading(prev => ({ ...prev, [spotId]: true }));
    try {
      await toggleFavorite(spotId);
      await refresh(); // Refresh data to update UI
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật yêu thích.');
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
    // Navigate to HotSpot-specific chat screen
    router.push({
      pathname: '/HotSpotChatScreen',
      params: {
        chatRoomId,
        hotSpotId: eventId || selectedEventId,
        hotSpotTitle: eventTitle || selectedEventTitle,
      },
    });
  };

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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [-50, 0],
    outputRange: [1.1, 1],
    extrapolate: 'clamp',
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: THEME.colors.background,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 20) + 10,
      paddingHorizontal: THEME.spacing.md,
      paddingBottom: THEME.spacing.xl,
      borderBottomLeftRadius: THEME.borderRadius.xl,
      borderBottomRightRadius: THEME.borderRadius.xl,
      overflow: 'hidden',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: THEME.spacing.lg,
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
      shadowOpacity: 0.15,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '900',
      color: 'white',
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
      marginTop: 4,
      fontWeight: '600',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    searchContainer: {
      marginBottom: THEME.spacing.md,
      borderRadius: THEME.borderRadius.lg,
      overflow: 'hidden',
    },
    searchGradient: {
      borderRadius: THEME.borderRadius.lg,
      padding: 2,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: THEME.borderRadius.lg - 2,
      paddingHorizontal: THEME.spacing.lg,
      height: 52,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    searchInput: {
      flex: 1,
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
      paddingHorizontal: THEME.spacing.md,
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
      paddingHorizontal: THEME.spacing.sm,
      paddingBottom: THEME.spacing.md,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.sm,
      marginRight: THEME.spacing.md,
      borderRadius: THEME.borderRadius.xl,
      minHeight: 36,
      gap: THEME.spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
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
      paddingHorizontal: THEME.spacing.md,
      paddingBottom: THEME.spacing.md,
      gap: THEME.spacing.md,
    },
    timeChip: {
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.sm,
      borderRadius: THEME.borderRadius.lg,
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
    statsBar: {
      flexDirection: 'row',
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.md,
      gap: THEME.spacing.md,
    },
    statCard: {
      flex: 1,
      padding: THEME.spacing.md,
      borderRadius: THEME.borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '900',
      color: 'white',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
    },
    listContent: {
      paddingHorizontal: THEME.spacing.md,
      paddingBottom: THEME.spacing.xl * 2,
      paddingTop: THEME.spacing.md,
    },
    card: {
      backgroundColor: THEME.colors.cardBg,
      borderRadius: THEME.borderRadius.lg,
      marginBottom: THEME.spacing.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: theme === 'dark' ? 0.3 : 0.15,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 1,
      borderColor: THEME.colors.border,
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
      top: THEME.spacing.lg,
      left: THEME.spacing.lg,
      right: THEME.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    badgeGroup: {
      flexDirection: 'row',
      gap: THEME.spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.sm,
      borderRadius: THEME.borderRadius.xl,
      gap: THEME.spacing.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 6,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: 'white',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    favoriteButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 6,
    },
    cardContent: {
      padding: THEME.spacing.lg,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: THEME.colors.text,
      marginBottom: THEME.spacing.md,
      lineHeight: 28,
    },
    infoSection: {
      marginBottom: THEME.spacing.lg,
      gap: THEME.spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: THEME.spacing.sm,
    },
    infoText: {
      flex: 1,
      fontSize: 15,
      color: THEME.colors.textSecondary,
      fontWeight: '500',
    },
    matchedBanner: {
      alignItems: 'center',
      marginBottom: THEME.spacing.lg,
    },
    matchedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: THEME.spacing.xl,
      paddingVertical: THEME.spacing.md,
      borderRadius: THEME.borderRadius.xl,
      gap: THEME.spacing.sm,
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    matchedText: {
      fontSize: 15,
      fontWeight: '700',
      color: 'white',
    },
    actionsGrid: {
      flexDirection: 'row',
      gap: THEME.spacing.sm,
      marginBottom: THEME.spacing.lg,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: THEME.spacing.sm,
      paddingHorizontal: THEME.spacing.xs,
      borderRadius: THEME.borderRadius.md,
      gap: THEME.spacing.xs,
      borderWidth: 1.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    actionButtonInactive: {
      backgroundColor: THEME.colors.surfaceLight,
      borderColor: THEME.colors.border,
    },
    actionButtonActive: {
      borderColor: 'transparent',
    },
    actionText: {
      fontSize: 12,
      fontWeight: '700',
    },
    actionTextInactive: {
      color: THEME.colors.textSecondary,
    },
    actionTextActive: {
      color: 'white',
    },
    participantsSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: THEME.spacing.md,
      borderTopWidth: 1,
      borderTopColor: THEME.colors.border,
    },
    avatarStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: THEME.colors.surface,
      borderWidth: 3,
      borderColor: THEME.colors.cardBg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '700',
      color: THEME.colors.primary,
    },
    viewMoreIndicator: {
      marginLeft: THEME.spacing.sm,
      backgroundColor: THEME.colors.surfaceLight,
      paddingHorizontal: THEME.spacing.sm,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: THEME.colors.border,
    },
    statsGroup: {
      alignItems: 'flex-end',
    },
    participantCount: {
      fontSize: 24,
      fontWeight: '900',
      color: THEME.colors.text,
      marginBottom: 4,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: THEME.spacing.md,
    },
    rating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      fontSize: 14,
      fontWeight: '700',
      color: THEME.colors.textSecondary,
    },
    price: {
      fontSize: 14,
      fontWeight: '800',
      color: THEME.colors.primary,
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
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 6,
    },
    notificationText: {
      fontSize: 11,
      fontWeight: '900',
      color: 'white',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: THEME.spacing.xl * 3,
      paddingHorizontal: THEME.spacing.xl,
    },
    emptyIcon: {
      marginBottom: THEME.spacing.lg,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: THEME.colors.text,
      marginBottom: THEME.spacing.sm,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 16,
      color: THEME.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    featuredSection: {
      marginBottom: THEME.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: THEME.spacing.md,
      marginBottom: THEME.spacing.md,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: THEME.colors.text,
    },
    toggleButton: {
      padding: THEME.spacing.sm,
    },
    featuredList: {
      paddingLeft: THEME.spacing.md,
    },
    featuredCard: {
      width: width * 0.75,
      height: 180,
      marginRight: THEME.spacing.md,
      borderRadius: THEME.borderRadius.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
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
      padding: THEME.spacing.lg,
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
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    viewModeToggle: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: THEME.borderRadius.md,
      padding: 2,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
    },
    viewModeButton: {
      paddingHorizontal: THEME.spacing.md,
      paddingVertical: THEME.spacing.sm,
      borderRadius: THEME.borderRadius.md - 2,
    },
    viewModeActive: {
      backgroundColor: 'white',
    },
  });

  const visibleHotSpots = useMemo(() => {
    if (!Array.isArray(hotSpots)) return [];
    if (timeFilter === 'all') return hotSpots;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return hotSpots.filter((s: any) => {
      if (!s?.startTime) return false;
      const t = new Date(s.startTime);
      return timeFilter === 'today' ? (t >= startOfToday && t <= endOfToday) : (t > endOfToday);
    });
  }, [hotSpots, timeFilter]);

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={THEME.colors.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🔥 Hot Spots</Text>
          <Text style={styles.headerSubtitle}>Khám phá điều thú vị</Text>
        </View>
        
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.iconButton, pendingInvitesCount > 0 && { position: 'relative' }]}
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
                placeholder="Tìm kiếm địa điểm, sự kiện..."
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

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map(cat => {
          const isActive = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
            >
              {isActive ? (
                <LinearGradient
                  colors={cat.gradient}
                  style={styles.categoryChip}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name={cat.icon} size={18} color="white" />
                  <Text style={styles.categoryText}>{cat.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.categoryChip, styles.categoryChipInactive]}>
                  <MaterialIcons name={cat.icon} size={18} color="rgba(255,255,255,0.85)" />
                  <Text style={[styles.categoryText, styles.categoryTextInactive]}>{cat.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.timeFilters}>
        {[
          { key: 'all', label: '✨ Tất cả', icon: 'apps' },
          { key: 'today', label: '📅 Hôm nay', icon: 'today' },
          { key: 'upcoming', label: '🔮 Sắp tới', icon: 'event' }
        ].map(filter => {
          const isActive = timeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.timeChip, isActive && styles.timeChipActive]}
              onPress={() => setTimeFilter(filter.key as any)}
            >
              <Text style={[styles.timeText, isActive && styles.timeTextActive]}>
                {filter.label}
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
            {safeText(item.location, 'Chưa rõ')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHotSpotCard = ({ item }: { item: UIHotSpot }) => {
    const hasMatch = !!userMatches[item.id];
    
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity 
          style={styles.card}
          onPress={() => handleSpotPress(item)}
          activeOpacity={0.95}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
            <LinearGradient
              colors={THEME.colors.gradients.overlay}
              style={styles.imageOverlay}
            />
            
            <View style={styles.badgeRow}>
              <View style={styles.badgeGroup}>
                {item.isPopular && (
                  <LinearGradient 
                    colors={THEME.colors.gradients.warning}
                    style={styles.badge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="flame" size={14} color="white" />
                    <Text style={styles.badgeText}>HOT</Text>
                  </LinearGradient>
                )}
                {item.isNew && (
                  <LinearGradient 
                    colors={THEME.colors.gradients.success}
                    style={styles.badge}
                  >
                    <Ionicons name="sparkles" size={14} color="white" />
                    <Text style={styles.badgeText}>MỚI</Text>
                  </LinearGradient>
                )}
              </View>

              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => handleFavorite(item.id)}
              >
                <Ionicons 
                  name={item.isFavorited ? "heart" : "heart-outline"} 
                  size={24} 
                  color={item.isFavorited ? "#EF4444" : "white"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {safeText(item.title, 'Hot Spot')}
            </Text>
            
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color={THEME.colors.hotSpotsPrimary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {safeText(item.location, 'Chưa rõ')}
                </Text>
              </View>
              
              {item.startTime && (
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={18} color={THEME.colors.secondary} />
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

            {hasMatch ? (
              <View style={styles.matchedBanner}>
                <LinearGradient
                  colors={THEME.colors.gradients.success}
                  style={styles.matchedBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="heart" size={18} color="white" />
                  <Text style={styles.matchedText}>💜 Đã có cặp ghép</Text>
                  <Ionicons name="checkmark-circle" size={18} color="white" />
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.actionsGrid}>
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    item.hasCheckedIn 
                      ? { ...styles.actionButtonActive }
                      : styles.actionButtonInactive,
                    { opacity: 0.6 }
                  ]}
                  disabled
                >
                  <LinearGradient
                    colors={item.hasCheckedIn ? THEME.colors.gradients.warning : ['transparent', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons 
                    name={item.hasCheckedIn ? "location" : "location-outline"} 
                    size={18} 
                    color={item.hasCheckedIn ? "white" : THEME.colors.hotSpotsPrimary} 
                  />
                  <Text style={[
                    styles.actionText,
                    item.hasCheckedIn ? styles.actionTextActive : styles.actionTextInactive
                  ]}>
                    {item.hasCheckedIn ? "Đã in" : "Check"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    item.isInterested 
                      ? { ...styles.actionButtonActive }
                      : styles.actionButtonInactive
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
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons 
                        name={item.isInterested ? "heart" : "heart-outline"} 
                        size={18} 
                        color={item.isInterested ? "white" : THEME.colors.secondary} 
                      />
                      <Text style={[
                        styles.actionText,
                        item.isInterested ? styles.actionTextActive : styles.actionTextInactive
                      ]}>
                        {item.isInterested ? "Thích" : "Quan tâm"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    item.isJoined 
                      ? { ...styles.actionButtonActive }
                      : styles.actionButtonInactive,
                    { opacity: 0.6 }
                  ]}
                  disabled
                >
                  <LinearGradient
                    colors={item.isJoined ? THEME.colors.gradients.success : ['transparent', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons 
                    name={item.isJoined ? "people" : "people-outline"} 
                    size={18} 
                    color={item.isJoined ? "white" : THEME.colors.accent} 
                  />
                  <Text style={[
                    styles.actionText,
                    item.isJoined ? styles.actionTextActive : styles.actionTextInactive
                  ]}>
                    {item.isJoined ? "Tham gia" : "Đi cùng"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
                    <Text style={[styles.avatarText, { fontSize: 11 }]}>+{(item.interestedCount ?? 0) - 3}</Text>
                  </View>
                )}
                <View style={styles.viewMoreIndicator}>
                  <Ionicons name="chevron-forward" size={14} color={THEME.colors.primary} />
                </View>
              </TouchableOpacity>

              <View style={styles.statsGroup}>
                <Text style={styles.participantCount}>{item.interestedCount ?? 0}</Text>
                <Text style={[styles.ratingText, { fontSize: 11, marginBottom: 4 }]}>Quan tâm</Text>
                <View style={styles.statsRow}>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={16} color="#FBBF24" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                  {item.price && (
                    <Text style={styles.price}>
                      {item.price.toLocaleString('vi-VN')}đ
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.05)', 'rgba(236, 72, 153, 0.05)', 'rgba(245, 158, 11, 0.05)']}
          style={StyleSheet.absoluteFill}
        />
        {renderHeader()}
        <FlatList
          data={[1,2,3,4]}
          keyExtractor={(i) => `skeleton-${i}`}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.listContent}
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
        
        {featuredSpots.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🌟 Nổi bật</Text>
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

        <View style={styles.listContent}>
          {visibleHotSpots.length > 0 ? (
            visibleHotSpots.map(item => (
              <View key={item.id}>
                {renderHotSpotCard({ item })}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={64} color={THEME.colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
              <Text style={styles.emptySubtitle}>
                Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

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
          setShowInvitesModal(false);
          loadPendingInvites();
        }}
        onInviteAccepted={handleInviteAccepted}
      />
    </View>
  );
};

export default HotSpotsScreen;