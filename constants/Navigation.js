/**
 * Navigation constants - định nghĩa các route paths
 */
export const ROUTES = {
  // Authentication routes
  SIGNIN: '/signin',
  SIGNUP: '/signup',
  
  // Main app routes
  TABS: '/(tabs)',
  HOME: '/(tabs)/home',
  
  // Call related routes
  INCOMING_CALL: '/IncomingCallScreen',
  CALL_SCREEN: '/CallScreen',
  LISTEN_CALL_ACCEPTED: '/ListenCallAcceptedScreen',
  
  // Other screens
  USER_PROFILE: '/UserProfileScreen',
  ADD_FRIEND: '/AddFriend',
  CHAT_SCREEN: '/chat', // Sử dụng route chat có sẵn
};

/**
 * Call status constants
 */
export const CALL_STATUS = {
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancel', // Sửa để match với code hiện tại
  DECLINED: 'declined',
  ENDED: 'ended',
};

/**
 * Call types
 */
export const CALL_TYPES = {
  VOICE: 'voice',
  VIDEO: 'video',
};

/**
 * Screen names constants
 */
export const SCREEN_NAMES = {
  INCOMING_CALL_SCREEN: 'IncomingCallScreen',
  CALL_SCREEN: 'CallScreen',
  LISTEN_CALL_ACCEPTED_SCREEN: 'ListenCallAcceptedScreen',
};
