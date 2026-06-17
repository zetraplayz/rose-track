/**
 * lib/db.ts
 * Production SQLite database layer.
 * WAL mode, full task schema with notification tracking, recurring support,
 * auto-miss detection, and standalone alarm table.
 */

import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('rosetrack_v2.db');
    await initDb(db);
  }
  return db;
};

// ─── Schema initialisation ─────────────────────────────────────────────────────
const initDb = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id              TEXT    PRIMARY KEY NOT NULL,
      title           TEXT    NOT NULL,
      description     TEXT,
      time            TEXT    NOT NULL,
      priority        TEXT    NOT NULL DEFAULT 'MEDIUM',
      category        TEXT    NOT NULL DEFAULT 'MORNING',
      status          TEXT    NOT NULL DEFAULT 'PENDING',
      is_recurring    INTEGER NOT NULL DEFAULT 0,
      recurrence      TEXT,
      date            TEXT    NOT NULL,
      notification_id TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- History table
    CREATE TABLE IF NOT EXISTS history (
      id               TEXT  PRIMARY KEY NOT NULL,
      date             TEXT  NOT NULL UNIQUE,
      completed_tasks  INTEGER NOT NULL DEFAULT 0,
      missed_tasks     INTEGER NOT NULL DEFAULT 0,
      total_tasks      INTEGER NOT NULL DEFAULT 0,
      completion_score REAL    NOT NULL DEFAULT 0.0,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Standalone alarms table
    CREATE TABLE IF NOT EXISTS alarms (
      id              TEXT    PRIMARY KEY NOT NULL,
      label           TEXT    NOT NULL DEFAULT 'Alarm',
      time            TEXT    NOT NULL,
      days            TEXT    NOT NULL DEFAULT '[]',
      is_enabled      INTEGER NOT NULL DEFAULT 1,
      vibrate         INTEGER NOT NULL DEFAULT 1,
      notification_id TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // Migrations: add columns that may not exist in older DB versions
  try {
    await database.execAsync(`ALTER TABLE tasks ADD COLUMN notification_id TEXT;`);
  } catch (_) {}
  try {
    await database.execAsync(`ALTER TABLE tasks ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'));`);
  } catch (_) {}
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface Task {
  id:              string;
  title:           string;
  description?:    string;
  time:            string;
  priority:        'LOW' | 'MEDIUM' | 'HIGH';
  category:        'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  status:          'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
  is_recurring:    boolean;
  recurrence?:     string;
  date:            string;
  notification_id?: string;
  created_at:      string;
  updated_at:      string;
}

export interface HistoryRecord {
  id:               string;
  date:             string;
  completed_tasks:  number;
  missed_tasks:     number;
  total_tasks:      number;
  completion_score: number;
}

export interface Alarm {
  id:              string;
  label:           string;
  time:            string;
  days:            string;      // JSON array string: '["MON","WED","FRI"]'
  is_enabled:      boolean;
  vibrate:         boolean;
  notification_id?: string;
  created_at:      string;
}

// ─── Task CRUD ─────────────────────────────────────────────────────────────────

export const getTasksByDate = async (date: string): Promise<Task[]> => {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM tasks WHERE date = ? ORDER BY time ASC, created_at ASC',
    [date]
  );
  return rows.map(normalizeTask);
};

export const getAllTasks = async (): Promise<Task[]> => {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM tasks ORDER BY date ASC, time ASC'
  );
  return rows.map(normalizeTask);
};

export const getTasksByDateRange = async (from: string, to: string): Promise<Task[]> => {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM tasks WHERE date >= ? AND date <= ? ORDER BY date ASC, time ASC',
    [from, to]
  );
  return rows.map(normalizeTask);
};

export const getTaskById = async (id: string): Promise<Task | null> => {
  const database = await getDb();
  const row = await database.getFirstAsync<any>('SELECT * FROM tasks WHERE id = ?', [id]);
  return row ? normalizeTask(row) : null;
};

export const createTask = async (task: Omit<Task, 'created_at' | 'updated_at'>): Promise<void> => {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO tasks
       (id, title, description, time, priority, category, status, is_recurring, recurrence, date, notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.description ?? null,
      task.time,
      task.priority,
      task.category,
      task.status,
      task.is_recurring ? 1 : 0,
      task.recurrence ?? null,
      task.date,
      task.notification_id ?? null,
    ]
  );
};

export const updateTask = async (
  id: string,
  updates: Partial<Omit<Task, 'id' | 'created_at'>>
): Promise<void> => {
  const database = await getDb();
  const fields = Object.keys(updates)
    .filter((k) => k !== 'id' && k !== 'created_at')
    .map((k) => `${k} = ?`);
  const values = Object.values(updates).map((v) =>
    typeof v === 'boolean' ? (v ? 1 : 0) : (v ?? null)
  );

  if (fields.length === 0) return;

  await database.runAsync(
    `UPDATE tasks SET ${fields.join(', ')}, updated_at = datetime('now','localtime') WHERE id = ?`,
    [...values, id]
  );
};

export const updateTaskStatus = async (
  id: string,
  status: Task['status']
): Promise<void> => {
  const database = await getDb();
  await database.runAsync(
    `UPDATE tasks SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
    [status, id]
  );
};

export const updateTaskNotificationId = async (
  id: string,
  notificationId: string | null
): Promise<void> => {
  const database = await getDb();
  await database.runAsync(
    `UPDATE tasks SET notification_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
    [notificationId, id]
  );
};

