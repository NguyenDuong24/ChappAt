// Chạm Sóng — Barrel exports (using project @/ convention)
// Import everything from one place: import { ... } from '@/features/cham-song'

// Types
export type {
  NearbySettings,
  NearbyEncounter,
  NearbySignal,
  NearbyMatch,
  LocationSnapshot,
  EncounterStatus,
  DistanceBucket,
  SignalType,
  MatchSource,
  NearbySettingsPayload,
  NearbyEncounterPayload,
  NearbySignalPayload,
  NearbyMatchPayload,
} from '@/types/nearby';
export { DEFAULT_NEARBY_SETTINGS, getDistanceBucket } from '@/types/nearby';

// Services
export {
  getNearbySettings,
  saveNearbySettings,
  deleteNearbyHistory,
  updateLocation,
  findNearbyUsers,
  findActiveEncounter,
  createEncounter,
  updateEncounter,
  expireOldEncounters,
  sendSignal,
  checkMutualSignal,
  createMatch,
  getEncounterHistory,
  checkHasEncountered,
  incrementNotificationCount,
  getTodayNotificationCount,
  isUserBlocked,
} from '@/services/nearbyService';

// Background Task
export {
  BACKGROUND_LOCATION_TASK,
  registerBackgroundLocationTask,
  unregisterBackgroundLocationTask,
} from '@/services/nearbyBackgroundTask';

// Notifications
export {
  configureNearbyNotifications,
  sendMatchNotification,
  setupNearbyNotificationChannel,
} from '@/services/nearbyNotifications';

// Hooks
export { useNearbySettings } from '@/hooks/useNearbySettings';
export { useNearbyDetection } from '@/hooks/useNearbyDetection';
export { useShakeToMatch } from '@/hooks/useShakeToMatch';

// Components
export { ProfileBadge } from '@/components/nearby/ProfileBadge';
export { UserProfileNearbySection } from '@/components/nearby/UserProfileNearbySection';
export { NearbyEntryButton } from '@/components/nearby/NearbyEntryButton';
export { NearbyAlert } from '@/components/nearby/NearbyAlert';
export { ShakeMatch } from '@/components/nearby/ShakeMatch';
export { NearbySettingsView } from '@/components/nearby/NearbySettings';
