import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/authContext';
import { optimizedHotSpotsService } from '@/services/optimizedServices';
import FirebaseErrorHandler from '@/services/firebaseErrorHandler';

// Enhanced interface for UI HotSpots
export interface UIHotSpot {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'event' | 'place';
  imageUrl?: string;
  images?: string[];
  location: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  participants: number;
  maxParticipants?: number;
  interestedCount?: number;
  startTime?: string;
  endTime?: string;
  price?: number;
  rating: number;
  tags: string[];
  isPopular?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
  creatorId?: string;
  // User interaction data
  isJoined?: boolean;
  isInterested?: boolean;
  isFavorited?: boolean;
  hasCheckedIn?: boolean;
}

interface HotSpotFilters {
  type?: string;
  category?: string;
  featured?: boolean;
  searchQuery?: string;
  sortBy?: 'newest' | 'popular' | 'rating';
}

interface UseHotSpotsDataReturn {
  hotSpots: UIHotSpot[];
  featuredSpots: UIHotSpot[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (filters: HotSpotFilters) => void;
  joinHotSpot: (hotSpotId: string) => Promise<void>;
  markInterested: (hotSpotId: string) => Promise<void>;
  removeInterested: (hotSpotId: string) => Promise<void>;
  checkIn: (hotSpotId: string, location?: { latitude: number; longitude: number }) => Promise<void>;
  toggleFavorite: (hotSpotId: string) => Promise<void>;
}

export const useHotSpotsData = (): UseHotSpotsDataReturn => {
  const { user } = useAuth();
  const [hotSpots, setHotSpots] = useState<UIHotSpot[]>([]);
  const [featuredSpots, setFeaturedSpots] = useState<UIHotSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<HotSpotFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  
  const PAGE_SIZE = 20;

  // Helper function to safely convert any value to string
  const safeString = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    
    // For objects, try to extract meaningful string representation
    if (typeof value === 'object') {
      // If it has a toString method that's not the default Object.prototype.toString
      if (value.toString && value.toString !== Object.prototype.toString) {
        try {
          const stringValue = value.toString();
          if (stringValue !== '[object Object]') {
            return stringValue;
          }
        } catch (error) {
          console.warn('Error converting object to string:', error);
        }
      }
      
      // Try to serialize as JSON (but limit length)
      try {
        const jsonString = JSON.stringify(value);
        return jsonString.length > 100 ? fallback : jsonString;
      } catch (error) {
        console.warn('Error serializing object:', error);
      }
    }
    
    return fallback;
  };

