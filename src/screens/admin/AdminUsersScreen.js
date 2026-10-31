import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  ActionButton,
  AdminHeader,
  Badge,
  Chip,
  EmptyState,
  ErrorCard,
} from '../../components/AdminUI';
import {
  deleteUserAccount,
  friendlyAdminError,
  listUsers,
  setUserRole,
  setUserSuspended,
  timeAgo,
} from '../../services/admin';

const PAGE = 50;

export default function AdminUsersScreen({ navigation }) {
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const searchRef = useRef('');

  const load = useCallback(
    async ({ refresh = false, append = false } = {}) => {
      try {
        setError('');
        if (refresh) setRefreshing(true);
        else if (!append) setLoading(true);

        const offset = append ? users.length : 0;
        const rows = await listUsers({ search: searchRef.current, limit: PAGE, offset });

        setUsers((current) => (append ? [...current, ...rows] : rows));
        setHasMore(rows.length === PAGE);
      } catch (e) {
        console.error('Admin users error:', e);
        setError(friendlyAdminError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [users.length]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Search as you type (debounced).
  useEffect(() => {
    searchRef.current = search.trim();
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const visible = users.filter((u) =>
    filter === 'admins' ? u.role === 'admin' : filter === 'suspended' ? u.is_suspended : true
  );

  const closeModal = () => {
    setSelected(null);
    setSuspending(false);
    setReason('');
  };

  const run = async (task, successMessage) => {
    try {
      setBusy(true);
      await task();
      closeModal();
      await load({ refresh: true });
      if (successMessage) Alert.alert('Done', successMessage);
    } catch (e) {
      Alert.alert('Action failed', friendlyAdminError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (u) => {
    Alert.alert(
      'Delete account permanently?',
      `${u.email ?? u.full_name} and all of their medications, doses and posts will be erased. This cannot be undone. To simply block access, suspend the account instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => run(() => deleteUserAccount(u.id), 'The account was deleted.'),
        },
      ]
    );
  };

  const renderUser = ({ item }) => (
    <Pressable
      onPress={() => setSelected(item)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.avatar, item.is_suspended && { backgroundColor: '#FEE9E7' }]}>
        <Ionicons
          name={
            item.is_suspended
              ? 'ban-outline'
              : item.role === 'admin'
                ? 'shield-checkmark'
                : 'person'
          }
          size={20}
          color={item.is_suspended ? colors.danger : colors.primary}
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.full_name || 'No name'}
          </Text>
          {item.id === me?.id ? <Badge label="You" /> : null}
          {item.role === 'admin' ? <Badge label="Admin" tone="admin" /> : null}
          {item.is_suspended ? <Badge label="Suspended" tone="danger" /> : null}
        </View>
        <Text style={styles.email} numberOfLines={1}>
          {item.email ?? '—'}
        </Text>
        <Text style={styles.meta}>
          Joined {timeAgo(item.created_at)} · Last sign-in {timeAgo(item.last_sign_in_at)}
        </Text>
        <Text style={styles.meta}>
          {item.medication_count} medication{Number(item.medication_count) === 1 ? '' : 's'} ·{' '}
          {item.post_count} post
          {Number(item.post_count) === 1 ? '' : 's'}
        </Text>
      </View>

      <Ionicons name="ellipsis-horizontal" size={20} color={colors.textLight} />
    </Pressable>
  );

  const isSelf = selected?.id === me?.id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminHeader
        title="Users"
        subtitle={`${users.length} loaded`}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textLight} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or email"
          placeholderTextColor={colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.chips}>
        <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Admins" active={filter === 'admins'} onPress={() => setFilter('admins')} />
        <Chip
          label="Suspended"
          active={filter === 'suspended'}
          onPress={() => setFilter('suspended')}
        />
      </View>

      {error ? <ErrorCard message={error} onRetry={() => load()} /> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />
          }
          ListEmptyComponent={
            !error ? <EmptyState icon="people-outline" title="No users found" /> : null
          }
          ListFooterComponent={
            hasMore && filter === 'all' ? (
              <View style={{ marginTop: 8 }}>
                <ActionButton
                  label="Load more"
                  tone="soft"
                  onPress={() => load({ append: true })}
                />
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <Pressable style={styles.backdrop} onPress={closeModal} />
          {selected ? (
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{selected.full_name || 'No name'}</Text>
              <Text style={styles.email}>{selected.email}</Text>
              {selected.is_suspended && selected.suspended_reason ? (
                <Text style={styles.reasonText}>Suspended: {selected.suspended_reason}</Text>
              ) : null}

              {isSelf ? (
                <Text style={styles.note}>
                  This is your own account, so there are no actions available.
                </Text>
              ) : suspending ? (
                <>
                  <Text style={styles.label}>
                    Reason (the member will see this when signed out)
                  </Text>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="e.g. Repeated spam in Community"
                    placeholderTextColor={colors.textLight}
                    style={styles.reasonInput}
                    multiline
                  />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <ActionButton label="Back" tone="soft" onPress={() => setSuspending(false)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ActionButton
                        label="Suspend & kick out"
                        icon="ban-outline"
                        tone="danger"
                        loading={busy}
                        onPress={() =>
                          run(
                            () => setUserSuspended(selected.id, true, reason),
                            'The user is suspended and will be signed out within a minute.'
                          )
                        }
                      />
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ gap: 10, marginTop: 16 }}>
                  {selected.is_suspended ? (
                    <ActionButton
                      label="Restore access"
                      icon="checkmark-circle-outline"
                      loading={busy}
                      onPress={() =>
                        run(() => setUserSuspended(selected.id, false), 'Access restored.')
                      }
                    />
                  ) : selected.role === 'admin' ? (
                    <Text style={styles.note}>Remove admin rights before suspending an admin.</Text>
                  ) : (
                    <ActionButton
                      label="Suspend (kick out)"
                      icon="ban-outline"
                      tone="softDanger"
                      onPress={() => setSuspending(true)}
                    />
                  )}

                  {selected.role === 'admin' ? (
                    <ActionButton
                      label="Remove admin rights"
                      icon="shield-outline"
                      tone="soft"
                      loading={busy}
                      onPress={() =>
                        run(
                          () => setUserRole(selected.id, 'user'),
                          'This user is now a normal member.'
                        )
                      }
                    />
                  ) : (
                    <ActionButton
                      label="Make admin"
                      icon="shield-checkmark-outline"
                      tone="soft"
                      loading={busy}
                      onPress={() =>
                        Alert.alert(
                          'Make admin?',
                          'Admins can see all members and moderate everything.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Make admin',
                              onPress: () =>
                                run(
                                  () => setUserRole(selected.id, 'admin'),
                                  'This user is now an admin.'
                                ),
                            },
                          ]
                        )
                      }
                    />
                  )}

                  {selected.role !== 'admin' ? (
                    <ActionButton
                      label="Delete account permanently"
                      icon="trash-outline"
                      tone="softDanger"
                      onPress={() => confirmDelete(selected)}
                    />
                  ) : null}
                </View>
              )}

              <Pressable onPress={closeModal} style={styles.closeLink}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: colors.text },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  card: {
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1 },
  email: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  meta: { marginTop: 2, fontSize: 11, color: colors.textLight },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,27,58,0.45)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  reasonText: { marginTop: 8, fontSize: 13, color: colors.danger },
  note: { marginTop: 16, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: '700', color: colors.text },
  reasonInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  row: { flexDirection: 'row', gap: 10 },
  closeLink: { alignItems: 'center', marginTop: 16 },
  closeText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
});
