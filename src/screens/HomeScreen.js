import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
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
import { processMissedDoses } from '../services/doses';
import { colors } from '../theme/colors';

const MISSED_DOSE_GRACE_MINUTES = 60;

export default function HomeScreen({ navigation }) {
  const [fullName, setFullName] = useState('');

  const [schedules, setSchedules] = useState([]);

  const [doseLogs, setDoseLogs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [processingDoseId, setProcessingDoseId] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');

  const loadHomeData = useCallback(async (skipMissedDoseCheck = false) => {
    try {
      setErrorMessage('');

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired.');
      }

      const start = new Date();

      start.setHours(0, 0, 0, 0);

      const end = new Date();

      end.setHours(23, 59, 59, 999);

      /*
       * Load the profile name, today's schedules and today's dose logs
       * at the same time instead of one after another.
       */
      const [profileResult, scheduleResult, logResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),

        supabase
          .from('medication_schedules')
          .select(
            `
            id,
            medication_id,
            frequency,
            dose_time,
            is_active,
            medications (
              id,
              name,
              dosage,
              medication_form,
              instructions,
              current_quantity,
              refill_threshold
            )
          `
          )
          .eq('user_id', user.id)
          .eq('is_active', true),

        supabase
          .from('dose_logs')
          .select(
            `
            id,
            medication_id,
            schedule_id,
            scheduled_for,
            status,
            taken_at
          `
          )
          .eq('user_id', user.id)
          .gte('scheduled_for', start.toISOString())
          .lte('scheduled_for', end.toISOString()),
      ]);

      const profileData = profileResult.data;

      if (profileData?.full_name) {
        setFullName(profileData.full_name);
      } else {
        setFullName(user.user_metadata?.full_name ?? '');
      }

      if (scheduleResult.error) {
        throw scheduleResult.error;
      }

      const validSchedules = (scheduleResult.data ?? [])
        .map((item) => ({
          ...item,

          medications: Array.isArray(item.medications)
            ? (item.medications[0] ?? null)
            : item.medications,
        }))
        .filter((item) => item.medications?.id);

      setSchedules(validSchedules);

      if (logResult.error) {
        throw logResult.error;
      }

      setDoseLogs(logResult.data ?? []);

      /*
       * Show the dashboard first. Then, in the background, ask MedTrack to
       * record any dose that is now genuinely missed (after the 60-minute
       * grace period). Only if something new was recorded do we quietly
       * reload today's logs. A failure here never blocks the dashboard.
       */
      if (!skipMissedDoseCheck) {
        processMissedDoses()
          .then((recordedCount) => {
            if (recordedCount > 0) {
              loadHomeData(true);
            }
          })
          .catch((missedDoseError) => {
            console.error('Missed dose processing error:', missedDoseError);
          });
      }
    } catch (error) {
      console.error('Home loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load your medication schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  const todayDoses = useMemo(() => {
    const now = new Date();

    const doses = schedules.map((schedule) => {
      const [hours, minutes] = schedule.dose_time.slice(0, 5).split(':').map(Number);

      const scheduledDate = new Date();

      scheduledDate.setHours(hours, minutes, 0, 0);

      const existingLog = doseLogs.find(
        (log) =>
          log.schedule_id === schedule.id &&
          new Date(log.scheduled_for).toDateString() === scheduledDate.toDateString()
      );

      let status;

      if (existingLog) {
        status = existingLog.status;
      } else {
        /*
         * A dose is NOT immediately
         * missed when its scheduled
         * time passes.
         *
         * Example:
         * 08:00 scheduled
         * 08:30 = still actionable
         * 09:00 = missed if no record
         */
        const missedAfter = new Date(
          scheduledDate.getTime() + MISSED_DOSE_GRACE_MINUTES * 60 * 1000
        );

        if (now >= missedAfter) {
          status = 'missed';
        } else {
          status = 'upcoming';
        }
      }

      return {
        scheduleId: schedule.id,

        medicationId: schedule.medications.id,

        name: schedule.medications.name,

        dosage: schedule.medications.dosage,

        form: schedule.medications.medication_form,

        instructions: schedule.medications.instructions,

        quantity: schedule.medications.current_quantity,

        refillThreshold: schedule.medications.refill_threshold,

        time: schedule.dose_time.slice(0, 5),

        scheduledDate,

        status,
      };
    });

    doses.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    const nextDose = doses.find((dose) => dose.status === 'upcoming');

    if (nextDose) {
      nextDose.status = 'next';
    }

    return doses;
  }, [schedules, doseLogs]);

  const nextDose = todayDoses.find((dose) => dose.status === 'next') ?? null;

  const completedCount = todayDoses.filter((dose) => dose.status === 'taken').length;

  const totalCount = todayDoses.length;

  const remainingCount = todayDoses.filter(
    (dose) => dose.status === 'next' || dose.status === 'upcoming'
  ).length;

  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const lowSupplyMedications = useMemo(() => {
    const unique = new Map();

    schedules.forEach((schedule) => {
      const medication = schedule.medications;

      if (
        medication &&
        medication.current_quantity !== null &&
        medication.current_quantity <= medication.refill_threshold
      ) {
        unique.set(medication.id, medication);
      }
    });

    return Array.from(unique.values());
  }, [schedules]);

  const firstName = fullName.trim().split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 18) {
      return 'Good afternoon';
    }

    return 'Good evening';
  };

  const formatToday = () => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const getRelativeTime = (dose) => {
    const difference = dose.scheduledDate.getTime() - new Date().getTime();

    const minutes = Math.round(difference / 60000);

    if (minutes <= 0) {
      const overdueMinutes = Math.abs(minutes);

      if (overdueMinutes < MISSED_DOSE_GRACE_MINUTES) {
        if (overdueMinutes === 0) {
          return 'Due now';
        }

        return `${overdueMinutes} min overdue`;
      }

      return 'Overdue';
    }

    if (minutes < 60) {
      return `In ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `In ${hours} hr`;
    }

    return `In ${hours} hr ${remainingMinutes} min`;
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'taken':
        return {
          icon: 'checkmark-circle',
          label: 'Taken',
          color: colors.success,
          background: colors.secondaryLight,
        };

      case 'missed':
        return {
          icon: 'alert-circle-outline',
          label: 'Missed',
          color: colors.danger,
          background: '#FFF0F0',
        };

      case 'skipped':
        return {
          icon: 'remove-circle-outline',
          label: 'Skipped',
          color: colors.warning,
          background: '#FFF7E8',
        };

      case 'next':
        return {
          icon: 'time',
          label: 'Next',
          color: colors.primary,
          background: colors.primaryLight,
        };

      default:
        return {
          icon: 'time-outline',
          label: 'Later',
          color: colors.textSecondary,
          background: colors.surfaceSoft,
        };
    }
  };

  const getCurrentUser = async () => {
    const { data, error } = await getUserFast();

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Your session has expired.');
    }

    return data.user;
  };

  const doseAlreadyRecorded = async (dose, userId) => {
    const start = new Date(dose.scheduledDate);

    start.setHours(0, 0, 0, 0);

    const end = new Date(dose.scheduledDate);

    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('dose_logs')
      .select('id, status')
      .eq('user_id', userId)
      .eq('schedule_id', dose.scheduleId)
      .gte('scheduled_for', start.toISOString())
      .lte('scheduled_for', end.toISOString())
      .limit(1);

    if (error) {
      throw error;
    }

    return data && data.length > 0;
  };

  const recordTakenDose = async (dose) => {
    if (processingDoseId) {
      return;
    }

    try {
      setProcessingDoseId(dose.scheduleId);

      const user = await getCurrentUser();

      const alreadyRecorded = await doseAlreadyRecorded(dose, user.id);

      if (alreadyRecorded) {
        Alert.alert('Dose already recorded', 'This scheduled dose already has a record.');

        await loadHomeData();

        return;
      }

      const { data: medicationData, error: medicationReadError } = await supabase
        .from('medications')
        .select('current_quantity')
        .eq('id', dose.medicationId)
        .eq('user_id', user.id)
        .single();

      if (medicationReadError) {
        throw medicationReadError;
      }

      const currentQuantity = medicationData.current_quantity;

      const { data: insertedLog, error: logError } = await supabase
        .from('dose_logs')
        .insert({
          user_id: user.id,

          medication_id: dose.medicationId,

          schedule_id: dose.scheduleId,

          scheduled_for: dose.scheduledDate.toISOString(),

          status: 'taken',

          taken_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (logError) {
        throw logError;
      }

      if (currentQuantity !== null && currentQuantity > 0) {
        const { error: quantityError } = await supabase
          .from('medications')
          .update({
            current_quantity: currentQuantity - 1,

            updated_at: new Date().toISOString(),
          })
          .eq('id', dose.medicationId)
          .eq('user_id', user.id);

        if (quantityError) {
          await supabase.from('dose_logs').delete().eq('id', insertedLog.id).eq('user_id', user.id);

          throw quantityError;
        }
      }

      await loadHomeData();

      Alert.alert('Dose recorded', `${dose.name} ${dose.dosage} has been marked as taken.`);
    } catch (error) {
      console.error('Take dose error:', error);

      Alert.alert(
        'Unable to record dose',
        error?.message ?? 'MedTrack could not record this dose.'
      );
    } finally {
      setProcessingDoseId(null);
    }
  };

  const recordSkippedDose = async (dose) => {
    if (processingDoseId) {
      return;
    }

    try {
      setProcessingDoseId(dose.scheduleId);

      const user = await getCurrentUser();

      const alreadyRecorded = await doseAlreadyRecorded(dose, user.id);

      if (alreadyRecorded) {
        Alert.alert('Dose already recorded', 'This scheduled dose already has a record.');

        await loadHomeData();

        return;
      }

      const { error } = await supabase.from('dose_logs').insert({
        user_id: user.id,

        medication_id: dose.medicationId,

        schedule_id: dose.scheduleId,

        scheduled_for: dose.scheduledDate.toISOString(),

        status: 'skipped',

        taken_at: null,
      });

      if (error) {
        throw error;
      }

      await loadHomeData();

      Alert.alert('Dose skipped', `${dose.name} ${dose.dosage} has been marked as skipped.`);
    } catch (error) {
      console.error('Skip dose error:', error);

      Alert.alert('Unable to skip dose', error?.message ?? 'MedTrack could not update this dose.');
    } finally {
      setProcessingDoseId(null);
    }
  };

  const confirmSkipDose = (dose) => {
    Alert.alert(
      'Skip this dose?',
      `${dose.name} is scheduled for ${dose.time}. This will record the dose as skipped.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip Dose',
          style: 'destructive',
          onPress: () => recordSkippedDose(dose),
        },
      ]
    );
  };

  const openAddMedication = () => {
    navigation.getParent()?.navigate('AddMedication');
  };

  const openMedication = (medicationId) => {
    navigation.getParent()?.navigate('MedicationDetails', {
      medicationId,
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="medical" size={31} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingText}>Preparing your MedTrack dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topHeader}>
          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.greeting}>{getGreeting()}</Text>

            <Text style={styles.name}>{firstName}</Text>

            <Text style={styles.dateText}>{formatToday()}</Text>
          </View>

          <Pressable
            onPress={() => navigation.getParent()?.navigate('Notifications')}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />

            {lowSupplyMedications.length > 0 && <View style={styles.notificationDot} />}
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
            <Ionicons name="person-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />

            <View
              style={{
                flex: 1,
                marginLeft: 10,
              }}
            >
              <Text style={styles.errorTitle}>Dashboard unavailable</Text>

              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          </View>
        ) : totalCount === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="medical-outline" size={38} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>Your schedule is empty</Text>

            <Text style={styles.emptyText}>
              Add your first medication and MedTrack will organise today's doses here.
            </Text>

            <Pressable onPress={openAddMedication} style={styles.primaryButton}>
              <Ionicons name="add" size={20} color={colors.white} />

              <Text style={styles.primaryButtonText}>Add Medication</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <View>
                  <Text style={styles.progressEyebrow}>TODAY'S PROGRESS</Text>

                  <Text style={styles.progressTitle}>
                    {completedCount} of {totalCount} doses completed
                  </Text>
                </View>

                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.progressBottom}>
                <Text style={styles.progressHint}>{remainingCount} upcoming</Text>

                <View style={styles.syncBadge}>
                  <Ionicons name="cloud-done-outline" size={14} color={colors.secondary} />

                  <Text style={styles.syncText}>Synced</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>NEXT DOSE</Text>

                <Text style={styles.sectionTitle}>Up next</Text>
              </View>
            </View>

            {nextDose ? (
              <View style={styles.nextDoseCard}>
                <Pressable onPress={() => openMedication(nextDose.medicationId)}>
                  <View style={styles.nextDoseTop}>
                    <View style={styles.nextDoseIcon}>
                      <Ionicons name="medical" size={27} color={colors.primary} />
                    </View>

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 12,
                      }}
                    >
                      <Text style={styles.nextDoseName}>{nextDose.name}</Text>

                      <Text style={styles.nextDoseDosage}>
                        {nextDose.dosage}
                        {'  •  '}
                        {nextDose.form}
                      </Text>
                    </View>

                    <View style={styles.dueBadge}>
                      <Text style={styles.dueText}>{getRelativeTime(nextDose)}</Text>
                    </View>
                  </View>
                </Pressable>

                <View style={styles.nextDoseInformation}>
                  <View style={styles.nextDoseInfoItem}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />

                    <View>
                      <Text style={styles.infoLabel}>TIME</Text>

                      <Text style={styles.infoValue}>{nextDose.time}</Text>
                    </View>
                  </View>

                  <View style={styles.nextDoseInfoItem}>
                    <Ionicons name="layers-outline" size={18} color={colors.secondary} />

                    <View>
                      <Text style={styles.infoLabel}>REMAINING</Text>

                      <Text style={styles.infoValue}>{nextDose.quantity ?? '—'} doses</Text>
                    </View>
                  </View>
                </View>

                {nextDose.instructions && (
                  <View style={styles.instructionBar}>
                    <Ionicons
                      name="information-circle-outline"
                      size={17}
                      color={colors.secondary}
                    />

                    <Text style={styles.instructionText}>{nextDose.instructions}</Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <Pressable
                    disabled={processingDoseId !== null}
                    onPress={() => confirmSkipDose(nextDose)}
                    style={({ pressed }) => [
                      styles.skipButton,
                      pressed && styles.buttonPressed,
                      processingDoseId !== null && styles.disabledButton,
                    ]}
                  >
                    <Ionicons
                      name="play-skip-forward-outline"
                      size={18}
                      color={colors.textSecondary}
                    />

                    <Text style={styles.skipButtonText}>Skip</Text>
                  </Pressable>

                  <Pressable
                    disabled={processingDoseId !== null}
                    onPress={() => recordTakenDose(nextDose)}
                    style={({ pressed }) => [
                      styles.takeButton,
                      pressed && styles.buttonPressed,
                      processingDoseId !== null && styles.disabledButton,
                    ]}
                  >
                    {processingDoseId === nextDose.scheduleId ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={19} color={colors.white} />
                    )}

                    <Text style={styles.takeButtonText}>
                      {processingDoseId === nextDose.scheduleId ? 'Saving...' : 'Take Now'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.completeCard}>
                <Ionicons name="checkmark-circle" size={36} color={colors.success} />

                <Text style={styles.completeTitle}>No more upcoming doses</Text>

                <Text style={styles.completeText}>
                  You have reached the end of today's active schedule.
                </Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>TODAY</Text>

                <Text style={styles.sectionTitle}>Medication schedule</Text>
              </View>

              <Text style={styles.scheduleCount}>
                {totalCount} {totalCount === 1 ? 'dose' : 'doses'}
              </Text>
            </View>

            <View style={styles.scheduleCard}>
              {todayDoses.map((dose, index) => {
                const config = getStatusConfig(dose.status);

                return (
                  <Pressable
                    key={dose.scheduleId}
                    onPress={() => openMedication(dose.medicationId)}
                    style={[
                      styles.scheduleItem,
                      index !== todayDoses.length - 1 && styles.scheduleItemBorder,
                    ]}
                  >
                    <Text style={styles.scheduleTime}>{dose.time}</Text>

                    <View style={styles.timelineArea}>
                      <View
                        style={[
                          styles.timelineDot,
                          {
                            backgroundColor: config.color,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.scheduleMedication}>
                      <Text style={styles.scheduleName}>{dose.name}</Text>

                      <Text style={styles.scheduleDosage}>{dose.dosage}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: config.background,
                        },
                      ]}
                    >
                      <Ionicons name={config.icon} size={14} color={config.color} />

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: config.color,
                          },
                        ]}
                      >
                        {config.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>QUICK ACCESS</Text>

                <Text style={styles.sectionTitle}>What do you need?</Text>
              </View>
            </View>

            <View style={styles.quickGrid}>
              <Pressable onPress={openAddMedication} style={styles.quickCard}>
                <View style={styles.quickBlue}>
                  <Ionicons name="add" size={22} color={colors.primary} />
                </View>

                <Text style={styles.quickTitle}>Add medication</Text>

                <Text style={styles.quickText}>Create a new medication schedule</Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.getParent()?.navigate('PrescriptionScanner')}
                style={styles.quickCard}
              >
                <View style={styles.quickGreen}>
                  <Ionicons name="scan-outline" size={22} color={colors.secondary} />
                </View>

                <Text style={styles.quickTitle}>Scan prescription</Text>

                <Text style={styles.quickText}>Add medicine from a prescription</Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.getParent()?.navigate('AIAssistant')}
                style={styles.quickCard}
              >
                <View style={styles.quickPurple}>
                  <Ionicons name="sparkles-outline" size={22} color="#7357D9" />
                </View>

                <Text style={styles.quickTitle}>Ask MedTrack</Text>

                <Text style={styles.quickText}>Get help understanding your routine</Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.getParent()?.navigate('Pharmacies')}
                style={styles.quickCard}
              >
                <View style={styles.quickOrange}>
                  <Ionicons name="location-outline" size={22} color={colors.warning} />
                </View>

                <Text style={styles.quickTitle}>Find pharmacy</Text>

                <Text style={styles.quickText}>Locate nearby pharmacies</Text>
              </Pressable>
            </View>

            {lowSupplyMedications.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionEyebrow}>REFILL</Text>

                    <Text style={styles.sectionTitle}>Supply warnings</Text>
                  </View>
                </View>

                {lowSupplyMedications.map((medication) => (
                  <Pressable
                    key={medication.id}
                    onPress={() => openMedication(medication.id)}
                    style={styles.refillCard}
                  >
                    <View style={styles.refillIcon}>
                      <Ionicons name="notifications-outline" size={21} color={colors.warning} />
                    </View>

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 11,
                      }}
                    >
                      <Text style={styles.refillTitle}>{medication.name}</Text>

                      <Text style={styles.refillText}>
                        {medication.current_quantity} doses remaining
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={colors.warning} />
                  </Pressable>
                ))}
              </>
            )}
          </>
        )}

        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.secondary} />

          <Text style={styles.safetyText}>
            MedTrack records your medication routine but does not decide whether you should take,
            skip or change a prescribed dose. Follow your healthcare professional's instructions.
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
    paddingBottom: 115,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  greeting: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  name: {
    marginTop: 2,
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },

  dateText: {
    marginTop: 4,
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.white,
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCard: {
    marginTop: 24,
    padding: 17,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
  },

  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressEyebrow: {
    color: '#8DB9F5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  progressTitle: {
    marginTop: 5,
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  progressPercent: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '800',
  },

  progressTrack: {
    height: 7,
    marginTop: 17,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.secondary,
  },

  progressBottom: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressHint: {
    color: '#CFE0F7',
    fontSize: 12,
    fontWeight: '600',
  },

  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  syncText: {
    color: colors.secondaryLight,
    fontSize: 12,
    fontWeight: '700',
  },

  sectionHeader: {
    marginTop: 28,
    marginBottom: 11,
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

  scheduleCount: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },

  nextDoseCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  nextDoseTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  nextDoseIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextDoseName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  nextDoseDosage: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },

  dueText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  nextDoseInformation: {
    marginTop: 17,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },

  nextDoseInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  infoLabel: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  infoValue: {
    marginTop: 2,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  instructionBar: {
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

  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 9,
  },

  skipButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  skipButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },

  takeButton: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  takeButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  disabledButton: {
    opacity: 0.55,
  },

  scheduleCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  scheduleItem: {
    minHeight: 72,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  scheduleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  scheduleTime: {
    width: 44,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  timelineArea: {
    width: 25,
    alignItems: 'center',
  },

  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  scheduleMedication: {
    flex: 1,
  },

  scheduleName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  scheduleDosage: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  statusBadge: {
    minWidth: 68,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },

  quickCard: {
    width: '48.5%',
    minHeight: 135,
    padding: 14,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  quickBlue: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickGreen: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickPurple: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: '#F1EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickOrange: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: '#FFF7E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickTitle: {
    marginTop: 12,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  quickText: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  refillCard: {
    marginBottom: 9,
    padding: 13,
    borderRadius: 17,
    backgroundColor: '#FFF7E8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  refillIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refillTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  refillText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  completeCard: {
    paddingVertical: 27,
    paddingHorizontal: 20,
    borderRadius: 21,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
  },

  completeTitle: {
    marginTop: 9,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  completeText: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },

  emptyCard: {
    marginTop: 30,
    padding: 30,
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
    marginTop: 17,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  primaryButton: {
    marginTop: 19,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  errorCard: {
    marginTop: 24,
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  safetyCard: {
    marginTop: 27,
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

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 11,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