  // Helper function to safely extract location string
  const extractLocationString = (locationData: any): string => {
    if (!locationData) return 'Chưa rõ';
    
    // If it's already a string, return it
    if (typeof locationData === 'string') {
      return locationData;
    }
    
    // If it's an object, try to extract meaningful location info
    if (typeof locationData === 'object') {
      // Try different possible fields
      const address = locationData.address || locationData.fullAddress || locationData.street;
      const city = locationData.city || locationData.cityName;
      const district = locationData.district || locationData.ward;
      
      // Build location string from available components
      const parts = [];
      if (address && typeof address === 'string') parts.push(address);
      if (district && typeof district === 'string') parts.push(district);
      if (city && typeof city === 'string') parts.push(city);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
      
      // If we have coordinates, show them as fallback
      if (locationData.latitude && locationData.longitude) {
        return `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
      }
    }
    
    return 'Chưa rõ';
  };

  // Helper function to safely extract address string
  const extractAddressString = (addressData: any): string | undefined => {
    if (!addressData) return undefined;
    
    if (typeof addressData === 'string') {
      return addressData;
    }
    
    if (typeof addressData === 'object') {
      return addressData.address || addressData.fullAddress || addressData.street || undefined;
    }
    
    return undefined;
  };

  // Convert Firebase HotSpot to UI HotSpot
  const convertToUIHotSpot = async (firebaseSpot: any): Promise<UIHotSpot> => {
    // Safely extract location and address
    const locationString = extractLocationString(firebaseSpot.location || firebaseSpot.address);
    const addressString = extractAddressString(firebaseSpot.address);
    
    // Check if user is interested via eventInterests collection
    let isInterested = false;
    if (user?.uid) {
      try {
        const { collection: firestoreCollection, query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/firebaseConfig');
        const q = firestoreQuery(
          firestoreCollection(db, 'eventInterests'),
          where('eventId', '==', firebaseSpot.id),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        isInterested = !snapshot.empty;
      } catch (error) {
        console.warn('Error checking interested status:', error);
      }
    }
    
    return {
      id: safeString(firebaseSpot.id, 'unknown'),
      title: safeString(firebaseSpot.title, 'Hot Spot'),
      description: safeString(firebaseSpot.description, ''),
      category: safeString(firebaseSpot.category, 'general'),
      type: firebaseSpot.type === 'event' || firebaseSpot.type === 'place' ? firebaseSpot.type : 'place',
      imageUrl: safeString(firebaseSpot.imageUrl || firebaseSpot.images?.[0], undefined),
      images: Array.isArray(firebaseSpot.images) ? firebaseSpot.images.filter((img: any) => typeof img === 'string') : 
               (firebaseSpot.imageUrl && typeof firebaseSpot.imageUrl === 'string' ? [firebaseSpot.imageUrl] : []),
      location: locationString,
      address: addressString,
      coordinates: firebaseSpot.coordinates,
      participants: Math.max(0, parseInt(firebaseSpot.stats?.joined || firebaseSpot.participantCount || 0)),
      maxParticipants: firebaseSpot.maxParticipants ? Math.max(0, parseInt(firebaseSpot.maxParticipants)) : undefined,
      interestedCount: Math.max(0, parseInt(firebaseSpot.stats?.interested || 0)),
      startTime: safeString(firebaseSpot.startTime || firebaseSpot.eventDate, undefined),
      endTime: safeString(firebaseSpot.endTime, undefined),
      price: firebaseSpot.price || firebaseSpot.entryFee ? Math.max(0, parseFloat(firebaseSpot.price || firebaseSpot.entryFee)) : undefined,
      rating: Math.max(0, Math.min(5, parseFloat(firebaseSpot.stats?.rating || firebaseSpot.rating || 0))),
      tags: Array.isArray(firebaseSpot.tags) ? firebaseSpot.tags.filter((tag: any) => typeof tag === 'string') : [],
      isPopular: Boolean(firebaseSpot.isPopular || (firebaseSpot.stats?.joined || 0) > 100),
      isNew: Boolean(firebaseSpot.isNew || (Date.now() - (firebaseSpot.createdAt?.toMillis?.() || 0)) < 7 * 24 * 3600 * 1000),
      isFeatured: Boolean(firebaseSpot.isFeatured),
      isActive: firebaseSpot.isActive !== false,
      createdAt: firebaseSpot.createdAt,
      updatedAt: firebaseSpot.updatedAt,
      creatorId: safeString(firebaseSpot.creatorId, undefined),
      // User interactions
      isJoined: false, // TODO: implement if needed
      isInterested: isInterested,
      isFavorited: false, // TODO: implement if needed
      hasCheckedIn: false, // TODO: implement if needed
    };
  };

  // Helper function to validate HotSpot data before using in UI
  const validateHotSpotData = (hotSpot: UIHotSpot): UIHotSpot => {
    return {
      ...hotSpot,
      // Ensure all text fields are strings
      id: safeString(hotSpot.id, 'unknown'),
      title: safeString(hotSpot.title, 'Hot Spot'),
      description: safeString(hotSpot.description, ''),
      category: safeString(hotSpot.category, 'general'),
      location: safeString(hotSpot.location, 'Chưa rõ'),
      address: hotSpot.address ? safeString(hotSpot.address) : undefined,
      
      // Ensure numeric fields are valid numbers
      participants: Math.max(0, parseInt(hotSpot.participants?.toString() || '0')),
      maxParticipants: hotSpot.maxParticipants ? Math.max(0, parseInt(hotSpot.maxParticipants.toString())) : undefined,
      interestedCount: Math.max(0, parseInt(hotSpot.interestedCount?.toString() || '0')),
      price: hotSpot.price ? Math.max(0, parseFloat(hotSpot.price.toString())) : undefined,
      rating: Math.max(0, Math.min(5, parseFloat(hotSpot.rating?.toString() || '0'))),
      
      // Ensure arrays are valid
      images: Array.isArray(hotSpot.images) ? hotSpot.images.filter((img: any) => typeof img === 'string' && img.length > 0) : [],
      tags: Array.isArray(hotSpot.tags) ? hotSpot.tags.filter((tag: any) => typeof tag === 'string' && tag.length > 0) : [],
      
      // Ensure booleans
      isPopular: Boolean(hotSpot.isPopular),
      isNew: Boolean(hotSpot.isNew),
      isFeatured: Boolean(hotSpot.isFeatured),
      isActive: Boolean(hotSpot.isActive),
      isJoined: Boolean(hotSpot.isJoined),
      isInterested: Boolean(hotSpot.isInterested),
      isFavorited: Boolean(hotSpot.isFavorited),
      hasCheckedIn: Boolean(hotSpot.hasCheckedIn),
    };
  };

  // Load hot spots with user interactions
  const loadHotSpots = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
      } else {
        setLoading(true);
      }
      setError(null);

      // Load hot spots from Firebase
      const firebaseSpots = await FirebaseErrorHandler.retryOperation(
        () => optimizedHotSpotsService.getHotSpots(
          filters,
          isRefresh ? PAGE_SIZE : PAGE_SIZE * currentPage,
          !isRefresh // Use cache for pagination
        ),
        { maxRetries: 3, initialDelay: 1000 }
      );

      // Load user interactions if logged in
      let userInteractions = new Map();
      if (user?.uid && firebaseSpots.length > 0) {
        try {
          userInteractions = await optimizedHotSpotsService.getBatchUserInteractions(
            user.uid,
            firebaseSpots.map(spot => spot.id)
          );
        } catch (error) {
          console.warn('Failed to load user interactions:', error);
        }
      }

      // Convert to UI format
      const uiSpots = await Promise.all(firebaseSpots.map(spot => convertToUIHotSpot(spot)));

      if (isRefresh) {
        setHotSpots(uiSpots);
      } else {
        setHotSpots(prev => currentPage === 1 ? uiSpots : [...prev, ...uiSpots]);
      }

      // Update featured spots
      const featured = uiSpots.filter(spot => spot.isFeatured).slice(0, 5);
      setFeaturedSpots(featured);

      // Update pagination
      setHasMore(firebaseSpots.length === PAGE_SIZE);

    } catch (error: any) {
      console.error('Error loading hot spots:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(errorMessage);
      
      // Set fallback data if it's first load
      if (hotSpots.length === 0) {
        setHotSpots([]);
        setFeaturedSpots([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, currentPage, user?.uid, hotSpots.length]);

  // Refresh data
  const refresh = useCallback(async () => {
    await loadHotSpots(true);
  }, [loadHotSpots]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    
    setCurrentPage(prev => prev + 1);
  }, [hasMore, loading, refreshing]);

  // Update filters
  const updateFilters = useCallback((newFilters: HotSpotFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // User interactions
  const joinHotSpot = useCallback(async (hotSpotId: string) => {
    if (!user?.uid) return;

    try {
      await optimizedHotSpotsService.joinHotSpot(user.uid, hotSpotId);
      
      // Update local state optimistically
      setHotSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isJoined: true, participants: spot.participants + 1 }
          : spot
      ));
      
      setFeaturedSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isJoined: true, participants: spot.participants + 1 }
          : spot
      ));
    } catch (error: any) {
      console.error('Error joining hot spot:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(`Failed to join: ${errorMessage}`);
    }
  }, [user?.uid]);

  const markInterested = useCallback(async (hotSpotId: string) => {
    if (!user?.uid) return;

    try {
      await optimizedHotSpotsService.markInterested(user.uid, hotSpotId);
      
      // Update local state optimistically
      setHotSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isInterested: !spot.isInterested }
          : spot
      ));
      
      setFeaturedSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isInterested: !spot.isInterested }
          : spot
      ));
    } catch (error: any) {
      console.error('Error marking interested:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(`Failed to mark interested: ${errorMessage}`);
    }
  }, [user?.uid]);

  const removeInterested = useCallback(async (hotSpotId: string) => {
    if (!user?.uid) return;

    try {
      await optimizedHotSpotsService.removeInterested(user.uid, hotSpotId);
      
      // Update local state optimistically
      setHotSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isInterested: false }
          : spot
      ));
      
      setFeaturedSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isInterested: false }
          : spot
      ));
    } catch (error: any) {
      console.error('Error removing interest:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(`Failed to remove interest: ${errorMessage}`);
    }
  }, [user?.uid]);

  const checkIn = useCallback(async (hotSpotId: string, location?: { latitude: number; longitude: number }) => {
    if (!user?.uid) return;

    try {
      await optimizedHotSpotsService.checkIn(user.uid, hotSpotId, location);
      
      // Update local state optimistically
      setHotSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, hasCheckedIn: true }
          : spot
      ));
      
      setFeaturedSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, hasCheckedIn: true }
          : spot
      ));
    } catch (error: any) {
      console.error('Error checking in:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(`Failed to check in: ${errorMessage}`);
    }
  }, [user?.uid]);

  const toggleFavorite = useCallback(async (hotSpotId: string) => {
    if (!user?.uid) return;

    try {
      const currentSpot = hotSpots.find(spot => spot.id === hotSpotId);
      if (!currentSpot) return;

      if (currentSpot.isFavorited) {
        await optimizedHotSpotsService.removeFavorite(user.uid, hotSpotId);
      } else {
        await optimizedHotSpotsService.addFavorite(user.uid, hotSpotId);
      }
      
      // Update local state optimistically
      setHotSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isFavorited: !spot.isFavorited }
          : spot
      ));
      
      setFeaturedSpots(prev => prev.map(spot => 
        spot.id === hotSpotId 
          ? { ...spot, isFavorited: !spot.isFavorited }
          : spot
      ));
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      const errorMessage = FirebaseErrorHandler.getUserFriendlyMessage(error);
      setError(`Failed to toggle favorite: ${errorMessage}`);
    }
  }, [user?.uid, hotSpots]);

  // Load data when filters change
  useEffect(() => {
    loadHotSpots(true);
  }, [filters]);

  // Load more when currentPage changes
  useEffect(() => {
    if (currentPage > 1) {
      loadHotSpots(false);
    }
  }, [currentPage]);

  // Initial load
  useEffect(() => {
    loadHotSpots(true);
  }, [user?.uid]);

  return {
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
    toggleFavorite,
  };
};

export default useHotSpotsData;
