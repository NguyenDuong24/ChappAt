# Sound Assets

This directory should contain sound files for the app. Currently, sounds are disabled to prevent errors.

## Required Sound Files:
- `ring.mp3` - For incoming/outgoing calls
- `notification.mp3` - For message notifications
- `sent.mp3` - For message sent confirmation
- `end.mp3` - For call end sound
- `accepted.mp3` - For call accepted sound
- `typing.mp3` - For typing indicator sound
- `success.mp3` - For success actions
- `error.mp3` - For error notifications

## To Enable Sounds:
1. Add the required MP3 files to this directory
2. In `context/AudioContext.jsx`, change `ENABLE_SOUNDS` from `false` to `true`
3. Update the `soundAssets` object to reference the actual files:

```javascript
const soundAssets = {
  incomingCall: require('../assets/sounds/ring.mp3'),
  outgoingCall: require('../assets/sounds/ring.mp3'),
  messageReceived: require('../assets/sounds/notification.mp3'),
  messageSent: require('../assets/sounds/sent.mp3'),
  notification: require('../assets/sounds/notification.mp3'),
  callEnd: require('../assets/sounds/end.mp3'),
  callAccepted: require('../assets/sounds/accepted.mp3'),
  typing: require('../assets/sounds/typing.mp3'),
  success: require('../assets/sounds/success.mp3'),
  error: require('../assets/sounds/error.mp3'),
};
```

## Supported Formats:
- MP3
- WAV
- AAC
- M4A

Make sure all sound files are optimized for mobile (small file size, appropriate quality).
