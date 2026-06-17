import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getStats, getHistory } from '../lib/db';
import { useAllTasks } from '../hooks/useTasks';

export default function AdminScreen() {
  const [stats, setStats] = useState<any>(null);
  const { tasks } = useAllTasks();

  useEffect(() => {
    const fetchStats = async () => {
      const dbStats = await getStats();
      const history = await getHistory(30);
      setStats({ ...dbStats, history });
    };
    fetchStats();
  }, []);

  if (!stats) return <Text style={styles.loading}>Loading admin dashboard...</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Monitoring</Text>
        <Text style={styles.subtitle}>Overview of schedule adherence.</Text>
      </View>

      <View style={styles.grid}>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>Total Tasks</Text>
          <Text style={[styles.statValue, { color: '#1e293b' }]}>{stats.total}</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.completed}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>Missed</Text>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.missed}</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>Today's %</Text>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.todayRate}%</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Tasks Listing</Text>
        {tasks.map(task => (
          <View key={task.id} style={styles.taskRow}>
            <Text style={styles.taskDate}>{task.date}</Text>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={[styles.taskStatus, 
                task.status === 'COMPLETED' ? {color: '#10b981'} : 
                task.status === 'MISSED' ? {color: '#ef4444'} : {color: '#64748b'}
              ]}>
                {task.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#94a3b8',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  taskDate: {
    fontSize: 12,
    color: '#94a3b8',
    width: 80,
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskTitle: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
