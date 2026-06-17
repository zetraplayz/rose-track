/**
 * app/(tabs)/settings.tsx
 * Settings: Supabase cloud sync, notification status, timezone info.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Switch,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { syncDataToCloud } from '../../lib/sync';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestNotificationPermission, cancelAllNotifications, getPendingNotifications } from '../../lib/notifications';
import { getTodayDateString, getCurrentTimeString } from '../../lib/time';
import { Cloud, Bell, ShieldCheck, LogOut, RefreshCw, Clock } from 'lucide-react-native';

export default function SettingsScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [session,  setSession]  = useState<any>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    loadNotifInfo();
    return () => subscription.unsubscribe();
  }, []);

  const loadNotifInfo = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    const pending = await getPendingNotifications();
    setNotifCount(pending.length);
  };

  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail('');
    setPassword('');
  };

  const handleSync = async () => {
    setSyncing(true);
    const ok = await syncDataToCloud();
    setSyncing(false);
    Alert.alert(
      ok ? 'Sync Complete ✅' : 'Sync Failed ❌',
      ok
        ? 'All data has been uploaded to the cloud.'
        : 'Could not sync. Check your internet connection.',
    );
  };

  const handleClearNotifications = async () => {
    Alert.alert('Clear All Notifications', 'This will cancel all scheduled reminders. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await cancelAllNotifications();
          setNotifCount(0);
          Alert.alert('Done', 'All scheduled notifications cleared.');
        },
      },
    ]);
  };

  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.title}>Settings</Text>

        {/* Time & Timezone info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color="#f43f5e" />
            <Text style={styles.sectionTitle}>Device Time</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current time</Text>
            <Text style={styles.infoValue}>{getCurrentTimeString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Today</Text>
            <Text style={styles.infoValue}>{getTodayDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timezone</Text>
            <Text style={styles.infoValue}>{timezone}</Text>
          </View>
        </View>

        {/* Notification status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={16} color="#f43f5e" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Permission</Text>
            <Text style={[styles.infoValue, { color: notifGranted ? '#10b981' : '#ef4444' }]}>
              {notifGranted ? '✅ Granted' : '❌ Not granted'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scheduled reminders</Text>
            <Text style={styles.infoValue}>{notifCount}</Text>
          </View>
          <TouchableOpacity onPress={loadNotifInfo} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>↻ Refresh</Text>
          </TouchableOpacity>
          {notifCount > 0 && (
            <TouchableOpacity onPress={handleClearNotifications} style={[styles.smallBtn, styles.dangerBtn]}>
              <Text style={[styles.smallBtnText, { color: '#ef4444' }]}>Clear all notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={16} color="#f43f5e" />
            <Text style={styles.sectionTitle}>Security</Text>
          </View>
          <Text style={styles.infoText}>
            All your data is stored securely on this device using SQLite.
            Cloud sync is optional and only happens when you press the button below.
            Your data never leaves this device automatically.
          </Text>
        </View>

        {/* Cloud sync */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Cloud size={16} color="#f43f5e" />
            <Text style={styles.sectionTitle}>Cloud Sync (Optional)</Text>
          </View>
          <Text style={styles.infoText}>
            Log in to securely sync your progress to the admin dashboard.
          </Text>

          {!session ? (
            <View style={styles.authBox}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.btn} onPress={signIn} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Sign In</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authBox}>
              <Text style={styles.loggedIn}>Logged in as:</Text>
              <Text style={styles.loggedInEmail}>{session.user.email}</Text>

              <TouchableOpacity
                style={[styles.btn, styles.syncBtn]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <RefreshCw size={16} color="#fff" />
                      <Text style={styles.btnText}>Sync to Cloud</Text>
                    </>
                }
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.logoutBtn]} onPress={signOut}>
                <LogOut size={16} color="#ef4444" />
                <Text style={[styles.btnText, { color: '#ef4444' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.version}>Rose Track v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content:   { padding: 16, gap: 16, paddingBottom: 40 },
  title:     { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: '#334155' },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel:     { fontSize: 13, color: '#64748b' },
  infoValue:     { fontSize: 13, fontWeight: '600', color: '#334155' },
  infoText:      { fontSize: 13, color: '#64748b', lineHeight: 20 },

  smallBtn:     { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 100 },
  dangerBtn:    { backgroundColor: '#fff5f5' },
  smallBtnText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  authBox: { gap: 10, marginTop: 4 },
  input:   { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, fontSize: 15, color: '#1e293b' },
  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', padding: 14, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  syncBtn: { backgroundColor: '#10b981' },
  logoutBtn: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca' },
  loggedIn:      { fontSize: 13, color: '#64748b' },
  loggedInEmail: { fontSize: 15, fontWeight: '600', color: '#334155' },

  version: { textAlign: 'center', color: '#cbd5e1', fontSize: 12 },
});
