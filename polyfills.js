// Minimal Node polyfills for React Native/Expo
// Load first in app entry

// Ensure crypto.getRandomValues for uuid and other libs
import 'react-native-get-random-values';

// Buffer
import { Buffer as RNBuffer } from 'buffer';
if (!global.Buffer) {
  // @ts-ignore
  global.Buffer = RNBuffer;
}

// process (only env and nextTick used by some libs)
if (!global.process) {
  // @ts-ignore
  global.process = { env: {} };
}
// @ts-ignore
global.process.env = global.process.env || {};
// @ts-ignore
if (typeof global.process.nextTick !== 'function') {
  // @ts-ignore
  global.process.nextTick = (cb) => setTimeout(cb, 0);
}

// TextEncoder/TextDecoder for libs expecting them
import { TextEncoder, TextDecoder } from 'text-encoding';
if (!global.TextEncoder) {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

// atob/btoa for base64 conversions used by some libs
if (typeof global.atob !== 'function') {
  // @ts-ignore
  global.atob = (b64) => RNBuffer.from(b64, 'base64').toString('binary');
}
if (typeof global.btoa !== 'function') {
  // @ts-ignore
  global.btoa = (bin) => RNBuffer.from(bin, 'binary').toString('base64');
}

// Notification handler configuration
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isCallNotification = data?.type === 'call';
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Đặt priority cao cho call notifications
      priority: isCallNotification ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

// Continue with normal Expo Router entry
import 'expo-router/entry';
