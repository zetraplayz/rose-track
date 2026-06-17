/**
 * app/(tabs)/index.tsx
 * Today's dashboard — live clock, real task engine, priority badges.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTasks } from '../../hooks/useTasks';
import CheerModal from '../../components/CheerModal';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Circle, Clock, AlertTriangle, Bell } from 'lucide-react-native';
import { getTodayDateString, getCurrentTimeString, formatTime12h, getFriendlyDate } from '../../lib/time';
import { requestNotificationPermission } from '../../lib/notifications';
import { Task } from '../../lib/db';

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  HIGH:   '#ef4444',
  MEDIUM: '#f59e0b',
  LOW:    '#10b981',
};

const CATEGORY_ICONS: Record<Task['category'], string> = {
  MORNING:   '🌅',
  AFTERNOON: '☀️',
  EVENING:   '🌙',
  NIGHT:     '🌃',
};

export default function DashboardScreen() {
  const today = getTodayDateString();
  const { tasks, loading, progress, completeTask, uncompleteTask, missedCount } = useTasks(today);
  const [showCheer, setShowCheer]   = useState(false);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());

  // Live clock — updates every second
  useEffect(() => {
    requestNotificationPermission();
    const t = setInterval(() => setCurrentTime(getCurrentTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleToggleTask = async (task: Task) => {
    if (task.status === 'COMPLETED') {
      await uncompleteTask(task.id);
    } else if (task.status !== 'MISSED') {
      await completeTask(task.id);
      setShowCheer(true);
    }
  };

  const activeTasks  = tasks.filter((t) => t.status !== 'MISSED');
  const missedTasks  = tasks.filter((t) => t.status === 'MISSED');
  const progressPct  = Math.round(progress * 100);

  // Live clock display
  const now = new Date();
  const hours   = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const period  = now.getHours() >= 12 ? 'PM' : 'AM';
  const dateLabel = getFriendlyDate(today);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return 'Good Morning 🌸';
    if (h < 17) return 'Good Afternoon ☀️';
    if (h < 21) return 'Good Evening 🌙';
    return 'Good Night 💫';
  })();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Live clock header */}
      <LinearGradient colors={['#f43f5e', '#ec4899']} style={styles.clockCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.clockTime}>
          {hours}:{minutes}
          <Text style={styles.clockSeconds}>:{seconds}</Text>
          <Text style={styles.clockPeriod}> {period}</Text>
        </Text>
        <Text style={styles.clockDate}>{dateLabel}</Text>
        <Text style={styles.greeting}>{greeting}</Text>
      </LinearGradient>

      {/* Progress bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Daily Progress</Text>
          <Text style={styles.progressValue}>{progressPct}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={progressPct === 100 ? ['#10b981', '#059669'] : ['#fb7185', '#ec4899']}
            style={[styles.progressBarFill, { width: `${progressPct}%` as any }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <View style={styles.progressStats}>
          <Text style={styles.statChip}>✅ {tasks.filter(t => t.status === 'COMPLETED').length} done</Text>
          <Text style={styles.statChip}>⏳ {tasks.filter(t => t.status === 'PENDING').length} pending</Text>
          {missedCount > 0 && <Text style={[styles.statChip, styles.missedChip]}>❌ {missedCount} missed</Text>}
        </View>
        {progressPct === 100 && activeTasks.length > 0 && (
          <Text style={styles.allDoneText}>✨ You did everything today! So proud of you!</Text>
        )}
      </View>

      {/* Active tasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Tasks</Text>

        {activeTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌸</Text>
            <Text style={styles.emptyText}>No tasks scheduled for today.{'\n'}Enjoy your day!</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {activeTasks.map((task) => (
              <Pressable
                key={task.id}
                style={[
                  styles.taskCard,
                  task.status === 'COMPLETED' && styles.taskCardCompleted,
                ]}
                onPress={() => handleToggleTask(task)}
                android_ripple={{ color: '#fce7f3' }}
              >
                {/* Priority stripe */}
                <View style={[styles.priorityStripe, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />

                <View style={styles.taskCheckbox}>
                  {task.status === 'COMPLETED'
                    ? <CheckCircle2 color="#10b981" size={26} />
                    : <Circle color="#fda4af" size={26} />
                  }
                </View>

                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, task.status === 'COMPLETED' && styles.taskTitleDone]}>
                    {CATEGORY_ICONS[task.category]} {task.title}
                  </Text>
                  {task.description ? (
                    <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
                  ) : null}
                  <View style={styles.taskMeta}>
                    <View style={styles.timeBadge}>
                      <Clock size={11} color="#f43f5e" />
                      <Text style={styles.timeText}>{formatTime12h(task.time)}</Text>
                    </View>
                    {task.is_recurring && (
                      <View style={styles.recurBadge}>
                        <Text style={styles.recurText}>🔁 {task.recurrence}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Missed tasks (collapsed section) */}
      {missedTasks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.missedHeader}>
            <AlertTriangle size={16} color="#ef4444" />
            <Text style={styles.missedTitle}>Missed ({missedTasks.length})</Text>
          </View>
          {missedTasks.map((task) => (
            <View key={task.id} style={styles.missedCard}>
              <Text style={styles.missedTaskTitle}>{task.title}</Text>
              <Text style={styles.missedTaskTime}>{formatTime12h(task.time)}</Text>
            </View>
          ))}
        </View>
      )}

      <CheerModal visible={showCheer} onClose={() => setShowCheer(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Clock
  clockCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  clockTime: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -1,
  },
  clockSeconds: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.6)',
  },
  clockPeriod: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.8)',
  },
  clockDate: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 8,
  },

  // Progress
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fecdd3',
    gap: 10,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#be123c',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f43f5e',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#fecdd3',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  missedChip: {
    color: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  allDoneText: {
    textAlign: 'center',
    color: '#db2777',
    fontWeight: '600',
    fontSize: 14,
  },

  // Sections
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },

  // Tasks
  taskList: { gap: 10 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  taskCardCompleted: {
    opacity: 0.55,
    backgroundColor: '#f8fafc',
  },
  priorityStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  taskCheckbox: {
    padding: 14,
  },
  taskInfo: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    gap: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f43f5e',
  },
  recurBadge: {
    backgroundColor: '#fdf4ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  recurText: {
    fontSize: 11,
    color: '#a855f7',
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyIcon: { fontSize: 40 },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },

  // Missed section
  missedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  missedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  missedTaskTitle: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  missedTaskTime: {
    fontSize: 12,
    color: '#f87171',
  },
});
