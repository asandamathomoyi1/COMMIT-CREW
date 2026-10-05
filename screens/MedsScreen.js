import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */
const C = {
  deep: '#1B0A3D',
  violet: '#4C1D95',
  magenta: '#A21CAF',
  rose: '#F43F5E',

  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primarySoft: '#F3E8FF',
  mint: '#5EEAD4',

  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  ink: '#0B1220',
  inkSoft: '#475569',
  inkMuted: '#64748B',
  inkFaint: '#94A3B8',
  line: '#EDE9FE',
  lineSoft: '#F3F0FA',
  surface: '#FFFFFF',
  bg: '#F8F7FC',
};

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'Medications', label: 'Meds', icon: 'medkit-outline', iconActive: 'medkit' },
  { key: 'History', label: 'History', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'Pharmacy', label: 'Pharmacy', icon: 'location-outline', iconActive: 'location' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'low', label: 'Needs attention' },
];

const MEDICATIONS = [
  {
    id: '1',
    name: 'Metformin',
    dosage: '500mg',
    schedule: '08:00 · 20:00',
    frequency: 'Twice daily',
    color: '#7C3AED',
    icon: 'medical-outline',
    takenDoses: 5,
    totalDoses: 7,
    nextDose: 'Today · 20:00',
  },
  {
    id: '2',
    name: 'Salbutamol',
    dosage: '100mcg',
    schedule: 'As needed',
    frequency: 'PRN inhaler',
    color: '#A21CAF',
    icon: 'cloud-outline',
    takenDoses: 2,
    totalDoses: 7,
    nextDose: 'As needed',
  },
  {
    id: '3',
    name: 'Levetiracetam',
    dosage: '500mg',
    schedule: '19:00',
    frequency: 'Once daily',
    color: '#D97706',
    icon: 'pulse-outline',
    takenDoses: 7,
    totalDoses: 7,
    nextDose: 'Tomorrow · 19:00',
  },
  {
    id: '4',
    name: 'Vitamin D3',
    dosage: '1000IU',
    schedule: '08:00',
    frequency: 'Once daily',
    color: '#059669',
    icon: 'sunny-outline',
    takenDoses: 6,
    totalDoses: 7,
    nextDose: 'Tomorrow · 08:00',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const getStatus = (med) => {
  const pct = med.takenDoses / med.totalDoses;
  if (pct === 1) return { label: 'Completed', color: C.success, bg: C.successSoft };
  if (pct >= 0.7) return { label: 'On track', color: C.primary, bg: C.primarySoft };
  if (pct >= 0.4) return { label: 'Slipping', color: C.warning, bg: C.warningSoft };
  return { label: 'Needs attention', color: C.danger, bg: C.dangerSoft };
};

/* ------------------------------------------------------------------ */
/*  Bottom tab bar                                                     */
/* ------------------------------------------------------------------ */
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
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
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

/* ------------------------------------------------------------------ */
/*  Medication card                                                    */
/* ------------------------------------------------------------------ */
function MedCard({ med, onPress, index }) {
  const pct = Math.round((med.takenDoses / med.totalDoses) * 100);
  const status = getStatus(med);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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

    Animated.timing(progressAnim, {
      toValue: pct / 100,
      duration: 800,
      delay: 320 + index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, index]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.medCardWrap, { opacity: fade, transform: [{ translateY: rise }] }]}
    >
      <TouchableOpacity
        style={styles.medCard}
        activeOpacity={0.85}
        onPress={onPress}
      >
        {/* Left accent bar */}
        <View style={[styles.medAccent, { backgroundColor: med.color }]} />

        <View style={styles.medBody}>
          {/* Top row */}
          <View style={styles.medCardTop}>
            <View style={[styles.medIconWrap, { backgroundColor: `${med.color}15` }]}>
              <Ionicons name={med.icon} size={20} color={med.color} />
            </View>

            <View style={styles.medInfo}>
              <View style={styles.medNameRow}>
                <Text style={styles.medName} numberOfLines={1}>
                  {med.name}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.medMeta} numberOfLines={1}>
                {med.dosage} · {med.frequency}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={C.inkFaint} />
          </View>

          {/* Next dose + schedule */}
          <View style={styles.medDetailRow}>
            <View style={styles.medDetailItem}>
              <Ionicons name="time-outline" size={13} color={C.inkFaint} />
              <Text style={styles.medDetailText}>{med.schedule}</Text>
            </View>
            <View style={styles.medDetailDivider} />
            <View style={styles.medDetailItem}>
              <Ionicons name="alarm-outline" size={13} color={C.inkFaint} />
              <Text style={styles.medDetailText} numberOfLines={1}>
                {med.nextDose}
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.medProgressRow}>
            <View style={styles.medProgressTrack}>
              <Animated.View
                style={[
                  styles.medProgressFill,
                  { width: progressWidth, backgroundColor: med.color },
                ]}
              />
            </View>

            <View style={styles.medProgressMeta}>
              <Text style={styles.medProgressLabel}>
                {med.takenDoses}/{med.totalDoses} doses this week
              </Text>
              <Text style={[styles.medProgressPct, { color: med.color }]}>
                {pct}%
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
const MedicationsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Medications');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const insets = useSafeAreaInsets();

  const totalMeds = MEDICATIONS.length;

  const overallPct = useMemo(() => {
    const taken = MEDICATIONS.reduce((s, m) => s + m.takenDoses, 0);
    const total = MEDICATIONS.reduce((s, m) => s + m.totalDoses, 0);
    return total === 0 ? 0 : Math.round((taken / total) * 100);
  }, []);

  const takenToday = useMemo(
    () => MEDICATIONS.reduce((s, m) => s + (m.takenDoses > 0 ? 1 : 0), 0),
    []
  );

  const filteredMeds = useMemo(() => {
    let list = MEDICATIONS;

    if (filter === 'low') {
      list = list.filter((m) => m.takenDoses / m.totalDoses < 0.7);
    } else if (filter === 'today') {
      list = list.filter((m) => m.schedule.toLowerCase().includes('today') || m.takenDoses < m.totalDoses);
    } else if (filter === 'week') {
      list = list.filter((m) => m.totalDoses > 0);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }

    return list;
  }, [query, filter]);

  /* Animations */
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerRise = useRef(new Animated.Value(16)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(16)).current;
  const bloom = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1, duration: 550, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(headerRise, {
        toValue: 0, duration: 550, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1, duration: 600, delay: 180,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(cardRise, {
        toValue: 0, duration: 600, delay: 180,
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

  useEffect(() => {
    Animated.timing(progress, {
      toValue: overallPct / 100,
      duration: 900,
      delay: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [overallPct]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const bloomX = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const bloomY = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey !== 'Medications') navigation.navigate(tabKey);
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
        {/* ============================================================ */}
        {/* HEADER                                                        */}
        {/* ============================================================ */}
        <Animated.View
          style={{ opacity: headerFade, transform: [{ translateY: headerRise }] }}
        >
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
                {/* Top row: back · title · add */}
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => navigation.goBack()}
                    accessibilityLabel="Go back"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>Medications</Text>
                    <Text style={styles.headerSubtitle}>
                      {totalMeds} active · {takenToday} dosed today
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => navigation.navigate('AddMedication')}
                    accessibilityLabel="Add medication"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Glass adherence card */}
                <Animated.View
                  style={[
                    styles.adherenceCard,
                    { opacity: cardFade, transform: [{ translateY: cardRise }] },
                  ]}
                >
                  <View style={styles.adherenceTopRow}>
                    <View>
                      <Text style={styles.adherenceLabel}>Weekly adherence</Text>
                      <Text style={styles.adherencePct}>{overallPct}%</Text>
                    </View>
                    <View style={styles.adherenceBadge}>
                      <Ionicons name="trending-up" size={13} color={C.mint} />
                      <Text style={styles.adherenceBadgeText}>Good</Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[styles.progressFill, { width: progressWidth }]}
                    />
                  </View>

                  <View style={styles.adherenceStats}>
                    <View style={styles.adherenceStat}>
                      <Text style={styles.adherenceStatValue}>{totalMeds}</Text>
                      <Text style={styles.adherenceStatLabel}>Active</Text>
                    </View>
                    <View style={styles.adherenceStatDivider} />
                    <View style={styles.adherenceStat}>
                      <Text style={styles.adherenceStatValue}>{takenToday}</Text>
                      <Text style={styles.adherenceStatLabel}>Today</Text>
                    </View>
                    <View style={styles.adherenceStatDivider} />
                    <View style={styles.adherenceStat}>
                      <Text style={styles.adherenceStatValue}>
                        {MEDICATIONS.filter((m) => m.takenDoses / m.totalDoses < 0.7).length}
                      </Text>
                      <Text style={styles.adherenceStatLabel}>Attention</Text>
                    </View>
                  </View>
                </Animated.View>
              </SafeAreaView>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ============================================================ */}
        {/* SEARCH                                                        */}
        {/* ============================================================ */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={C.inkFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medications"
              placeholderTextColor={C.inkFaint}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={C.inkFaint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ============================================================ */}
        {/* FILTER CHIPS                                                  */}
        {/* ============================================================ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ============================================================ */}
        {/* LIST                                                          */}
        {/* ============================================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ALL MEDICATIONS</Text>
            {filteredMeds.length > 0 && (
              <Text style={styles.sectionCount}>
                {filteredMeds.length} item{filteredMeds.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {filteredMeds.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={24} color={C.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>No medications found</Text>
              <Text style={styles.emptyStateText}>
                Try a different search term or clear your filters.
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => {
                  setQuery('');
                  setFilter('all');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyActionText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredMeds.map((med, index) => (
              <MedCard
                key={med.id}
                med={med}
                index={index}
                onPress={() =>
                  navigation.navigate('MedicationDetail', { id: med.id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        bottomInset={insets.bottom}
      />
    </View>
  );
};

export default MedicationsScreen;

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  /* ── Header ────────────────────────────────────────────────── */
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
    paddingBottom: 24,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
    fontWeight: '500',
  },

  /* ── Adherence card ───────────────────────────────────────── */
  adherenceCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  adherenceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  adherenceLabel: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  adherencePct: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  adherenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(94,234,212,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,0.32)',
  },
  adherenceBadgeText: {
    color: C.mint,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: C.mint,
  },
  adherenceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  adherenceStat: { flex: 1, alignItems: 'center' },
  adherenceStatValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  adherenceStatLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  adherenceStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  /* ── Search ───────────────────────────────────────────────── */
  searchWrap: { paddingHorizontal: 20, marginTop: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    padding: 0,
    fontWeight: '500',
  },

  /* ── Filter chips ─────────────────────────────────────────── */
  chipsRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.inkSoft,
    letterSpacing: 0.1,
  },
  chipTextActive: { color: '#FFFFFF' },

  /* ── Section ──────────────────────────────────────────────── */
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: C.inkMuted,
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: C.inkFaint,
    fontWeight: '600',
  },

  /* ── Empty state ──────────────────────────────────────────── */
  emptyState: {
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: C.line,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginTop: 14,
  },
  emptyStateText: {
    fontSize: 13,
    color: C.inkMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  emptyAction: {
    marginTop: 16,
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  /* ── Medication card ──────────────────────────────────────── */
  medCardWrap: { marginBottom: 12 },
  medCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  medAccent: {
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  medBody: { flex: 1, padding: 14 },

  medCardTop: { flexDirection: 'row', alignItems: 'center' },
  medIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medInfo: { flex: 1 },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },

  medMeta: {
    fontSize: 12.5,
    color: C.inkMuted,
    marginTop: 4,
    fontWeight: '500',
  },

  medDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.lineSoft,
  },
  medDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  medDetailText: {
    fontSize: 11.5,
    color: C.inkMuted,
    fontWeight: '600',
  },
  medDetailDivider: {
    width: 1,
    height: 12,
    backgroundColor: C.line,
    marginHorizontal: 10,
  },

  medProgressRow: { marginTop: 12 },
  medProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F1EEF9',
    overflow: 'hidden',
    marginBottom: 8,
  },
  medProgressFill: { height: '100%', borderRadius: 3 },
  medProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medProgressLabel: {
    fontSize: 11.5,
    color: C.inkFaint,
    fontWeight: '500',
  },
  medProgressPct: { fontSize: 12, fontWeight: '800' },

  /* ── Floating tab bar ─────────────────────────────────────── */
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 26,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIconWrap: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconWrapActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: C.inkFaint, letterSpacing: 0.1 },
  tabLabelActive: { color: C.primary, fontWeight: '800' },
});