declare module '@videosdk.live/react-native-incallmanager' {
  type MediaType = 'audio' | 'video';
  interface StartOptions { media?: MediaType }

  const InCallManager: {
    start: (options?: StartOptions) => void;
    stop: () => void;
    setSpeakerphoneOn: (on: boolean) => void; // Android
    setForceSpeakerphoneOn: (on: boolean | 'on' | 'off' | 'auto') => void; // iOS
  };
  export default InCallManager;
}
