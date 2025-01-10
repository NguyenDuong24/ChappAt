import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { MeetingProvider, createMeeting } from "videosdk-rtc-react-native";

const VideoCallScreen = ({ route }) => {
  const { roomId } = route.params;

  useEffect(() => {
    const initMeeting = async () => {
      const meeting = await createMeeting({ roomId });
      meeting.join();
    };

    initMeeting();
  }, [roomId]);

  return (
    <MeetingProvider>
      <View style={styles.container}>
        {/* Video components */}
      </View>
    </MeetingProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
});

export default VideoCallScreen;
