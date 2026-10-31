import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import {
  ActionButton,
  AdminHeader,
  Badge,
  Chip,
  EmptyState,
  ErrorCard,
} from '../../components/AdminUI';
import {
  deleteComment,
  deletePost,
  friendlyAdminError,
  listComments,
  listPosts,
  listReports,
  resolveReport,
  timeAgo,
} from '../../services/admin';

export default function AdminModerationScreen({ navigation }) {
  const [tab, setTab] = useState('reports');
  const [reportStatus, setReportStatus] = useState('open');
  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [commentsFor, setCommentsFor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        setError('');
        isRefresh ? setRefreshing(true) : setLoading(true);

        if (tab === 'reports') {
          setReports(await listReports(reportStatus));
        } else {
          setPosts(await listPosts({ search: search.trim(), limit: 50 }));
        }
      } catch (e) {
        console.error('Moderation load error:', e);
        setError(friendlyAdminError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab, reportStatus, search]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, reportStatus])
  );

  useEffect(() => {
    if (tab !== 'posts') return undefined;
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const act = async (id, task) => {
    try {
      setBusyId(id);
      await task();
      await load(true);
    } catch (e) {
      Alert.alert('Action failed', friendlyAdminError(e));
    } finally {
      setBusyId(null);
    }
  };

  const confirmReportAction = (report, action) => {
    const copy = {
      dismiss: ['Dismiss report?', 'The post stays up and the report is closed.', 'Dismiss'],
      remove_post: [
        'Remove this post?',
        'The post, its comments and likes are permanently deleted.',
        'Remove post',
      ],
      remove_post_and_suspend: [
        'Remove post and suspend author?',
        'The post is deleted and the author is signed out and blocked.',
        'Remove & suspend',
      ],
    }[action];

    Alert.alert(copy[0], copy[1], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy[2],
        style: action === 'dismiss' ? 'default' : 'destructive',
        onPress: () =>
          act(report.report_id, () => resolveReport(report.report_id, action, report.reason)),
      },
    ]);
  };

  const confirmDeletePost = (post) => {
    Alert.alert('Remove this post?', 'The post, its comments and likes are permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => act(post.post_id, () => deletePost(post.post_id, 'Removed by admin')),
      },
    ]);
  };

  const openComments = async (post) => {
    setCommentsFor(post);
    setCommentsLoading(true);
    try {
      setComments(await listComments(post.post_id));
    } catch (e) {
      Alert.alert('Could not load comments', friendlyAdminError(e));
    } finally {
      setCommentsLoading(false);
    }
  };

  const removeComment = (comment) => {
    Alert.alert('Remove comment?', comment.content, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(comment.comment_id, 'Removed by admin');
            setComments((current) => current.filter((c) => c.comment_id !== comment.comment_id));
            load(true);
          } catch (e) {
            Alert.alert('Action failed', friendlyAdminError(e));
          }
        },
      },
    ]);
  };

  const renderReport = ({ item }) => {
    const open = item.status === 'open';
    const busy = busyId === item.report_id;

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Badge label={item.reason || 'Report'} tone="warning" />
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>

        {item.details ? <Text style={styles.details}>“{item.details}”</Text> : null}
        <Text style={styles.meta}>
          Reported by {item.reporter_name || 'a member'} · {item.reports_on_post} report
          {Number(item.reports_on_post) === 1 ? '' : 's'} on this post
        </Text>

        <View style={styles.postBox}>
          {item.post_content ? (
            <Text style={styles.postText}>{item.post_content}</Text>
          ) : (
            <Text style={styles.meta}>This post no longer exists.</Text>
          )}
          <Text style={styles.meta}>
            By {item.post_author_name || 'Unknown'} ({item.post_author_email || 'no email'})
            {item.post_author_suspended ? ' · suspended' : ''}
          </Text>
        </View>

        {open ? (
          <View style={styles.actions}>
            <ActionButton
              label="Dismiss"
              tone="soft"
              disabled={busy}
              onPress={() => confirmReportAction(item, 'dismiss')}
            />
            {item.post_content ? (
              <>
                <ActionButton
                  label="Remove post"
                  icon="trash-outline"
                  tone="softDanger"
                  loading={busy}
                  onPress={() => confirmReportAction(item, 'remove_post')}
                />
                <ActionButton
                  label="Remove + suspend"
                  icon="ban-outline"
                  tone="danger"
                  disabled={busy}
                  onPress={() => confirmReportAction(item, 'remove_post_and_suspend')}
                />
              </>
            ) : null}
          </View>
        ) : (
          <Badge label={item.status} tone="success" />
        )}
      </View>
    );
  };

  const renderPost = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Badge label={item.topic || 'General'} />
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>

      <Text style={styles.postText}>{item.content}</Text>

      <Text style={styles.meta}>
        By {item.author_name || 'Unknown'} ({item.author_email || 'no email'})
        {item.is_anonymous ? ' · posted anonymously (hidden from members)' : ''}
      </Text>
      <Text style={styles.meta}>
        {item.like_count} likes · {item.comment_count} comments · {item.report_count} reports
      </Text>

      <View style={styles.actions}>
        <ActionButton
          label="Comments"
          icon="chatbubble-outline"
          tone="soft"
          onPress={() => openComments(item)}
        />
        <ActionButton
          label="Remove post"
          icon="trash-outline"
          tone="softDanger"
          loading={busyId === item.post_id}
          onPress={() => confirmDeletePost(item)}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminHeader
        title="Moderation"
        subtitle="Keep the community safe"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.chips}>
        <Chip label="Reports" active={tab === 'reports'} onPress={() => setTab('reports')} />
        <Chip label="All posts" active={tab === 'posts'} onPress={() => setTab('posts')} />
      </View>

      {tab === 'reports' ? (
        <View style={styles.chips}>
          <Chip
            label="Open"
            active={reportStatus === 'open'}
            onPress={() => setReportStatus('open')}
          />
          <Chip
            label="Dismissed"
            active={reportStatus === 'dismissed'}
            onPress={() => setReportStatus('dismissed')}
          />
          <Chip
            label="All"
            active={reportStatus === 'all'}
            onPress={() => setReportStatus('all')}
          />
        </View>
      ) : (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search posts or authors"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            style={styles.searchInput}
          />
        </View>
      )}

      {error ? <ErrorCard message={error} onRetry={() => load()} /> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tab === 'reports' ? (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.report_id}
          renderItem={renderReport}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            !error ? (
              <EmptyState
                title="No reports here"
                text="Reports filed by members will show up in this list."
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.post_id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            !error ? <EmptyState icon="chatbubbles-outline" title="No posts found" /> : null
          }
        />
      )}

      <Modal
        visible={Boolean(commentsFor)}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentsFor(null)}
      >
        <View style={styles.modalWrap}>
          <Pressable style={styles.backdrop} onPress={() => setCommentsFor(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Comments</Text>
            {commentsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.meta}>No comments on this post.</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.comment_id}
                style={{ maxHeight: 380 }}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.postText}>{item.content}</Text>
                      <Text style={styles.meta}>
                        {item.author_name || 'Unknown'} ({item.author_email || 'no email'}) ·{' '}
                        {timeAgo(item.created_at)}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeComment(item)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                )}
              />
            )}
            <Pressable
              onPress={() => setCommentsFor(null)}
              style={{ alignItems: 'center', marginTop: 14 }}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 10,
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 11, color: colors.textLight },
  details: { fontSize: 13, fontStyle: 'italic', color: colors.textSecondary },
  meta: { fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  postBox: { backgroundColor: colors.surfaceSoft, borderRadius: 12, padding: 10, gap: 6 },
  postText: { fontSize: 14, lineHeight: 20, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,27,58,0.45)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 10 },
  commentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
});
