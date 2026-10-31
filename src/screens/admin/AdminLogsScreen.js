import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../../theme/colors';
import { ActionButton, AdminHeader, Chip, EmptyState, ErrorCard } from '../../components/AdminUI';
import { friendlyAdminError, listLogs, timeAgo } from '../../services/admin';

const PAGE = 100;
const AUTO_REFRESH_MS = 15000;

const EVENT_STYLE = {
  signup: { icon: 'person-add-outline', color: colors.secondary },
  post_created: { icon: 'create-outline', color: colors.primary },
  comment_created: { icon: 'chatbubble-outline', color: colors.primary },
  report_filed: { icon: 'flag-outline', color: colors.warning },
  user_suspended: { icon: 'ban-outline', color: colors.danger },
  user_restored: { icon: 'checkmark-circle-outline', color: colors.success },
  user_deleted: { icon: 'trash-outline', color: colors.danger },
  role_changed: { icon: 'shield-checkmark-outline', color: colors.primary },
  post_removed: { icon: 'trash-outline', color: colors.danger },
  post_removed_via_report: { icon: 'trash-outline', color: colors.danger },
  comment_removed: { icon: 'trash-outline', color: colors.danger },
  report_dismissed: { icon: 'close-circle-outline', color: colors.textSecondary },
};

export default function AdminLogsScreen({ navigation }) {
  const [category, setCategory] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const categoryRef = useRef('all');
  categoryRef.current = category;

  const load = useCallback(async ({ refresh = false, silent = false } = {}) => {
    try {
      setError('');
      if (refresh) setRefreshing(true);
      else if (!silent) setLoading(true);

      const rows = await listLogs({ category: categoryRef.current, limit: PAGE });
      setLogs(rows);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      console.error('Admin logs error:', e);
      if (!silent) setError(friendlyAdminError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadOlder = async () => {
    if (logs.length === 0) return;

    try {
      const rows = await listLogs({
        category: categoryRef.current,
        limit: PAGE,
        before: logs[logs.length - 1].created_at,
      });
      setLogs((current) => [...current, ...rows]);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      setError(friendlyAdminError(e));
    }
  };

  // Reload when the filter changes.
  useEffect(() => {
    load();
  }, [category, load]);

  // Live-ish monitoring: refresh every 15 s while this screen is open.
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => load({ silent: true }), AUTO_REFRESH_MS);
      return () => clearInterval(id);
    }, [load])
  );

  const renderLog = ({ item }) => {
    const style = EVENT_STYLE[item.event] ?? {
      icon: 'information-circle-outline',
      color: colors.textSecondary,
    };

    return (
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${style.color}18` }]}>
          <Ionicons name={style.icon} size={18} color={style.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.message}>{item.message || item.event}</Text>
          <Text style={styles.meta}>
            {item.actor_label ? `${item.actor_label} · ` : ''}
            {timeAgo(item.created_at)} · {new Date(item.created_at).toLocaleString()}
          </Text>
          {item.details?.reason ? (
            <Text style={styles.reason}>Reason: {item.details.reason}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminHeader
        title="Activity logs"
        subtitle="Refreshes every 15 seconds"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.chips}>
        <Chip label="All" active={category === 'all'} onPress={() => setCategory('all')} />
        <Chip
          label="Accounts"
          active={category === 'account'}
          onPress={() => setCategory('account')}
        />
        <Chip
          label="Community"
          active={category === 'community'}
          onPress={() => setCategory('community')}
        />
        <Chip label="Admin" active={category === 'admin'} onPress={() => setCategory('admin')} />
      </View>

      {error ? <ErrorCard message={error} onRetry={() => load()} /> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLog}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />
          }
          ListEmptyComponent={
            !error ? (
              <EmptyState
                icon="list-outline"
                title="No activity yet"
                text="Sign-ups, posts, comments, reports and admin actions will be recorded here."
              />
            ) : null
          }
          ListFooterComponent={
            hasMore ? (
              <View style={{ marginTop: 8 }}>
                <ActionButton label="Load older" tone="soft" onPress={loadOlder} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: colors.text },
  meta: { marginTop: 3, fontSize: 11, color: colors.textSecondary },
  reason: { marginTop: 3, fontSize: 12, color: colors.textSecondary },
});
