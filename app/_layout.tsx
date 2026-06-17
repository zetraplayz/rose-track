import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { requestNotificationPermission, setupNotificationChannel } from '../lib/notifications';
import { usePreventScreenCapture } from 'expo-screen-capture';
import * as Device from 'expo-device';
import { ShieldAlert } from 'lucide-react-native';

export default function RootLayout() {
  const [isRooted, setIsRooted] = useState<boolean | null>(null);

  // 1. Prevent Screenshots & Screen Recording
  usePreventScreenCapture();

  useEffect(() => {
    // 2. Check for Root / Jailbreak
    async function checkSecurity() {
      try {
        const rooted = await Device.isRootedExperimentalAsync();
        setIsRooted(rooted);
      } catch (error) {
        // Fallback safely if detection fails
        setIsRooted(false);
      }
    }
    checkSecurity();

    // Request notification permission and setup channels on app launch
    setupNotificationChannel().then(() => requestNotificationPermission());
  }, []);

  if (isRooted === null) {
    return null; // Wait for security check
  }

  // 3. Security Lockdown Screen
  if (isRooted) {
    return (
      <View style={styles.lockdownContainer}>
        <StatusBar style="light" />
        <View style={styles.iconContainer}>
          <ShieldAlert color="#ef4444" size={64} />
        </View>
        <Text style={styles.lockdownTitle}>Security Lockdown</Text>
        <Text style={styles.lockdownText}>
          This device appears to be compromised (rooted or jailbroken).
          For your protection, the application cannot run on an insecure device.
        </Text>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  lockdownContainer: {
    flex: 1,
    backgroundColor: '#0f172a', // dark slate 900
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    backgroundColor: '#450a0a', // dark red
    padding: 24,
    borderRadius: 64,
    marginBottom: 32,
  },
  lockdownTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444', // red 500
    marginBottom: 16,
    textAlign: 'center',
  },
  lockdownText: {
    fontSize: 16,
    color: '#cbd5e1', // slate 300
    textAlign: 'center',
    lineHeight: 24,
  },
});
