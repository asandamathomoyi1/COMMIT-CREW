import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMedications } from '../context/MedicationsContext';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  deep: '#1B0A3D',
  violet: '#4C1D95',
  magenta: '#A21CAF',
  rose: '#F43F5E',
  coral: '#FB923C',

  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primarySoft: '#F3E8FF',
  magentaSoft: '#FAE8FF',
  magenta: '#A21CAF',
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

const MAX_CHARS = 800;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function CreatePostScreen({ navigation, route }) {
  const { medications = [] } = useMedications();
  const insets = useSafeAreaInsets();

  const [body, setBody] = useState('');
  const [selectedMedId, setSelectedMedId] = useState(
    route?.params?.medicationId || null
  );
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [posting, setPosting] = useState(false);
  const [medPickerOpen, setMedPickerOpen] = useState(false);

  /* ── animations ─────────────────────────────────────────────────── */
  const headerFade = useRef(new Animated.Value(0)).current;
  const composerFade = useRef(new Animated.Value(0)).current;
  const composerRise = useRef(new Animated.Value(14)).current;
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1, duration: 400, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(composerFade, {
        toValue: 1, duration: 550, delay: 140,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(composerRise, {
        toValue: 0, duration: 550, delay: 140,
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

  /* ── derived ────────────────────────────────────────────────────── */
  const trimmed = body.trim();
  const canPost = trimmed.length >= 10 && trimmed.length <= MAX_CHARS && !posting;
  const remaining = MAX_CHARS - body.length;
  const selectedMed = medications.find((m) => m.id === selectedMedId) || null;

  /* ── handlers ───────────────────────────────────────────────────── */
  const handlePost = () => {
    if (!canPost) {
      if (trimmed.length < 10) {
        Alert.alert(
          'A little more',
          'Write at least a sentence so others know what you\u2019re sharing.'
        );
      }
      return;
    }

    const newPost = {
      id: `p${Date.now()}`,
      author: isAnonymous ? null : 'You',
      timeAgo: 'Just now',
      medication: selectedMed
        ? { name: selectedMed.name, color: selectedMed.color || C.primary }
        : null,
      body: trimmed,
      sameHere: 0,
      helpful: 0,
      comments: 0,
    };

    setPosting(true);
    // TODO: POST /community/posts → { body, medicationId, isAnonymous }
    setTimeout(() => {
      setPosting(false);
      Alert.alert(
        isAnonymous ? 'Posted anonymously' : 'Posted',
        'Your experience is now live in Community.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 900);
  };

  const handleClose = () => {
    if (trimmed.length > 0) {
      Alert.alert('Discard draft?', 'Your post won\u2019t be saved.', [
        { text: 'Keep writing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 140 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ============================================================ */}
          {/* COMPACT HEADER                                                */}
          {/* ============================================================ */}
          <Animated.View style={{ opacity: headerFade }}>
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
                  <View style={styles.headerRow}>
                    <TouchableOpacity
                      onPress={handleClose}
                      style={styles.headerIconBtn}
                      activeOpacity={0.7}
                      accessibilityLabel="Close"
                    >
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>New post</Text>

                    <TouchableOpacity
                      onPress={handlePost}
                      disabled={!canPost}
                      style={[styles.headerActionBtn, !canPost && { opacity: 0.4 }]}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.headerActionText}>
                        {posting ? 'Posting…' : 'Post'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* ============================================================ */}
          {/* AUTHOR STRIP                                                  */}
          {/* ============================================================ */}
          <Animated.View
            style={[
              styles.authorStrip,
              { opacity: composerFade, transform: [{ translateY: composerRise }] },
            ]}
          >
            <View style={styles.authorAvatar}>
              {isAnonymous ? (
                <Ionicons name="person-outline" size={18} color="#FFFFFF" />
              ) : (
                <Text style={styles.authorAvatarText}>ME</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>
                {isAnonymous ? 'Anonymous' : 'You'}
              </Text>
              <Text style={styles.authorMeta}>
                {isAnonymous
                  ? 'Posted without your name'
                  : 'Posted with your name'}
              </Text>
            </View>

            {selectedMed && (
              <View
                style={[
                  styles.medPill,
                  {
                    backgroundColor: (selectedMed.color || C.primary) + '18',
                    borderColor: (selectedMed.color || C.primary) + '44',
                  },
                ]}
              >
                <View
                  style={[
                    styles.medPillDot,
                    { backgroundColor: selectedMed.color || C.primary },
                  ]}
                />
                <Text
                  style={[
                    styles.medPillText,
                    { color: selectedMed.color || C.primary },
                  ]}
                  numberOfLines={1}
                >
                  {selectedMed.name}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* ============================================================ */}
          {/* COMPOSER                                                      */}
          {/* ============================================================ */}
          <Animated.View
            style={[
              styles.composer,
              { opacity: composerFade, transform: [{ translateY: composerRise }] },
            ]}
          >
            <TextInput
              style={styles.composerInput}
              placeholder={
                selectedMed
                  ? `What's your experience with ${selectedMed.name}?`
                  : 'Share what helped, what didn\u2019t, or what you\u2019re still figuring out…'
              }
              placeholderTextColor={C.inkFaint}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={MAX_CHARS + 100}
              textAlignVertical="top"
              scrollEnabled={false}
              autoFocus
            />

            <View style={styles.composerFooter}>
              <Text
                style={[
                  styles.counter,
                  remaining < 80 && styles.counterWarn,
                  remaining < 0 && styles.counterDanger,
                ]}
              >
                {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining}`}
              </Text>

              <View style={styles.composerDivider} />

              <TouchableOpacity
                style={[styles.toolBtn, selectedMed && styles.toolBtnActive]}
                onPress={() => setMedPickerOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="medkit-outline"
                  size={16}
                  color={selectedMed ? C.primary : C.inkMuted}
                />
                <Text
                  style={[
                    styles.toolBtnText,
                    selectedMed && styles.toolBtnTextActive,
                  ]}
                >
                  {selectedMed ? 'Change tag' : 'Tag medication'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolBtn, isAnonymous && styles.toolBtnActive]}
                onPress={() => setIsAnonymous((v) => !v)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isAnonymous ? 'shield-checkmark' : 'person-outline'}
                  size={16}
                  color={isAnonymous ? C.primary : C.inkMuted}
                />
                <Text
                  style={[
                    styles.toolBtnText,
                    isAnonymous && styles.toolBtnTextActive,
                  ]}
                >
                  {isAnonymous ? 'Private' : 'Named'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ============================================================ */}
          {/* MEDICATION PICKER (expands inline)                            */}
          {/* ============================================================ */}
          {medPickerOpen && (
            <Animated.View style={styles.medPicker}>
              <View style={styles.medPickerHeader}>
                <Text style={styles.medPickerTitle}>Tag a medication</Text>
                <TouchableOpacity
                  onPress={() => setMedPickerOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color={C.inkFaint} />
                </TouchableOpacity>
              </View>

              {medications.length === 0 ? (
                <View style={styles.emptyMeds}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={C.inkMuted}
                  />
                  <Text style={styles.emptyMedsText}>
                    Add a medication first — then you can tag it here so people
                    on the same one find your post.
                  </Text>
                </View>
              ) : (
                <>
                  {selectedMed && (
                    <TouchableOpacity
                      style={styles.clearTagBtn}
                      onPress={() => {
                        setSelectedMedId(null);
                        setMedPickerOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={14} color={C.danger} />
                      <Text style={styles.clearTagText}>Remove tag</Text>
                    </TouchableOpacity>
                  )}

                  {medications.map((med) => {
                    const active = selectedMedId === med.id;
                    return (
                      <TouchableOpacity
                        key={med.id}
                        style={[styles.medRow, active && styles.medRowActive]}
                        onPress={() => {
                          setSelectedMedId(active ? null : med.id);
                          setMedPickerOpen(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.medRowIcon,
                            { backgroundColor: med.color || C.primary },
                          ]}
                        >
                          <Ionicons
                            name={med.icon || 'medkit-outline'}
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medRowName} numberOfLines={1}>
                            {med.name}
                          </Text>
                          <Text style={styles.medRowMeta} numberOfLines={1}>
                            {med.dosage || 'No dosage'} · {med.frequency || 'As needed'}
                          </Text>
                        </View>
                        <Ionicons
                          name={active ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={active ? med.color || C.primary : C.inkFaint}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </Animated.View>
          )}

          {/* ============================================================ */}
          {/* GUIDELINES                                                    */}
          {/* ============================================================ */}
          <Animated.View
            style={[
              styles.guidelines,
              { opacity: composerFade, transform: [{ translateY: composerRise }] },
            ]}
          >
            <View style={styles.guidelinesIconWrap}>
              <Ionicons name="heart" size={14} color={C.magenta} />
            </View>
            <Text style={styles.guidelinesText}>
              Be kind. Share your experience — not medical advice. What works
              for you might not work for someone else.
            </Text>
          </Animated.View>
        </ScrollView>

        {/* ============================================================== */}
        {/* BOTTOM POST BAR                                                */}
        {/* ============================================================== */}
        <View style={[styles.bottomBar, { paddingBottom: 18 + insets.bottom }]}>
          <TouchableOpacity
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost}
            activeOpacity={0.85}
          >
            <Ionicons
              name={posting ? 'hourglass-outline' : 'paper-plane-outline'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.postBtnText}>
              {posting ? 'Posting…' : 'Share with Community'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 140 },

  /* ── Header ─────────────────────────────────────────────────────── */
  headerWrap: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1B0A3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  headerGradient: {
    paddingBottom: 16,
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bloom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#22D3EE',
    opacity: 0.18,
    top: -70,
    right: -80,
  },
  headerSafe: { paddingHorizontal: 16, paddingTop: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  headerActionText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* ── Author strip ───────────────────────────────────────────────── */
  authorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -18,
    marginBottom: 14,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.surface,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  authorAvatarText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  authorName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.1,
  },
  authorMeta: {
    fontSize: 11.5,
    color: C.inkMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  medPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 130,
  },
  medPillDot: { width: 6, height: 6, borderRadius: 3 },
  medPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },

  /* ── Composer card ──────────────────────────────────────────────── */
  composer: {
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    overflow: 'hidden',
  },
  composerInput: {
    fontSize: 15.5,
    lineHeight: 23,
    color: C.ink,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    minHeight: 200,
    fontWeight: '400',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.bg,
    gap: 8,
  },
  counter: {
    fontSize: 11.5,
    color: C.inkFaint,
    fontWeight: '700',
    paddingHorizontal: 4,
    minWidth: 32,
    textAlign: 'center',
  },
  counterWarn: { color: C.warning },
  counterDanger: { color: C.danger },
  composerDivider: {
    width: 1,
    height: 20,
    backgroundColor: C.line,
    marginRight: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  toolBtnActive: {
    backgroundColor: C.primarySoft,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkMuted,
  },
  toolBtnTextActive: { color: C.primary },

  /* ── Med picker ─────────────────────────────────────────────────── */
  medPicker: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  medPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medPickerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.inkSoft,
    letterSpacing: 0.3,
  },
  clearTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: C.dangerSoft,
    marginBottom: 10,
  },
  clearTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.danger,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  medRowActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  medRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medRowName: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.1,
  },
  medRowMeta: {
    fontSize: 11.5,
    color: C.inkMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  emptyMeds: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
  },
  emptyMedsText: {
    flex: 1,
    fontSize: 12.5,
    color: C.inkMuted,
    lineHeight: 18,
    fontWeight: '500',
  },

  /* ── Guidelines ─────────────────────────────────────────────────── */
  guidelines: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: C.magentaSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5D0FE',
  },
  guidelinesIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelinesText: {
    flex: 1,
    fontSize: 12,
    color: C.magenta,
    fontWeight: '600',
    lineHeight: 17,
  },

  /* ── Bottom bar ─────────────────────────────────────────────────── */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 5,
  },
  postBtnDisabled: { opacity: 0.45 },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});