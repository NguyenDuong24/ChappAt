# Sound Assets

This directory should contain sound files for the app. Currently, sounds are disabled to prevent errors.

## Required Sound Files:
- `incoming.mp3` - For incoming calls (ringtone)
- `outcoming.mp3` - For outgoing calls (dialing sound)
- `notification.mp3` - For message notifications
- `join.mp3` - For message sent confirmation and call sounds
- `sent.mp3` - For message sent confirmation (alternative)
- `success.mp3` - For success actions
- `error.mp3` - For error notifications
- `calling.mp3` - Legacy file (can be removed)

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
