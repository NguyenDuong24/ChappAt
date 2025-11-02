export interface EventInvite {
  id: string;
  eventId: string;
  inviterId: string; // User A
  inviteeId: string; // User B
  status: 'pending' | 'accepted' | 'declined' | 'confirmed' | 'matched';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // 24h before event
  chatRoomId?: string; // Created when accepted
  mutualConfirmed?: boolean; // Both confirmed to go together
  inviterConfirmed?: boolean; // Inviter confirmed to go
  inviteeConfirmed?: boolean; // Invitee confirmed to go
}

export interface EventInterest {
  id: string;
  eventId: string;
  userId: string;
  createdAt: Date;
  isHidden?: boolean; // Hidden when user is matched
}

export interface EventMatch {
  id: string;
  eventId: string;
  user1Id: string;
  user2Id: string;
  chatRoomId: string;
  status: 'matched' | 'cancelled';
  createdAt: Date;
  confirmedAt: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  age?: number;
  bio?: string;
  interests?: string[];
  location?: string;
}
