/**
 * Notification Provider
 * Refactored and cleaned up context provider for notifications
 * Manages notification state and provides unified API
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../../context/authContext';
import CoreNotificationService from './NotificationService';
import SocialNotificationService from './SocialNotificationService';
import NotificationNavigationService from './NotificationNavigationService';
import NotificationModal from '../../components/notifications/NotificationModal';
import * as Notifications from 'expo-notifications';

// Context interface
interface NotificationContextType {
  // Core state
  pushToken: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Local notifications
  scheduleNotification: (notification: any) => Promise<string | null>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  clearBadge: () => Promise<void>;
  
  // Social notifications
  sendLikeNotification: (targetUserId: string, postId: string) => Promise<void>;
  sendCommentNotification: (targetUserId: string, postId: string, comment: string) => Promise<void>;
  sendFollowNotification: (targetUserId: string) => Promise<void>;
  sendMentionNotification: (targetUserId: string, postId: string, content: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook for consuming context
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

// Provider props
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Early init navigation service so taps work even before auth resolves (cold start/background)
  React.useEffect(() => {
    try {
      NotificationNavigationService.initialize();
    } catch (e) {
      console.warn('NotificationNavigationService early init failed', e);
    }
    return () => {
      try { NotificationNavigationService.cleanup(); } catch {}
    };
  }, []);

  // State
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNotification, setCurrentNotification] = useState<Notifications.Notification | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Initialize services when user is authenticated
  useEffect(() => {
    const initializeServices = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Initializing notification services...');

        // Initialize core service
        await CoreNotificationService.initialize();
        setPushToken(CoreNotificationService.getCurrentPushToken());

        // Initialize social service
        await SocialNotificationService.initialize();

        // Setup foreground notification listener
        setupForegroundListener();

        console.log('✅ All notification services initialized');
      } catch (err) {
        console.error('❌ Failed to initialize notification services:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeServices();

    // Cleanup on unmount or user change
    return () => {
      CoreNotificationService.cleanup();
      SocialNotificationService.cleanup();
    };
  }, [user]);

  // Setup foreground notification listener
  const setupForegroundListener = () => {
    CoreNotificationService.addNotificationReceivedListener((notification) => {
      console.log('📱 Foreground notification received:', notification);
      setCurrentNotification(notification);
      setShowModal(true);
    });
  };

  // Handle modal notification tap
  const handleModalNotificationTap = async () => {
    if (currentNotification?.request.content.data) {
      await NotificationNavigationService.handleNotificationTap(
        currentNotification.request.content.data as any
      );
    }
    setShowModal(false);
    setCurrentNotification(null);
  };

  // Schedule local notification
  const scheduleNotification = async (notification: any): Promise<string | null> => {
    try {
      return await CoreNotificationService.scheduleLocalNotification(notification);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule notification');
      return null;
    }
  };

  // Cancel notification
  const cancelNotification = async (id: string): Promise<void> => {
    try {
      await CoreNotificationService.cancelNotification(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel notification');
    }
  };

  // Cancel all notifications
  const cancelAllNotifications = async (): Promise<void> => {
    try {
      await CoreNotificationService.cancelAllNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel notifications');
    }
  };

  // Clear badge
  const clearBadge = async (): Promise<void> => {
    try {
      await CoreNotificationService.clearBadge();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear badge');
    }
  };

  // Send like notification
  const sendLikeNotification = async (targetUserId: string, postId: string): Promise<void> => {
    if (!user) return;
    
    try {
      await SocialNotificationService.sendLikeNotification(user.uid, targetUserId, postId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send like notification');
    }
  };

  // Send comment notification
  const sendCommentNotification = async (targetUserId: string, postId: string, comment: string): Promise<void> => {
    if (!user) return;
    
    try {
      await SocialNotificationService.sendCommentNotification(user.uid, targetUserId, postId, comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send comment notification');
    }
  };

  // Send follow notification
  const sendFollowNotification = async (targetUserId: string): Promise<void> => {
    if (!user) return;
    
    try {
      await SocialNotificationService.sendFollowNotification(user.uid, targetUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send follow notification');
    }
  };

  // Send mention notification
  const sendMentionNotification = async (targetUserId: string, postId: string, content: string): Promise<void> => {
    if (!user) return;
    
    try {
      await SocialNotificationService.sendMentionNotification(user.uid, targetUserId, postId, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send mention notification');
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Refresh services
  const refresh = async (): Promise<void> => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Re-initialize services
      await CoreNotificationService.initialize();
      setPushToken(CoreNotificationService.getCurrentPushToken());
      
      console.log('✅ Notification services refreshed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh services');
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const contextValue: NotificationContextType = {
    pushToken,
    isLoading,
    error,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    clearBadge,
    sendLikeNotification,
    sendCommentNotification,
    sendFollowNotification,
    sendMentionNotification,
    clearError,
    refresh,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Foreground notification modal */}
      {showModal && currentNotification && (
        <NotificationModal
          notification={{
            id: currentNotification.request.identifier,
            type: currentNotification.request.content.data?.type || 'unknown',
            title: currentNotification.request.content.title || '',
            body: currentNotification.request.content.body || '',
            data: currentNotification.request.content.data,
            senderName: currentNotification.request.content.data?.sourceUsername,
            senderAvatar: currentNotification.request.content.data?.sourceProfileUrl,
          }}
          visible={showModal}
          onClose={() => {
            setShowModal(false);
            setCurrentNotification(null);
          }}
          onAction={async () => {
            await handleModalNotificationTap();
          }}
        />
      )}
    </NotificationContext.Provider>
  );
};
