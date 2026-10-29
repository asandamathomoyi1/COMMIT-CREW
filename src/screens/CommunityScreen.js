import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const TOPICS = ['General', 'Medication Tips', 'Wellness', 'Reminders', 'Support'];

const REPORT_REASONS = [
  'Unsafe medical advice',
  'Spam',
  'Harassment',
  'False information',
  'Inappropriate content',
  'Other',
];

const EDUCATIONAL_VIDEOS = [
  {
    id: 'v1',
    title: 'How Pills Work Inside Your Body',
    category: 'BASICS',
    duration: '5 min',
    icon: 'body-outline',
    color: '#4A90D9',
    url: 'https://www.youtube.com/results?search_query=how+pills+work+in+your+body',
  },
  {
    id: 'v2',
    title: 'Understanding Your Prescription Label',
    category: 'SAFETY',
    duration: '4 min',
    icon: 'document-text-outline',
    color: '#10B981',
    url: 'https://www.youtube.com/results?search_query=how+to+read+prescription+label',
  },
  {
    id: 'v3',
    title: 'Common Medication Side Effects',
    category: 'SAFETY',
    duration: '6 min',
    icon: 'warning-outline',
    color: '#F59E0B',
    url: 'https://www.youtube.com/results?search_query=common+medication+side+effects',
  },
  {
    id: 'v4',
    title: 'Drug Interactions Explained',
    category: 'SAFETY',
    duration: '7 min',
    icon: 'git-compare-outline',
    color: '#EF4444',
    url: 'https://www.youtube.com/results?search_query=drug+interactions+explained',
  },
  {
    id: 'v5',
    title: 'Your Digestive System & Medication',
    category: 'BODY',
    duration: '8 min',
    icon: 'nutrition-outline',
    color: '#8B5CF6',
    url: 'https://www.youtube.com/results?search_query=digestive+system+and+medication',
  },
  {
    id: 'v6',
    title: 'Blood Pressure Medication Basics',
    category: 'CONDITIONS',
    duration: '5 min',
    icon: 'heart-outline',
    color: '#EC4899',
    url: 'https://www.youtube.com/results?search_query=blood+pressure+medication+basics',
  },
  {
    id: 'v7',
    title: 'Diabetes & Insulin: What You Need to Know',
    category: 'CONDITIONS',
    duration: '9 min',
    icon: 'water-outline',
    color: '#06B6D4',
    url: 'https://www.youtube.com/results?search_query=diabetes+insulin+explained',
  },
  {
    id: 'v8',
    title: 'Mental Health & Medication',
    category: 'WELLNESS',
    duration: '6 min',
    icon: 'happy-outline',
    color: '#14B8A6',
    url: 'https://www.youtube.com/results?search_query=mental+health+medication+explained',
  },
];

// Reads member display names. Uses a safe database function that only returns id + full_name
// (so names work even though the profiles table itself is private), and falls back to a direct read.
async function fetchAuthorNames(userIds) {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_community_authors', { p_user_ids: userIds });

  if (!error && Array.isArray(data)) {
    return data;
  }

  const { data: rows } = await supabase.from('profiles').select('id, full_name').in('id', userIds);

  return rows ?? [];
}

