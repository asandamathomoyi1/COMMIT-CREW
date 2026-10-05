import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---- Design tokens (read off the Figma — adjust to match your real theme file) ----
const COLORS = {
  primary: '#2F5FDB',
  primaryDark: '#1E3FA8',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  orange: '#F59E0B',
  purple: '#7C3AED',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F5F7FB',
  card: '#FFFFFF',
};

// ---- Mock data — swap for real data once wired up to your MedsScreen/SQLite store ----
const WEEKLY_RATE = 89;
const TAKEN_COUNT = 31;
const MISSED_COUNT = 4;

const DAILY_DATA = [
  { day: 'Mon', taken: 4, missed: 0 },
  { day: 'Tue', taken: 3, missed: 1 },
  { day: 'Wed', taken: 4, missed: 0 },
  { day: 'Thu', taken: 3, missed: 1 },
  { day: 'Fri', taken: 4, missed: 0 },
  { day: 'Sat', taken: 4, missed: 0 },
  { day: 'Sun', taken: 4, missed: 0 },
];
const MAX_DAILY = 8;

const MEDICATION_ADHERENCE = [
  { name: 'Novolog', percent: 93, color: COLORS.blue },
  { name: 'Metformin', percent: 89, color: COLORS.green },
  { name: 'Vitamin D3', percent: 96, color: COLORS.orange },
  { name: 'Lisinopril', percent: 84, color: COLORS.purple },
];

const RECENT_LOG = [
  { name: 'Metformin 500mg', when: 'Today · 08:00', status: 'Taken' },
  { name: 'Novolog 10 units', when: 'Today · 07:30', status: 'Taken' },
  { name: 'Metformin 500mg', when: 'Yesterday · 20:00', status: 'Taken' },
  { name: 'Novolog 10 units', when: 'Yesterday · 18:30', status: 'Missed' },
  { name: 'Novolog 10 units', when: 'Yesterday · 12:30', status: 'Taken' },
];

function StatCard({ value, label, tint, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DailyBarChart() {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.sectionTitle}>Daily Taken vs Missed</Text>
      <View style={styles.chartArea}>
        {DAILY_DATA.map((d) => (
          <View key={d.day} style={styles.chartColumn}>
            <View style={styles.barTrack}>
              {d.taken > 0 && (
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${(d.taken / MAX_DAILY) * 100}%`,
                      backgroundColor: COLORS.green,
                    },
                  ]}
                />
              )}
              {d.missed > 0 && (
                <View
                  style={[
                    styles.bar,
                    styles.missedBar,
                    {
                      height: `${(d.missed / MAX_DAILY) * 100}%`,
                      backgroundColor: COLORS.red,
                    },
                  ]}
                />
              )}
            </View>
            <Text style={styles.chartDayLabel}>{d.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MedicationBar({ name, percent, color }) {
  return (
    <View style={styles.medRow}>
      <View style={styles.medRowHeader}>
        <Text style={styles.medName}>{name}</Text>
        <Text style={[styles.medPercent, { color }]}>{percent}%</Text>
      </View>
      <View style={styles.medTrack}>
        <View
          style={[
            styles.medFill,
            { width: `${percent}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function RecentLogRow({ item }) {
  const isTaken = item.status === 'Taken';
  return (
    <View style={styles.logRow}>
      <View>
        <Text style={styles.logName}>{item.name}</Text>
        <Text style={styles.logWhen}>{item.when}</Text>
      </View>
      <View
        style={[
          styles.logBadge,
          { backgroundColor: isTaken ? COLORS.greenLight : COLORS.redLight },
        ]}
      >
        <Text
          style={[
            styles.logBadgeText,
            { color: isTaken ? COLORS.green : COLORS.red },
          ]}
        >
          {item.status}
        </Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [range, setRange] = useState('week'); // 'week' | 'month'

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Adherence History</Text>
            <Text style={styles.headerSubtitle}>
              Track your medication adherence
            </Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            value={`${WEEKLY_RATE}%`}
            label="Weekly Rate"
            tint={COLORS.green}
            bg={COLORS.greenLight}
          />
          <StatCard
            value={TAKEN_COUNT}
            label="Taken"
            tint={COLORS.blue}
            bg={COLORS.blueLight}
          />
          <StatCard
            value={MISSED_COUNT}
            label="Missed"
            tint={COLORS.red}
            bg={COLORS.redLight}
          />
        </View>

        {/* This Week / Monthly toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, range === 'week' && styles.toggleBtnActive]}
            onPress={() => setRange('week')}
          >
            <Text
              style={[
                styles.toggleText,
                range === 'week' && styles.toggleTextActive,
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, range === 'month' && styles.toggleBtnActive]}
            onPress={() => setRange('month')}
          >
            <Text
              style={[
                styles.toggleText,
                range === 'month' && styles.toggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bar chart */}
        <DailyBarChart />

        {/* By Medication */}
        <View style={styles.medCard}>
          <Text style={styles.sectionTitle}>By Medication</Text>
          {MEDICATION_ADHERENCE.map((m) => (
            <MedicationBar
              key={m.name}
              name={m.name}
              percent={m.percent}
              color={m.color}
            />
          ))}
        </View>

        {/* Streak banner */}
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>7-day streak!</Text>
            <Text style={styles.streakSubtitle}>
              You've taken all meds on time for a week. Keep it up!
            </Text>
          </View>
        </View>

        {/* Recent log */}
        <View style={styles.logCard}>
          <Text style={styles.sectionTitle}>Recent Log</Text>
          {RECENT_LOG.map((item, i) => (
            <RecentLogRow key={`${item.name}-${i}`} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  toggleTextActive: { color: '#FFFFFF' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 140,
    alignItems: 'flex-end',
  },
  chartColumn: { alignItems: 'center', flex: 1 },
  barTrack: {
    width: 14,
    height: 110,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: 4 },
  missedBar: { marginTop: 2 },
  chartDayLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },

  medCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  medRow: { marginBottom: 14 },
  medRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  medName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  medPercent: { fontSize: 14, fontWeight: '700' },
  medTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  medFill: { height: '100%', borderRadius: 3 },

  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  streakEmoji: { fontSize: 28 },
  streakTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  streakSubtitle: { fontSize: 12, color: '#E5EBFF', marginTop: 2 },

  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  },
  logName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  logWhen: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  logBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  logBadgeText: { fontSize: 12, fontWeight: '600' },
});