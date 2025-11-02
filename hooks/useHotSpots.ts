import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
// import simpleHotSpotsService from '@/services/simpleHotSpotsService';
import simpleHotSpotsService from '@/services/simpleHotSpotsService';
import { useAuth } from '@/context/authContext';
import { 
  HotSpot, 
  UserHotSpotInteraction, 
  HotSpotInvitation, 
  EventPass,
  HotSpotFilters,
  HotSpotsResponse,
  UserHotSpotStats
} from '@/types/hotSpots';

export const useHotSpots = () => {
  const { user } = useAuth();
  const [hotSpots, setHotSpots] = useState([] as HotSpot[]);
  const [featuredHotSpots, setFeaturedHotSpots] = useState([] as HotSpot[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHotSpots = useCallback(async (filters: HotSpotFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await simpleHotSpotsService.getHotSpots({
        filters,
        limit: 20
      });
      setHotSpots(response.hotSpots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hot spots');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFeaturedHotSpots = useCallback(async () => {
    try {
      const featured = await simpleHotSpotsService.getFeaturedHotSpots(10);
      setFeaturedHotSpots(featured);
    } catch (err) {
      console.error('Error fetching featured hot spots:', err);
    }
  }, []);

  const fetchNearbyHotSpots = useCallback(async (
    latitude: number, 
    longitude: number, 
    radius: number = 10
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const nearby = await simpleHotSpotsService.getNearbyHotSpots(latitude, longitude, radius);
      setHotSpots(nearby);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nearby hot spots');
    } finally {
      setLoading(false);
    }
  }, []);

  const interactWithHotSpot = useCallback(async (
    hotSpotId: string,
    interactionType: 'interested' | 'joined' | 'checked_in',
    additionalData?: any
  ) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please login to interact with hot spots');
      return false;
    }

    try {
      await simpleHotSpotsService.interactWithHotSpot(
        user.uid,
        hotSpotId,
        interactionType,
        additionalData
      );

      // Update local state
      setHotSpots(prev => prev.map(hotSpot => {
        if (hotSpot.id === hotSpotId) {
          const updatedStats = { ...hotSpot.stats };
          switch (interactionType) {
            case 'interested':
              updatedStats.interested += 1;
              break;
            case 'joined':
              updatedStats.joined += 1;
              break;
            case 'checked_in':
              updatedStats.checkedIn += 1;
              break;
          }
          return { ...hotSpot, stats: updatedStats };
        }
        return hotSpot;
      }));

      return true;
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to interact with hot spot');
      return false;
    }
  }, [user]);

  const removeInteraction = useCallback(async (
    hotSpotId: string,
    interactionType: 'interested' | 'joined' | 'checked_in'
  ) => {
    if (!user?.uid) return false;

    try {
      await simpleHotSpotsService.removeInteraction(user.uid, hotSpotId, interactionType);
      
      // Update local state
      setHotSpots(prev => prev.map(hotSpot => {
        if (hotSpot.id === hotSpotId) {
          const updatedStats = { ...hotSpot.stats };
          switch (interactionType) {
            case 'interested':
              updatedStats.interested = Math.max(0, updatedStats.interested - 1);
              break;
            case 'joined':
              updatedStats.joined = Math.max(0, updatedStats.joined - 1);
              break;
            case 'checked_in':
              updatedStats.checkedIn = Math.max(0, updatedStats.checkedIn - 1);
              break;
          }
          return { ...hotSpot, stats: updatedStats };
        }
        return hotSpot;
      }));

      return true;
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove interaction');
      return false;
    }
  }, [user]);

  return {
    hotSpots,
    featuredHotSpots,
    loading,
    error,
    fetchHotSpots,
    fetchFeaturedHotSpots,
    fetchNearbyHotSpots,
    interactWithHotSpot,
    removeInteraction,
    clearError: () => setError(null)
  };
};

