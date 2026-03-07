import { Stack } from 'expo-router';

export default function GroupsLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}
