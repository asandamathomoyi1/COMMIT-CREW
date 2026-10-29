import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import DateTimePicker from '@react-native-community/datetimepicker';

import { colors } from '../theme/colors';
import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';

import { scheduleMedicationReminders } from '../services/notifications';

const medicationForms = [
  {
    label: 'Tablet',
    icon: 'medical-outline',
  },
  {
    label: 'Capsule',
    icon: 'medical-outline',
  },
  {
    label: 'Liquid',
    icon: 'water-outline',
  },
  {
    label: 'Injection',
    icon: 'fitness-outline',
  },
];

const frequencies = ['Once daily', '2 times daily', '3 times daily', '4 times daily'];

const frequencyCounts = {
  'Once daily': 1,
  '2 times daily': 2,
  '3 times daily': 3,
  '4 times daily': 4,
};

const initialTimes = {
  'Once daily': ['08:00'],

  '2 times daily': ['08:00', '20:00'],

  '3 times daily': ['08:00', '14:00', '20:00'],

  '4 times daily': ['06:00', '12:00', '18:00', '22:00'],
};

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');

  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function timeStringToDate(time) {
  const [hour, minute] = time.split(':').map(Number);

  const date = new Date();

  date.setHours(Number.isNaN(hour) ? 8 : hour);

  date.setMinutes(Number.isNaN(minute) ? 0 : minute);

  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

function getSuggestedNewTime(existingTimes) {
  const now = new Date();

  now.setSeconds(0);
  now.setMilliseconds(0);

  const minutes = now.getMinutes();

  const remainder = minutes % 5;

  if (remainder !== 0) {
    now.setMinutes(minutes + (5 - remainder));
  }

  let candidate = new Date(now);

  let attempts = 0;

  while (existingTimes.includes(formatTime(candidate)) && attempts < 288) {
    candidate = new Date(candidate.getTime() + 5 * 60 * 1000);

    attempts += 1;
  }

  return candidate;
}

function matchFrequency(text) {
  const value = (text ?? '').toLowerCase();

  if (/(four|4)\s*(x|times)|\bqid\b|every\s*6\s*h/.test(value)) return '4 times daily';

  if (/(three|3)\s*(x|times)|\btid\b|\btds\b|every\s*8\s*h/.test(value)) return '3 times daily';

  if (/twice|two\s*times|2\s*(x|times)|\bbid\b|\bbd\b|every\s*12\s*h/.test(value)) {
    return '2 times daily';
  }

  return 'Once daily';
}

export default function AddMedicationScreen({ navigation, route }) {
  const [medicationName, setMedicationName] = useState('');

  const [dosage, setDosage] = useState('');

  const [selectedForm, setSelectedForm] = useState('Tablet');

  const [frequency, setFrequency] = useState('Once daily');

  const [doseTimes, setDoseTimes] = useState(initialTimes['Once daily']);

  const [quantity, setQuantity] = useState('');

  const [instructions, setInstructions] = useState('');

  const [showFrequencyOptions, setShowFrequencyOptions] = useState(false);

  const [saving, setSaving] = useState(false);

  const [showTimePicker, setShowTimePicker] = useState(false);

  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);

  const [pickerTime, setPickerTime] = useState(new Date());

  // Details handed over by the Scan Prescription screen (never saved until the member taps Save).
  const prefill = route?.params?.prefill;

  useEffect(() => {
    if (!prefill) {
      return;
    }

    const matchedFrequency = matchFrequency(prefill.frequency);

    setMedicationName(prefill.name ?? '');
    setDosage(prefill.dosage ?? '');
    setInstructions(prefill.instructions ?? '');
    setFrequency(matchedFrequency);
    setDoseTimes(initialTimes[matchedFrequency]);

    if (medicationForms.some((item) => item.label === prefill.form)) {
      setSelectedForm(prefill.form);
    }
  }, [prefill]);

  const selectFrequency = (selectedFrequency) => {
    const requiredCount = frequencyCounts[selectedFrequency];

    let updatedTimes = [...doseTimes];

    if (updatedTimes.length > requiredCount) {
      updatedTimes = updatedTimes.slice(0, requiredCount);
    }

    if (updatedTimes.length < requiredCount) {
      const defaults = initialTimes[selectedFrequency];

      for (let index = updatedTimes.length; index < requiredCount; index += 1) {
        let newTime = defaults[index];

        if (updatedTimes.includes(newTime)) {
          const suggested = getSuggestedNewTime(updatedTimes);

          newTime = formatTime(suggested);
        }

        updatedTimes.push(newTime);
      }
    }

    setFrequency(selectedFrequency);

    setDoseTimes(updatedTimes);

    setShowFrequencyOptions(false);
  };

  const openTimePickerForEdit = (index) => {
    if (saving) {
      return;
    }

    setSelectedTimeIndex(index);

    setPickerTime(timeStringToDate(doseTimes[index]));

    setShowTimePicker(true);
  };

  const openTimePickerForNew = () => {
    if (saving) {
      return;
    }

    if (doseTimes.length >= 6) {
      Alert.alert('Maximum reached', 'You can add up to 6 dose times for one medication.');

      return;
    }

    setSelectedTimeIndex(null);

    setPickerTime(getSuggestedNewTime(doseTimes));

    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (!selectedDate) {
      return;
    }

    if (Platform.OS === 'ios') {
      setPickerTime(selectedDate);

      return;
    }

    saveSelectedTime(selectedDate);
  };

  const saveSelectedTime = (selectedDate) => {
    const newTime = formatTime(selectedDate);

    const duplicate = doseTimes.some(
      (time, index) => time === newTime && index !== selectedTimeIndex
    );

    if (duplicate) {
      Alert.alert(
        'Time already added',
        `${newTime} is already included in this medication schedule.`
      );

      return;
    }

    if (selectedTimeIndex === null) {
      setDoseTimes([...doseTimes, newTime].sort());
    } else {
      const updatedTimes = [...doseTimes];

      updatedTimes[selectedTimeIndex] = newTime;

      setDoseTimes(updatedTimes.sort());
    }

    setShowTimePicker(false);

    setSelectedTimeIndex(null);
  };

  const removeTime = (index) => {
    if (doseTimes.length === 1) {
      Alert.alert('Dose time required', 'A medication must have at least one dose time.');

      return;
    }

    const updatedTimes = doseTimes.filter((_, currentIndex) => currentIndex !== index);

    setDoseTimes(updatedTimes);
  };

  const saveMedication = async () => {
    const cleanName = medicationName.trim();

    const cleanDosage = dosage.trim();

    const cleanInstructions = instructions.trim();

    if (!cleanName) {
      Alert.alert('Medication name required', 'Please enter the name of your medication.');

      return;
    }

    if (!cleanDosage) {
      Alert.alert('Dosage required', 'Please enter the prescribed dosage.');

      return;
    }

    if (!quantity.trim()) {
      Alert.alert('Quantity required', 'Please enter your current medication quantity.');

      return;
    }

    const numericQuantity = Number(quantity);

    if (Number.isNaN(numericQuantity) || numericQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Please enter a valid medication quantity.');

      return;
    }

    if (doseTimes.length === 0) {
      Alert.alert('Dose time required', 'Please add at least one medication time.');

      return;
    }

    try {
      setSaving(true);

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        Alert.alert('Session expired', 'Please sign in again before adding a medication.');

        return;
      }

      const { data: medicationData, error: medicationError } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,

          name: cleanName,

          dosage: cleanDosage,

          medication_form: selectedForm,

          instructions: cleanInstructions || null,

          current_quantity: numericQuantity,

          refill_threshold: 5,

          is_active: true,
        })
        .select('id')
        .single();

      if (medicationError) {
        throw medicationError;
      }

      if (!medicationData) {
        throw new Error('Medication record was not returned after saving.');
      }

      const medicationId = medicationData.id;

      const scheduleRows = doseTimes.map((doseTime) => ({
        medication_id: medicationId,

        user_id: user.id,

        frequency,

        dose_time: doseTime,

        is_active: true,
      }));

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('medication_schedules')
        .insert(scheduleRows)
        .select('id, dose_time');

      if (scheduleError) {
        await supabase.from('medications').delete().eq('id', medicationId);

        throw scheduleError;
      }

      const createdSchedules = scheduleData ?? [];

      if (createdSchedules.length === 0) {
        await supabase.from('medications').delete().eq('id', medicationId);

        throw new Error('MedTrack could not create the medication schedule.');
      }

      let remindersEnabled = true;

      try {
        await scheduleMedicationReminders(
          createdSchedules.map((schedule) => ({
            medicationId,

            medicationName: cleanName,

            dosage: cleanDosage,

            scheduleId: schedule.id,

            time: schedule.dose_time,
          }))
        );
      } catch (notificationError) {
        remindersEnabled = false;

        console.error('Medication saved, but reminders could not be scheduled:', notificationError);
      }

      if (remindersEnabled) {
        Alert.alert(
          'Medication added',
          `${cleanName} has been added successfully. MedTrack will remind you at ${createdSchedules
            .map((schedule) => schedule.dose_time)
            .sort()
            .join(', ')}.`,
          [
            {
              text: 'Done',

              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Medication added',
          `${cleanName} was saved successfully, but MedTrack could not enable phone reminders. You can enable notification permission in your phone settings.`,
          [
            {
              text: 'Done',

              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Medication save error:', error);

      Alert.alert(
        'Unable to save medication',
        error?.message ?? 'Something went wrong while saving your medication.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Pressable
              disabled={saving}
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={23} color={colors.text} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Add Medication</Text>

              <Text style={styles.headerSubtitle}>Create a safe medication schedule</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="medical" size={27} color={colors.primary} />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Medication details</Text>

              <Text style={styles.heroText}>
                Use the information from your medication label or prescription.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionNumber}>01</Text>

              <Text style={styles.sectionTitle}>Basic information</Text>
            </View>
          </View>

          <Text style={styles.label}>Medication name</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="medical-outline" size={20} color={colors.textSecondary} />

            <TextInput
              value={medicationName}
              onChangeText={setMedicationName}
              placeholder="e.g. Amoxicillin"
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Dosage</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />

            <TextInput
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 500 mg"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Medication form</Text>

          <View style={styles.formGrid}>
            {medicationForms.map((item) => {
              const selected = selectedForm === item.label;

              return (
                <Pressable
                  key={item.label}
                  onPress={() => setSelectedForm(item.label)}
                  style={({ pressed }) => [
                    styles.formOption,

                    selected && styles.formOptionSelected,

                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.formIcon, selected && styles.formIconSelected]}>
                    <Ionicons
                      name={item.icon}
                      size={21}
                      color={selected ? colors.white : colors.textSecondary}
                    />
                  </View>

                  <Text style={[styles.formText, selected && styles.formTextSelected]}>
                    {item.label}
                  </Text>

                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={colors.primary}
                      style={styles.formCheck}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionNumber}>02</Text>

              <Text style={styles.sectionTitle}>Dose schedule</Text>
            </View>

            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>REQUIRED</Text>
            </View>
          </View>

          <Text style={styles.label}>How often?</Text>

          <Pressable
            onPress={() => setShowFrequencyOptions(!showFrequencyOptions)}
            style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
          >
            <View style={styles.selectorLeft}>
              <View style={styles.smallIconContainer}>
                <Ionicons name="repeat-outline" size={18} color={colors.primary} />
              </View>

              <View>
                <Text style={styles.selectorLabel}>Frequency</Text>

                <Text style={styles.selectorText}>{frequency}</Text>
              </View>
            </View>

            <Ionicons
              name={showFrequencyOptions ? 'chevron-up' : 'chevron-down'}
              size={19}
              color={colors.textSecondary}
            />
          </Pressable>

          {showFrequencyOptions && (
            <View style={styles.frequencyMenu}>
              {frequencies.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => selectFrequency(item)}
                  style={({ pressed }) => [
                    styles.frequencyOption,

                    item === frequency && styles.frequencyOptionSelected,

                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.frequencyOptionText,

                      item === frequency && styles.frequencyOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>

                  {item === frequency && (
                    <Ionicons name="checkmark-circle" size={19} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.timeHeader}>
            <Text style={styles.label}>Dose times</Text>

            <Text style={styles.timeHint}>Tap a time to change it</Text>
          </View>

          <View style={styles.timeContainer}>
            {doseTimes.map((time, index) => (
              <View key={`${time}-${index}`} style={styles.timeCard}>
                <Pressable
                  onPress={() => openTimePickerForEdit(index)}
                  style={({ pressed }) => [styles.timeEditArea, pressed && styles.pressed]}
                >
                  <Ionicons name="time-outline" size={18} color={colors.primary} />

                  <Text style={styles.timeText}>{time}</Text>

                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                </Pressable>

                <Pressable
                  hitSlop={8}
                  onPress={() => removeTime(index)}
                  style={styles.removeTimeButton}
                >
                  <Ionicons name="close-circle" size={19} color={colors.textLight} />
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            onPress={openTimePickerForNew}
            style={({ pressed }) => [styles.addTimeButton, pressed && styles.pressed]}
          >
            <View style={styles.addTimeIcon}>
              <Ionicons name="add" size={20} color={colors.primary} />
            </View>

            <View style={styles.addTimeContent}>
              <Text style={styles.addTimeText}>Add another time</Text>

              <Text style={styles.addTimeHint}>Choose the exact time for this dose</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>

          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={pickerTime}
              mode="time"
              is24Hour
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {showTimePicker && Platform.OS === 'ios' && (
            <View style={styles.iosPickerCard}>
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={styles.pickerTitle}>Choose dose time</Text>

                  <Text style={styles.pickerSubtitle}>
                    Select the exact time for your medication.
                  </Text>
                </View>

                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Ionicons name="close" size={23} color={colors.textSecondary} />
                </Pressable>
              </View>

              <DateTimePicker
                value={pickerTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.iosPicker}
              />

              <Pressable
                onPress={() => saveSelectedTime(pickerTime)}
                style={styles.confirmTimeButton}
              >
                <Ionicons name="checkmark" size={19} color={colors.white} />

                <Text style={styles.confirmTimeText}>Use this time</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.scheduleInfoCard}>
            <Ionicons name="alarm-outline" size={20} color={colors.primary} />

            <Text style={styles.scheduleInfoText}>
              MedTrack will use the exact times you choose here for your medication reminders.
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionNumber}>03</Text>

              <Text style={styles.sectionTitle}>Supply tracking</Text>
            </View>
          </View>

          <Text style={styles.label}>Current quantity</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="layers-outline" size={20} color={colors.textSecondary} />

            <TextInput
              value={quantity}
              onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 30"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.inputSuffix}>doses</Text>
          </View>

          <View style={styles.refillCard}>
            <View style={styles.refillIcon}>
              <Ionicons name="notifications-outline" size={20} color={colors.secondary} />
            </View>

            <View style={styles.refillContent}>
              <Text style={styles.refillTitle}>Smart refill tracking</Text>

              <Text style={styles.refillDescription}>
                MedTrack will use your schedule and remaining quantity to estimate when your supply
                is running low.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionNumber}>04</Text>

              <Text style={styles.sectionTitle}>Instructions</Text>
            </View>

            <Text style={styles.optionalText}>Optional</Text>
          </View>

          <Text style={styles.label}>How should you take it?</Text>

          <View style={styles.notesContainer}>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="e.g. Take after food"
              placeholderTextColor={colors.textLight}
              multiline
              textAlignVertical="top"
              style={styles.notesInput}
            />
          </View>

          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.secondary} />

            <Text style={styles.safetyText}>
              Always confirm the medication name, dosage and instructions against your prescription
              or medication label before saving.
            </Text>
          </View>

          <Pressable
            disabled={saving}
            onPress={saveMedication}
            style={({ pressed }) => [
              styles.saveButton,

              pressed && !saving && styles.saveButtonPressed,

              saving && styles.disabledButton,
            ]}
          >
            {saving ? (
              <>
                <ActivityIndicator color={colors.white} />

                <Text style={styles.saveButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={21} color={colors.white} />

                <Text style={styles.saveButtonText}>Save Medication</Text>
              </>
            )}
          </Pressable>

          <Pressable
            disabled={saving}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  headerSpacer: {
    width: 44,
  },

  heroCard: {
    marginTop: 24,
    borderRadius: 23,
    padding: 18,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroContent: {
    flex: 1,
    marginLeft: 14,
  },

  heroTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  heroText: {
    color: '#CFE0F7',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  sectionHeader: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  sectionNumber: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },

  requiredBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
  },

  requiredText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  optionalText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  label: {
    marginTop: 17,
    marginBottom: 8,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  inputContainer: {
    minHeight: 56,
    paddingHorizontal: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    height: 55,
    marginLeft: 10,
    color: colors.text,
    fontSize: 13,
  },

  inputSuffix: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },

  formOption: {
    width: '48.5%',
    minHeight: 62,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },

  formOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  formIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formIconSelected: {
    backgroundColor: colors.primary,
  },

  formText: {
    marginLeft: 9,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  formTextSelected: {
    color: colors.primary,
  },

  formCheck: {
    marginLeft: 'auto',
  },

  selector: {
    minHeight: 62,
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  smallIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  selectorLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  selectorText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  frequencyMenu: {
    marginTop: 8,
    padding: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  frequencyOption: {
    minHeight: 45,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  frequencyOptionSelected: {
    backgroundColor: colors.primaryLight,
  },

  frequencyOptionText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  frequencyOptionTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },

  timeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  timeHint: {
    marginBottom: 8,
    color: colors.textLight,
    fontSize: 12,
  },

  timeContainer: {
    gap: 8,
  },

  timeCard: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  timeEditArea: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  timeText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  removeTimeButton: {
    width: 48,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  addTimeButton: {
    marginTop: 10,
    minHeight: 60,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  addTimeIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addTimeContent: {
    flex: 1,
    marginLeft: 11,
  },

  addTimeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  addTimeHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  iosPickerCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  pickerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  pickerSubtitle: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  iosPicker: {
    marginTop: 8,
  },

  confirmTimeButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  confirmTimeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },

  scheduleInfoCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  scheduleInfoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  refillCard: {
    marginTop: 10,
    padding: 13,
    borderRadius: 16,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  refillIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refillContent: {
    flex: 1,
    marginLeft: 11,
  },

  refillTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  refillDescription: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  notesContainer: {
    minHeight: 105,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  notesInput: {
    minHeight: 75,
    color: colors.text,
    fontSize: 13,
  },

  safetyCard: {
    marginTop: 20,
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  safetyText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  saveButton: {
    marginTop: 24,
    height: 57,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,

    shadowColor: colors.primary,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },

  saveButtonPressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  cancelButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.75,
  },
});
