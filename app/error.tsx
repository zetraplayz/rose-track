import { ErrorBoundaryProps } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import React from 'react';

export default function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Error Detected</Text>
      <Text style={styles.subtitle}>Please copy this exact text and send it back:</Text>
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{error?.message || 'Unknown Error'}</Text>
      </View>
      <Text style={styles.stackTitle}>Stack Trace:</Text>
      <Text style={styles.errorStack}>{error?.stack || 'No stack trace available'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e11d48' },
  subtitle: { fontSize: 16, marginTop: 8, color: '#333' },
  errorBox: { marginTop: 20, padding: 16, backgroundColor: '#ffe4e6', borderRadius: 8 },
  errorText: { fontSize: 16, color: '#9f1239', fontWeight: 'bold' },
  stackTitle: { fontSize: 16, marginTop: 24, fontWeight: 'bold', color: '#333' },
  errorStack: { fontSize: 12, marginTop: 8, color: '#666', fontFamily: 'monospace' }
});
