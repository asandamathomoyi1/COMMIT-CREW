import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---- Design tokens (matches AnalyticsScreen.js — keep in sync until you have a shared theme file) ----
const COLORS = {
  primary: '#2F5FDB',
  blue: '#2563EB',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F5F7FB',
  card: '#FFFFFF',
  locked: '#9CA3AF',
  lockedBg: '#F3F4F6',
};

// ---- Mock data — replace with real computed values from your dose-history store ----
const CURRENT_STREAK = 7;

const BADGES = [
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Logged your first dose',
    emoji: '👣',
    earned: true,
    tint: COLORS.blue,
  },
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Took every dose for 3 days straight',
    emoji: '🔥',
    earned: true,
    tint: COLORS.orange,
  },
  {
    id: 'streak-7',
    title: '7-Day Streak',
    description: 'A full week, zero missed doses',
    emoji: '🔥',
    earned: true,
    tint: COLORS.orange,
  },
  {
    id: 'perfect-week',
    title: 'Perfect Week',
    description: '100% adherence in a single week',
    emoji: '⭐',
    earned: true,
    tint: COLORS.purple,
  },
  {
    id: 'streak-30',
    title: '30-Day Streak',
    description: 'One month of consistent doses',
    emoji: '🏆',
    earned: false,
    progress: 7,
    target: 30,
    tint: COLORS.purple,
  },
  {
    id: 'consistency-champ',
    title: 'Consistency Champ',
    description: '90%+ adherence over a full month',
    emoji: '🎯',
    earned: false,
    progress: 89,
    target: 90,
    isPercent: true,
    tint: COLORS.green,
  },
  {
    id: 'comeback',
    title: 'Comeback',
    description: 'Got back on track within 24h of a missed dose',
    emoji: '💪',
    earned: false,
    tint: COLORS.blue,
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Took your morning dose on time, 10 days in a row',
    emoji: '🌅',
    earned: false,
    progress: 4,
    target: 10,
    tint: COLORS.orange,
  },
];

function BadgeCard({ badge }) {
  const { title, description, emoji, earned, progress, target, isPercent, tint } = badge;

  return (
    <View
      style={[
        styles.badgeCard,
        !earned && styles.badgeCardLocked,
      ]}
    >
      <View
        style={[
          styles.badgeIconWrap,
          { backgroundColor: earned ? `${tint}22` : COLORS.lockedBg },
        ]}
      >
        <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>
          {earned ? emoji : '🔒'}
        </Text>
      </View>

      <Text style={[styles.badgeTitle, !earned && styles.textLocked]}>
        {title}
      </Text>
      <Text style={[styles.badgeDescription, !earned && styles.textLocked]}>
        {description}
      </Text>

      {!earned && target ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((progress / target) * 100, 100)}%`,
                  backgroundColor: tint,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {isPercent ? `${progress}% / ${target}%` : `${progress} / ${target}`}
          </Text>
        </View>
      ) : null}

      {earned ? (
        <View style={styles.earnedTag}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
          <Text style={styles.earnedTagText}>Earned</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function AchievementsScreen() {
  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSubtitle}>
            {earnedCount} of {BADGES.length} badges earned
          </Text>
        </View>

        {/* Streak summary banner */}
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>{CURRENT_STREAK}-day streak</Text>
            <Text style={styles.streakSubtitle}>
              Keep going — you're building a strong routine
            </Text>
          </View>
        </View>

        {/* Badge grid */}
        <View style={styles.grid}>
          {BADGES.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
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

  header: { marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  streakEmoji: { fontSize: 28 },
  streakTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  streakSubtitle: { fontSize: 12, color: '#E5EBFF', marginTop: 2 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 150,
  },
  badgeCardLocked: {
    backgroundColor: COLORS.lockedBg,
    borderColor: COLORS.border,
  },
  badgeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeEmoji: { fontSize: 20 },
  badgeEmojiLocked: { opacity: 0.6 },

  badgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  textLocked: { color: COLORS.locked },

  progressWrap: { marginTop: 10 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 10, color: COLORS.textMuted },

  earnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  earnedTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.green,
  },
});