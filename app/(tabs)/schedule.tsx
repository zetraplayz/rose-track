/**
 * app/(tabs)/schedule.tsx
 * Full task management: create, edit, delete, with real time picker,
 * date picker, priority selector, category selector, and recurring options.
 * Pure React Native — no extra native dependencies.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Modal, KeyboardAvoidingView, Platform, Alert, Switch, TouchableOpacity,
} from 'react-native';
import { useTasks } from '../../hooks/useTasks';
import { Plus, Trash2, CalendarClock, X, Edit3, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTodayDateString, formatTime12h, dateToString, getFriendlyDate } from '../../lib/time';
import { Task } from '../../lib/db';

// ─── Priority config ─────────────────────────────────────────────────────────
const PRIORITIES: Array<{ value: Task['priority']; label: string; color: string; bg: string }> = [
  { value: 'HIGH',   label: '🔴 High',   color: '#ef4444', bg: '#fee2e2' },
  { value: 'MEDIUM', label: '🟡 Medium', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'LOW',    label: '🟢 Low',    color: '#10b981', bg: '#d1fae5' },
];

const CATEGORIES: Array<{ value: Task['category']; label: string }> = [
  { value: 'MORNING',   label: '🌅 Morning'   },
  { value: 'AFTERNOON', label: '☀️ Afternoon' },
  { value: 'EVENING',   label: '🌙 Evening'   },
  { value: 'NIGHT',     label: '🌃 Night'     },
];

const RECURRENCES: Array<{ value: string; label: string }> = [
  { value: 'DAILY',    label: '📅 Every Day'   },
  { value: 'WEEKDAYS', label: '💼 Weekdays'    },
  { value: 'WEEKENDS', label: '🎉 Weekends'    },
  { value: 'WEEKLY',   label: '🗓️ Same day/week' },
];

// ─── Custom Time Picker (pure JS, no native deps) ────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = value.split(':').map(Number);

  const step = (field: 'h' | 'm', dir: 1 | -1) => {
    if (field === 'h') {
      const next = ((h + dir + 24) % 24);
      onChange(`${String(next).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    } else {
      const next = ((m + dir * 5 + 60) % 60);
      onChange(`${String(h).padStart(2, '0')}:${String(next).padStart(2, '0')}`);
    }
  };

  const isAM = h < 12;
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;

  return (
    <View style={tp.container}>
      {/* Hours */}
      <View style={tp.wheel}>
        <Pressable onPress={() => step('h', 1)} style={tp.arrow}><ChevronUp size={20} color="#f43f5e" /></Pressable>
        <Text style={tp.digit}>{String(h12).padStart(2, '0')}</Text>
        <Pressable onPress={() => step('h', -1)} style={tp.arrow}><ChevronDown size={20} color="#f43f5e" /></Pressable>
      </View>

      <Text style={tp.colon}>:</Text>

      {/* Minutes */}
      <View style={tp.wheel}>
        <Pressable onPress={() => step('m', 1)} style={tp.arrow}><ChevronUp size={20} color="#f43f5e" /></Pressable>
        <Text style={tp.digit}>{String(m).padStart(2, '0')}</Text>
        <Pressable onPress={() => step('m', -1)} style={tp.arrow}><ChevronDown size={20} color="#f43f5e" /></Pressable>
      </View>

      {/* AM/PM */}
      <Pressable
        onPress={() => onChange(`${String(isAM ? h + 12 : h - 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`)}
        style={tp.ampm}
      >
        <Text style={tp.ampmText}>{isAM ? 'AM' : 'PM'}</Text>
      </Pressable>
    </View>
  );
}

