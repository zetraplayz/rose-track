import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { requestNotificationPermission, setupNotificationChannel } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Request notification permission and setup channels on app launch
    setupNotificationChannel().then(() => requestNotificationPermission());
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
