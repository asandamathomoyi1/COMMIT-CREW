import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../../theme/colors';
import { AdminHeader, ErrorCard } from '../../components/AdminUI';
import { friendlyAdminError, getAdminStats } from '../../services/admin';

function StatCard({ icon, label, value, tone = colors.primary }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LinkCard({ icon, title, subtitle, badge, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={styles.linkBadge}>
          <Text style={styles.linkBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError('');
      isRefresh ? setRefreshing(true) : setLoading(true);
      setStats(await getAdminStats());
    } catch (e) {
      console.error('Admin stats error:', e);
      setError(friendlyAdminError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminHeader
        title="Admin Console"
        subtitle="Monitor and manage MedTrack"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {error ? <ErrorCard message={error} onRetry={() => load()} /> : null}

          {stats ? (
            <>
              <Text style={styles.section}>Overview</Text>
              <View style={styles.grid}>
                <StatCard icon="people-outline" label="Total users" value={stats.total_users} />
                <StatCard
                  icon="person-add-outline"
                  label="New this week"
                  value={stats.new_users_7d}
                  tone={colors.secondary}
                />
                <StatCard
                  icon="ban-outline"
                  label="Suspended"
                  value={stats.suspended_users}
                  tone={colors.danger}
                />
                <StatCard icon="shield-checkmark-outline" label="Admins" value={stats.admins} />
              </View>

              <Text style={styles.section}>Medication activity (last 7 days)</Text>
              <View style={styles.grid}>
                <StatCard
                  icon="medical-outline"
                  label="Active medications"
                  value={stats.active_medications}
                />
                <StatCard
                  icon="analytics-outline"
                  label="Adherence"
                  value={
                    stats.adherence_7d === null || stats.adherence_7d === undefined
                      ? '—'
                      : `${stats.adherence_7d}%`
                  }
                  tone={colors.secondary}
                />
                <StatCard
                  icon="checkmark-circle-outline"
                  label="Doses taken"
                  value={stats.doses_taken_7d}
                  tone={colors.success}
                />
                <StatCard
                  icon="close-circle-outline"
                  label="Doses missed"
                  value={stats.doses_missed_7d}
                  tone={colors.warning}
                />
              </View>

              <Text style={styles.section}>Community</Text>
              <View style={styles.grid}>
                <StatCard
                  icon="chatbubbles-outline"
                  label="Posts (7 days)"
                  value={stats.posts_7d}
                />
                <StatCard
                  icon="chatbubble-outline"
                  label="Comments (7 days)"
                  value={stats.comments_7d}
                />
              </View>
              <Text style={styles.privacy}>
                Admins see totals only, never an individual member's medications or dose history.
              </Text>
            </>
          ) : null}

          <Text style={styles.section}>Manage</Text>
          <LinkCard
            icon="people-outline"
            title="Users"
            subtitle="Search, suspend (kick out), restore, change roles"
            onPress={() => navigation.navigate('AdminUsers')}
          />
          <LinkCard
            icon="flag-outline"
            title="Moderation"
            subtitle="Review reports, remove posts and comments"
            badge={stats && stats.open_reports > 0 ? String(stats.open_reports) : null}
            onPress={() => navigation.navigate('AdminModeration')}
          />
          <LinkCard
            icon="list-outline"
            title="Activity logs"
            subtitle="Sign-ups, community activity and admin actions"
            badge={stats && stats.logs_24h > 0 ? `${stats.logs_24h} today` : null}
            onPress={() => navigation.navigate('AdminLogs')}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginTop: 20, marginBottom: 10, fontSize: 15, fontWeight: '800', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { marginTop: 10, fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  privacy: { marginTop: 10, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  linkSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  linkBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  linkBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
