/**
 * lib/sync.ts
 * Supabase sync: push local data to cloud AND subscribe to realtime
 * changes so the admin console reflects live task status.
 */

import { supabase } from './supabase';
import { getAllTasks, getHistory, updateTaskStatus, Task, HistoryRecord } from './db';
import { RealtimeChannel } from '@supabase/supabase-js';

let activeChannel: RealtimeChannel | null = null;

// ─── Push local data to Supabase ──────────────────────────────────────────────
export const syncDataToCloud = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Sync] No authenticated user — skipping sync.');
      return false;
    }

    const localTasks   = await getAllTasks();
    const localHistory = await getHistory(100);

    // --- Upsert tasks
    if (localTasks.length > 0) {
      const payload = localTasks.map((t) => ({
        id:           t.id,
        user_id:      user.id,
        title:        t.title,
        description:  t.description || null,
        time:         t.time,
        priority:     t.priority,
        category:     t.category,
        status:       t.status,
        is_recurring: t.is_recurring,
        recurrence:   t.recurrence || null,
        date:         t.date,
        synced_at:    new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('tasks')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Task sync failed: ${error.message}`);
    }

    // --- Upsert history
    if (localHistory.length > 0) {
      const payload = localHistory.map((h) => ({
        id:               h.id,
        user_id:          user.id,
        date:             h.date,
        completed_tasks:  h.completed_tasks,
        missed_tasks:     h.missed_tasks,
        total_tasks:      h.total_tasks,
        completion_score: h.completion_score,
        synced_at:        new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('history')
        .upsert(payload, { onConflict: 'user_id,date' });
      if (error) throw new Error(`History sync failed: ${error.message}`);
    }

    console.log(`[Sync] ✅ Pushed ${localTasks.length} tasks and ${localHistory.length} history records.`);
    return true;
  } catch (err) {
    console.error('[Sync] Error:', err);
    return false;
  }
};

// ─── Realtime subscription ─────────────────────────────────────────────────────
/**
 * Subscribes to realtime task updates from Supabase.
 * When an admin changes a task status remotely, the callback fires with the updated task.
 * This allows the mobile UI to reflect admin changes without a manual sync.
 *
 * @param userId       - The authenticated user's UUID (filter to own tasks only)
 * @param onTaskUpdate - Callback invoked with the updated task payload
 */
export const subscribeToTaskUpdates = (
  userId: string,
  onTaskUpdate: (task: Partial<Task> & { id: string }) => void
): (() => void) => {
  // Clean up any existing subscription
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  const channel = supabase
    .channel(`tasks:user:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'tasks',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = payload.new as any;
          console.log('[Realtime] Task updated remotely:', updated.id, updated.status);
          onTaskUpdate({
            id:       updated.id,
            status:   updated.status,
            title:    updated.title,
            date:     updated.date,
            time:     updated.time,
            priority: updated.priority,
            category: updated.category,
          });
        }
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Channel status:', status);
    });

  activeChannel = channel;

  // Return an unsubscribe function
  return () => {
    supabase.removeChannel(channel);
    activeChannel = null;
  };
};

// ─── Unsubscribe from realtime ─────────────────────────────────────────────────
export const unsubscribeFromTaskUpdates = (): void => {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
};
