import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCommunity } from '../context/CommunityContext';

const C = {
  deep: '#1B0A3D',
  violet: '#4C1D95',
  magenta: '#A21CAF',
  rose: '#F43F5E',
  primary: '#7C3AED',
  primarySoft: '#F3E8FF',
  magentaSoft: '#FAE8FF',
  warning: '#D97706',
  ink: '#0B1220',
  inkSoft: '#475569',
  inkMuted: '#64748B',
  inkFaint: '#94A3B8',
  line: '#EDE9FE',
  surface: '#FFFFFF',
  bg: '#F8F7FC',
};

const TABS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'Medications', label: 'Meds', icon: 'medkit-outline', iconActive: 'medkit' },
  { key: 'Community', label: 'Community', icon: 'people-outline', iconActive: 'people' },
  { key: 'Pharmacy', label: 'Pharmacy', icon: 'location-outline', iconActive: 'location' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'following', label: 'Following' },
  { key: 'Metformin', label: 'Metformin' },
  { key: 'Salbutamol', label: 'Salbutamol' },
  { key: 'Levetiracetam', label: 'Levetiracetam' },
  { key: 'Vitamin D3', label: 'Vitamin D3' },
];

// ---------------------------------------------------------------------------
// Educational videos — tapping a card opens a YouTube search for the topic.
// Swap `query` for a real YouTube playlist/video URL when you have specific
// curated content you want to point users to instead of a search.
// ---------------------------------------------------------------------------
const VIDEOS = [
  {
    id: 'v1',
    title: 'How medications work in your body',
    source: 'MedTrack Learning',
    duration: '4:12',
    query: 'how medications work in the body explained',
    gradient: ['#7C3AED', '#A21CAF'],
    icon: 'body-outline',
  },
  {
    id: 'v2',
    title: 'Managing common side effects',
    source: 'MedTrack Learning',
    duration: '6:48',
    query: 'managing common medication side effects',
    gradient: ['#A21CAF', '#F43F5E'],
    icon: 'pulse-outline',
  },
  {
    id: 'v3',
    title: 'Tips for taking meds on time',
    source: 'MedTrack Learning',
    duration: '3:25',
    query: 'tips for remembering to take medication on time',
    gradient: ['#F43F5E', '#FB923C'],
    icon: 'time-outline',
  },
  {
    id: 'v4',
    title: 'Drug interactions explained',
    source: 'MedTrack Learning',
    duration: '5:03',
    query: 'drug interactions explained simply',
    gradient: ['#0891B2', '#7C3AED'],
    icon: 'warning-outline',
  },
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#7C3AED', '#A21CAF', '#0891B2', '#059669', '#D97706', '#DB2777'];
function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function BottomTabBar({ activeTab, onTabPress, bottomInset }) {
  return (
    <View style={[styles.tabBarWrap, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={19}
                  color={isActive ? '#FFFFFF' : C.inkFaint}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function VideoCard({ video, index }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1, duration: 420, delay: 200 + index * 60,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0, duration: 420, delay: 200 + index * 60,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, index]);

  const handlePress = async () => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (e) {
      // Fail silently — nothing the user can do if YouTube isn't reachable.
    }
  };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
      <TouchableOpacity
        style={styles.videoCard}
        activeOpacity={0.85}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Open video: ${video.title}`}
      >
        <LinearGradient
          colors={video.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.videoThumb}
        >
          <View style={styles.videoThumbIconWrap}>
            <Ionicons name={video.icon} size={22} color="rgba(255,255,255,0.9)" />
          </View>

          <View style={styles.playBadge}>
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </View>

          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        </LinearGradient>

        <View style={styles.videoMeta}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {video.title}
          </Text>
          <View style={styles.videoSourceRow}>
            <Ionicons name="logo-youtube" size={12} color="#DC2626" />
            <Text style={styles.videoSource} numberOfLines={1}>
              {video.source}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PostCard({ post, index }) {
  const [sameHereOn, setSameHereOn] = useState(false);
  const [helpfulOn, setHelpfulOn] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1, duration: 420, delay: 200 + index * 70,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0, duration: 420, delay: 200 + index * 70,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, index]);

  const isAnon = !post.author;
  const displayName = isAnon ? 'Anonymous' : post.author;
  const initials = isAnon ? '?' : getInitials(post.author);
  const bg = isAnon ? '#94A3B8' : avatarColor(post.author);

  const sameHereCount = sameHereOn ? post.sameHere + 1 : post.sameHere;
  const helpfulCount = helpfulOn ? post.helpful + 1 : post.helpful;

  return (
    <Animated.View
      style={[styles.postCard, { opacity: fade, transform: [{ translateY: rise }] }]}
    >
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          {isAnon ? (
            <Ionicons name="person-outline" size={16} color="#FFFFFF" />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName} numberOfLines={1}>{displayName}</Text>
            {isAnon && (
              <View style={styles.anonPill}>
                <Ionicons name="shield-checkmark" size={10} color={C.primary} />
                <Text style={styles.anonPillText}>Private</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeAgo}>{post.timeAgo}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color={C.inkFaint} />
      </View>

      {post.medication && (
        <View
          style={[
            styles.medTag,
            {
              backgroundColor: post.medication.color + '14',
              borderColor: post.medication.color + '33',
            },
          ]}
        >
          <View style={[styles.medTagDot, { backgroundColor: post.medication.color }]} />
          <Text style={[styles.medTagText, { color: post.medication.color }]}>
            {post.medication.name}
          </Text>
        </View>
      )}

      <Text style={styles.postBody}>{post.body}</Text>

      <View style={styles.reactionsRow}>
        <TouchableOpacity
          style={styles.reactionBtn}
          onPress={() => setSameHereOn((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={sameHereOn ? 'hand-left' : 'hand-left-outline'}
            size={16}
            color={sameHereOn ? C.primary : C.inkFaint}
          />
          <Text style={[styles.reactionCount, sameHereOn && { color: C.primary, fontWeight: '800' }]}>
            {sameHereCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reactionBtn}
          onPress={() => setHelpfulOn((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={helpfulOn ? 'bulb' : 'bulb-outline'}
            size={16}
            color={helpfulOn ? C.warning : C.inkFaint}
          />
          <Text style={[styles.reactionCount, helpfulOn && { color: C.warning, fontWeight: '800' }]}>
            {helpfulCount}
          </Text>
        </TouchableOpacity>

        <View style={styles.reactionBtn}>
          <Ionicons name="chatbubble-outline" size={16} color={C.inkFaint} />
          <Text style={styles.reactionCount}>{post.comments}</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Ionicons name="bookmark-outline" size={16} color={C.inkFaint} />
      </View>
    </Animated.View>
  );
}

export default function CommunityScreen({ navigation }) {
  const { posts } = useCommunity();
  const [activeTab, setActiveTab] = useState('Community');
  const [activeFilter, setActiveFilter] = useState('all');
  const insets = useSafeAreaInsets();

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerRise = useRef(new Animated.Value(16)).current;
  const composerFade = useRef(new Animated.Value(0)).current;
  const composerRise = useRef(new Animated.Value(16)).current;
  const videosFade = useRef(new Animated.Value(0)).current;
  const videosRise = useRef(new Animated.Value(16)).current;
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1, duration: 500, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(headerRise, {
        toValue: 0, duration: 500, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(composerFade, {
        toValue: 1, duration: 600, delay: 180,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(composerRise, {
        toValue: 0, duration: 600, delay: 180,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(videosFade, {
        toValue: 1, duration: 600, delay: 260,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(videosRise, {
        toValue: 0, duration: 600, delay: 260,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bloom, {
          toValue: 1, duration: 7000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(bloom, {
          toValue: 0, duration: 7000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const bloomX = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const bloomY = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });

  const visiblePosts =
    activeFilter === 'all'
      ? posts
      : activeFilter === 'following'
      ? posts.filter((p) => p.author)
      : posts.filter((p) => p.medication?.name === activeFilter);

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey !== 'Community') navigation.navigate(tabKey);
  };

  const openAllVideos = () => {
    Linking.openURL(
      'https://www.youtube.com/results?search_query=medication+education+patient'
    ).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        <Animated.View style={{ opacity: headerFade, transform: [{ translateY: headerRise }] }}>
          <View style={styles.headerWrap}>
            <LinearGradient
              colors={[C.deep, C.violet, C.magenta, C.rose]}
              locations={[0, 0.35, 0.7, 1]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={styles.headerGradient}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.bloom,
                  { transform: [{ translateX: bloomX }, { translateY: bloomY }] },
                ]}
              />
              <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.headerTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Community</Text>
                    <Text style={styles.headerSubtitle}>
                      Real experiences from people on similar medications
                    </Text>
                  </View>
                </View>
                <View style={styles.disclaimerPill}>
                  <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.disclaimerText}>
                    Peer support, not medical advice. Always talk to your doctor.
                  </Text>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.composerWrap,
            { opacity: composerFade, transform: [{ translateY: composerRise }] },
          ]}
        >
          <TouchableOpacity
            style={styles.composerCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <View style={styles.composerAvatar}>
              <Text style={styles.composerAvatarText}>ME</Text>
            </View>
            <Text style={styles.composerPlaceholder}>Share your experience…</Text>
            <View style={styles.composerIconBtn}>
              <Ionicons name="create-outline" size={17} color={C.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ================================================================ */}
        {/* LEARN — educational YouTube videos                                */}
        {/* ================================================================ */}
        <Animated.View
          style={[
            styles.learnSection,
            { opacity: videosFade, transform: [{ translateY: videosRise }] },
          ]}
        >
          <View style={styles.learnHeader}>
            <View style={styles.learnTitleRow}>
              <View style={styles.learnIconWrap}>
                <Ionicons name="school-outline" size={16} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.learnTitle}>Learn</Text>
                <Text style={styles.learnSubtitle}>
                  Short videos on medications and symptoms
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={openAllVideos}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.learnSeeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.videosRow}
          >
            {VIDEOS.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} />
            ))}
          </ScrollView>
        </Animated.View>

        {/* ================================================================ */}
        {/* FILTERS                                                          */}
        {/* ================================================================ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={activeFilter === f.key}
              onPress={() => setActiveFilter(f.key)}
            />
          ))}
        </ScrollView>

        {/* ================================================================ */}
        {/* FEED                                                             */}
        {/* ================================================================ */}
        <View style={styles.section}>
          {visiblePosts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={24} color={C.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>Nothing here yet</Text>
              <Text style={styles.emptyStateText}>
                Be the first to share an experience with{' '}
                {activeFilter === 'following' ? 'people you follow' : activeFilter}.
              </Text>
            </View>
          ) : (
            visiblePosts.map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 96 + insets.bottom }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <LinearGradient
          colors={[C.violet, C.magenta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  headerWrap: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#1B0A3D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  headerGradient: {
    paddingBottom: 30,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  bloom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#22D3EE',
    opacity: 0.18,
    top: -80,
    right: -90,
  },
  headerSafe: { paddingHorizontal: 20, paddingTop: 10 },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 18,
    paddingRight: 12,
  },
  disclaimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    lineHeight: 15,
  },

  composerWrap: { paddingHorizontal: 20, marginTop: -22 },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  composerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  composerAvatarText: {
    color: C.primary, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5,
  },
  composerPlaceholder: {
    flex: 1, fontSize: 14, color: C.inkMuted, fontWeight: '500',
  },
  composerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── Learn / Videos ─────────────────────────────────────────────── */
  learnSection: {
    marginTop: 26,
  },
  learnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  learnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  learnIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.2,
  },
  learnSubtitle: {
    fontSize: 11.5,
    color: C.inkMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  learnSeeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },

  videosRow: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  videoCard: {
    width: 180,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  videoThumb: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoThumbIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  videoMeta: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.1,
  },
  videoSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  videoSource: {
    fontSize: 11,
    color: C.inkMuted,
    fontWeight: '500',
    flexShrink: 1,
  },

  /* ── Filters ────────────────────────────────────────────────────── */
  filtersRow: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 6,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line,
  },
  chipActive: {
    backgroundColor: C.primary, borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  chipText: {
    fontSize: 13, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.1,
  },
  chipTextActive: { color: '#FFFFFF' },

  /* ── Feed ───────────────────────────────────────────────────────── */
  section: { paddingHorizontal: 20, marginTop: 14 },
  postCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  avatarText: {
    color: '#FFFFFF', fontSize: 13.5, fontWeight: '800', letterSpacing: 0.5,
  },
  authorInfo: { flex: 1, marginRight: 8 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: {
    fontSize: 14, fontWeight: '700', color: C.ink, letterSpacing: -0.1, flexShrink: 1,
  },
  anonPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.primarySoft,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  anonPillText: {
    fontSize: 9.5, fontWeight: '800', color: C.primary, letterSpacing: 0.3,
  },
  timeAgo: {
    fontSize: 11.5, color: C.inkFaint, marginTop: 2, fontWeight: '500',
  },

  medTag: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, marginBottom: 10,
  },
  medTagDot: { width: 6, height: 6, borderRadius: 3 },
  medTagText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },

  postBody: {
    fontSize: 14, lineHeight: 21, color: C.ink,
    fontWeight: '400', letterSpacing: -0.05, marginBottom: 14,
  },

  reactionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line,
  },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionCount: { fontSize: 12.5, color: C.inkFaint, fontWeight: '600' },

  emptyState: {
    alignItems: 'center', backgroundColor: C.surface,
    borderRadius: 20, paddingVertical: 30, paddingHorizontal: 24,
    borderWidth: 1, borderColor: C.line,
  },
  emptyIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 14,
  },
  emptyStateText: {
    fontSize: 13, color: C.inkMuted, textAlign: 'center', marginTop: 6, lineHeight: 19,
  },

  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    shadowColor: C.magenta,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },

  tabBarWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 26, paddingVertical: 8, paddingHorizontal: 6,
    borderWidth: 1, borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16, shadowRadius: 22, elevation: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIconWrap: {
    width: 40, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  tabIconWrapActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  tabLabel: {
    fontSize: 10, fontWeight: '600', color: C.inkFaint, letterSpacing: 0.1,
  },
  tabLabelActive: { color: C.primary, fontWeight: '800' },
});