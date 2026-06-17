/**
 * app/(tabs)/alarms.tsx
 * Standalone alarm clock screen — set alarms by time and repeat days.
 * Independent of tasks. Like a real alarm clock app for her.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, Switch, Alert,
} from 'react-native';
import { useAlarms } from '../../hooks/useTasks';
import { Plus, Trash2, BellRing, Bell, BellOff, ChevronUp, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Alarm } from '../../lib/db';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = {
  MON: 'M', TUE: 'T', WED: 'W', THU: 'Th', FRI: 'F', SAT: 'Sa', SUN: 'Su',
};

function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = value.split(':').map(Number);
  const step = (field: 'h' | 'm', dir: 1 | -1) => {
    if (field === 'h') onChange(`${String(((h + dir + 24) % 24)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    else               onChange(`${String(h).padStart(2, '0')}:${String(((m + dir * 5 + 60) % 60)).padStart(2, '0')}`);
  };
  const isAM = h < 12;
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;

  return (
    <View style={tp.row}>
      <View style={tp.wheel}>
        <Pressable onPress={() => step('h', 1)}  style={tp.arrow}><ChevronUp   size={22} color="#f43f5e" /></Pressable>
        <Text style={tp.digit}>{String(h12).padStart(2, '0')}</Text>
        <Pressable onPress={() => step('h', -1)} style={tp.arrow}><ChevronDown size={22} color="#f43f5e" /></Pressable>
      </View>
      <Text style={tp.colon}>:</Text>
      <View style={tp.wheel}>
        <Pressable onPress={() => step('m', 1)}  style={tp.arrow}><ChevronUp   size={22} color="#f43f5e" /></Pressable>
        <Text style={tp.digit}>{String(m).padStart(2, '0')}</Text>
        <Pressable onPress={() => step('m', -1)} style={tp.arrow}><ChevronDown size={22} color="#f43f5e" /></Pressable>
      </View>
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
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  wheel:    { alignItems: 'center', gap: 6 },
  arrow:    { padding: 10, backgroundColor: '#fff1f2', borderRadius: 12 },
  digit:    { fontSize: 44, fontWeight: 'bold', color: '#1e293b', minWidth: 58, textAlign: 'center' },
  colon:    { fontSize: 44, fontWeight: 'bold', color: '#f43f5e', marginBottom: 8 },
  ampm:     { backgroundColor: '#f43f5e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginLeft: 10 },
  ampmText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});

function AlarmCard({ alarm, onToggle, onDelete }: {
  alarm: Alarm;
  onToggle: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const days: string[] = JSON.parse(alarm.days || '[]');
  const [h, m] = alarm.time.split(':').map(Number);
  const isAM = h < 12;
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const timeStr = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;

  return (
    <View style={[card.container, !alarm.is_enabled && card.disabled]}>
      <View style={card.info}>
        <Text style={[card.time, !alarm.is_enabled && card.timeOff]}>{timeStr}</Text>
        <Text style={card.label}>{alarm.label}</Text>
        <View style={card.days}>
          {DAYS.map((d) => (
            <View key={d} style={[card.dayChip, days.includes(d) && card.dayChipActive]}>
              <Text style={[card.dayText, days.includes(d) && card.dayTextActive]}>{DAY_LABELS[d]}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={card.actions}>
        <Switch
          value={alarm.is_enabled}
          onValueChange={(v) => onToggle(alarm.id, v)}
          trackColor={{ false: '#e2e8f0', true: '#fda4af' }}
          thumbColor={alarm.is_enabled ? '#f43f5e' : '#94a3b8'}
        />
        <Pressable onPress={() => onDelete(alarm.id)} style={card.delBtn}>
          <Trash2 size={16} color="#cbd5e1" />
        </Pressable>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, alignItems: 'center' },
  disabled:  { opacity: 0.5 },
  info:      { flex: 1, gap: 4 },
  time:      { fontSize: 36, fontWeight: 'bold', color: '#1e293b', letterSpacing: -1 },
  timeOff:   { color: '#94a3b8' },
  label:     { fontSize: 13, color: '#64748b', fontWeight: '500' },
  days:      { flexDirection: 'row', gap: 4, marginTop: 6 },
  dayChip:   { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: '#fda4af' },
  dayText:   { fontSize: 9, fontWeight: '600', color: '#94a3b8' },
  dayTextActive: { color: '#be123c' },
  actions:   { gap: 12, alignItems: 'center' },
  delBtn:    { padding: 8 },
});

export default function AlarmsScreen() {
  const { alarms, loading, addAlarm, toggleAlarm, removeAlarm } = useAlarms();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    label:   'Alarm',
    time:    '07:00',
    days:    [] as string[],
    vibrate: true,
  });

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const handleSave = async () => {
    await addAlarm(form);
    setShowModal(false);
    setForm({ label: 'Alarm', time: '07:00', days: [], vibrate: true });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Alarm', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeAlarm(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Alarms</Text>
            <Text style={styles.subtitle}>{alarms.length} alarm{alarms.length !== 1 ? 's' : ''} set</Text>
          </View>
          <Pressable onPress={() => setShowModal(true)}>
            <LinearGradient colors={['#fb7185', '#ec4899']} style={styles.addBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Plus color="#fff" size={18} />
              <Text style={styles.addBtnText}>New Alarm</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {alarms.length === 0 ? (
          <View style={styles.empty}>
            <BellOff size={48} color="#fda4af" />
            <Text style={styles.emptyText}>No alarms yet.{'\n'}Add one to get started!</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {alarms.map((a) => (
              <AlarmCard
                key={a.id}
                alarm={a}
                onToggle={toggleAlarm}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Alarm Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Alarm</Text>
              <Pressable onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <Text style={{ fontSize: 18, color: '#64748b' }}>✕</Text>
              </Pressable>
            </View>

            {/* Time picker */}
            <View style={styles.timeBox}>
              <TimePicker value={form.time} onChange={(t) => setForm({ ...form, time: t })} />
            </View>

            {/* Days */}
            <Text style={styles.label}>Repeat</Text>
            <View style={styles.daysRow}>
              {DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={[styles.dayBtn, form.days.includes(d) && styles.dayBtnActive]}
                >
                  <Text style={[styles.dayBtnText, form.days.includes(d) && styles.dayBtnTextActive]}>
                    {DAY_LABELS[d]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Vibrate */}
            <View style={styles.row}>
              <Text style={styles.label}>Vibrate</Text>
              <Switch
                value={form.vibrate}
                onValueChange={(v) => setForm({ ...form, vibrate: v })}
                trackColor={{ false: '#e2e8f0', true: '#fda4af' }}
                thumbColor={form.vibrate ? '#f43f5e' : '#94a3b8'}
              />
            </View>

            {/* Save */}
            <Pressable onPress={handleSave} style={{ borderRadius: 100, overflow: 'hidden', marginTop: 20 }}>
              <LinearGradient colors={['#fb7185', '#ec4899']} style={styles.saveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.saveBtnText}>Set Alarm</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content:   { padding: 16, gap: 16, paddingBottom: 40 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:     { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle:  { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list:      { gap: 12 },
  empty:     { alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { color: '#94a3b8', textAlign: 'center', fontSize: 15, lineHeight: 22 },

  // Modal
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modal:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle:      { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:  { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  closeBtn:    { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 100 },
  timeBox:     { backgroundColor: '#fafaf9', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  label:       { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 12 },
  daysRow:     { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dayBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e2e8f0' },
  dayBtnActive: { backgroundColor: '#fff1f2', borderColor: '#f43f5e' },
  dayBtnText:  { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  dayBtnTextActive: { color: '#f43f5e' },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  saveBtn:     { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