export default function CommunityScreen() {
  const { isAdmin } = useAuth();

  const [posts, setPosts] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postTopic, setPostTopic] = useState('General');
  const [postAnonymous, setPostAnonymous] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  const [likingPostId, setLikingPostId] = useState(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPostId, setReportPostId] = useState(null);
  const [selectedReportReason, setSelectedReportReason] = useState('Unsafe medical advice');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  const [showDiscussion, setShowDiscussion] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsRefreshing, setCommentsRefreshing] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCommunity();
    }, [])
  );

  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await getUserFast();

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error('You must be signed in to use Community.');
    }

    setCurrentUserId(user.id);

    return user;
  };

  const loadCommunity = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const user = await getCurrentUser();

      const { data: postRows, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        throw postsError;
      }

      const rows = postRows ?? [];

      if (rows.length === 0) {
        setPosts([]);
        return;
      }

      const postIds = rows.map((post) => post.id);

      const userIds = Array.from(new Set(rows.map((post) => post.user_id)));

      let profiles = [];
      let likes = [];
      let commentRows = [];

      profiles = await fetchAuthorNames(userIds);

      const { data: likeData, error: likesError } = await supabase
        .from('community_likes')
        .select('id, post_id, user_id')
        .in('post_id', postIds);

      if (likesError) {
        throw likesError;
      }

      likes = likeData ?? [];

      const { data: commentData, error: commentsError } = await supabase
        .from('community_comments')
        .select('id, post_id')
        .in('post_id', postIds);

      if (commentsError) {
        throw commentsError;
      }

      commentRows = commentData ?? [];

      const formatted = rows.map((post) => {
        const profile = profiles.find((profileItem) => profileItem.id === post.user_id);

        const postLikes = likes.filter((like) => like.post_id === post.id);

        const postComments = commentRows.filter((comment) => comment.post_id === post.id);

        return {
          id: post.id,
          user_id: post.user_id,
          topic: post.topic,
          content: post.content,
          is_anonymous: post.is_anonymous,
          created_at: post.created_at,
          updated_at: post.updated_at,
          authorName: profile?.full_name?.trim() || 'MedTrack Member',
          likeCount: postLikes.length,
          commentCount: postComments.length,
          likedByMe: postLikes.some((like) => like.user_id === user.id),
        };
      });

      setPosts(formatted);
    } catch (error) {
      console.error('Community load error:', error);

      Alert.alert(
        'Unable to load community',
        error?.message || 'MedTrack could not load the community right now.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createPost = async () => {
    const cleanContent = postContent.trim();

    if (cleanContent.length < 3) {
      Alert.alert('Post is too short', 'Write at least a few words before publishing.');
      return;
    }

    if (cleanContent.length > 2000) {
      Alert.alert('Post is too long', 'Community posts can contain up to 2,000 characters.');
      return;
    }

    try {
      setCreatingPost(true);

      const user = await getCurrentUser();

      const { error } = await supabase.from('community_posts').insert({
        user_id: user.id,
        topic: postTopic,
        content: cleanContent,
        is_anonymous: postAnonymous,
      });

      if (error) {
        throw error;
      }

      setPostContent('');
      setPostTopic('General');
      setPostAnonymous(false);
      setShowCreatePost(false);

      await loadCommunity(true);
    } catch (error) {
      console.error('Create post error:', error);

      Alert.alert('Unable to publish', error?.message || 'Your post could not be published.');
    } finally {
      setCreatingPost(false);
    }
  };

  const toggleLike = async (post) => {
    if (!currentUserId || likingPostId) {
      return;
    }

    try {
      setLikingPostId(post.id);

      if (post.likedByMe) {
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from('community_likes').insert({
          post_id: post.id,
          user_id: currentUserId,
        });

        if (error) {
          if (error.code === '23505') {
            await loadCommunity(true);
            return;
          }

          throw error;
        }
      }

      setPosts((currentPosts) =>
        currentPosts.map((item) => {
          if (item.id !== post.id) {
            return item;
          }

          return {
            ...item,
            likedByMe: !item.likedByMe,
            likeCount: item.likedByMe ? Math.max(0, item.likeCount - 1) : item.likeCount + 1,
          };
        })
      );

      if (selectedPost?.id === post.id) {
        setSelectedPost((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            likedByMe: !current.likedByMe,
            likeCount: current.likedByMe
              ? Math.max(0, current.likeCount - 1)
              : current.likeCount + 1,
          };
        });
      }
    } catch (error) {
      console.error('Like error:', error);

      Alert.alert('Unable to update reaction', error?.message || 'Please try again.');
    } finally {
      setLikingPostId(null);
    }
  };

  const confirmDeletePost = (post) => {
    Alert.alert(
      'Delete post?',
      isAdmin && post.user_id !== currentUserId
        ? "As an admin you are removing a member's post, its comments and reactions. This is recorded in the activity log."
        : 'This will permanently remove your post and its comments and reactions.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePost(post.id),
        },
      ]
    );
  };

  const deletePost = async (postId) => {
    try {
      const target = posts.find((post) => post.id === postId);
      const moderating = isAdmin && target && target.user_id !== currentUserId;

      // Admins removing someone else's post go through the audited admin function.
      const { error } = moderating
        ? await supabase.rpc('admin_delete_post', {
            p_post_id: String(postId),
            p_reason: 'Removed by admin',
          })
        : await supabase.from('community_posts').delete().eq('id', postId);

      if (error) {
        throw error;
      }

      setPosts((current) => current.filter((post) => post.id !== postId));

      if (selectedPost?.id === postId) {
        closeDiscussion();
      }
    } catch (error) {
      Alert.alert('Unable to delete post', error?.message || 'Please try again.');
    }
  };

  const openDiscussion = async (post) => {
    setSelectedPost(post);
    setShowDiscussion(true);
    setCommentText('');
    setCommentAnonymous(false);

    await loadComments(post.id);
  };

  const closeDiscussion = () => {
    setShowDiscussion(false);
    setSelectedPost(null);
    setComments([]);
    setCommentText('');
    setCommentAnonymous(false);
  };

  const loadComments = async (postId, isRefresh = false) => {
    try {
      if (isRefresh) {
        setCommentsRefreshing(true);
      } else {
        setCommentsLoading(true);
      }

      const { data: rows, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const commentRows = rows ?? [];

      if (commentRows.length === 0) {
        setComments([]);
        return;
      }

      const userIds = Array.from(new Set(commentRows.map((comment) => comment.user_id)));

      let profiles = [];

      profiles = await fetchAuthorNames(userIds);

      const formatted = commentRows.map((comment) => {
        const profile = profiles.find((item) => item.id === comment.user_id);

        return {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          is_anonymous: comment.is_anonymous,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          authorName: profile?.full_name?.trim() || 'MedTrack Member',
        };
      });

      setComments(formatted);
    } catch (error) {
      console.error('Comments load error:', error);

      Alert.alert(
        'Unable to load comments',
        error?.message || 'MedTrack could not load this discussion.'
      );
    } finally {
      setCommentsLoading(false);
      setCommentsRefreshing(false);
    }
  };

  const submitComment = async () => {
    const cleanComment = commentText.trim();

    if (!selectedPost) {
      return;
    }

    if (cleanComment.length < 1) {
      return;
    }

    if (cleanComment.length > 1000) {
      Alert.alert('Comment too long', 'Comments can contain up to 1,000 characters.');
      return;
    }

    try {
      setSendingComment(true);

      const user = await getCurrentUser();

      const { error } = await supabase.from('community_comments').insert({
        post_id: selectedPost.id,
        user_id: user.id,
        content: cleanComment,
        is_anonymous: commentAnonymous,
      });

      if (error) {
        throw error;
      }

      setCommentText('');
      setCommentAnonymous(false);

      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id
            ? {
                ...post,
                commentCount: post.commentCount + 1,
              }
            : post
        )
      );

      setSelectedPost((current) =>
        current
          ? {
              ...current,
              commentCount: current.commentCount + 1,
            }
          : current
      );

      await loadComments(selectedPost.id);
    } catch (error) {
      console.error('Comment create error:', error);

      Alert.alert('Unable to comment', error?.message || 'Your comment could not be published.');
    } finally {
      setSendingComment(false);
    }
  };

  const confirmDeleteComment = (comment) => {
    Alert.alert('Delete comment?', 'This comment will be permanently removed.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteComment(comment),
      },
    ]);
  };

  const deleteComment = async (comment) => {
    if (!selectedPost) {
      return;
    }

    try {
      const moderating = isAdmin && comment.user_id !== currentUserId;

      const { error } = moderating
        ? await supabase.rpc('admin_delete_comment', {
            p_comment_id: String(comment.id),
            p_reason: 'Removed by admin',
          })
        : await supabase.from('community_comments').delete().eq('id', comment.id);

      if (error) {
        throw error;
      }

      setComments((current) => current.filter((item) => item.id !== comment.id));

      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id
            ? {
                ...post,
                commentCount: Math.max(0, post.commentCount - 1),
              }
            : post
        )
      );

      setSelectedPost((current) =>
        current
          ? {
              ...current,
              commentCount: Math.max(0, current.commentCount - 1),
            }
          : current
      );
    } catch (error) {
      Alert.alert('Unable to delete comment', error?.message || 'Please try again.');
    }
  };

  const openReport = (postId) => {
    setReportPostId(postId);
    setSelectedReportReason('Unsafe medical advice');
    setReportDetails('');
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportPostId || !currentUserId) {
      return;
    }

    try {
      setReporting(true);

      const { error } = await supabase.from('community_reports').insert({
        post_id: reportPostId,
        user_id: currentUserId,
        reason: selectedReportReason,
        details: reportDetails.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already reported', 'You have already reported this post.');

          setShowReportModal(false);
          return;
        }

        throw error;
      }

      setShowReportModal(false);

      Alert.alert('Report submitted', 'Thank you. This post has been submitted for review.');
    } catch (error) {
      Alert.alert('Unable to report post', error?.message || 'Please try again.');
    } finally {
      setReporting(false);
    }
  };

  const openVideo = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open', 'No browser available.');
      }
    } catch (error) {
      Alert.alert('Unable to open video', 'Please try again.');
    }
  };

  const filteredPosts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return posts.filter((post) => {
      const topicMatches = selectedFilter === 'All' || post.topic === selectedFilter;

      const visibleName = post.is_anonymous ? 'anonymous' : post.authorName.toLowerCase();

      const searchMatches =
        !query ||
        post.content.toLowerCase().includes(query) ||
        post.topic.toLowerCase().includes(query) ||
        visibleName.includes(query);

      return topicMatches && searchMatches;
    });
  }, [posts, searchText, selectedFilter]);

  const formatPostTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const difference = Math.max(0, now.getTime() - date.getTime());

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    if (hours < 24) {
      return `${hours}h ago`;
    }

    if (days < 7) {
      return `${days}d ago`;
    }

    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getTopicIcon = (topic) => {
    switch (topic) {
      case 'Medication Tips':
        return 'medical-outline';

      case 'Wellness':
        return 'heart-outline';

      case 'Reminders':
        return 'notifications-outline';

      case 'Support':
        return 'people-outline';

      default:
        return 'chatbubbles-outline';
    }
  };

  const renderPost = ({ item }) => {
    const isMine = item.user_id === currentUserId;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={[styles.avatar, item.is_anonymous && styles.anonymousAvatar]}>
            <Ionicons
              name={item.is_anonymous ? 'person-outline' : 'person'}
              size={20}
              color={item.is_anonymous ? colors.textSecondary : colors.primary}
            />
          </View>

          <View style={styles.authorContainer}>
            <View style={styles.authorRow}>
              <Text style={styles.authorName}>
                {item.is_anonymous ? 'Anonymous Member' : item.authorName}
              </Text>

              {isMine && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>

            <Text style={styles.postTime}>{formatPostTime(item.created_at)}</Text>
          </View>

          <Pressable
            onPress={() => {
              if (isMine || isAdmin) {
                confirmDeletePost(item);
              } else {
                openReport(item.id);
              }
            }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={isMine || isAdmin ? 'trash-outline' : 'flag-outline'}
              size={18}
              color={isMine || isAdmin ? colors.danger : colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.topicBadge}>
          <Ionicons name={getTopicIcon(item.topic)} size={14} color={colors.primary} />

          <Text style={styles.topicBadgeText}>{item.topic}</Text>
        </View>

        <Pressable onPress={() => openDiscussion(item)}>
          <Text style={styles.postContent}>{item.content}</Text>
        </Pressable>

        <View style={styles.postDivider} />

        <View style={styles.postActions}>
          <Pressable
            onPress={() => toggleLike(item)}
            disabled={likingPostId === item.id}
            style={({ pressed }) => [styles.postAction, pressed && styles.actionPressed]}
          >
            {likingPostId === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={item.likedByMe ? 'heart' : 'heart-outline'}
                size={20}
                color={item.likedByMe ? colors.danger : colors.textSecondary}
              />
            )}

            <Text style={[styles.postActionText, item.likedByMe && styles.likedActionText]}>
              {item.likeCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => openDiscussion(item)}
            style={({ pressed }) => [styles.postAction, pressed && styles.actionPressed]}
          >
            <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />

            <Text style={styles.postActionText}>{item.commentCount}</Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => openDiscussion(item)}
            style={({ pressed }) => [styles.discussButton, pressed && styles.actionPressed]}
          >
            <Text style={styles.discussText}>Discussion</Text>

            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="people-outline" size={32} color={colors.primary} />
          </View>

          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading MedTrack Community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCommunity(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.topHeader}>
              <View>
                <Text style={styles.headerEyebrow}>MEDTRACK</Text>

                <Text style={styles.headerTitle}>Community</Text>

                <Text style={styles.headerSubtitle}>Learn, share and support</Text>
              </View>

              <Pressable
                onPress={() => setShowCreatePost(true)}
                style={({ pressed }) => [
                  styles.createHeaderButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="add" size={27} color={colors.white} />
              </Pressable>
            </View>

            <View style={styles.safetyCard}>
              <View style={styles.safetyIcon}>
                <Ionicons name="shield-checkmark-outline" size={23} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.safetyTitle}>Support, not medical advice</Text>

                <Text style={styles.safetyText}>
                  Community posts reflect personal experiences. Never change prescribed medication
                  or dosage based on a post.
                </Text>
              </View>
            </View>

            <View style={styles.videosSection}>
              <View style={styles.videosHeader}>
                <View>
                  <Text style={styles.videosEyebrow}>LEARN</Text>
                  <Text style={styles.videosTitle}>Educational Videos</Text>
                  <Text style={styles.videosSubtitle}>
                    Bite-sized lessons about medication and your body
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.videosRow}
              >
                {EDUCATIONAL_VIDEOS.map((video) => (
                  <Pressable
                    key={video.id}
                    onPress={() => openVideo(video.url)}
                    style={({ pressed }) => [styles.videoCard, pressed && styles.buttonPressed]}
                  >
                    <View style={[styles.videoThumb, { backgroundColor: video.color }]}>
                      <Ionicons name={video.icon} size={38} color="#FFFFFF" />

                      <View style={styles.videoPlay}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                      </View>

                      <View style={styles.videoDuration}>
                        <Text style={styles.videoDurationText}>{video.duration}</Text>
                      </View>
                    </View>

                    <Text style={styles.videoCategory}>{video.category}</Text>

                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Pressable onPress={() => setShowCreatePost(true)} style={styles.shareCard}>
              <View style={styles.shareAvatar}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>

              <Text style={styles.sharePlaceholder}>Share something with the community...</Text>

              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </Pressable>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />

              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search community"
                placeholderTextColor={colors.textLight}
                style={styles.searchInput}
              />

              {!!searchText && (
                <Pressable onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textLight} />
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {['All', ...TOPICS].map((topic) => {
                const selected = selectedFilter === topic;

                return (
                  <Pressable
                    key={topic}
                    onPress={() => setSelectedFilter(topic)}
                    style={[styles.filterChip, selected && styles.filterChipSelected]}
                  >
                    <Text
                      style={[styles.filterChipText, selected && styles.filterChipTextSelected]}
                    >
                      {topic}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.feedHeading}>
              <View>
                <Text style={styles.feedTitle}>Community Feed</Text>

                <Text style={styles.feedSubtitle}>
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                </Text>
              </View>

              <Pressable onPress={() => loadCommunity(true)} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={38} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>
              {posts.length === 0 ? 'Start the conversation' : 'No matching posts'}
            </Text>

            <Text style={styles.emptyText}>
              {posts.length === 0
                ? 'Be the first MedTrack member to share something helpful.'
                : 'Try another search term or topic.'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showCreatePost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreatePost(false)}
      >
        <SafeAreaView style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowCreatePost(false)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>

            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Create Post</Text>

              <Text style={styles.modalSubtitle}>Share with the MedTrack community</Text>
            </View>

            <View style={{ width: 42 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.createContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>Choose topic</Text>

            <View style={styles.createTopics}>
              {TOPICS.map((topic) => {
                const selected = postTopic === topic;

                return (
                  <Pressable
                    key={topic}
                    onPress={() => setPostTopic(topic)}
                    style={[styles.createTopicChip, selected && styles.createTopicSelected]}
                  >
                    <Ionicons
                      name={getTopicIcon(topic)}
                      size={15}
                      color={selected ? colors.white : colors.primary}
                    />

                    <Text
                      style={[styles.createTopicText, selected && styles.createTopicTextSelected]}
                    >
                      {topic}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Your post</Text>

            <View style={styles.largeInputContainer}>
              <TextInput
                value={postContent}
                onChangeText={setPostContent}
                placeholder="What would you like to share?"
                placeholderTextColor={colors.textLight}
                multiline
                maxLength={2000}
                textAlignVertical="top"
                style={styles.largeInput}
              />

              <Text style={styles.characterCount}>{postContent.length}/2000</Text>
            </View>

            <View style={styles.anonymousCard}>
              <View style={styles.anonymousIcon}>
                <Ionicons name="eye-off-outline" size={21} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.anonymousTitle}>Post anonymously</Text>

                <Text style={styles.anonymousText}>
                  Other members will see &quot;Anonymous Member&quot;.
                </Text>
              </View>

              <Switch value={postAnonymous} onValueChange={setPostAnonymous} />
            </View>

            <View style={styles.warningCard}>
              <Ionicons name="information-circle-outline" size={22} color={colors.warning} />

              <Text style={styles.warningText}>
                Avoid sharing prescription images, phone numbers, addresses or other sensitive
                information. Community posts are not medical advice.
              </Text>
            </View>

            <Pressable
              onPress={createPost}
              disabled={creatingPost || postContent.trim().length < 3}
              style={[
                styles.primaryButton,
                (creatingPost || postContent.trim().length < 3) && styles.disabled,
              ]}
            >
              {creatingPost ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Ionicons name="send" size={19} color={colors.white} />
              )}

              <Text style={styles.primaryButtonText}>
                {creatingPost ? 'Publishing...' : 'Publish Post'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showDiscussion}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDiscussion}
      >
        <SafeAreaView style={styles.modalPage}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Pressable onPress={closeDiscussion} style={styles.modalClose}>
                <Ionicons name="chevron-down" size={24} color={colors.text} />
              </Pressable>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Discussion</Text>

                <Text style={styles.modalSubtitle}>
                  {selectedPost?.commentCount ?? 0}{' '}
                  {(selectedPost?.commentCount ?? 0) === 1 ? 'comment' : 'comments'}
                </Text>
              </View>

              <View style={{ width: 42 }} />
            </View>

            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.commentsList}
              refreshControl={
                <RefreshControl
                  refreshing={commentsRefreshing}
                  onRefresh={() => {
                    if (selectedPost) {
                      loadComments(selectedPost.id, true);
                    }
                  }}
                />
              }
              ListHeaderComponent={
                selectedPost ? (
                  <>
                    <View style={styles.discussionPost}>
                      <View style={styles.postHeader}>
                        <View style={styles.avatar}>
                          <Ionicons
                            name={selectedPost.is_anonymous ? 'person-outline' : 'person'}
                            size={20}
                            color={colors.primary}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.authorName}>
                            {selectedPost.is_anonymous
                              ? 'Anonymous Member'
                              : selectedPost.authorName}
                          </Text>

                          <Text style={styles.postTime}>
                            {formatPostTime(selectedPost.created_at)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.topicBadge}>
                        <Ionicons
                          name={getTopicIcon(selectedPost.topic)}
                          size={14}
                          color={colors.primary}
                        />

                        <Text style={styles.topicBadgeText}>{selectedPost.topic}</Text>
                      </View>

                      <Text style={styles.discussionContent}>{selectedPost.content}</Text>

                      <View style={styles.discussionActions}>
                        <Pressable
                          onPress={() => toggleLike(selectedPost)}
                          style={styles.postAction}
                        >
                          <Ionicons
                            name={selectedPost.likedByMe ? 'heart' : 'heart-outline'}
                            size={20}
                            color={selectedPost.likedByMe ? colors.danger : colors.textSecondary}
                          />

                          <Text style={styles.postActionText}>{selectedPost.likeCount}</Text>
                        </Pressable>

                        <View style={styles.postAction}>
                          <Ionicons
                            name="chatbubble-outline"
                            size={19}
                            color={colors.textSecondary}
                          />

                          <Text style={styles.postActionText}>{selectedPost.commentCount}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.commentsHeading}>
                      <Text style={styles.commentsHeadingTitle}>Comments</Text>

                      <Text style={styles.commentsHeadingText}>
                        Join the conversation respectfully
                      </Text>
                    </View>

                    {commentsLoading && (
                      <View style={styles.commentsLoading}>
                        <ActivityIndicator color={colors.primary} />

                        <Text style={styles.loadingText}>Loading comments...</Text>
                      </View>
                    )}
                  </>
                ) : null
              }
              renderItem={({ item }) => {
                const isMine = item.user_id === currentUserId;

                return (
                  <View style={styles.commentCard}>
                    <View style={styles.commentAvatar}>
                      <Ionicons
                        name={item.is_anonymous ? 'person-outline' : 'person'}
                        size={17}
                        color={item.is_anonymous ? colors.textSecondary : colors.primary}
                      />
                    </View>

                    <View style={styles.commentBody}>
                      <View style={styles.commentHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.authorRow}>
                            <Text style={styles.commentAuthor}>
                              {item.is_anonymous ? 'Anonymous Member' : item.authorName}
                            </Text>

                            {isMine && (
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>You</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.commentTime}>{formatPostTime(item.created_at)}</Text>
                        </View>

                        {(isMine || isAdmin) && (
                          <Pressable
                            onPress={() => confirmDeleteComment(item)}
                            style={styles.commentDelete}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </Pressable>
                        )}
                      </View>

                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                !commentsLoading ? (
                  <View style={styles.noComments}>
                    <View style={styles.noCommentsIcon}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={29}
                        color={colors.primary}
                      />
                    </View>

                    <Text style={styles.noCommentsTitle}>No comments yet</Text>

                    <Text style={styles.noCommentsText}>
                      Be the first person to join this discussion.
                    </Text>
                  </View>
                ) : null
              }
            />

            <View style={styles.commentComposer}>
              <View style={styles.commentOptions}>
                <Pressable
                  onPress={() => setCommentAnonymous(!commentAnonymous)}
                  style={styles.anonymousCommentToggle}
                >
                  <Ionicons
                    name={commentAnonymous ? 'eye-off' : 'eye-off-outline'}
                    size={17}
                    color={commentAnonymous ? colors.primary : colors.textSecondary}
                  />

                  <Text
                    style={[
                      styles.anonymousCommentText,
                      commentAnonymous && {
                        color: colors.primary,
                      },
                    ]}
                  >
                    Anonymous
                  </Text>
                </Pressable>

                <Text style={styles.commentCounter}>{commentText.length}/1000</Text>
              </View>

              <View style={styles.commentInputRow}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Write a comment..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  maxLength={1000}
                  style={styles.commentInput}
                />

                <Pressable
                  onPress={submitComment}
                  disabled={sendingComment || !commentText.trim()}
                  style={[
                    styles.sendCommentButton,
                    (sendingComment || !commentText.trim()) && styles.disabled,
                  ]}
                >
                  {sendingComment ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="send" size={19} color={colors.white} />
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportBackdrop}>
          <View style={styles.reportModal}>
            <View style={styles.reportTop}>
              <View style={styles.reportIcon}>
                <Ionicons name="flag-outline" size={22} color={colors.danger} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.reportTitle}>Report Post</Text>

                <Text style={styles.reportSubtitle}>Help keep MedTrack Community safe.</Text>
              </View>

              <Pressable onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {REPORT_REASONS.map((reason) => {
                const selected = selectedReportReason === reason;

                return (
                  <Pressable
                    key={reason}
                    onPress={() => setSelectedReportReason(reason)}
                    style={[styles.reportReason, selected && styles.reportReasonSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>

                    <Text style={styles.reportReasonText}>{reason}</Text>
                  </Pressable>
                );
              })}

              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Additional details (optional)"
                placeholderTextColor={colors.textLight}
                multiline
                maxLength={500}
                style={styles.reportInput}
              />
            </ScrollView>

            <View style={styles.reportButtons}>
              <Pressable onPress={() => setShowReportModal(false)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={submitReport}
                disabled={reporting}
                style={[styles.reportSubmitButton, reporting && styles.disabled]}
              >
                {reporting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Ionicons name="flag" size={17} color={colors.white} />
                )}

                <Text style={styles.reportSubmitText}>Submit Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  listContent: {
    paddingHorizontal: 17,
    paddingTop: 12,
    paddingBottom: 115,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  headerEyebrow: {
    fontSize: 13,
    letterSpacing: 1.7,
    fontWeight: '800',
    color: colors.primary,
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  createHeaderButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    elevation: 5,
  },

  safetyCard: {
    padding: 15,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    marginBottom: 13,
  },

  safetyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  safetyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  safetyText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  videosSection: {
    marginBottom: 14,
  },

  videosHeader: {
    marginBottom: 10,
  },

  videosEyebrow: {
    fontSize: 13,
    letterSpacing: 1.7,
    fontWeight: '800',
    color: colors.primary,
  },

  videosTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  videosSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textSecondary,
  },

  videosRow: {
    paddingVertical: 4,
    gap: 11,
  },

  videoCard: {
    width: 168,
  },

  videoThumb: {
    height: 104,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  videoPlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoDuration: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  videoDurationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  videoCategory: {
    marginTop: 8,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '800',
    color: colors.primary,
  },

  videoTitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.text,
  },

  shareCard: {
    minHeight: 66,
    padding: 11,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  shareAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sharePlaceholder: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },

  searchBox: {
    height: 52,
    borderRadius: 17,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.text,
  },

  filterContainer: {
    paddingVertical: 12,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  filterChipTextSelected: {
    color: colors.white,
  },

  feedHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  feedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  feedSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postCard: {
    padding: 16,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  anonymousAvatar: {
    backgroundColor: colors.surfaceSoft,
  },

  authorContainer: {
    flex: 1,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  authorName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  postTime: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textLight,
  },

  youBadge: {
    marginLeft: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.secondaryLight,
  },

  youBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },

  iconButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topicBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 13,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },

  topicBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  postContent: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },

  postDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 15,
  },

  postActions: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 9,
  },

  postAction: {
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 12,
  },

  postActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  likedActionText: {
    color: colors.danger,
  },

  discussButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  discussText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  actionPressed: {
    opacity: 0.55,
  },

  pressed: {
    opacity: 0.65,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textSecondary,
  },

  emptyContainer: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  emptyText: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  modalPage: {
    flex: 1,
    backgroundColor: colors.background,
  },

  modalHeader: {
    minHeight: 70,
    paddingHorizontal: 17,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalClose: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalHeaderText: {
    flex: 1,
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  modalSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },

  createContent: {
    padding: 18,
    paddingBottom: 40,
  },

  inputLabel: {
    marginBottom: 9,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  createTopics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 21,
  },

  createTopicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  createTopicSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  createTopicText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  createTopicTextSelected: {
    color: colors.white,
  },

  largeInputContainer: {
    minHeight: 190,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  largeInput: {
    minHeight: 150,
    padding: 15,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },

  characterCount: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 11,
    fontSize: 13,
    color: colors.textLight,
  },

  anonymousCard: {
    marginTop: 15,
    padding: 13,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  anonymousIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  anonymousTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  anonymousText: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textSecondary,
  },

  warningCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFF7E8',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  warningText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  primaryButton: {
    minHeight: 55,
    marginTop: 18,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },

  disabled: {
    opacity: 0.45,
  },

  commentsList: {
    padding: 16,
    paddingBottom: 30,
  },

  discussionPost: {
    padding: 16,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  discussionContent: {
    marginTop: 13,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },

  discussionActions: {
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
  },

  commentsHeading: {
    marginTop: 22,
    marginBottom: 12,
  },

  commentsHeadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  commentsHeadingText: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },

  commentsLoading: {
    paddingVertical: 25,
    alignItems: 'center',
  },

  commentCard: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  commentBody: {
    flex: 1,
    padding: 12,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  commentAuthor: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  commentTime: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textLight,
  },

  commentDelete: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },

  noComments: {
    paddingVertical: 35,
    alignItems: 'center',
  },

  noCommentsIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noCommentsTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  noCommentsText: {
    marginTop: 5,
    fontSize: 11,
    color: colors.textSecondary,
  },

  commentComposer: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 8 : 13,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  commentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },

  anonymousCommentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  anonymousCommentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  commentCounter: {
    fontSize: 12,
    color: colors.textLight,
  },

  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
  },

  commentInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    color: colors.text,
  },

  sendCommentButton: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reportBackdrop: {
    flex: 1,
    padding: 18,
    backgroundColor: 'rgba(11,27,58,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reportModal: {
    width: '100%',
    maxWidth: 480,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.white,
  },

  reportTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  reportSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },

  reportReason: {
    minHeight: 42,
    paddingHorizontal: 9,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  reportReasonSelected: {
    backgroundColor: colors.primaryLight,
  },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  radioSelected: {
    borderColor: colors.primary,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  reportReasonText: {
    fontSize: 11,
    color: colors.text,
  },

  reportInput: {
    minHeight: 85,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },

  reportButtons: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  reportSubmitButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  reportSubmitText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
});
