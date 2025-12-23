import { useState, useEffect } from 'react';
import { UserVibe } from '@/types/vibe';

interface UseVibeExpirationResult {
  isExpired: boolean;
  timeRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  formattedTimeRemaining: string;
  formattedTimeAgo: string;
}

/**
 * Hook to track vibe expiration status and remaining time
 * @param vibe - The UserVibe object to track
 * @param updateInterval - How often to update (in milliseconds), default 60000 (1 minute)
 */
export const useVibeExpiration = (
  vibe: UserVibe | null | undefined,
  updateInterval: number = 60000
): UseVibeExpirationResult => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  const calculateExpirationData = (): UseVibeExpirationResult => {
    if (!vibe || !vibe.createdAt) {
      return {
        isExpired: true,
        timeRemaining: 0,
        hoursRemaining: 0,
        minutesRemaining: 0,
        formattedTimeRemaining: '0h 0m',
        formattedTimeAgo: '',
      };
    }

    const createdAt = vibe.createdAt.toDate ? vibe.createdAt.toDate() : new Date(vibe.createdAt);
    const expirationTime = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const timeDifference = expirationTime.getTime() - currentTime.getTime();

    const isExpired = timeDifference <= 0;
    const timeRemaining = Math.max(0, timeDifference);
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    const formattedTimeRemaining = isExpired
      ? 'Expired'
      : `${hoursRemaining}h ${minutesRemaining}m`;

    // Calculate Time Ago
    const diffAgo = currentTime.getTime() - createdAt.getTime();
    const agoMinutes = Math.floor(diffAgo / (1000 * 60));
    const agoHours = Math.floor(diffAgo / (1000 * 60 * 60));

    let formattedTimeAgo = 'Vừa xong';
    if (agoHours > 0) {
      formattedTimeAgo = `${agoHours} giờ trước`;
    } else if (agoMinutes > 0) {
      formattedTimeAgo = `${agoMinutes} phút trước`;
    }

    return {
      isExpired,
      timeRemaining,
      hoursRemaining,
      minutesRemaining,
      formattedTimeRemaining,
      formattedTimeAgo,
    };
  };

  return calculateExpirationData();
};