const tp = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wheel:     { alignItems: 'center', gap: 4 },
  arrow:     { padding: 8, backgroundColor: '#fff1f2', borderRadius: 10 },
  digit:     { fontSize: 36, fontWeight: 'bold', color: '#1e293b', minWidth: 54, textAlign: 'center' },
  colon:     { fontSize: 36, fontWeight: 'bold', color: '#f43f5e', marginBottom: 4 },
  ampm:      { backgroundColor: '#f43f5e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
  ampmText:  { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

// ─── Custom Date Picker ───────────────────────────────────────────────────────
function DateSelector({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    dates.push(dateToString(d));
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
        {dates.map((d) => {
          const selected = d === value;
          const [, , day] = d.split('-');
          const [y, m, dy] = d.split('-').map(Number);
          const date = new Date(y, m - 1, dy);
          const dow = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
          return (
            <Pressable
              key={d}
              onPress={() => onChange(d)}
              style={[ds.chip, selected && ds.chipSelected]}
            >
              <Text style={[ds.dow, selected && ds.dowSelected]}>{dow}</Text>
              <Text style={[ds.day, selected && ds.daySelected]}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const ds = StyleSheet.create({
  chip:         { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#f1f5f9', minWidth: 52 },
  chipSelected: { backgroundColor: '#f43f5e' },
  dow:          { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginBottom: 2 },
  dowSelected:  { color: 'rgba(255,255,255,0.8)' },
  day:          { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  daySelected:  { color: '#fff' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
const emptyForm = () => ({
  title:        '',
  description:  '',
  time:         '09:00',
  priority:     'MEDIUM' as Task['priority'],
  category:     'MORNING' as Task['category'],
  date:         getTodayDateString(),
  is_recurring: false,
  recurrence:   'DAILY',
});

export default function ScheduleScreen() {
  const { tasks, removeTask, addTask, loading, refetch } = useTasks();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState(getTodayDateString());

  const openAdd = () => {
    setForm({ ...emptyForm(), date: filterDate });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Missing title', 'Please enter a task title.');
      return;
    }
    setSaving(true);
    const result = await addTask({
      title:        form.title,
      description:  form.description || undefined,
      time:         form.time,
      priority:     form.priority,
      category:     form.category,
      date:         form.date,
      is_recurring: form.is_recurring,
      recurrence:   form.is_recurring ? form.recurrence : undefined,
    });
    setSaving(false);

    if (result.success) {
      setShowModal(false);
      setForm(emptyForm());
    } else {
      Alert.alert('Could not save task', result.error);
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeTask(task.id) },
      ]
    );
  };

  // Filter tasks by selected date
  const displayedTasks = tasks.filter((t) => t.date === filterDate);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Schedule</Text>
            <Text style={styles.subtitle}>{getFriendlyDate(filterDate)}</Text>
          </View>
          <Pressable onPress={openAdd}>
            <LinearGradient
              colors={['#fb7185', '#ec4899']}
              style={styles.addBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Plus color="#fff" size={18} />
              <Text style={styles.addBtnText}>Add Task</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Date strip */}
        <DateSelector value={filterDate} onChange={setFilterDate} />

        {/* Task list */}
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : displayedTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarClock size={40} color="#fda4af" />
              <Text style={styles.emptyText}>No tasks for this day.{'\n'}Tap + to add one!</Text>
            </View>
          ) : (
            displayedTasks.map((task, i) => (
              <View
                key={task.id}
                style={[
                  styles.taskRow,
                  i !== displayedTasks.length - 1 && styles.borderBottom,
                ]}
              >
                {/* Priority stripe */}
                <View style={[
                  styles.stripe,
                  {
                    backgroundColor:
                      task.priority === 'HIGH'   ? '#ef4444' :
                      task.priority === 'MEDIUM' ? '#f59e0b' : '#10b981',
                  }
                ]} />

                <View style={styles.taskInfo}>
                  <Text style={[
                    styles.taskTitle,
                    task.status === 'COMPLETED' && styles.taskDone,
                    task.status === 'MISSED'    && styles.taskMissed,
                  ]}>
                    {task.title}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={styles.timeTag}>
                      <Text style={styles.timeText}>{formatTime12h(task.time)}</Text>
                    </View>
                    <View style={styles.catTag}>
                      <Text style={styles.catText}>{task.category}</Text>
                    </View>
                    {task.is_recurring && (
                      <View style={styles.recurTag}>
                        <RotateCcw size={10} color="#a855f7" />
                        <Text style={styles.recurText}>{task.recurrence}</Text>
                      </View>
                    )}
                    <View style={[
                      styles.statusTag,
                      task.status === 'COMPLETED' && { backgroundColor: '#d1fae5' },
                      task.status === 'MISSED'    && { backgroundColor: '#fee2e2' },
                    ]}>
                      <Text style={[
                        styles.statusText,
                        task.status === 'COMPLETED' && { color: '#059669' },
                        task.status === 'MISSED'    && { color: '#ef4444' },
                      ]}>
                        {task.status === 'COMPLETED' ? '✅ Done' : task.status === 'MISSED' ? '❌ Missed' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable onPress={() => handleDelete(task)} style={styles.deleteBtn}>
                  <Trash2 size={18} color="#cbd5e1" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <Pressable onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <X size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Task Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#94a3b8"
                  value={form.title}
                  onChangeText={(t) => setForm({ ...form, title: t })}
                  maxLength={100}
                />
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder="Any details..."
                  placeholderTextColor="#94a3b8"
                  value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                  multiline
                  maxLength={300}
                />
              </View>

              {/* Time picker */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Time</Text>
                <View style={styles.timePickerBox}>
                  <TimePicker value={form.time} onChange={(t) => setForm({ ...form, time: t })} />
                </View>
              </View>

              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Date</Text>
                <DateSelector value={form.date} onChange={(d) => setForm({ ...form, date: d })} />
              </View>

              {/* Priority */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.chipRow}>
                  {PRIORITIES.map((p) => (
                    <Pressable
                      key={p.value}
                      onPress={() => setForm({ ...form, priority: p.value })}
                      style={[
                        styles.selectorChip,
                        { borderColor: p.color, backgroundColor: form.priority === p.value ? p.bg : '#f8fafc' },
                      ]}
                    >
                      <Text style={[styles.selectorChipText, form.priority === p.value && { color: p.color, fontWeight: '700' }]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c.value}
                      onPress={() => setForm({ ...form, category: c.value })}
                      style={[
                        styles.selectorChip,
                        form.category === c.value && { backgroundColor: '#fff1f2', borderColor: '#f43f5e' },
                      ]}
                    >
                      <Text style={[styles.selectorChipText, form.category === c.value && { color: '#f43f5e', fontWeight: '700' }]}>
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Recurring */}
              <View style={styles.fieldGroup}>
                <View style={styles.recurRow}>
                  <View>
                    <Text style={styles.label}>Repeat</Text>
                    <Text style={styles.labelSub}>Schedule this task regularly</Text>
                  </View>
                  <Switch
                    value={form.is_recurring}
                    onValueChange={(v) => setForm({ ...form, is_recurring: v })}
                    trackColor={{ false: '#e2e8f0', true: '#fda4af' }}
                    thumbColor={form.is_recurring ? '#f43f5e' : '#94a3b8'}
                  />
                </View>
                {form.is_recurring && (
                  <View style={styles.chipRow}>
                    {RECURRENCES.map((r) => (
                      <Pressable
                        key={r.value}
                        onPress={() => setForm({ ...form, recurrence: r.value })}
                        style={[
                          styles.selectorChip,
                          form.recurrence === r.value && { backgroundColor: '#fdf4ff', borderColor: '#a855f7' },
                        ]}
                      >
                        <Text style={[styles.selectorChipText, form.recurrence === r.value && { color: '#a855f7', fontWeight: '700' }]}>
                          {r.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Save button */}
              <Pressable onPress={handleSave} disabled={saving} style={{ borderRadius: 100, overflow: 'hidden', marginTop: 8, marginBottom: 20 }}>
                <LinearGradient
                  colors={saving ? ['#cbd5e1', '#94a3b8'] : ['#fb7185', '#ec4899']}
                  style={styles.saveBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : '✓ Save Task'}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content:   { padding: 16, gap: 16, paddingBottom: 40 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle:    { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  emptyState: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText:  { color: '#94a3b8', textAlign: 'center', fontSize: 14, lineHeight: 20 },

  taskRow:    { flexDirection: 'row', alignItems: 'center' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  stripe:     { width: 4, alignSelf: 'stretch' },
  taskInfo:   { flex: 1, paddingVertical: 14, paddingLeft: 12, gap: 6 },
  taskTitle:  { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  taskDone:   { textDecorationLine: 'line-through', color: '#94a3b8' },
  taskMissed: { color: '#f87171' },
  tagRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  timeTag:    { backgroundColor: '#fff1f2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  timeText:   { color: '#f43f5e', fontSize: 11, fontWeight: '600' },
  catTag:     { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  catText:    { color: '#64748b', fontSize: 11, fontWeight: '600' },
  recurTag:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fdf4ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  recurText:  { color: '#a855f7', fontSize: 11, fontWeight: '600' },
  statusTag:  { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  statusText: { color: '#d97706', fontSize: 11, fontWeight: '600' },
  deleteBtn:  { padding: 14 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '95%' },
  modalHandle:  { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  closeBtn:     { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 100 },

  fieldGroup:     { marginBottom: 16 },
  label:          { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  labelSub:       { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  input:          { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b' },
  timePickerBox:  { backgroundColor: '#fafaf9', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  selectorChipText: { fontSize: 13, color: '#64748b' },
  recurRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  saveBtn:     { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
