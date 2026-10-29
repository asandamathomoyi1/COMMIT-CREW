import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
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

import { cancelMedicationReminders } from '../services/notifications';

export default function MedicationDetailsScreen({ navigation, route }) {
  const medicationId = route?.params?.medicationId;

  const [medication, setMedication] = useState(null);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

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
        setErrorMessage('Your session has expired. Please sign in again.');

        return;
      }

      const { data, error } = await supabase
        .from('medications')
        .select(
          `
            id,
            user_id,
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
        .eq('id', medicationId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      const schedules = (data.medication_schedules ?? [])
        .filter((schedule) => schedule.is_active)
        .sort((a, b) => a.dose_time.localeCompare(b.dose_time));

      setMedication({
        ...data,
        medication_schedules: schedules,
      });
    } catch (error) {
      console.error('Medication details error:', error);

      setErrorMessage(error?.message ?? 'We could not load this medication.');
    } finally {
      setLoading(false);
    }
  }, [medicationId]);

  useFocusEffect(
    useCallback(() => {
      loadMedication();
    }, [loadMedication])
  );

  const formatTime = (time) => {
    return time?.slice(0, 5) ?? '';
  };

  const formatDate = (date) => {
    if (!date) {
      return 'Not set';
    }

    const parsedDate = new Date(`${date}T00:00:00`);

    return parsedDate.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFormIcon = () => {
    switch (medication?.medication_form) {
      case 'Liquid':
        return 'water-outline';

      case 'Injection':
        return 'fitness-outline';

      case 'Capsule':
      case 'Tablet':
      default:
        return 'medical-outline';
    }
  };

  const openEditMedication = () => {
    if (!medication) {
      return;
    }

    navigation.navigate('EditMedication', {
      medicationId: medication.id,
    });
  };

  const archiveMedication = async () => {
    if (!medication || actionLoading) {
      return;
    }

    try {
      setActionLoading(true);

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      if (user.id !== medication.user_id) {
        throw new Error('You do not have permission to archive this medication.');
      }

      const { error: medicationError } = await supabase
        .from('medications')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', medication.id)
        .eq('user_id', user.id);

      if (medicationError) {
        throw medicationError;
      }

      const { error: scheduleError } = await supabase
        .from('medication_schedules')
        .update({
          is_active: false,
        })
        .eq('medication_id', medication.id)
        .eq('user_id', user.id);

      if (scheduleError) {
        console.error('Medication archived but schedules could not be deactivated:', scheduleError);

        try {
          await cancelMedicationReminders(medication.id);
        } catch (notificationError) {
          console.error('Unable to cancel reminders after partial archive:', notificationError);
        }

        Alert.alert(
          'Medication archived',
          `${medication.name} was archived, but MedTrack could not fully update its schedule records.`,
          [
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );

        return;
      }

      let remindersCancelled = true;

      try {
        await cancelMedicationReminders(medication.id);
      } catch (notificationError) {
        remindersCancelled = false;

        console.error(
          'Medication archived but reminders could not be cancelled:',
          notificationError
        );
      }

      if (remindersCancelled) {
        Alert.alert(
          'Medication archived',
          `${medication.name} has been removed from your active medication routine. Its scheduled reminders have also been stopped.`,
          [
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Medication archived',
          `${medication.name} has been archived, but MedTrack could not confirm that its phone reminders were cancelled.`,
          [
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Medication archive error:', error);

      Alert.alert('Unable to archive', error?.message ?? 'We could not archive this medication.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmArchive = () => {
    if (!medication) {
      return;
    }

    Alert.alert(
      'Archive medication?',
      `Archive ${medication.name}? It will no longer appear in your active medication routine and its reminders will be stopped.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          onPress: archiveMedication,
        },
      ]
    );
  };

  const deleteMedication = async () => {
    if (!medication || actionLoading) {
      return;
    }

    try {
      setActionLoading(true);

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      if (user.id !== medication.user_id) {
        throw new Error('You do not have permission to delete this medication.');
      }

      /*
       * Cancel local reminders first.
       *
       * If this fails, we continue with the database
       * deletion and tell the user afterwards.
       */
      let remindersCancelled = true;

      try {
        await cancelMedicationReminders(medication.id);
      } catch (notificationError) {
        remindersCancelled = false;

        console.error('Unable to cancel reminders before deleting medication:', notificationError);
      }

      const { error: scheduleDeleteError } = await supabase
        .from('medication_schedules')
        .delete()
        .eq('medication_id', medication.id)
        .eq('user_id', user.id);

      if (scheduleDeleteError) {
        throw scheduleDeleteError;
      }

      const { error: medicationDeleteError } = await supabase
        .from('medications')
        .delete()
        .eq('id', medication.id)
        .eq('user_id', user.id);

      if (medicationDeleteError) {
        throw medicationDeleteError;
      }

      if (remindersCancelled) {
        Alert.alert(
          'Medication deleted',
          `${medication.name} has been permanently deleted. Its scheduled reminders have also been removed.`,
          [
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Medication deleted',
          `${medication.name} has been permanently deleted, but MedTrack could not confirm that its phone reminders were cancelled.`,
          [
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Medication deletion error:', error);

      Alert.alert('Unable to delete', error?.message ?? 'We could not delete this medication.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = () => {
    if (!medication) {
      return;
    }

    Alert.alert(
      'Delete medication?',
      `Permanently delete ${medication.name}? Its scheduled reminders will also be removed. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: deleteMedication,
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading medication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !medication) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Medication</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={35} color={colors.danger} />
          </View>

          <Text style={styles.errorTitle}>Unable to open medication</Text>

          <Text style={styles.errorText}>{errorMessage || 'Medication could not be found.'}</Text>

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

  const frequency = medication.medication_schedules[0]?.frequency ?? 'No active schedule';

  const lowSupply =
    medication.current_quantity !== null &&
    medication.current_quantity <= medication.refill_threshold;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable
            disabled={actionLoading}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.headerTitle}>Medication Details</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconContainer}>
            <Ionicons name={getFormIcon()} size={32} color={colors.primary} />
          </View>

          <Text style={styles.medicationName}>{medication.name}</Text>

          <Text style={styles.medicationDosage}>
            {medication.dosage}
            {'  •  '}
            {medication.medication_form}
          </Text>

          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />

            <Text style={styles.activeText}>Active medication</Text>
          </View>
        </View>

        {lowSupply && (
          <View style={styles.warningCard}>
            <View style={styles.warningIcon}>
              <Ionicons name="notifications-outline" size={20} color={colors.warning} />
            </View>

            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Refill reminder</Text>

              <Text style={styles.warningText}>
                Only {medication.current_quantity} doses remain. Your refill threshold is{' '}
                {medication.refill_threshold}.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>SCHEDULE</Text>

          <Text style={styles.sectionTitle}>Dose routine</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="repeat-outline" size={20} color={colors.primary} />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>FREQUENCY</Text>

              <Text style={styles.infoValue}>{frequency}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.doseTimesLabel}>DOSE TIMES</Text>

          {medication.medication_schedules.length > 0 ? (
            <View style={styles.timeContainer}>
              {medication.medication_schedules.map((schedule) => (
                <View key={schedule.id} style={styles.timeChip}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />

                  <Text style={styles.timeText}>{formatTime(schedule.dose_time)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noScheduleText}>No active dose times found.</Text>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>SUPPLY</Text>

          <Text style={styles.sectionTitle}>Medication supply</Text>
        </View>

        <View style={styles.supplyGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="layers-outline" size={20} color={colors.primary} />
            </View>

            <Text style={styles.statNumber}>{medication.current_quantity ?? '—'}</Text>

            <Text style={styles.statLabel}>Doses remaining</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconGreen}>
              <Ionicons name="notifications-outline" size={20} color={colors.secondary} />
            </View>

            <Text style={styles.statNumber}>{medication.refill_threshold}</Text>

            <Text style={styles.statLabel}>Refill threshold</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>INFORMATION</Text>

          <Text style={styles.sectionTitle}>Prescription details</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />

              <Text style={styles.detailLabel}>Start date</Text>
            </View>

            <Text style={styles.detailValue}>{formatDate(medication.start_date)}</Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="calendar-number-outline" size={18} color={colors.textSecondary} />

              <Text style={styles.detailLabel}>End date</Text>
            </View>

            <Text style={styles.detailValue}>{formatDate(medication.end_date)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>INSTRUCTIONS</Text>

          <Text style={styles.sectionTitle}>How to take it</Text>
        </View>

        <View style={styles.instructionsCard}>
          <View style={styles.instructionsIcon}>
            <Ionicons name="information-circle-outline" size={22} color={colors.secondary} />
          </View>

          <Text style={styles.instructionsText}>
            {medication.instructions ||
              'No additional instructions were added for this medication.'}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>MANAGEMENT</Text>

          <Text style={styles.sectionTitle}>Manage medication</Text>
        </View>

        <Pressable
          disabled={actionLoading}
          onPress={openEditMedication}
          style={({ pressed }) => [styles.managementButton, pressed && styles.pressed]}
        >
          <View style={styles.managementIcon}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </View>

          <View style={styles.managementContent}>
            <Text style={styles.managementTitle}>Edit medication</Text>

            <Text style={styles.managementDescription}>
              Change dosage, schedule, quantity or instructions.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          disabled={actionLoading}
          onPress={confirmArchive}
          style={({ pressed }) => [styles.managementButton, pressed && styles.pressed]}
        >
          <View style={styles.archiveIcon}>
            <Ionicons name="archive-outline" size={20} color={colors.warning} />
          </View>

          <View style={styles.managementContent}>
            <Text style={styles.managementTitle}>Archive medication</Text>

            <Text style={styles.managementDescription}>
              Remove it from your active routine, stop reminders and keep its record.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          disabled={actionLoading}
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          {actionLoading ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <>
              <View style={styles.deleteIcon}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </View>

              <View style={styles.managementContent}>
                <Text style={styles.deleteTitle}>Delete permanently</Text>

                <Text style={styles.managementDescription}>
                  Permanently remove this medication and stop its reminders.
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </>
          )}
        </Pressable>

        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.secondary} />

          <Text style={styles.safetyText}>
            Do not change or stop a prescribed medication based only on information in MedTrack.
            Follow the instructions provided by your healthcare professional.
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
    paddingBottom: 55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
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

  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  headerSpacer: {
    width: 44,
  },

  heroCard: {
    marginTop: 24,
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
  },

  heroIconContainer: {
    width: 66,
    height: 66,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medicationName: {
    marginTop: 14,
    color: colors.white,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },

  medicationDosage: {
    marginTop: 5,
    color: '#CFE0F7',
    fontSize: 11,
    fontWeight: '600',
  },

  activeBadge: {
    marginTop: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },

  activeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  warningCard: {
    marginTop: 15,
    padding: 13,
    borderRadius: 16,
    backgroundColor: '#FFF7E8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  warningContent: {
    flex: 1,
    marginLeft: 11,
  },

  warningTitle: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '800',
  },

  warningText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  sectionHeader: {
    marginTop: 28,
    marginBottom: 11,
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

  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContent: {
    marginLeft: 11,
  },

  infoLabel: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  infoValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginVertical: 15,
    backgroundColor: colors.border,
  },

  doseTimesLabel: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  timeContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  timeChip: {
    height: 38,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  timeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  noScheduleText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 13,
  },

  supplyGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  statCard: {
    flex: 1,
    minHeight: 135,
    padding: 15,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statIconGreen: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statNumber: {
    marginTop: 14,
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },

  statLabel: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  detailRow: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  detailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  instructionsCard: {
    padding: 15,
    borderRadius: 19,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  instructionsIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  instructionsText: {
    flex: 1,
    marginLeft: 11,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  managementButton: {
    minHeight: 68,
    marginBottom: 9,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  managementIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  archiveIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFF7E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  managementContent: {
    flex: 1,
    marginHorizontal: 11,
  },

  managementTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  managementDescription: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  deleteButton: {
    minHeight: 68,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFD9D9',
    flexDirection: 'row',
    alignItems: 'center',
  },

  deleteIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteTitle: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },

  safetyCard: {
    marginTop: 25,
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
  },

  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  errorContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorTitle: {
    marginTop: 17,
    color: colors.text,
    fontSize: 18,
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
    marginTop: 18,
    height: 47,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
