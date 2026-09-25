import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEmergencyInfo } from './Emergencyinfocontext';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// "Type 2 Diabetes, Asthma" <-> ['Type 2 Diabetes', 'Asthma']
function listToText(list) {
  return (list || []).join(', ');
}
function textToList(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function BloodTypeChip({ label, active, onPress }) {
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

export default function EditEmergencyInfoScreen({ navigation }) {
  const { emergencyInfo, updateEmergencyInfo } = useEmergencyInfo();

  const [name, setName] = useState(emergencyInfo.name);
  const [dob, setDob] = useState(emergencyInfo.dob);
  const [bloodType, setBloodType] = useState(emergencyInfo.bloodType);
  const [conditionsText, setConditionsText] = useState(listToText(emergencyInfo.conditions));
  const [allergiesText, setAllergiesText] = useState(listToText(emergencyInfo.allergies));
  const [contactName, setContactName] = useState(emergencyInfo.contactName);
  const [contactPhone, setContactPhone] = useState(emergencyInfo.contactPhone);
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = 'Enter a full name';
    if (!contactPhone.trim()) errs.contactPhone = 'Enter an emergency contact number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    updateEmergencyInfo({
      name: name.trim(),
      dob: dob.trim(),
      bloodType,
      conditions: textToList(conditionsText),
      allergies: textToList(allergiesText),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
    });

    Alert.alert('Saved', 'Your emergency info card has been updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color="#ffffff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Info Card</Text>
        <Text style={styles.headerSubtitle}>
          Shown on the lock screen without a PIN — keep it accurate
        </Text>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.fieldLabel}>Full name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="e.g. Alex Botha"
          placeholderTextColor="#a7b0ba"
          value={name}
          onChangeText={setName}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

        <Text style={styles.fieldLabel}>Date of birth</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#a7b0ba"
          value={dob}
          onChangeText={setDob}
        />

        <Text style={styles.fieldLabel}>Blood type</Text>
        <View style={styles.chipGrid}>
          {BLOOD_TYPES.map((bt) => (
            <BloodTypeChip
              key={bt}
              label={bt}
              active={bloodType === bt}
              onPress={() => setBloodType(bt)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Conditions</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Type 2 Diabetes, Asthma"
          placeholderTextColor="#a7b0ba"
          value={conditionsText}
          onChangeText={setConditionsText}
        />
        <Text style={styles.helperText}>Separate multiple conditions with commas</Text>

        <Text style={styles.fieldLabel}>Allergies</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Penicillin, Ibuprofen"
          placeholderTextColor="#a7b0ba"
          value={allergiesText}
          onChangeText={setAllergiesText}
        />
        <Text style={styles.helperText}>Separate multiple allergies with commas</Text>

        <Text style={styles.fieldLabel}>Emergency contact name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mom"
          placeholderTextColor="#a7b0ba"
          value={contactName}
          onChangeText={setContactName}
        />

        <Text style={styles.fieldLabel}>Emergency contact number</Text>
        <TextInput
          style={[styles.input, errors.contactPhone && styles.inputError]}
          placeholder="e.g. +27 82 555 0145"
          placeholderTextColor="#a7b0ba"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />
        {errors.contactPhone ? <Text style={styles.errorText}>{errors.contactPhone}</Text> : null}

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.saveBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save Emergency Info</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },

  header: {
    backgroundColor: '#c0392b',
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

  form: { flex: 1 },
  formContent: { paddingHorizontal: 20, paddingTop: 18 },

  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: '#43505e', marginBottom: 7, marginTop: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e6ea',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14.5,
    color: '#1a2a3a',
    backgroundColor: '#ffffff',
  },
  inputError: { borderColor: '#e74c3c' },
  errorText: { color: '#e74c3c', fontSize: 12, marginTop: 5 },
  helperText: { color: '#8a94a3', fontSize: 12, marginTop: 5 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e6ea',
    backgroundColor: '#ffffff',
  },
  chipActive: { backgroundColor: '#fdeaea', borderColor: '#c0392b' },
  chipText: { fontSize: 13.5, fontWeight: '700', color: '#43505e' },
  chipTextActive: { color: '#c0392b' },

  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: '#f0f2f5',
  },
  saveBtn: {
    backgroundColor: '#c0392b',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});