/**
 * lib/notifications.ts
 * Real expo-notifications implementation for the production APK build.
 * Handles scheduling, cancellation, and permission management.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task } from './db';
import { buildDateFromParts, parseTime } from './time';

// ─── Handler config ────────────────────────────────────────────────────────────
// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:   true,
    shouldPlaySound:   true,
    shouldSetBadge:    false,
    shouldShowBanner:  true,
    shouldShowList:    true,
  }),
});

// ─── Android channel setup ─────────────────────────────────────────────────────
export const setupNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  // Primary task reminder channel
  await Notifications.setNotificationChannelAsync('task-reminders', {
    name: 'Task Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#f43f5e',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    sound: 'default',
  });

  // Alarm channel — maximum importance, bypasses DnD
  await Notifications.setNotificationChannelAsync('alarms', {
    name: 'Alarms',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500],
    lightColor: '#f43f5e',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    sound: 'default',
  });

  // Missed task channel
  await Notifications.setNotificationChannelAsync('missed-tasks', {
    name: 'Missed Tasks',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 100],
    lightColor: '#94a3b8',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    bypassDnd: false,
  });
};

// ─── Permission request ────────────────────────────────────────────────────────
export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert:   true,
        allowBadge:   false,
        allowSound:   true,
        allowProvisional: false,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted.');
    return false;
  }

  await setupNotificationChannel();
  return true;
};

// ─── Schedule a task reminder ──────────────────────────────────────────────────
/**
 * Schedules a local notification 15 minutes before a task's scheduled time.
 * Returns the notification identifier string (store this to cancel later).
 * Returns null if the task time has already passed or permission is missing.
 */
export const scheduleTaskReminder = async (task: Task): Promise<string | null> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const { hours, minutes } = parseTime(task.time);

    // Build the exact Date when the notification should fire: task time minus 15 min
    const taskDate = buildDateFromParts(task.date, task.time);
    const fireAt   = new Date(taskDate.getTime() - 15 * 60 * 1000);

    // Don't schedule if the fire time is in the past
    if (fireAt <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title:    `⏰ ${task.title}`,
        body:     `Starting in 15 minutes at ${task.time}`,
        data:     { taskId: task.id, type: 'task-reminder' },
        sound:    'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId: 'task-reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      } as Notifications.DateTriggerInput,
    });

    return id;
  } catch (err) {
    console.error('[Notifications] scheduleTaskReminder failed:', err);
    return null;
  }
};

// ─── Schedule an exact alarm ───────────────────────────────────────────────────
/**
 * Schedules an alarm notification at the exact time (no offset).
 * Used for standalone alarm entries.
 */
export const scheduleAlarm = async (
  label: string,
  fireAt: Date,
  channelId: 'alarms' | 'task-reminders' = 'alarms'
): Promise<string | null> => {
  try {
    if (fireAt <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title:    `🔔 ${label}`,
        body:     'Time!',
        data:     { type: 'alarm' },
        sound:    'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      } as Notifications.DateTriggerInput,
    });

    return id;
  } catch (err) {
    console.error('[Notifications] scheduleAlarm failed:', err);
    return null;
  }
};

// ─── Send an immediate notification ───────────────────────────────────────────
export const sendImmediateNotification = async (
  title: string,
  body: string,
  channelId: string = 'task-reminders'
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: null, // fires immediately
    });
  } catch (err) {
    console.error('[Notifications] sendImmediateNotification failed:', err);
  }
};

// ─── Cancel a specific notification ───────────────────────────────────────────
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (_) {}
};

// ─── Cancel all notifications ──────────────────────────────────────────────────
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (_) {}
};

// ─── Get all pending notifications (for debugging) ────────────────────────────
export const getPendingNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};
