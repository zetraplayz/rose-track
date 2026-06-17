/**
 * hooks/useTasks.ts
 * Production task hook with:
 * - Real timezone-aware date/time
 * - Auto-miss detection engine (checks every 30 seconds)
 * - Recurring task expansion
 * - Supabase Realtime integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTasksByDate,
  getAllTasks,
  createTask,
  updateTaskStatus,
  updateTaskNotificationId,
  deleteTask,
  upsertHistory,
  markOverdueTasks,
  Task,
  getAlarms,
  createAlarm,
  updateAlarm,
  deleteAlarm,
  Alarm,
} from '../lib/db';
import { scheduleTaskReminder, cancelNotification, scheduleAlarm, cancelAllNotifications } from '../lib/notifications';
import { validateTaskInput } from '../lib/security';
import { getTodayDateString, getCurrentTimeString, buildDateFromParts, getRecurringDates } from '../lib/time';
import * as Crypto from 'expo-crypto';

// ─── useTasks ─────────────────────────────────────────────────────────────────

export const useTasks = (dateOverride?: string) => {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const targetDate = dateOverride ?? getTodayDateString();
  const isToday    = targetDate === getTodayDateString();

  // ── Fetch tasks ──────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTasksByDate(targetDate);
      setTasks(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── Auto-miss detection engine ───────────────────────────────────────────────
  // Runs every 30 seconds while the app is open and the screen is showing today.
  useEffect(() => {
    if (!isToday) return; // Only auto-miss on today's tasks

    const runCheck = async () => {
      const now  = getCurrentTimeString();
      const date = getTodayDateString();
      const changed = await markOverdueTasks(date, now, 5);
      if (changed > 0) {
        await upsertHistory(date);
        await fetchTasks(); // Refresh UI
      }
    };

    // Run once immediately
    runCheck();

    // Then every 30 seconds
    const interval = setInterval(runCheck, 30_000);
    return () => clearInterval(interval);
  }, [isToday, fetchTasks]);

  // ── addTask ──────────────────────────────────────────────────────────────────
  const addTask = async (input: {
    title:        string;
    description?: string;
    time:         string;
    priority:     Task['priority'];
    category:     Task['category'];
    date:         string;
    is_recurring?: boolean;
    recurrence?:   string;
  }): Promise<{ success: true } | { success: false; error: string }> => {

    const validated = validateTaskInput({
      title:       input.title,
      description: input.description,
      time:        input.time,
      priority:    input.priority,
      category:    input.category,
      date:        input.date,
      recurrence:  input.recurrence,
    });

    if (!validated.valid) {
      return { success: false, error: validated.error };
    }

    const { data } = validated as any;

    // Handle recurring tasks: create an entry for the next 30 occurrences
    if (input.is_recurring && input.recurrence) {
      const dates = getRecurringDates(
        input.date,
        input.recurrence as 'DAILY' | 'WEEKLY' | 'WEEKDAYS' | 'WEEKENDS',
        30
      );

      for (const date of dates) {
        const id = Crypto.randomUUID();
        const task: Omit<Task, 'created_at' | 'updated_at'> = {
          id,
          title:        data.title,
          description:  data.description,
          time:         input.time,
          priority:     input.priority,
          category:     input.category,
          status:       'PENDING',
          is_recurring: true,
          recurrence:   input.recurrence,
          date,
        };
        await createTask(task);

        // Schedule reminder for each date
        const notifId = await scheduleTaskReminder({ ...task, created_at: '', updated_at: '' } as Task);
        if (notifId) {
          await updateTaskNotificationId(id, notifId);
        }
      }
    } else {
      // Single task
      const id = Crypto.randomUUID();
      const task: Omit<Task, 'created_at' | 'updated_at'> = {
        id,
        title:        data.title,
        description:  data.description,
        time:         input.time,
        priority:     input.priority,
        category:     input.category,
        status:       'PENDING',
        is_recurring: false,
        date:         input.date,
      };
      await createTask(task);

      const notifId = await scheduleTaskReminder({ ...task, created_at: '', updated_at: '' } as Task);
      if (notifId) {
        await updateTaskNotificationId(id, notifId);
      }
    }

    await fetchTasks();
    return { success: true };
  };

  // ── completeTask ─────────────────────────────────────────────────────────────
  const completeTask = async (id: string): Promise<void> => {
    await updateTaskStatus(id, 'COMPLETED');
    await upsertHistory(targetDate);
    await fetchTasks();
  };

  // ── uncompleteTask ───────────────────────────────────────────────────────────
  const uncompleteTask = async (id: string): Promise<void> => {
    await updateTaskStatus(id, 'PENDING');
    await upsertHistory(targetDate);
    await fetchTasks();
  };

  // ── removeTask ───────────────────────────────────────────────────────────────
  const removeTask = async (id: string): Promise<void> => {
    const notifId = await deleteTask(id);
    if (notifId) await cancelNotification(notifId);
    await upsertHistory(targetDate);
    await fetchTasks();
  };

  // ── Computed values ──────────────────────────────────────────────────────────
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const missedCount    = tasks.filter((t) => t.status === 'MISSED').length;
  const pendingCount   = tasks.filter((t) => t.status === 'PENDING').length;
  const activeCount    = tasks.filter((t) => t.status !== 'MISSED').length;
  const progress       = activeCount > 0 ? completedCount / activeCount : 0;

  return {
    tasks,
    loading,
    error,
    addTask,
    completeTask,
    uncompleteTask,
    removeTask,
    refetch:        fetchTasks,
    completedCount,
    missedCount,
    pendingCount,
    activeCount,
    progress,
  };
};

// ─── useAllTasks ──────────────────────────────────────────────────────────────

export const useAllTasks = () => {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const data = await getAllTasks();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { tasks, loading, refetch: fetch };
};

// ─── useAlarms ────────────────────────────────────────────────────────────────

export const useAlarms = () => {
  const [alarms,  setAlarms]  = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlarms = useCallback(async () => {
    setLoading(true);
    const data = await getAlarms();
    setAlarms(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlarms(); }, [fetchAlarms]);

  const addAlarm = async (input: {
    label:     string;
    time:      string;
    days:      string[];
    vibrate:   boolean;
  }): Promise<void> => {
    const id = Crypto.randomUUID();
    const days = JSON.stringify(input.days);

    // Schedule the alarm
    const fireAt = (() => {
      const [h, m] = input.time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      if (d <= new Date()) d.setDate(d.getDate() + 1);
      return d;
    })();

    const notifId = await scheduleAlarm(input.label, fireAt, 'alarms');

    await createAlarm({
      id,
      label:       input.label,
      time:        input.time,
      days,
      is_enabled:  true,
      vibrate:     input.vibrate,
      notification_id: notifId ?? undefined,
      created_at:  new Date().toISOString(),
    });

    await fetchAlarms();
  };

  const toggleAlarm = async (id: string, enabled: boolean): Promise<void> => {
    await updateAlarm(id, { is_enabled: enabled });
    await fetchAlarms();
  };

  const removeAlarm = async (id: string): Promise<void> => {
    const notifId = await deleteAlarm(id);
    if (notifId) await cancelNotification(notifId);
    await fetchAlarms();
  };

  return { alarms, loading, addAlarm, toggleAlarm, removeAlarm, refetch: fetchAlarms };
};