export const useHotSpotInvitations = () => {
  const { user } = useAuth();
  const [sentInvitations, setSentInvitations] = useState([] as HotSpotInvitation[]);
  const [receivedInvitations, setReceivedInvitations] = useState([] as HotSpotInvitation[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      // TODO: Implement invitation methods in simpleHotSpotsService
      // const [sent, received] = await Promise.all([
      //   simpleHotSpotsService.getUserInvitations(user.uid, 'sent'),
      //   simpleHotSpotsService.getUserInvitations(user.uid, 'received')
      // ]);
      
      // setSentInvitations(sent);
      // setReceivedInvitations(received);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendInvitation = useCallback(async (
    toUserId: string,
    hotSpotId: string,
    message: string = ''
  ) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please login to send invitations');
      return false;
    }

    try {
      // TODO: Implement sendInvitation in simpleHotSpotsService
      // const invitationId = await simpleHotSpotsService.sendInvitation(
      //   user.uid,
      //   toUserId,
      //   hotSpotId,
      //   message
      // );

      // Alert.alert('Success', 'Invitation sent successfully!');
      // await fetchInvitations(); // Refresh the list
      // return invitationId;
      return null;
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send invitation');
      return null;
    }
  }, [user, fetchInvitations]);

  const respondToInvitation = useCallback(async (
    invitationId: string,
    response: 'accepted' | 'declined'
  ) => {
    if (!user?.uid) return false;

    try {
      // TODO: Implement respondToInvitation in simpleHotSpotsService
      // await simpleHotSpotsService.respondToInvitation(invitationId, user.uid, response);
      
      // const message = response === 'accepted' 
      //   ? 'Invitation accepted! A chat has been created.' 
      //   : 'Invitation declined.';
      
      // Alert.alert('Success', message);
      // await fetchInvitations(); // Refresh the list
      return true;
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to respond to invitation');
      return false;
    }
  }, [user, fetchInvitations]);

  useEffect(() => {
    if (user?.uid) {
      fetchInvitations();
    }
  }, [user, fetchInvitations]);

  return {
    sentInvitations,
    receivedInvitations,
    loading,
    fetchInvitations,
    sendInvitation,
    respondToInvitation
  };
};

export const useEventPasses = () => {
  const { user } = useAuth();
  const [eventPasses, setEventPasses] = useState([] as EventPass[]);
  const [userStats, setUserStats] = useState<UserHotSpotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventPasses = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      // TODO: Implement getUserEventPasses in simpleHotSpotsService
      // const passes = await simpleHotSpotsService.getUserEventPasses(user.uid);
      // setEventPasses(passes);
    } catch (err) {
      console.error('Error fetching event passes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUserStats = useCallback(async () => {
    if (!user?.uid) return;

    try {
      // TODO: Implement getUserHotSpotStats in simpleHotSpotsService
      // const stats = await simpleHotSpotsService.getUserHotSpotStats(user.uid);
      // setUserStats(stats);
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      fetchEventPasses();
      fetchUserStats();
    }
  }, [user, fetchEventPasses, fetchUserStats]);

  return {
    eventPasses,
    userStats,
    loading,
    fetchEventPasses,
    fetchUserStats
  };
};

export const useHotSpotDetails = (hotSpotId: string) => {
  const { user } = useAuth();
  const [hotSpot, setHotSpot] = useState<HotSpot | null>(null);
  const [userInteractions, setUserInteractions] = useState([] as UserHotSpotInteraction[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHotSpotDetails = useCallback(async () => {
    if (!hotSpotId) return;

    setLoading(true);
    setError(null);

    try {
      const [hotSpotData, interactions] = await Promise.all([
        simpleHotSpotsService.getHotSpotById(hotSpotId),
        user?.uid ? simpleHotSpotsService.getUserInteractionsForHotSpot(user.uid, hotSpotId) : Promise.resolve([])
      ]);

      setHotSpot(hotSpotData);
      setUserInteractions(interactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hot spot details');
    } finally {
      setLoading(false);
    }
  }, [hotSpotId, user]);

  const hasInteraction = useCallback((type: 'interested' | 'joined' | 'checked_in') => {
    return userInteractions.some(interaction => interaction.type === type);
  }, [userInteractions]);

  useEffect(() => {
    fetchHotSpotDetails();
  }, [fetchHotSpotDetails]);

  return {
    hotSpot,
    userInteractions,
    loading,
    error,
    hasInteraction,
    refetch: fetchHotSpotDetails
  };
};

// Real-time hooks
export const useHotSpotsRealtime = () => {
  const { user } = useAuth();
  const [hotSpots, setHotSpots] = useState([] as HotSpot[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Implement real-time subscription in simpleHotSpotsService
    // const unsubscribe = simpleHotSpotsService.subscribeToHotSpots(filters, (updatedHotSpots) => {
    //   setHotSpots(updatedHotSpots);
    //   setLoading(false);
    // });
    // return unsubscribe;
    
    // For now, just set loading to false
    setLoading(false);
  }, []);

  return { hotSpots, loading };
};

export const useInvitationsRealtime = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([] as HotSpotInvitation[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    // TODO: Implement real-time subscription in simpleHotSpotsService
    // const unsubscribe = simpleHotSpotsService.subscribeToUserInvitations(user.uid, (updatedInvitations) => {
    //   setInvitations(updatedInvitations);
    // });
    // return unsubscribe;
  }, [user]);

  return { invitations };
};
