import React, { useCallback, useState } from 'react';

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

import { useFocusEffect } from '@react-navigation/native';

import DateTimePicker from '@react-native-community/datetimepicker';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';

import { colors } from '../theme/colors';

import { rescheduleMedicationReminders } from '../services/notifications';

const forms = [
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

const defaultTimes = {
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
  const [hour, minute] = time.slice(0, 5).split(':').map(Number);

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

  const currentMinutes = now.getMinutes();

  const remainder = currentMinutes % 5;

  if (remainder !== 0) {
    now.setMinutes(currentMinutes + (5 - remainder));
  }

  let candidate = new Date(now);

  let attempts = 0;

  while (existingTimes.includes(formatTime(candidate)) && attempts < 288) {
    candidate = new Date(candidate.getTime() + 5 * 60 * 1000);

    attempts += 1;
  }

  return candidate;
}

export default function EditMedicationScreen({ navigation, route }) {
  const medicationId = route?.params?.medicationId;

  const [medicationName, setMedicationName] = useState('');

  const [dosage, setDosage] = useState('');

  const [selectedForm, setSelectedForm] = useState('Tablet');

  const [frequency, setFrequency] = useState('Once daily');

  const [doseTimes, setDoseTimes] = useState(['08:00']);

  const [quantity, setQuantity] = useState('');

  const [instructions, setInstructions] = useState('');

  const [showFrequencyOptions, setShowFrequencyOptions] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [showTimePicker, setShowTimePicker] = useState(false);

  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);

  const [pickerTime, setPickerTime] = useState(new Date());

  const loadMedication = useCallback(async () => {
    try {
      setErrorMessage('');

      if (!medicationId) {
        setErrorMessage('Medication information was not provided.');

        return;
      }

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        setErrorMessage('Your session has expired.');

        return;
      }

      const { data, error } = await supabase
        .from('medications')
        .select(
          `
                id,
                name,
                dosage,
                medication_form,
                instructions,
                current_quantity,
                medication_schedules (
                  id,
                  dose_time,
                  frequency,
                  is_active
                )
              `
        )
        .eq('id', medicationId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      const activeSchedules = (data.medication_schedules ?? [])
        .filter((schedule) => schedule.is_active)
        .sort((a, b) => a.dose_time.localeCompare(b.dose_time));

      setMedicationName(data.name ?? '');

      setDosage(data.dosage ?? '');

      if (forms.some((item) => item.label === data.medication_form)) {
        setSelectedForm(data.medication_form);
      }

      setQuantity(data.current_quantity !== null ? String(data.current_quantity) : '');

      setInstructions(data.instructions ?? '');

      if (activeSchedules.length > 0) {
        const savedFrequency = activeSchedules[0].frequency;

        if (frequencies.includes(savedFrequency)) {
          setFrequency(savedFrequency);
        }

        setDoseTimes(activeSchedules.map((schedule) => schedule.dose_time.slice(0, 5)));
      }
    } catch (error) {
      console.error('Edit medication loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load this medication.');
    } finally {
      setLoading(false);
    }
  }, [medicationId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      loadMedication();
    }, [loadMedication])
  );

  const selectFrequency = (selectedFrequency) => {
    const requiredCount = frequencyCounts[selectedFrequency];

    let updatedTimes = [...doseTimes];

    if (updatedTimes.length > requiredCount) {
      updatedTimes = updatedTimes.slice(0, requiredCount);
    }

    if (updatedTimes.length < requiredCount) {
      const defaults = defaultTimes[selectedFrequency];

      for (let index = updatedTimes.length; index < requiredCount; index += 1) {
        let newTime = defaults[index];

        if (updatedTimes.includes(newTime)) {
          newTime = formatTime(getSuggestedNewTime(updatedTimes));
        }

        updatedTimes.push(newTime);
      }
    }

    setFrequency(selectedFrequency);

    setDoseTimes(updatedTimes.sort());

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
      Alert.alert('Maximum reached', 'You can add up to 6 dose times.');

      return;
    }

    setSelectedTimeIndex(null);

    setPickerTime(getSuggestedNewTime(doseTimes));

    setShowTimePicker(true);
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

  const removeTime = (index) => {
    if (doseTimes.length === 1) {
      Alert.alert('Dose time required', 'A medication must have at least one dose time.');

      return;
    }

    setDoseTimes(doseTimes.filter((_, currentIndex) => currentIndex !== index));
  };

  const saveChanges = async () => {
    if (saving) {
      return;
    }

    const cleanName = medicationName.trim();

    const cleanDosage = dosage.trim();

    const cleanInstructions = instructions.trim();

    if (!medicationId) {
      Alert.alert('Medication unavailable', 'MedTrack could not identify this medication.');

      return;
    }

    if (!cleanName) {
      Alert.alert('Medication name required', 'Please enter the medication name.');

      return;
    }

    if (!cleanDosage) {
      Alert.alert('Dosage required', 'Please enter the dosage.');

      return;
    }

    const numericQuantity = Number(quantity);

    if (
      !quantity.trim() ||
      Number.isNaN(numericQuantity) ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 0
    ) {
      Alert.alert(
        'Invalid quantity',
        'Please enter a valid whole number for the remaining quantity.'
      );

      return;
    }

    if (doseTimes.length === 0) {
      Alert.alert('Dose time required', 'Please add at least one dose time.');

      return;
    }

    const uniqueTimes = Array.from(new Set(doseTimes)).sort();

    if (uniqueTimes.length !== doseTimes.length) {
      Alert.alert('Duplicate dose times', 'Each dose time must be different.');

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
        throw new Error('Your session has expired.');
      }

      /*
       * Update medication + version schedules
       * using the database RPC you already created.
       */

      const { error: updateError } = await supabase.rpc('update_medication_with_schedule', {
        p_medication_id: medicationId,

        p_name: cleanName,

        p_dosage: cleanDosage,

        p_medication_form: selectedForm,

        p_instructions: cleanInstructions,

        p_current_quantity: numericQuantity,

        p_frequency: frequency,

        p_dose_times: uniqueTimes,
      });

      if (updateError) {
        throw updateError;
      }

      /*
       * The RPC creates new active schedules.
       *
       * We now retrieve those new schedule IDs
       * so the local phone notifications point
       * to the correct active schedule records.
       */

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('medication_schedules')
        .select('id, dose_time')
        .eq('user_id', user.id)
        .eq('medication_id', medicationId)
        .eq('is_active', true)
        .order('dose_time', {
          ascending: true,
        });

      if (scheduleError) {
        console.error(
          'Medication updated but active schedules could not be loaded:',
          scheduleError
        );

        Alert.alert(
          'Medication updated',
          `${cleanName} was updated successfully, but MedTrack could not refresh the phone reminders. Please check the medication again.`,
          [
            {
              text: 'Done',

              onPress: () => navigation.goBack(),
            },
          ]
        );

        return;
      }

      const createdSchedules = scheduleData ?? [];

      if (createdSchedules.length === 0) {
        Alert.alert(
          'Medication updated',
          `${cleanName} was updated successfully, but no active reminder schedule was returned.`,
          [
            {
              text: 'Done',

              onPress: () => navigation.goBack(),
            },
          ]
        );

        return;
      }

      /*
       * IMPORTANT:
       *
       * This cancels the old local notifications
       * for this medication and schedules new ones.
       */

      let remindersUpdated = true;

      try {
        await rescheduleMedicationReminders(
          medicationId,
          createdSchedules.map((schedule) => ({
            medicationId,

            medicationName: cleanName,

            dosage: cleanDosage,

            scheduleId: schedule.id,

            time: schedule.dose_time,
          }))
        );
      } catch (notificationError) {
        remindersUpdated = false;

        console.error(
          'Medication updated but reminders could not be rescheduled:',
          notificationError
        );
      }

      if (remindersUpdated) {
        const reminderTimes = createdSchedules
          .map((schedule) => schedule.dose_time.slice(0, 5))
          .sort()
          .join(', ');

        Alert.alert(
          'Medication updated',
          `${cleanName} has been updated successfully. Your reminders are now set for ${reminderTimes}.`,
          [
            {
              text: 'Done',

              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Medication updated',
          `${cleanName} was updated successfully, but MedTrack could not update the phone reminders. Please check your notification permissions.`,
          [
            {
              text: 'Done',

              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Medication update error:', error);

      Alert.alert(
        'Unable to update medication',
        error?.message ?? 'Something went wrong while updating the medication.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="create-outline" size={30} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingText}>Loading medication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Edit Medication</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={42} color={colors.danger} />

          <Text style={styles.errorTitle}>Unable to load medication</Text>

          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable
            onPress={() => {
              setLoading(true);

              loadMedication();
            }}
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={18} color={colors.white} />

            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
              style={({ pressed }) => [
                styles.backButton,

                pressed && styles.pressed,

                saving && styles.disabledButton,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Edit Medication</Text>

              <Text style={styles.headerSubtitle}>Update your medication routine</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="create-outline" size={26} color={colors.primary} />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Update medication</Text>

              <Text style={styles.heroText}>
                Review the information carefully before saving your changes.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Medication information</Text>

          <Text style={styles.label}>Medication name</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="medical-outline" size={20} color={colors.textSecondary} />

            <TextInput
              value={medicationName}
              onChangeText={setMedicationName}
              editable={!saving}
              placeholder="Medication name"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Dosage</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />

            <TextInput
              value={dosage}
              onChangeText={setDosage}
              editable={!saving}
              placeholder="e.g. 500 mg"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />
          </View>

          <Text style={styles.label}>Medication form</Text>

          <View style={styles.formGrid}>
            {forms.map((item) => {
              const selected = selectedForm === item.label;

              return (
                <Pressable
                  key={item.label}
                  disabled={saving}
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
                      size={20}
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

          <Text style={styles.sectionTitle}>Dose schedule</Text>

          <View style={styles.historyNotice}>
            <View style={styles.historyNoticeIcon}>
              <Ionicons name="time-outline" size={19} color={colors.primary} />
            </View>

            <Text style={styles.historyNoticeText}>
              Schedule changes apply to your active routine. Previous dose history is preserved.
            </Text>
          </View>

          <Text style={styles.label}>Frequency</Text>

          <Pressable
            disabled={saving}
            onPress={() => setShowFrequencyOptions(!showFrequencyOptions)}
            style={styles.selector}
          >
            <View style={styles.selectorLeft}>
              <View style={styles.selectorIcon}>
                <Ionicons name="repeat-outline" size={18} color={colors.primary} />
              </View>

              <Text style={styles.selectorText}>{frequency}</Text>
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
                  disabled={saving}
                  onPress={() => selectFrequency(item)}
                  style={[
                    styles.frequencyOption,

                    item === frequency && styles.frequencyOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.frequencyText,

                      item === frequency && styles.frequencyTextSelected,
                    ]}
                  >
                    {item}
                  </Text>

                  {item === frequency && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
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
                  disabled={saving}
                  onPress={() => openTimePickerForEdit(index)}
                  style={({ pressed }) => [styles.timeEditArea, pressed && styles.pressed]}
                >
                  <Ionicons name="time-outline" size={18} color={colors.primary} />

                  <Text style={styles.timeText}>{time}</Text>

                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                </Pressable>

                <Pressable
                  disabled={saving}
                  onPress={() => removeTime(index)}
                  hitSlop={8}
                  style={styles.removeTimeButton}
                >
                  <Ionicons name="close-circle" size={19} color={colors.textLight} />
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            disabled={saving}
            onPress={openTimePickerForNew}
            style={({ pressed }) => [
              styles.addTimeButton,

              pressed && styles.pressed,

              saving && styles.disabledButton,
            ]}
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
                <View
                  style={{
                    flex: 1,
                  }}
                >
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

          <View style={styles.reminderNotice}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />

            <Text style={styles.reminderNoticeText}>
              When you save, MedTrack will replace the old phone reminders with reminders for these
              new times.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Supply</Text>

          <Text style={styles.label}>Remaining quantity</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="layers-outline" size={20} color={colors.textSecondary} />

            <TextInput
              value={quantity}
              editable={!saving}
              onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Remaining doses"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />

            <Text style={styles.inputSuffix}>doses</Text>
          </View>

          <Text style={styles.sectionTitle}>Instructions</Text>

          <View style={styles.notesContainer}>
            <TextInput
              value={instructions}
              editable={!saving}
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
              Only update your medication dosage or schedule when the change matches instructions
              from your healthcare professional or medication label.
            </Text>
          </View>

          <Pressable
            disabled={saving}
            onPress={saveChanges}
            style={({ pressed }) => [
              styles.saveButton,

              pressed && !saving && styles.buttonPressed,

              saving && styles.disabledButton,
            ]}
          >
            {saving ? (
              <>
                <ActivityIndicator color={colors.white} />

                <Text style={styles.saveButtonText}>Saving changes...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={21} color={colors.white} />

                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </Pressable>

          <Pressable
            disabled={saving}
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
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
    paddingTop: 14,
    paddingBottom: 55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },

  headerSpacer: {
    width: 44,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    marginTop: 23,
    padding: 17,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroContent: {
    flex: 1,
    marginLeft: 13,
  },

  heroTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  heroText: {
    marginTop: 4,
    color: '#CFE0F7',
    fontSize: 12,
    lineHeight: 17,
  },

  sectionTitle: {
    marginTop: 29,
    marginBottom: 2,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  label: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  inputContainer: {
    height: 56,
    paddingHorizontal: 14,
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
    fontSize: 12,
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
    minHeight: 60,
    paddingHorizontal: 10,
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
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formIconSelected: {
    backgroundColor: colors.primary,
  },

  formText: {
    marginLeft: 8,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  formTextSelected: {
    color: colors.primary,
  },

  formCheck: {
    marginLeft: 'auto',
  },

  historyNotice: {
    marginTop: 13,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyNoticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyNoticeText: {
    flex: 1,
    marginLeft: 10,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  selector: {
    minHeight: 58,
    paddingHorizontal: 13,
    borderRadius: 16,
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

  selectorIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  selectorText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
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
    minHeight: 44,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  frequencyOptionSelected: {
    backgroundColor: colors.primaryLight,
  },

  frequencyText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  frequencyTextSelected: {
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
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
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

  reminderNotice: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  reminderNoticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  notesContainer: {
    marginTop: 13,
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
    marginTop: 23,
    height: 57,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  buttonPressed: {
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

  cancelButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 13,
  },

  errorContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorTitle: {
    marginTop: 15,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 7,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 20,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  retryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.75,
  },
});
