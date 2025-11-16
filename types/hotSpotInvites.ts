// Types for HotSpot invite and meetup system

export interface HotSpotInvite {
  id: string;
  hotSpotId: string;
  hotSpotTitle: string;
  hotSpotLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined' | 'confirmed_going' | 'met' | 'completed' | 'expired';
  createdAt: any;
  updatedAt: any;
  expiresAt?: any;
  chatRoomId?: string;
  meetupDetails?: {
    confirmedAt?: any;
    senderConfirmed: boolean;
    receiverConfirmed: boolean;
    senderCheckInTime?: any;
    receiverCheckInTime?: any;
    meetupTime?: any;
    bothCheckedIn: boolean;
  };
}

export interface MeetupSession {
  id: string;
  hotSpotId: string;
  inviteId: string;
  participants: string[]; // [senderId, receiverId]
  status: 'waiting' | 'both_confirmed' | 'checking_proximity' | 'met' | 'completed' | 'expired';
  checkInData: {
    [userId: string]: {
      location?: {
        latitude: number;
        longitude: number;
      };
      checkInTime?: any;
      isWithinRadius: boolean;
    };
  };
  rewards?: {
    points: number;
    badge?: string;
    items?: string[];
  };
  createdAt: any;
  completedAt?: any;
}

export interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: any;
  accuracy?: number;
}

export interface CheckInReward {
  points: number;
  badge?: string;
  message: string;
  items?: string[];
}
