import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect } from '@react-navigation/native';

import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { colors } from '../theme/colors';

export default function MedicationsScreen({ navigation }) {
  const [medications, setMedications] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const loadMedications = useCallback(async () => {
    try {
      setErrorMessage('');

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        setMedications([]);

        setErrorMessage('Your session has expired. Please sign in again.');

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
            refill_threshold,
            start_date,
            end_date,
            is_active,
            created_at,
            medication_schedules (
              id,
              dose_time,
              frequency,
              is_active
            )
          `
        )
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const cleanedData = (data ?? []).map((medication) => ({
        ...medication,

        medication_schedules: (medication.medication_schedules ?? [])
          .filter((schedule) => schedule.is_active)
          .sort((a, b) => a.dose_time.localeCompare(b.dose_time)),
      }));

      setMedications(cleanedData);
    } catch (error) {
      console.error('Medication loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load your medications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [loadMedications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadMedications();
  };

  const openAddMedication = () => {
    navigation.getParent()?.navigate('AddMedication');
  };

  const openMedicationDetails = (medicationId) => {
    navigation.getParent()?.navigate('MedicationDetails', {
      medicationId,
    });
  };

  const formatTime = (time) => {
    if (!time) {
      return '';
    }

    return time.slice(0, 5);
  };

  const getFormIcon = (form) => {
    switch (form) {
      case 'Liquid':
        return 'water-outline';

      case 'Injection':
        return 'fitness-outline';

      case 'Capsule':
        return 'medical-outline';

      case 'Tablet':
      default:
        return 'medical-outline';
    }
  };

  const getFrequency = (medication) => {
    if (medication.medication_schedules.length === 0) {
      return 'No active schedule';
    }

    return medication.medication_schedules[0].frequency;
  };

  const getRefillState = (medication) => {
    if (medication.current_quantity === null) {
      return null;
    }

    if (medication.current_quantity <= 0) {
      return {
        label: 'Out of medication',
        type: 'danger',
      };
    }

    if (medication.current_quantity <= medication.refill_threshold) {
      return {
        label: 'Refill needed',
        type: 'warning',
      };
    }

    return null;
  };

  const renderMedicationCard = (medication) => {
    const refillState = getRefillState(medication);

    return (
      <Pressable
        key={medication.id}
        onPress={() => openMedicationDetails(medication.id)}
        style={({ pressed }) => [styles.medicationCard, pressed && styles.cardPressed]}
      >
        <View style={styles.medicationTop}>
          <View style={styles.medicationIcon}>
            <Ionicons
              name={getFormIcon(medication.medication_form)}
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.medicationTitleArea}>
            <Text style={styles.medicationName} numberOfLines={1}>
              {medication.name}
            </Text>

            <Text style={styles.medicationDosage}>
              {medication.dosage}
              {'  •  '}
              {medication.medication_form}
            </Text>
          </View>

          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />

            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.scheduleRow}>
          <View style={styles.scheduleIcon}>
            <Ionicons name="repeat-outline" size={18} color={colors.primary} />
          </View>

          <View style={styles.scheduleContent}>
            <Text style={styles.infoLabel}>SCHEDULE</Text>

            <Text style={styles.scheduleFrequency}>{getFrequency(medication)}</Text>
          </View>
        </View>

        {medication.medication_schedules.length > 0 && (
          <View style={styles.timeList}>
            {medication.medication_schedules.map((schedule) => (
              <View key={schedule.id} style={styles.timeChip}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />

                <Text style={styles.timeChipText}>{formatTime(schedule.dose_time)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomInformation}>
          <View style={styles.quantityArea}>
            <View style={styles.quantityIcon}>
              <Ionicons name="layers-outline" size={17} color={colors.textSecondary} />
            </View>

            <View>
              <Text style={styles.infoLabel}>REMAINING</Text>

              <Text style={styles.quantityText}>{medication.current_quantity ?? '—'} doses</Text>
            </View>
          </View>

          <View style={styles.detailsArrow}>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        </View>

        {refillState && (
          <View
            style={[styles.refillWarning, refillState.type === 'danger' && styles.refillDanger]}
          >
            <Ionicons
              name={
                refillState.type === 'danger' ? 'alert-circle-outline' : 'notifications-outline'
              }
              size={17}
              color={refillState.type === 'danger' ? colors.danger : colors.warning}
            />

            <Text
              style={[
                styles.refillWarningText,
                refillState.type === 'danger' && styles.refillDangerText,
              ]}
            >
              {refillState.label}
            </Text>
          </View>
        )}

        {medication.instructions && (
          <View style={styles.instructionArea}>
            <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />

            <Text style={styles.instructionText} numberOfLines={2}>
              {medication.instructions}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="medical-outline" size={30} color={colors.primary} />
          </View>

          <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />

          <Text style={styles.loadingText}>Loading your medications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MEDTRACK</Text>

            <Text style={styles.title}>My Medications</Text>

            <Text style={styles.subtitle}>Manage your active medication routine</Text>
          </View>

          <Pressable
            onPress={openAddMedication}
            style={({ pressed }) => [styles.headerAddButton, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={25} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="medical" size={23} color={colors.primary} />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{medications.length}</Text>

            <Text style={styles.summaryLabel}>
              {medications.length === 1 ? 'Active medication' : 'Active medications'}
            </Text>
          </View>

          <View style={styles.summaryRight}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.secondary} />

            <Text style={styles.summaryStatus}>Synced</Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Unable to load medications</Text>

              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>

            <Pressable
              onPress={() => {
                setLoading(true);
                loadMedications();
              }}
            >
              <Ionicons name="refresh" size={21} color={colors.primary} />
            </Pressable>
          </View>
        ) : medications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="medical-outline" size={36} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>No medications yet</Text>

            <Text style={styles.emptyDescription}>
              Add your first medication to start building your MedTrack schedule and refill tracker.
            </Text>

            <Pressable
              onPress={openAddMedication}
              style={({ pressed }) => [styles.emptyButton, pressed && styles.buttonPressed]}
            >
              <Ionicons name="add" size={20} color={colors.white} />

              <Text style={styles.emptyButtonText}>Add Medication</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>CURRENT ROUTINE</Text>

                <Text style={styles.sectionTitle}>Active medications</Text>
              </View>

              <Text style={styles.pullHint}>Pull to refresh</Text>
            </View>

            {medications.map(renderMedicationCard)}

            <Pressable
              onPress={openAddMedication}
              style={({ pressed }) => [styles.addMedicationCard, pressed && styles.pressed]}
            >
              <View style={styles.addMedicationIcon}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </View>

              <View style={styles.addMedicationContent}>
                <Text style={styles.addMedicationTitle}>Add another medication</Text>

                <Text style={styles.addMedicationText}>
                  Add a prescription and create its dose schedule.
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
            </Pressable>
          </>
        )}

        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.secondary} />

          <Text style={styles.safetyText}>
            MedTrack helps you organise medication information and reminders. Always follow
            instructions from your healthcare professional or medication label.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  title: {
    marginTop: 4,
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
  },

  headerAddButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  summaryCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 21,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryContent: {
    marginLeft: 13,
  },

  summaryNumber: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '800',
  },

  summaryLabel: {
    marginTop: 1,
    color: '#CFE0F7',
    fontSize: 12,
    fontWeight: '600',
  },

  summaryRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  summaryStatus: {
    color: colors.secondaryLight,
    fontSize: 12,
    fontWeight: '700',
  },

  sectionHeader: {
    marginTop: 27,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  sectionEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  sectionTitle: {
    marginTop: 3,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  pullHint: {
    color: colors.textLight,
    fontSize: 12,
  },

  medicationCard: {
    marginBottom: 13,
    padding: 16,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 2,
  },

  cardPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  medicationTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  medicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medicationTitleArea: {
    flex: 1,
    marginLeft: 12,
  },

  medicationName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  medicationDosage: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.success,
  },

  activeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: colors.border,
  },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scheduleIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scheduleContent: {
    marginLeft: 10,
  },

  infoLabel: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  scheduleFrequency: {
    marginTop: 2,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  timeList: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  timeChip: {
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  timeChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  bottomInformation: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  quantityText: {
    marginTop: 2,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  detailsArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refillWarning: {
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFF7E8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  refillDanger: {
    backgroundColor: '#FFF0F0',
  },

  refillWarningText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '800',
  },

  refillDangerText: {
    color: colors.danger,
  },

  instructionArea: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },

  instructionText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  addMedicationCard: {
    marginTop: 3,
    padding: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  addMedicationIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addMedicationContent: {
    flex: 1,
    marginHorizontal: 11,
  },

  addMedicationTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  addMedicationText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  emptyCard: {
    marginTop: 30,
    paddingHorizontal: 25,
    paddingVertical: 36,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 18,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  emptyDescription: {
    marginTop: 8,
    maxWidth: 270,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 20,
    height: 49,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  emptyButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },

  errorCard: {
    marginTop: 25,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorContent: {
    flex: 1,
    marginHorizontal: 10,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  safetyCard: {
    marginTop: 24,
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

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  pressed: {
    opacity: 0.75,
  },
});
