/**
 * app/(tabs)/progress.tsx
 * Real SVG bar chart + streak counter using react-native-svg.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { getStats, getHistory, HistoryRecord } from '../../lib/db';
import { getTodayDateString, getLastNDays, getFriendlyDate } from '../../lib/time';
import { LinearGradient } from 'expo-linear-gradient';

const CHART_HEIGHT = 180;
const CHART_PADDING = { top: 16, bottom: 28, left: 8, right: 8 };
const BAR_RADIUS = 6;

function BarChart({ data }: { data: HistoryRecord[] }) {
  const chartDates  = getLastNDays(7);
  const dataByDate  = Object.fromEntries(data.map((d) => [d.date, d]));
  const maxScore    = 100;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // We'll measure width at runtime. Use a fixed width estimate.
  const CHART_WIDTH = 320;
  const innerWidth  = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const barCount    = chartDates.length;
  const barWidth    = Math.floor(innerWidth / barCount) - 6;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      <G x={CHART_PADDING.left} y={CHART_PADDING.top}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = innerHeight - (pct / maxScore) * innerHeight;
          return (
            <G key={pct}>
              <Line
                x1={0} y1={y}
                x2={innerWidth} y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            </G>
          );
        })}

        {/* Bars */}
        {chartDates.map((date, i) => {
          const record = dataByDate[date];
          const score  = record?.completion_score ?? 0;
          const barH   = Math.max(4, (score / maxScore) * innerHeight);
          const x      = i * (barWidth + 6);
          const y      = innerHeight - barH;
          const isToday = date === getTodayDateString();

          // Color by score
          const fill =
            score >= 80 ? '#10b981' :
            score >= 50 ? '#f59e0b' :
            score >  0  ? '#fb7185' : '#e2e8f0';

          // Day label
          const [yr, mo, dy] = date.split('-').map(Number);
          const d = new Date(yr, mo - 1, dy);
          const dow = ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];

          return (
            <G key={date}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={fill}
                rx={BAR_RADIUS}
                opacity={isToday ? 1 : 0.75}
              />
              {score > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#64748b"
                >
                  {Math.round(score)}%
                </SvgText>
              )}
              <SvgText
                x={x + barWidth / 2}
                y={innerHeight + 16}
                textAnchor="middle"
                fontSize={isToday ? 10 : 9}
                fontWeight={isToday ? 'bold' : 'normal'}
                fill={isToday ? '#f43f5e' : '#94a3b8'}
              >
                {dow}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[sc.card, { borderColor: color + '33' }]}>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card:  { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  value: { fontSize: 28, fontWeight: 'bold' },
  label: { fontSize: 12, color: '#64748b', marginTop: 2, textAlign: 'center' },
});

function StreakBadge({ streak }: { streak: number }) {
  const emoji = streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '🌸';
  return (
    <LinearGradient colors={['#fef9c3', '#fef3c7']} style={str.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <Text style={str.emoji}>{emoji}</Text>
      <View>
        <Text style={str.count}>{streak} day streak!</Text>
        <Text style={str.sub}>Keep it up 💪</Text>
      </View>
    </LinearGradient>
  );
}

const str = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16 },
  emoji: { fontSize: 36 },
  count: { fontSize: 18, fontWeight: 'bold', color: '#92400e' },
  sub:   { fontSize: 12, color: '#b45309' },
});

export default function ProgressScreen() {
  const [stats,   setStats]   = useState<any>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const today = getTodayDateString();
    const [s, h] = await Promise.all([getStats(today), getHistory(30)]);
    setStats(s);
    setHistory(h);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Calculate streak: consecutive days with completion_score > 0
  const streak = (() => {
    const sortedDesc = [...history].sort((a, b) => b.date.localeCompare(a.date));
    let count = 0;
    let prev  = getTodayDateString();
    for (const r of sortedDesc) {
      if (r.date !== prev) break;
      if (r.completion_score <= 0) break;
      count++;
      const d = new Date(r.date);
      d.setDate(d.getDate() - 1);
      prev = d.toISOString().split('T')[0];
    }
    return count;
  })();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#f43f5e" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>See how consistent you've been 🌸</Text>
      </View>

      {streak > 0 && <StreakBadge streak={streak} />}

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatCard label="Today's Score"   value={`${stats?.todayRate ?? 0}%`} color="#f43f5e" />
        <StatCard label="All Completed"   value={stats?.completed ?? 0}       color="#10b981" />
      </View>
      <View style={styles.grid}>
        <StatCard label="Total Tasks"     value={stats?.total ?? 0}           color="#6366f1" />
        <StatCard label="Total Missed"    value={stats?.missed ?? 0}          color="#f87171" />
      </View>

      {/* Weekly chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weekly Completion</Text>
        <View style={styles.legendRow}>
          {[
            { color: '#10b981', label: '≥80%' },
            { color: '#f59e0b', label: '50-79%' },
            { color: '#fb7185', label: '<50%' },
            { color: '#e2e8f0', label: 'No tasks' },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendLabel}>{l.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ alignItems: 'center' }}>
          <BarChart data={history} />
        </View>
      </View>

      {/* 30-day history list */}
      <View style={styles.historyCard}>
        <Text style={styles.chartTitle}>30-Day History</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No history yet. Complete some tasks!</Text>
        ) : (
          [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).map((r) => (
            <View key={r.date} style={styles.histRow}>
              <Text style={styles.histDate}>{getFriendlyDate(r.date)}</Text>
              <View style={styles.histBarBg}>
                <View
                  style={[
                    styles.histBarFill,
                    {
                      width: `${r.completion_score}%` as any,
                      backgroundColor:
                        r.completion_score >= 80 ? '#10b981' :
                        r.completion_score >= 50 ? '#f59e0b' : '#fb7185',
                    },
                  ]}
                />
              </View>
              <Text style={styles.histScore}>{Math.round(r.completion_score)}%</Text>
            </View>
          ))
        )}
      </View>

      <Pressable onPress={load} style={styles.refreshBtn}>
        <Text style={styles.refreshText}>↻ Refresh</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf9' },
  content:   { padding: 16, gap: 16, paddingBottom: 40 },

  header:   { gap: 4 },
  title:    { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b' },

  grid: { flexDirection: 'row', gap: 12 },

  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: 'bold', color: '#334155', marginBottom: 10 },
  legendRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#64748b' },

  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
  },
  histRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histDate:  { fontSize: 12, color: '#64748b', width: 80 },
  histBarBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  histBarFill: { height: '100%', borderRadius: 4 },
  histScore: { fontSize: 12, fontWeight: '600', color: '#334155', width: 36, textAlign: 'right' },

  emptyText: { color: '#94a3b8', textAlign: 'center', padding: 20 },

  refreshBtn: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 100, borderWidth: 1, borderColor: '#e2e8f0' },
  refreshText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
});
