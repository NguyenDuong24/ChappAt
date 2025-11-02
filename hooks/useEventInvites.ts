import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { EventInvite, EventMatch } from '@/types/eventInvites';
import { eventInviteService } from '@/services/eventInviteService';

interface UseEventInvitesProps {
  userId?: string;
}

export const useEventInvites = ({ userId }: UseEventInvitesProps) => {
  const [pendingInvites, setPendingInvites] = useState<EventInvite[]>([]);
  const [userMatches, setUserMatches] = useState<{[eventId: string]: EventMatch}>({});
  const [loading, setLoading] = useState(false);

  // Real-time listener for pending invites
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'eventInvites'),
      where('inviteeId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventInvite[];
      
      setPendingInvites(invites);
    });

    return () => unsubscribe();
  }, [userId]);

  // Load user matches
  const loadUserMatches = useCallback(async (eventIds: string[]) => {
    if (!userId || eventIds.length === 0) return;

    setLoading(true);
    try {
      const matches: {[eventId: string]: EventMatch} = {};
      
      await Promise.all(
        eventIds.map(async (eventId) => {
          const match = await eventInviteService.getUserEventMatch(eventId, userId);
          if (match) {
            matches[eventId] = match;
          }
        })
      );
      
      setUserMatches(matches);
    } catch (error) {
      console.error('Error loading user matches:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Send invite
  const sendInvite = useCallback(async (eventId: string, targetUserId: string) => {
    if (!userId) throw new Error('User not authenticated');
    
    return await eventInviteService.sendInvite(eventId, userId, targetUserId);
  }, [userId]);

  // Respond to invite
  const respondToInvite = useCallback(async (inviteId: string, response: 'accepted' | 'declined') => {
    return await eventInviteService.respondToInvite(inviteId, response);
  }, []);

  // Confirm going
  const confirmGoing = useCallback(async (inviteId: string) => {
    if (!userId) throw new Error('User not authenticated');
    
    return await eventInviteService.confirmGoing(inviteId, userId);
  }, [userId]);

  // Mark interested
  const markInterested = useCallback(async (eventId: string) => {
    if (!userId) throw new Error('User not authenticated');
    
    return await eventInviteService.markInterested(eventId, userId);
  }, [userId]);

  // Remove interest
  const removeInterest = useCallback(async (eventId: string) => {
    if (!userId) throw new Error('User not authenticated');
    
    return await eventInviteService.removeInterest(eventId, userId);
  }, [userId]);

  return {
    pendingInvites,
    userMatches,
    loading,
    loadUserMatches,
    sendInvite,
    respondToInvite,
    confirmGoing,
    markInterested,
    removeInterest,
  };
};