export const deleteTask = async (id: string): Promise<string | null> => {
  const database = await getDb();
  // Fetch notification_id before deleting so caller can cancel it
  const row = await database.getFirstAsync<{ notification_id: string | null }>(
    'SELECT notification_id FROM tasks WHERE id = ?',
    [id]
  );
  await database.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  return row?.notification_id ?? null;
};

/**
 * Marks all PENDING tasks for today whose time is more than graceMinutes in the past.
 * Returns count of tasks newly marked as MISSED.
 */
export const markOverdueTasks = async (
  todayDate: string,
  currentTime: string,
  graceMinutes: number = 5
): Promise<number> => {
  const database = await getDb();
  // Convert "HH:MM" to minutes-since-midnight for comparison in SQLite
  // SQLite doesn't have time functions, so we compare strings directly
  // "HH:MM" strings sort lexicographically correctly
  const [h, m] = currentTime.split(':').map(Number);
  const graceH = Math.floor((h * 60 + m - graceMinutes) / 60);
  const graceM = (h * 60 + m - graceMinutes) % 60;
  const gracePad = `${String(Math.max(0, graceH)).padStart(2, '0')}:${String(Math.max(0, graceM)).padStart(2, '0')}`;

  const result = await database.runAsync(
    `UPDATE tasks
     SET status = 'MISSED', updated_at = datetime('now','localtime')
     WHERE date = ?
       AND status = 'PENDING'
       AND time < ?`,
    [todayDate, gracePad]
  );

  return result.changes ?? 0;
};

// ─── History CRUD ──────────────────────────────────────────────────────────────

export const getHistory = async (days: number = 7): Promise<HistoryRecord[]> => {
  const database = await getDb();
  const rows = await database.getAllAsync<HistoryRecord>(
    'SELECT * FROM history ORDER BY date DESC LIMIT ?',
    [days]
  );
  return rows.reverse();
};

export const upsertHistory = async (date: string): Promise<void> => {
  const database = await getDb();
  const tasks = await database.getAllAsync<{ status: string }>(
    'SELECT status FROM tasks WHERE date = ?',
    [date]
  );
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const missed    = tasks.filter((t) => t.status === 'MISSED').length;
  const score     = total > 0 ? (completed / total) * 100 : 0;

  await database.runAsync(
    `INSERT INTO history (id, date, completed_tasks, missed_tasks, total_tasks, completion_score)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       completed_tasks  = excluded.completed_tasks,
       missed_tasks     = excluded.missed_tasks,
       total_tasks      = excluded.total_tasks,
       completion_score = excluded.completion_score,
       updated_at       = datetime('now','localtime')`,
    [Crypto.randomUUID(), date, completed, missed, total, score]
  );
};

// ─── Stats ─────────────────────────────────────────────────────────────────────

export const getStats = async (todayDate: string) => {
  const database = await getDb();
  const total     = (await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks'))?.count ?? 0;
  const completed = (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE status = 'COMPLETED'"))?.count ?? 0;
  const missed    = (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE status = 'MISSED'"))?.count ?? 0;
  const pending   = (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM tasks WHERE status = 'PENDING'"))?.count ?? 0;

  const todayTasks     = await database.getAllAsync<{ status: string }>('SELECT status FROM tasks WHERE date = ?', [todayDate]);
  const todayCompleted = todayTasks.filter((t) => t.status === 'COMPLETED').length;
  const todayRate      = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;

  return { total, completed, missed, pending, todayRate, todayTotal: todayTasks.length };
};

// ─── Alarm CRUD ────────────────────────────────────────────────────────────────

export const getAlarms = async (): Promise<Alarm[]> => {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM alarms ORDER BY time ASC'
  );
  return rows.map((r) => ({ ...r, is_enabled: !!r.is_enabled, vibrate: !!r.vibrate }));
};

export const createAlarm = async (alarm: Omit<Alarm, 'created_at'>): Promise<void> => {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO alarms (id, label, time, days, is_enabled, vibrate, notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      alarm.id,
      alarm.label,
      alarm.time,
      alarm.days,
      alarm.is_enabled ? 1 : 0,
      alarm.vibrate ? 1 : 0,
      alarm.notification_id ?? null,
    ]
  );
};

export const updateAlarm = async (
  id: string,
  updates: Partial<Alarm>
): Promise<void> => {
  const database = await getDb();
  if (updates.is_enabled !== undefined) {
    await database.runAsync(
      `UPDATE alarms SET is_enabled = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [updates.is_enabled ? 1 : 0, id]
    );
  }
  if (updates.notification_id !== undefined) {
    await database.runAsync(
      `UPDATE alarms SET notification_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [updates.notification_id ?? null, id]
    );
  }
};

export const deleteAlarm = async (id: string): Promise<string | null> => {
  const database = await getDb();
  const row = await database.getFirstAsync<{ notification_id: string | null }>(
    'SELECT notification_id FROM alarms WHERE id = ?',
    [id]
  );
  await database.runAsync('DELETE FROM alarms WHERE id = ?', [id]);
  return row?.notification_id ?? null;
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

const normalizeTask = (row: any): Task => ({
  ...row,
  is_recurring: !!row.is_recurring,
  description:  row.description ?? undefined,
  recurrence:   row.recurrence  ?? undefined,
  notification_id: row.notification_id ?? undefined,
  updated_at:   row.updated_at  ?? row.created_at,
});
