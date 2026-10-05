import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMedications } from '../context/MedicationsContext';

const C = {
  deep: '#1B0A3D',
  violet: '#4C1D95',
  magenta: '#A21CAF',
  rose: '#F43F5E',

  primary: '#7C3AED',
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

const FEATURED_DEAL = {
  pharmacyName: 'Clicks Pharmacy',
  discount: '10% off selected medication',
  distanceKm: 2.3,
  expiresInDays: 4,
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ME';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatCountdown(mins) {
  if (mins <= 0) return 'now';
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

function getDoseTiming(med) {
  const times = Array.isArray(med.times) ? med.times.filter(Boolean) : [];
  if (times.length === 0) {
    return { order: 9000, tone: 'neutral', label: 'As needed', sub: 'No schedule' };
  }
  const now = new Date();
  const parsed = times
    .map((t) => {
      const [h, m] = t.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return { raw: t, date: d };
    })
    .sort((a, b) => a.date - b.date);

  const next = parsed.find((p) => p.date.getTime() > now.getTime());
  const first = parsed[0];

  if (med.takenToday) {
    return {
      order: 8000,
      tone: 'done',
      label: 'Taken',
      sub: next ? `Next ${formatTime(next.raw)}` : `Logged ${formatTime(first.raw)}`,
    };
  }
  if (next) {
    const mins = Math.round((next.date - now) / 60000);
    return {
      order: mins,
      tone: mins <= 60 ? 'soon' : 'upcoming',
      label: formatTime(next.raw),
      sub: formatCountdown(mins),
    };
  }
  const last = parsed[parsed.length - 1];
  return {
    order: -1,
    tone: 'overdue',
    label: 'Overdue',
    sub: `Missed ${formatTime(last.raw)}`,
  };
}

const TONE = {
  overdue: { bg: C.dangerSoft, fg: C.danger },
  soon: { bg: C.warningSoft, fg: C.warning },
  upcoming: { bg: C.primarySoft, fg: C.primary },
  done: { bg: C.successSoft, fg: C.success },
  neutral: { bg: '#F1F5F9', fg: C.inkMuted },
};

/* ------------------------------------------------------------------ */
/*  Tab bar                                                            */
/* ------------------------------------------------------------------ */
function BottomTabBar({ active, onPress, inset }) {
  return (
    <View style={[styles.tabWrap, { paddingBottom: Math.max(inset, 12) }]}>
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => onPress(t.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIcon, on && styles.tabIconOn]}>
                <Ionicons
                  name={on ? t.iconActive : t.icon}
                  size={19}
                  color={on ? '#FFF' : C.inkFaint}
                />
              </View>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Section label                                                      */
/* ------------------------------------------------------------------ */
function SectionLabel({ title, action, onAction }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{title}</Text>
      {action ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Dose row                                                           */
/* ------------------------------------------------------------------ */
function DoseRow({ med, onToggle, index }) {
  const timing = getDoseTiming(med);
  const taken = !!med.takenToday;
  const t = TONE[timing.tone] || TONE.neutral;

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1, duration: 360, delay: 180 + index * 50,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0, duration: 360, delay: 180 + index * 50,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, index]);

  return (
    <Animated.View
      style={[styles.doseRow, { opacity: fade, transform: [{ translateY: rise }] }]}
    >
      <View
        style={[styles.doseIcon, { backgroundColor: (med.color || C.primary) + '18' }]}
      >
        <Ionicons
          name={med.icon || 'medkit-outline'}
          size={18}
          color={med.color || C.primary}
        />
      </View>

      <View style={styles.doseInfo}>
        <Text style={styles.doseName} numberOfLines={1}>
          {med.name}
        </Text>
        <View style={styles.doseMetaRow}>
          <Text style={styles.doseMeta} numberOfLines={1}>
            {med.dosage || '—'}
          </Text>
          <Text style={styles.doseMetaDot}>·</Text>
          <Text style={styles.doseMeta} numberOfLines={1}>
            {timing.label}
          </Text>
        </View>
      </View>

      <View style={[styles.doseBadge, { backgroundColor: t.bg }]}>
        <Text style={[styles.doseBadgeText, { color: t.fg }]}>
          {timing.sub}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.doseCheck, taken && styles.doseCheckDone]}
        onPress={onToggle}
        activeOpacity={0.75}
      >
        <Ionicons
          name={taken ? 'checkmark' : 'add'}
          size={16}
          color={taken ? C.success : '#FFFFFF'}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export default function HomeScreen({ navigation, userName = 'Alex' }) {
  const { medications = [], toggleTaken } = useMedications();
  const [activeTab, setActiveTab] = useState('Home');
  const insets = useSafeAreaInsets();

  const total = medications.length;
  const taken = medications.filter((m) => m.takenToday).length;
  const remaining = total - taken;
  const pct = total === 0 ? 0 : Math.round((taken / total) * 100);

  const sorted = useMemo(
    () =>
      [...medications].sort(
        (a, b) => getDoseTiming(a).order - getDoseTiming(b).order
      ),
    [medications]
  );

  const nextUp = useMemo(() => {
    const pending = sorted.filter((m) => !m.takenToday);
    return pending[0] || null;
  }, [sorted]);

  const nextTiming = nextUp ? getDoseTiming(nextUp) : null;

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerRise = useRef(new Animated.Value(14)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1, duration: 480, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(headerRise, {
        toValue: 0, duration: 480, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progress, {
      toValue: pct / 100,
      duration: 850,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bloom, {
          toValue: 1, duration: 7500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(bloom, {
          toValue: 0, duration: 7500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pct]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const bloomX = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const bloomY = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 24] });

  const handleTab = (key) => {
    setActiveTab(key);
    if (key !== 'Home') navigation.navigate(key);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scroll}
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
                <View style={styles.topRow}>
                  <TouchableOpacity
                    style={styles.identity}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Profile')}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(userName)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.greetSmall}>{greeting()}</Text>
                      <Text style={styles.greetName} numberOfLines={1}>
                        {userName}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => navigation.navigate('Emergency')}
                    accessibilityLabel="Emergency"
                    activeOpacity={0.85}
                  >
                    <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.summary}>
                  <View style={styles.summaryTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryLabel}>Today's adherence</Text>
                      <Text style={styles.summaryBig}>
                        {taken}
                        <Text style={styles.summaryBigFaint}>/{total}</Text>
                        <Text style={styles.summaryUnit}> doses</Text>
                      </Text>
                    </View>
                    <Text style={styles.summaryPct}>{pct}%</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[styles.progressFill, { width: progressWidth }]}
                    />
                  </View>

                  <Text style={styles.summaryFoot} numberOfLines={1}>
                    {total === 0
                      ? 'Add a medication to begin'
                      : remaining === 0
                      ? 'All doses logged for today'
                      : nextUp
                      ? `Next: ${nextUp.name} · ${nextTiming.label} ${nextTiming.sub}`
                      : 'No scheduled doses remaining'}
                  </Text>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ============================================================ */}
        {/* QUICK ACCESS — 2x2 grid                                       */}
        {/* ============================================================ */}
        <View style={styles.section}>
          <SectionLabel title="Quick access" />
          <View style={styles.quickGrid}>
            {/* Add medication — primary tile */}
            <TouchableOpacity
              style={[styles.quickTile, styles.quickTilePrimary]}
              onPress={() => navigation.navigate('AddMedication')}
              activeOpacity={0.9}
            >
              <View style={styles.quickTileTop}>
                <View style={styles.quickIconPrimary}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="rgba(255,255,255,0.8)"
                />
              </View>
              <View>
                <Text style={styles.quickTitlePrimary}>Add medication</Text>
                <Text style={styles.quickSubPrimary}>Create new schedule</Text>
              </View>
            </TouchableOpacity>

            {/* My medications */}
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => navigation.navigate('Medications')}
              activeOpacity={0.9}
            >
              <View style={styles.quickTileTop}>
                <View style={styles.quickIconSoft}>
                  <Ionicons name="list-outline" size={20} color={C.primary} />
                </View>
                <Ionicons name="arrow-forward" size={16} color={C.inkFaint} />
              </View>
              <View>
                <Text style={styles.quickTitle}>My medications</Text>
                <Text style={styles.quickSub}>
                  {total} active {total === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Pharmacy */}
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => navigation.navigate('Pharmacy')}
              activeOpacity={0.9}
            >
              <View style={styles.quickTileTop}>
                <View style={styles.quickIconSoft}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={C.primary}
                  />
                </View>
                <Ionicons name="arrow-forward" size={16} color={C.inkFaint} />
              </View>
              <View>
                <Text style={styles.quickTitle}>Find pharmacy</Text>
                <Text style={styles.quickSub}>Nearby &amp; open</Text>
              </View>
            </TouchableOpacity>

            {/* Community */}
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => navigation.navigate('Community')}
              activeOpacity={0.9}
            >
              <View style={styles.quickTileTop}>
                <View style={styles.quickIconSoft}>
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={C.primary}
                  />
                </View>
                <Ionicons name="arrow-forward" size={16} color={C.inkFaint} />
              </View>
              <View>
                <Text style={styles.quickTitle}>Community</Text>
                <Text style={styles.quickSub}>Share &amp; learn</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* TODAY'S SCHEDULE                                              */}
        {/* ============================================================ */}
        <View style={styles.section}>
          <SectionLabel
            title="Today's schedule"
            action={total > 0 ? 'See all' : null}
            onAction={() => navigation.navigate('Medications')}
          />

          {total === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="medkit-outline" size={24} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptyText}>
                Add your first medication to build your daily schedule and
                start receiving reminders.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('AddMedication')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sorted.map((med, i) => (
              <DoseRow
                key={med.id}
                med={med}
                index={i}
                onToggle={() => toggleTaken(med.id)}
              />
            ))
          )}
        </View>

        {/* ============================================================ */}
        {/* NEARBY DEALS                                                  */}
        {/* ============================================================ */}
        <View style={styles.section}>
          <SectionLabel
            title="Nearby deals"
            action="See all"
            onAction={() => navigation.navigate('Pharmacy')}
          />

          <TouchableOpacity
            style={styles.deal}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Pharmacy')}
          >
            <View style={styles.dealIconWrap}>
              <Ionicons name="storefront-outline" size={18} color={C.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.dealTop}>
                <Text style={styles.dealPharmacy} numberOfLines={1}>
                  {FEATURED_DEAL.pharmacyName}
                </Text>
                <View style={styles.dealTag}>
                  <Text style={styles.dealTagText}>PROMOTED</Text>
                </View>
              </View>
              <Text style={styles.dealDiscount} numberOfLines={1}>
                {FEATURED_DEAL.discount}
              </Text>
              <Text style={styles.dealMeta}>
                {FEATURED_DEAL.distanceKm} km away  ·  Ends in{' '}
                {FEATURED_DEAL.expiresInDays}d
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={C.inkFaint} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomTabBar active={activeTab} onPress={handleTab} inset={insets.bottom} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  /* Header */
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
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#22D3EE',
    opacity: 0.16,
    top: -70,
    right: -80,
  },
  headerSafe: { paddingHorizontal: 20, paddingTop: 10 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  greetSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
  greetName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220,38,38,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Summary */
  summary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  summaryBig: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.7,
    marginTop: 4,
  },
  summaryBigFaint: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  summaryUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  summaryPct: {
    fontSize: 24,
    fontWeight: '800',
    color: C.mint,
    letterSpacing: -0.5,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.20)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: C.mint,
  },
  summaryFoot: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 14,
  },

  /* Section */
  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
  },

  /* Quick access 2x2 grid */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  quickTile: {
    width: '48%',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  quickTilePrimary: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  quickTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  quickIconPrimary: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconSoft: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.2,
  },
  quickTitlePrimary: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  quickSub: {
    fontSize: 12,
    color: C.inkMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  quickSubPrimary: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    fontWeight: '500',
  },

  /* Dose row */
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  doseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doseInfo: { flex: 1, marginRight: 8 },
  doseName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.1,
  },
  doseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  doseMeta: {
    fontSize: 12,
    color: C.inkMuted,
    fontWeight: '500',
    flexShrink: 1,
  },
  doseMetaDot: { fontSize: 12, color: C.inkFaint },
  doseBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  doseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  doseCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseCheckDone: { backgroundColor: C.successSoft },

  /* Empty */
  empty: {
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: C.line,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginTop: 14,
  },
  emptyText: {
    fontSize: 13,
    color: C.inkMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },

  /* Deal */
  deal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  dealIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dealTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dealPharmacy: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.ink,
    flexShrink: 1,
    letterSpacing: -0.1,
  },
  dealTag: {
    backgroundColor: C.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dealTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
  },
  dealDiscount: {
    fontSize: 13,
    color: C.success,
    fontWeight: '600',
    marginBottom: 3,
  },
  dealMeta: {
    fontSize: 11.5,
    color: C.inkFaint,
    fontWeight: '500',
  },

  /* Tab bar */
  tabWrap: {
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
  tabIcon: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconOn: { backgroundColor: C.primary },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.inkFaint,
    letterSpacing: 0.1,
  },
  tabTextOn: { color: C.primary, fontWeight: '800' },
});