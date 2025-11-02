// Types và interfaces cho Hot Spots system
export interface HotSpot {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'place';
  category: string; // 'music', 'food', 'sports', 'art', 'nightlife', etc.
  
  // Location info
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    city: string;
    district?: string;
  };
  
  // Event specific (if type === 'event')
  eventInfo?: {
    startDate: string; // ISO string
    endDate: string;
    organizer: string;
    price?: number;
    maxParticipants?: number;
    currentParticipants: number;
  };
  
  // Media
  images: string[];
  thumbnail: string;
  
  // Stats
  stats: {
    interested: number;
    joined: number;
    checkedIn: number;
    rating: number;
    reviewCount: number;
  };
  
  // Metadata
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // admin user ID
}

export interface UserHotSpotInteraction {
  id: string;
  userId: string;
  hotSpotId: string;
  type: 'interested' | 'joined' | 'checked_in';
  timestamp: string;
  
  // Check-in specific
  checkInLocation?: {
    latitude: number;
    longitude: number;
  };
  
  // Join invitation specific
  invitationData?: {
    message?: string;
    status: 'pending' | 'accepted' | 'declined';
  };
}

export interface HotSpotInvitation {
  id: string;
  hotSpotId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  
  // Metadata
  hotSpotTitle: string;
  fromUserName: string;
  fromUserAvatar?: string;
}

export interface EventPass {
  id: string;
  userId: string;
  hotSpotId: string;
  hotSpotTitle: string;
  hotSpotType: 'event' | 'place';
  hotSpotCategory: string;
  hotSpotThumbnail: string;
  
  // Badge info
  badgeType: 'participant' | 'checked_in' | 'organizer' | 'vip';
  earnedAt: string;
  
  // Verification
  isVerified: boolean;
  verificationData: {
    checkInLocation?: {
      latitude: number;
      longitude: number;
    };
    photosSubmitted?: string[];
    verifiedBy?: string; // admin ID
  };
}

export interface HotSpotChat {
  id: string;
  hotSpotId: string;
  participants: string[];
  createdAt: string;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  
  // Chat metadata
  chatType: 'invitation_accepted' | 'group_meetup';
  relatedInvitationId?: string;
}

// Filter and search types
export interface HotSpotFilters {
  type?: 'event' | 'place' | 'all';
  category?: string;
  searchQuery?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  dateRange?: {
    start: string;
    end: string;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  sortBy?: 'distance' | 'popular' | 'newest' | 'rating' | 'date';
  featured?: boolean;
  isActive?: boolean;
}

export interface HotSpotSearchParams {
  query?: string;
  filters: HotSpotFilters;
  limit?: number;
  offset?: number;
}

// API response types
export interface HotSpotsResponse {
  hotSpots: HotSpot[];
  total: number;
  hasMore: boolean;
}

export interface UserHotSpotStats {
  totalInterested: number;
  totalJoined: number;
  totalCheckedIn: number;
  eventPasses: EventPass[];
  favoriteCategories: string[];
  recentActivity: UserHotSpotInteraction[];
}
