import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useMedications } from '../context/MedicationsContext';

// ---------------------------------------------------------------------------
// Design tokens — matches Splash / Home / Medications
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

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times', 'As needed'];

const FREQ_DEFAULT_TIMES = {
  'Once daily': ['08:00'],
  'Twice daily': ['08:00', '20:00'],
  'Three times': ['08:00', '14:00', '20:00'],
  'As needed': [],
};

// Colors pulled from the theme palette so saved medications look native
const PALETTE = ['#7C3AED', '#A21CAF', '#D97706', '#059669', '#DB2777', '#0891B2'];

const BARCODE_LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup?upc=';

function iconFor(condition = '') {
  const c = condition.toLowerCase();
  if (c.includes('asthma') || c.includes('lung') || c.includes('breath')) return 'body-outline';
  if (c.includes('diabet') || c.includes('sugar')) return 'water-outline';
  if (c.includes('vitamin') || c.includes('supplement')) return 'sunny-outline';
  if (c.includes('heart') || c.includes('pressure') || c.includes('cholesterol')) return 'heart-outline';
  if (c.includes('pain') || c.includes('ache')) return 'bandage-outline';
  if (c.includes('seizure') || c.includes('epilep')) return 'flash-outline';
  if (c.includes('allerg')) return 'alert-circle-outline';
  return 'medkit-outline';
}

function extractDosage(text = '') {
  const match = text.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu))/i);
  return match ? match[1].replace(/\s+/g, '').toUpperCase() : '';
}

function cleanName(title = '', dosageToken = '') {
  let cleaned = title;
  if (dosageToken) {
    cleaned = cleaned.replace(
      new RegExp(dosageToken.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1'), 'i'),
      ''
    );
  }
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/[,-]\s*$/, '').trim();
  return cleaned || title.trim();
}

function timeStringToDate(t) {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function dateToTimeString(d) {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
function formatTimeLabel(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function TimeField({ value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <View style={styles.timeRow}>
      <TouchableOpacity
        style={styles.timeInput}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <View style={styles.timeLeft}>
          <Ionicons name="time-outline" size={16} color={C.primary} />
          <Text style={styles.timeInputText}>{formatTimeLabel(value)}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={C.inkFaint} />
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (event.type === 'dismissed') {
              setShowPicker(false);
              return;
            }
            if (selectedDate) onChange(dateToTimeString(selectedDate));
            if (Platform.OS === 'android') setShowPicker(false);
          }}
        />
      )}
    </View>
  );
}

function FreqButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.freqBtn, active && styles.freqBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.freqBtnText, active && styles.freqBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ModeToggle({ mode, onChange, onEnterScan }) {
  return (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[styles.toggleBtn, mode === 'manual' && styles.toggleActive]}
        onPress={() => onChange('manual')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="create-outline"
          size={16}
          color={mode === 'manual' ? C.primary : C.inkFaint}
        />
        <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>
          Manual
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toggleBtn, mode === 'scan' && styles.toggleActive]}
        onPress={onEnterScan}
        activeOpacity={0.8}
      >
        <Ionicons
          name="camera-outline"
          size={16}
          color={mode === 'scan' ? C.primary : C.inkFaint}
        />
        <Text style={[styles.toggleText, mode === 'scan' && styles.toggleTextActive]}>
          Scan
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function AddMedicationScreen({ navigation }) {
  const { addMedication } = useMedications();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState('manual');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanBanner, setScanBanner] = useState(null);
  const [scanBannerTone, setScanBannerTone] = useState('success');

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [condition, setCondition] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [times, setTimes] = useState(FREQ_DEFAULT_TIMES['Once daily']);
  const [errors, setErrors] = useState({});

  const lastScanRef = useRef(null);

  /* ── entrance animations ────────────────────────────────────────── */
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerRise = useRef(new Animated.Value(16)).current;
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

  /* ── form logic ─────────────────────────────────────────────────── */
  function changeFrequency(freq) {
    setFrequency(freq);
    setTimes(FREQ_DEFAULT_TIMES[freq]);
  }

  function updateTime(idx, val) {
    setTimes((prev) => prev.map((t, i) => (i === idx ? val : t)));
  }

  async function handleEnterScanMode() {
    if (!permission) return;
    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera access needed',
          'MedTrack needs camera access to scan a medication barcode. You can still add it manually.',
        );
        return;
      }
    }
    setMode('scan');
  }

  async function lookupBarcode(code) {
    setLookupLoading(true);
    try {
      const res = await fetch(`${BARCODE_LOOKUP_URL}${encodeURIComponent(code)}`);
      const json = await res.json();
      const item = json?.items?.[0];

      if (item) {
        const rawTitle = item.title || item.brand || '';
        const rawSize = item.size || '';
        const dosageToken = extractDosage(rawSize) || extractDosage(rawTitle);
        const guessedName = cleanName(rawTitle, dosageToken);

        if (guessedName) setName(guessedName);
        if (dosageToken) setDosage(dosageToken);
        if (item.category) setCondition(item.category.split('>').pop().trim());

        setScanBannerTone('success');
        setScanBanner(
          guessedName
            ? `Auto-filled "${guessedName}"${dosageToken ? ` · ${dosageToken}` : ''} from the scan — check it over and adjust anything that's off.`
            : 'Found a match, but the listing was missing a clear name — please check the fields below.',
        );
      } else {
        setScanBannerTone('neutral');
        setScanBanner(
          "We couldn't find that barcode in the product database — enter the details below to finish adding it.",
        );
      }
    } catch (e) {
      setScanBannerTone('neutral');
      setScanBanner(
        "Couldn't reach the lookup service — enter the details below to finish adding it.",
      );
    } finally {
      setLookupLoading(false);
      setMode('manual');
    }
  }

  function handleBarcodeScanned({ data }) {
    if (scanLocked || lastScanRef.current === data) return;
    lastScanRef.current = data;
    setScanLocked(true);
    lookupBarcode(data);
    setTimeout(() => {
      setScanLocked(false);
      lastScanRef.current = null;
    }, 1500);
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = 'Enter the medication name';
    if (!dosage.trim()) errs.dosage = 'Enter a dosage';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const newMedication = {
      id: `m${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      condition: condition.trim(),
      frequency,
      times,
      icon: iconFor(condition),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      takenToday: false,
    };
    addMedication(newMedication);
    navigation.navigate('Medications');
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ================================================================ */}
      {/* HEADER                                                            */}
      {/* ================================================================ */}
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
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backRow}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Add Medication</Text>
              <Text style={styles.headerSubtitle}>
                Scan packaging or enter details manually
              </Text>
            </SafeAreaView>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* ================================================================ */}
      {/* MODE TOGGLE                                                       */}
      {/* ================================================================ */}
      <ModeToggle
        mode={mode}
        onChange={setMode}
        onEnterScan={handleEnterScanMode}
      />

      {/* ================================================================ */}
      {/* SCAN MODE                                                         */}
      {/* ================================================================ */}
      {mode === 'scan' ? (
        <View style={styles.cameraWrap}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            >
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
                <View style={styles.scanCornerTL} />
                <View style={styles.scanCornerTR} />
                <View style={styles.scanCornerBL} />
                <View style={styles.scanCornerBR} />

                {lookupLoading ? (
                  <View style={styles.lookupBadge}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.scanHint}>Looking up product…</Text>
                  </View>
                ) : (
                  <Text style={styles.scanHint}>Line up the barcode inside the frame</Text>
                )}
              </View>

              <View style={styles.scanControls}>
                <TouchableOpacity
                  style={styles.scanControlBtn}
                  onPress={() => setTorchOn((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={torchOn ? 'flash' : 'flash-outline'}
                    size={15}
                    color="#FFFFFF"
                  />
                  <Text style={styles.scanControlText}>
                    {torchOn ? 'Torch on' : 'Torch'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scanControlBtn}
                  onPress={() => setMode('manual')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="keypad-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.scanControlText}>Enter manually</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <LinearGradient
              colors={[C.deep, C.violet, C.magenta]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.permissionFallback}
            >
              <View style={styles.permissionIconWrap}>
                <Ionicons name="camera-outline" size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.permissionTitle}>Camera access is off</Text>
              <Text style={styles.permissionText}>
                Turn on camera access in your device settings to scan a barcode,
                or switch to Manual.
              </Text>
              <TouchableOpacity
                style={styles.permissionBtn}
                onPress={() => setMode('manual')}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionBtnText}>Switch to Manual</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>
      ) : (
        /* ============================================================== */
        /* FORM MODE                                                      */
        /* ============================================================== */
        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {scanBanner ? (
            <View
              style={[
                styles.scanBanner,
                scanBannerTone === 'neutral' && styles.scanBannerNeutral,
              ]}
            >
              <Ionicons
                name={
                  scanBannerTone === 'success'
                    ? 'checkmark-circle-outline'
                    : 'information-circle-outline'
                }
                size={17}
                color={scanBannerTone === 'success' ? C.success : C.inkMuted}
              />
              <Text
                style={[
                  styles.scanBannerText,
                  scanBannerTone === 'neutral' && styles.scanBannerTextNeutral,
                ]}
              >
                {scanBanner}
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Medication name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="e.g. Metformin"
            placeholderTextColor={C.inkFaint}
            value={name}
            onChangeText={setName}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          <Text style={styles.fieldLabel}>Dosage</Text>
          <TextInput
            style={[styles.input, errors.dosage && styles.inputError]}
            placeholder="e.g. 500mg"
            placeholderTextColor={C.inkFaint}
            value={dosage}
            onChangeText={setDosage}
          />
          {errors.dosage ? <Text style={styles.errorText}>{errors.dosage}</Text> : null}

          <Text style={styles.fieldLabel}>Condition / Purpose</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Diabetes"
            placeholderTextColor={C.inkFaint}
            value={condition}
            onChangeText={setCondition}
          />

          <Text style={styles.fieldLabel}>Frequency</Text>
          <View style={styles.freqGrid}>
            {FREQUENCIES.map((f) => (
              <FreqButton
                key={f}
                label={f}
                active={frequency === f}
                onPress={() => changeFrequency(f)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Reminder times</Text>
          {frequency === 'As needed' ? (
            <View style={styles.asNeededNote}>
              <Ionicons name="notifications-off-outline" size={16} color={C.warning} />
              <Text style={styles.asNeededText}>
                No scheduled reminders — you'll log this dose yourself whenever you
                take it.
              </Text>
            </View>
          ) : (
            times.map((t, idx) => (
              <TimeField key={idx} value={t} onChange={(val) => updateTime(idx, val)} />
            ))
          )}

          <View style={styles.infoBox}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="cloud-offline-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBoxTitle}>Offline reminders</Text>
              <Text style={styles.infoBoxSub}>
                Reminders are scheduled on your device — no internet needed.
              </Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ================================================================ */}
      {/* SAVE BAR                                                          */}
      {/* ================================================================ */}
      {mode === 'manual' && (
        <View style={[styles.saveBar, { paddingBottom: 18 + insets.bottom }]}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Save Medication</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* ── Header ─────────────────────────────────────────────────────── */
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
    paddingBottom: 22,
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
    opacity: 0.18,
    top: -80,
    right: -80,
  },
  headerSafe: { paddingHorizontal: 22, paddingTop: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 10 },
  backText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },

  /* ── Mode toggle ────────────────────────────────────────────────── */
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  toggleActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  toggleText: { fontSize: 14, fontWeight: '700', color: C.inkFaint },
  toggleTextActive: { color: C.primary },

  /* ── Camera ─────────────────────────────────────────────────────── */
  cameraWrap: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: C.line,
  },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: '72%',
    aspectRatio: 1.6,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
  },
  scanCornerTL: {
    position: 'absolute',
    top: '34%',
    left: '13%',
    width: 26,
    height: 26,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 8,
  },
  scanCornerTR: {
    position: 'absolute',
    top: '34%',
    right: '13%',
    width: 26,
    height: 26,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 8,
  },
  scanCornerBL: {
    position: 'absolute',
    bottom: '34%',
    left: '13%',
    width: 26,
    height: 26,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
  },
  scanCornerBR: {
    position: 'absolute',
    bottom: '34%',
    right: '13%',
    width: 26,
    height: 26,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 8,
  },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  lookupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scanControls: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  scanControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanControlText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  /* ── Permission fallback ────────────────────────────────────────── */
  permissionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  permissionIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
  },
  permissionBtnText: { color: C.primaryDark, fontSize: 14, fontWeight: '800' },

  /* ── Form ───────────────────────────────────────────────────────── */
  form: { flex: 1 },
  formContent: { paddingHorizontal: 20, paddingTop: 18 },

  scanBanner: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: C.successSoft,
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scanBannerNeutral: {
    backgroundColor: '#F1F5F9',
    borderColor: C.line,
  },
  scanBannerText: {
    flex: 1,
    color: C.success,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  scanBannerTextNeutral: { color: C.inkSoft },

  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.inkSoft,
    marginBottom: 7,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14.5,
    color: C.ink,
    backgroundColor: C.surface,
    marginBottom: 3,
    fontWeight: '500',
  },
  inputError: { borderColor: C.danger },
  errorText: {
    color: C.danger,
    fontSize: 12,
    marginBottom: 12,
    marginTop: 2,
    fontWeight: '500',
  },

  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 17 },
  freqBtn: {
    width: '47.5%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  freqBtnActive: { backgroundColor: C.primarySoft, borderColor: C.primary },
  freqBtnText: { fontSize: 13.5, fontWeight: '700', color: C.inkSoft },
  freqBtnTextActive: { color: C.primary },

  timeRow: { marginBottom: 9 },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: C.surface,
  },
  timeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInputText: { fontSize: 14, color: C.ink, fontWeight: '600' },

  asNeededNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.warningSoft,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  asNeededText: {
    flex: 1,
    fontSize: 12.5,
    color: C.warning,
    lineHeight: 18,
    fontWeight: '500',
  },

  infoBox: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: C.primarySoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBoxTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.primaryDark,
    marginBottom: 2,
  },
  infoBoxSub: { fontSize: 12, color: C.primary, lineHeight: 17 },

  /* ── Save bar ───────────────────────────────────────────────────── */
  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  saveBtn: {
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
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});