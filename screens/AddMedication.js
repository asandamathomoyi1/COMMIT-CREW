import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useMedications } from '../context/MedicationsContext';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times', 'As needed'];

const FREQ_DEFAULT_TIMES = {
  'Once daily': ['08:00'],
  'Twice daily': ['08:00', '20:00'],
  'Three times': ['08:00', '14:00', '20:00'],
  'As needed': [],
};

const PALETTE = ['#4a90d9', '#8e5fd9', '#e0932c', '#2ea86b', '#e05c7a', '#20a8a8'];

// Public, keyless product-lookup endpoint used to resolve a scanned barcode
// into a product name/size. Free tier is rate-limited and best-effort —
// callers must always be ready for a miss or a network failure.
const BARCODE_LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup?upc=';

// Returns an Ionicons name so Home / Medications can render a matching icon.
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

// Pulls a dosage-looking token (e.g. "500mg", "10 ML", "200 mcg") out of a
// free-text product title/size string, since lookup APIs rarely split it out.
function extractDosage(text = '') {
  const match = text.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu))/i);
  return match ? match[1].replace(/\s+/g, '').toUpperCase() : '';
}

// Strips a matched dosage token and common package-size noise out of a title
// so the "name" field isn't cluttered with it.
function cleanName(title = '', dosageToken = '') {
  let cleaned = title;
  if (dosageToken) {
    cleaned = cleaned.replace(new RegExp(dosageToken.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1'), 'i'), '');
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

function TimeField({ value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.timeRow}>
      <TouchableOpacity style={styles.timeInput} onPress={() => setShowPicker(true)}>
        <Text style={styles.timeInputText}>{formatTimeLabel(value)}</Text>
        <Ionicons name="time-outline" size={16} color="#7f8c8d" />
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

export default function AddMedicationScreen({ navigation }) {
  const { addMedication } = useMedications();

  const [mode, setMode] = useState('manual'); // 'manual' | 'scan'
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanBanner, setScanBanner] = useState(null);
  const [scanBannerTone, setScanBannerTone] = useState('success'); // 'success' | 'neutral'

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [condition, setCondition] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [times, setTimes] = useState(FREQ_DEFAULT_TIMES['Once daily']);
  const [errors, setErrors] = useState({});

  const lastScanRef = useRef(null);

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

  // Looks the scanned code up against a product database and, on a hit,
  // fills in as many fields as we can confidently parse out of the result.
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
        setScanBanner("We couldn't find that barcode in the product database — enter the details below to finish adding it.");
      }
    } catch (e) {
      setScanBannerTone('neutral');
      setScanBanner("Couldn't reach the lookup service — enter the details below to finish adding it.");
    } finally {
      setLookupLoading(false);
      setMode('manual');
    }
  }

  function handleBarcodeScanned({ data }) {
    // Debounce repeated callbacks from the same code while the camera is open
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color="#ffffff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Medication</Text>
        <Text style={styles.headerSubtitle}>Scan packaging or enter details manually</Text>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'manual' ? styles.toggleActive : styles.toggleInactive]}
          onPress={() => setMode('manual')}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={mode === 'manual' ? '#4a90d9' : '#8a94a3'}
          />
          <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>Manual</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'scan' ? styles.toggleActive : styles.toggleInactive]}
          onPress={handleEnterScanMode}
        >
          <Ionicons
            name="camera-outline"
            size={16}
            color={mode === 'scan' ? '#4a90d9' : '#8a94a3'}
          />
          <Text style={[styles.toggleText, mode === 'scan' && styles.toggleTextActive]}>Scan</Text>
        </TouchableOpacity>
      </View>

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
                {lookupLoading ? (
                  <View style={styles.lookupBadge}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.scanHint}>Looking up product…</Text>
                  </View>
                ) : (
                  <Text style={styles.scanHint}>Line up the barcode inside the frame</Text>
                )}
              </View>
              <View style={styles.scanControls}>
                <TouchableOpacity style={styles.scanControlBtn} onPress={() => setTorchOn((v) => !v)}>
                  <Ionicons name={torchOn ? 'flash' : 'flash-outline'} size={15} color="#ffffff" />
                  <Text style={styles.scanControlText}>{torchOn ? 'Torch on' : 'Torch'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanControlBtn} onPress={() => setMode('manual')}>
                  <Ionicons name="keypad-outline" size={15} color="#ffffff" />
                  <Text style={styles.scanControlText}>Enter manually</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionFallback}>
              <Ionicons name="camera-outline" size={32} color="#ffffff" style={{ marginBottom: 10 }} />
              <Text style={styles.permissionTitle}>Camera access is off</Text>
              <Text style={styles.permissionText}>
                Turn on camera access in your device settings to scan a barcode, or switch to Manual.
              </Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={() => setMode('manual')}>
                <Text style={styles.permissionBtnText}>Switch to Manual</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {scanBanner ? (
            <View style={[styles.scanBanner, scanBannerTone === 'neutral' && styles.scanBannerNeutral]}>
              <Ionicons
                name={scanBannerTone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline'}
                size={17}
                color={scanBannerTone === 'success' ? '#1f7a4d' : '#5a6b7a'}
              />
              <Text
                style={[styles.scanBannerText, scanBannerTone === 'neutral' && styles.scanBannerTextNeutral]}
              >
                {scanBanner}
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Medication name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="e.g. Metformin"
            placeholderTextColor="#a7b0ba"
            value={name}
            onChangeText={setName}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          <Text style={styles.fieldLabel}>Dosage</Text>
          <TextInput
            style={[styles.input, errors.dosage && styles.inputError]}
            placeholder="e.g. 500mg"
            placeholderTextColor="#a7b0ba"
            value={dosage}
            onChangeText={setDosage}
          />
          {errors.dosage ? <Text style={styles.errorText}>{errors.dosage}</Text> : null}

          <Text style={styles.fieldLabel}>Condition / Purpose</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Diabetes"
            placeholderTextColor="#a7b0ba"
            value={condition}
            onChangeText={setCondition}
          />

          <Text style={styles.fieldLabel}>Frequency</Text>
          <View style={styles.freqGrid}>
            {FREQUENCIES.map((f) => (
              <FreqButton key={f} label={f} active={frequency === f} onPress={() => changeFrequency(f)} />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Reminder times</Text>
          {frequency === 'As needed' ? (
            <View style={styles.asNeededNote}>
              <Ionicons name="notifications-outline" size={16} color="#8a6a3d" />
              <Text style={styles.asNeededText}>
                No scheduled reminders — you'll log this dose yourself whenever you take it.
              </Text>
            </View>
          ) : (
            times.map((t, idx) => (
              <TimeField key={idx} value={t} onChange={(val) => updateTime(idx, val)} />
            ))
          )}

          <View style={styles.infoBox}>
            <Ionicons name="cloud-offline-outline" size={18} color="#2f6cb5" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBoxTitle}>Offline reminders</Text>
              <Text style={styles.infoBoxSub}>
                Reminders are scheduled on your device — no internet needed.
              </Text>
            </View>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {mode === 'manual' && (
        <View style={styles.saveBar}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Save Medication</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },

  header: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 10 },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  toggleRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16, marginBottom: 6 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  toggleActive: { backgroundColor: '#eaf2fb', borderWidth: 1.5, borderColor: '#4a90d9' },
  toggleInactive: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e2e6ea' },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#8a94a3' },
  toggleTextActive: { color: '#4a90d9' },

  cameraWrap: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scanOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: '72%',
    aspectRatio: 1.6,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    borderRadius: 16,
  },
  scanHint: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  lookupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
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
  scanControlText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  permissionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#1a2a3a',
  },
  permissionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  permissionText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  permissionBtn: {
    marginTop: 18,
    backgroundColor: '#4a90d9',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
  },
  permissionBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  form: { flex: 1 },
  formContent: { paddingHorizontal: 20, paddingTop: 18 },

  scanBanner: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: '#e3f6ec',
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  scanBannerNeutral: {
    backgroundColor: '#eef1f4',
  },
  scanBannerText: { flex: 1, color: '#1f7a4d', fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  scanBannerTextNeutral: { color: '#5a6b7a' },

  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: '#43505e', marginBottom: 7, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e6ea',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14.5,
    color: '#1a2a3a',
    backgroundColor: '#ffffff',
    marginBottom: 3,
  },
  inputError: { borderColor: '#e74c3c' },
  errorText: { color: '#e74c3c', fontSize: 12, marginBottom: 12, marginTop: 2 },

  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 17 },
  freqBtn: {
    width: '47.5%',
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e6ea',
    backgroundColor: '#ffffff',
  },
  freqBtnActive: { backgroundColor: '#eaf2fb', borderColor: '#4a90d9' },
  freqBtnText: { fontSize: 13.5, fontWeight: '700', color: '#43505e' },
  freqBtnTextActive: { color: '#4a90d9' },

  timeRow: { marginBottom: 9 },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e2e6ea',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  timeInputText: { fontSize: 14, color: '#1a2a3a', fontWeight: '600' },

  asNeededNote: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: '#fdf3ea',
    borderRadius: 13,
    padding: 13,
    alignItems: 'flex-start',
  },
  asNeededText: { flex: 1, fontSize: 12.5, color: '#8a6a3d', lineHeight: 18 },

  infoBox: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: '#eaf2fb',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  infoBoxTitle: { fontSize: 13.5, fontWeight: '700', color: '#2f6cb5', marginBottom: 2 },
  infoBoxSub: { fontSize: 12, color: '#5a7ba3', lineHeight: 17 },

  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: '#f0f2f5',
  },
  saveBtn: {
    backgroundColor: '#4a90d9',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#4a90d9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});