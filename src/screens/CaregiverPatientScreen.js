import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';

export default function CaregiverPatientScreen({ navigation, route }) {
  const relationshipId = route?.params?.relationshipId;

  const [summary, setSummary] = useState(null);

  const [medications, setMedications] = useState([]);

  const [history, setHistory] = useState([]);

  const [missedDoses, setMissedDoses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const loadPatientData = useCallback(
    async (refresh = false) => {
      if (!relationshipId) {
        setErrorMessage('Caregiver relationship information is missing.');
        setLoading(false);
        return;
      }

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage('');

        // ---------------------------------------------------
        // 1. LOAD SECURE CAREGIVER SUMMARY
        // ---------------------------------------------------

        const { data: summaryData, error: summaryError } = await supabase.rpc(
          'get_caregiver_patient_summary',
          {
            p_relationship_id: relationshipId,
          }
        );

        if (summaryError) {
          throw summaryError;
        }

        if (!summaryData) {
          throw new Error('Caregiver information could not be found.');
        }

        const patientSummary = summaryData;

        setSummary(patientSummary);

        const permissions = patientSummary.permissions;

        // Clear old information first so revoked permissions
        // cannot leave old information visible on the screen.

        setMedications([]);
        setHistory([]);
        setMissedDoses([]);

        // ---------------------------------------------------
        // 2. LOAD MEDICATIONS ONLY WHEN ALLOWED
        // ---------------------------------------------------

        if (permissions.can_view_medications) {
          const { data: medicationData, error: medicationError } = await supabase.rpc(
            'get_caregiver_medications',
            {
              p_relationship_id: relationshipId,
            }
          );

          if (medicationError) {
            throw medicationError;
          }

          setMedications(medicationData ?? []);
        }

        // ---------------------------------------------------
        // 3. LOAD ADHERENCE ONLY WHEN ALLOWED
        // ---------------------------------------------------

        if (permissions.can_view_adherence) {
          const { data: historyData, error: historyError } = await supabase.rpc(
            'get_caregiver_adherence_history',
            {
              p_relationship_id: relationshipId,
              p_days: 30,
            }
          );

          if (historyError) {
            throw historyError;
          }

          setHistory(historyData ?? []);
        }

        // ---------------------------------------------------
        // 4. LOAD MISSED DOSES ONLY WHEN ALLOWED
        // ---------------------------------------------------

        if (permissions.can_view_missed_doses) {
          const { data: missedData, error: missedError } = await supabase.rpc(
            'get_caregiver_missed_doses',
            {
              p_relationship_id: relationshipId,
              p_limit: 20,
            }
          );

          if (missedError) {
            throw missedError;
          }

          setMissedDoses(missedData ?? []);
        }
      } catch (error) {
        console.error('Caregiver patient loading error:', error);

        setErrorMessage(error?.message || 'MedTrack could not load this caregiver profile.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [relationshipId]
  );

  useFocusEffect(
    useCallback(() => {
      loadPatientData();
    }, [loadPatientData])
  );

  const formatDateTime = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Unknown time';
    }

    return date.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name) => {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase() || 'DW'
    );
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'taken':
        return {
          label: 'Taken',
          icon: 'checkmark-circle',
          color: colors.success,
          background: '#EAFBF2',
        };

      case 'missed':
        return {
          label: 'Missed',
          icon: 'alert-circle',
          color: colors.danger,
          background: '#FFF0EE',
        };

      case 'skipped':
        return {
          label: 'Skipped',
          icon: 'play-skip-forward-circle',
          color: colors.warning,
          background: '#FFF7E8',
        };

      default:
        return {
          label: status,
          icon: 'time-outline',
          color: colors.textSecondary,
          background: colors.surfaceSoft,
        };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="heart-outline" size={32} color={colors.primary} />
          </View>

          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading caregiver information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !summary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color={colors.text} />
          </Pressable>

          <Text
            style={[
              styles.headerTitle,
              {
                flex: 1,
                marginLeft: 12,
              },
            ]}
          >
            Caregiver
          </Text>
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
          </View>

          <Text style={styles.errorTitle}>Unable to load profile</Text>

          <Text style={styles.errorText}>
            {errorMessage || 'Caregiver information is unavailable.'}
          </Text>

          <Pressable onPress={() => loadPatientData()} style={styles.retryButton}>
            <Ionicons name="refresh" size={18} color={colors.white} />

            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const permissions = summary.permissions;

  const stats = summary.stats;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPatientData(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color={colors.text} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerEyebrow}>CAREGIVER VIEW</Text>

            <Text style={styles.headerTitle}>Health Overview</Text>
          </View>

          <View style={styles.secureButton}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          </View>
        </View>

        <View style={styles.patientCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(summary.owner_name)}</Text>
          </View>

          <View style={styles.patientInfo}>
            <Text style={styles.patientName} numberOfLines={1}>
              {summary.owner_name}
            </Text>

            <Text style={styles.patientRelationship}>
              You are connected as {summary.relationship_name}
            </Text>

            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.secondary} />

              <Text style={styles.connectedText}>Caregiver access active</Text>
            </View>
          </View>
        </View>

        <View style={styles.permissionNotice}>
          <Ionicons name="lock-closed-outline" size={19} color={colors.primary} />

          <Text style={styles.permissionNoticeText}>
            You can only see information this person has chosen to share with you.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.statsGrid}>
          {permissions.can_view_medications ? (
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Ionicons name="medical-outline" size={21} color={colors.primary} />
              </View>

              <Text style={styles.statValue}>{stats.active_medications ?? 0}</Text>

              <Text style={styles.statLabel}>Active medications</Text>
            </View>
          ) : null}

          {permissions.can_view_adherence ? (
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: colors.secondaryLight,
                  },
                ]}
              >
                <Ionicons name="analytics-outline" size={21} color={colors.secondary} />
              </View>

              <Text style={styles.statValue}>{stats.adherence ?? 0}%</Text>

              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          ) : null}

          {permissions.can_view_missed_doses ? (
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  {
                    backgroundColor: '#FFF0EE',
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={21} color={colors.danger} />
              </View>

              <Text
                style={[
                  styles.statValue,
                  (stats.missed_doses ?? 0) > 0 && {
                    color: colors.danger,
                  },
                ]}
              >
                {stats.missed_doses ?? 0}
              </Text>

              <Text style={styles.statLabel}>Missed doses</Text>
            </View>
          ) : null}
        </View>

        {!permissions.can_view_medications &&
        !permissions.can_view_adherence &&
        !permissions.can_view_missed_doses ? (
          <View style={styles.noPermissionCard}>
            <Ionicons name="lock-closed-outline" size={29} color={colors.textSecondary} />

            <Text style={styles.noPermissionTitle}>No health information shared</Text>

            <Text style={styles.noPermissionText}>
              You are connected as a caregiver, but this person has not enabled health-data
              permissions yet.
            </Text>
          </View>
        ) : null}

        {permissions.can_view_medications ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitleInline}>Medications</Text>

                <Text style={styles.sectionSubtitle}>Currently active medication plan</Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>{medications.length}</Text>
              </View>
            </View>

            {medications.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="medical-outline" size={27} color={colors.textLight} />

                <Text style={styles.emptyTitle}>No active medications</Text>
              </View>
            ) : (
              medications.map((medication) => (
                <View key={medication.id} style={styles.medicationCard}>
                  <View style={styles.medicationIcon}>
                    <Ionicons name="medical" size={21} color={colors.primary} />
                  </View>

                  <View style={styles.medicationContent}>
                    <Text style={styles.medicationName}>{medication.name}</Text>

                    <Text style={styles.medicationDose}>
                      {medication.dosage || 'Dosage not specified'}
                      {medication.medication_form ? ` • ${medication.medication_form}` : ''}
                    </Text>

                    {medication.instructions ? (
                      <Text style={styles.medicationInstructions} numberOfLines={2}>
                        {medication.instructions}
                      </Text>
                    ) : null}

                    {medication.current_quantity !== null ? (
                      <View style={styles.quantityRow}>
                        <Ionicons name="cube-outline" size={13} color={colors.textSecondary} />

                        <Text style={styles.quantityText}>
                          {medication.current_quantity} remaining
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}

        {permissions.can_view_missed_doses ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitleInline}>Recent Missed Doses</Text>

                <Text style={styles.sectionSubtitle}>Latest recorded missed doses</Text>
              </View>

              <View style={[styles.countBadge, missedDoses.length > 0 && styles.dangerCountBadge]}>
                <Text style={[styles.countText, missedDoses.length > 0 && styles.dangerCountText]}>
                  {missedDoses.length}
                </Text>
              </View>
            </View>

            {missedDoses.length === 0 ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={25} color={colors.success} />

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text style={styles.successTitle}>No missed doses</Text>

                  <Text style={styles.successText}>
                    There are no recorded missed doses to show.
                  </Text>
                </View>
              </View>
            ) : (
              missedDoses.slice(0, 5).map((dose) => (
                <View key={dose.dose_log_id} style={styles.missedCard}>
                  <View style={styles.missedIcon}>
                    <Ionicons name="alert-circle-outline" size={21} color={colors.danger} />
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text style={styles.missedName}>{dose.medication_name}</Text>

                    <Text style={styles.missedDetails}>
                      {dose.dosage || 'Dosage not specified'}
                    </Text>

                    <Text style={styles.missedTime}>{formatDateTime(dose.scheduled_for)}</Text>
                  </View>

                  <View style={styles.missedBadge}>
                    <Text style={styles.missedBadgeText}>MISSED</Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}

        {permissions.can_view_adherence ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitleInline}>Recent Adherence</Text>

                <Text style={styles.sectionSubtitle}>Last 30 days</Text>
              </View>
            </View>

            {history.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={27} color={colors.textLight} />

                <Text style={styles.emptyTitle}>No dose history yet</Text>
              </View>
            ) : (
              history.slice(0, 10).map((item) => {
                const status = getStatusDetails(item.status);

                return (
                  <View key={item.dose_log_id} style={styles.historyCard}>
                    <View
                      style={[
                        styles.historyStatusIcon,
                        {
                          backgroundColor: status.background,
                        },
                      ]}
                    >
                      <Ionicons name={status.icon} size={20} color={status.color} />
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text style={styles.historyName}>{item.medication_name}</Text>

                      <Text style={styles.historyDetails}>
                        {item.dosage || 'Dosage not specified'}
                      </Text>

                      <Text style={styles.historyTime}>
                        Scheduled {formatDateTime(item.scheduled_for)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.historyBadge,
                        {
                          backgroundColor: status.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyBadgeText,
                          {
                            color: status.color,
                          },
                        ]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : null}

        <View style={styles.securityCard}>
          <Ionicons name="shield-checkmark-outline" size={23} color={colors.primary} />

          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.securityTitle}>Permission-controlled access</Text>

            <Text style={styles.securityText}>
              The account owner controls what information is shared. If they change or revoke your
              permissions, this view will update accordingly.
            </Text>
          </View>
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

  content: {
    padding: 17,
    paddingBottom: 45,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 17,
    paddingTop: 10,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerContent: {
    flex: 1,
    marginLeft: 12,
  },

  headerEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: '800',
    color: colors.text,
  },

  secureButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAFBF2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  patientCard: {
    padding: 17,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarContainer: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },

  patientInfo: {
    flex: 1,
    marginLeft: 13,
  },

  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },

  patientRelationship: {
    marginTop: 4,
    fontSize: 13,
    color: '#C8D8EE',
  },

  connectedBadge: {
    marginTop: 9,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  connectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },

  permissionNotice: {
    marginTop: 12,
    padding: 12,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  permissionNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  statCard: {
    flex: 1,
    minHeight: 124,
    padding: 11,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    marginTop: 11,
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },

  statLabel: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  sectionHeader: {
    marginTop: 26,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitleInline: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  dangerCountBadge: {
    backgroundColor: '#FFF0EE',
  },

  dangerCountText: {
    color: colors.danger,
  },

  medicationCard: {
    padding: 14,
    marginBottom: 9,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },

  medicationIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medicationContent: {
    flex: 1,
    marginLeft: 11,
  },

  medicationName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },

  medicationDose: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },

  medicationInstructions: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  quantityRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  quantityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  missedCard: {
    padding: 13,
    marginBottom: 8,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#FFD7D3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  missedIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  missedName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  missedDetails: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  missedTime: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textLight,
  },

  missedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFF0EE',
  },

  missedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.danger,
  },

  historyCard: {
    padding: 13,
    marginBottom: 8,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyStatusIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  historyName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  historyDetails: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  historyTime: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textLight,
  },

  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },

  historyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    padding: 22,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  successCard: {
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#EAFBF2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  successTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  successText: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  noPermissionCard: {
    marginTop: 18,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  noPermissionTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  noPermissionText: {
    marginTop: 5,
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  securityCard: {
    marginTop: 27,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    gap: 10,
  },

  securityTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  securityText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingText: {
    marginTop: 11,
    fontSize: 13,
    color: colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  errorIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  errorText: {
    marginTop: 5,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  retryButton: {
    marginTop: 18,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  retryButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
});
