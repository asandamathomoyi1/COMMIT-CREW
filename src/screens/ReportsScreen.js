import React, { useCallback, useMemo, useState } from 'react';

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

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { colors } from '../theme/colors';

function getStartDate(period) {
  const now = new Date();

  if (period === 'all') {
    return null;
  }

  const start = new Date(now);

  if (period === '7days') {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }

  start.setHours(0, 0, 0, 0);

  return start;
}

function getPeriodTitle(period) {
  switch (period) {
    case '7days':
      return 'Last 7 days';

    case '30days':
      return 'Last 30 days';

    default:
      return 'All time';
  }
}

function formatDate(value) {
  const date = new Date(value);

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(value) {
  const date = new Date(value);

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getStatusColor(status) {
  switch (status) {
    case 'taken':
      return colors.success;

    case 'missed':
      return colors.danger;

    case 'skipped':
      return colors.warning;

    default:
      return colors.textSecondary;
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'taken':
      return 'checkmark-circle';

    case 'missed':
      return 'close-circle';

    case 'skipped':
      return 'play-skip-forward-circle';

    default:
      return 'ellipse';
  }
}

export default function ReportsScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState('7days');

  const [doseLogs, setDoseLogs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const loadReports = useCallback(async () => {
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

      let query = supabase
        .from('dose_logs')
        .select(
          `
              id,
              medication_id,
              scheduled_for,
              status,
              taken_at,
              medications (
                id,
                name,
                dosage
              )
            `
        )
        .eq('user_id', user.id)
        .order('scheduled_for', {
          ascending: false,
        });

      const startDate = getStartDate(selectedPeriod);

      if (startDate) {
        query = query.gte('scheduled_for', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const normalized = (data ?? []).map((item) => ({
        ...item,

        medications: Array.isArray(item.medications)
          ? (item.medications[0] ?? null)
          : item.medications,
      }));

      setDoseLogs(normalized);
    } catch (error) {
      console.error('Reports loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load your medication report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const refreshReports = async () => {
    setRefreshing(true);

    await loadReports();
  };

  const statistics = useMemo(() => {
    const total = doseLogs.length;

    const taken = doseLogs.filter((item) => item.status === 'taken').length;

    const missed = doseLogs.filter((item) => item.status === 'missed').length;

    const skipped = doseLogs.filter((item) => item.status === 'skipped').length;

    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

    return {
      total,
      taken,
      missed,
      skipped,
      adherence,
    };
  }, [doseLogs]);

  const medicationReports = useMemo(() => {
    const medicationMap = new Map();

    doseLogs.forEach((log) => {
      const id = log.medication_id;

      const existing = medicationMap.get(id);

      const medicationName = log.medications?.name ?? 'Medication';

      const medicationDosage = log.medications?.dosage ?? '';

      if (!existing) {
        medicationMap.set(id, {
          medicationId: id,

          name: medicationName,

          dosage: medicationDosage,

          total: 1,

          taken: log.status === 'taken' ? 1 : 0,

          missed: log.status === 'missed' ? 1 : 0,

          skipped: log.status === 'skipped' ? 1 : 0,

          adherence: log.status === 'taken' ? 100 : 0,
        });

        return;
      }

      existing.total += 1;

      if (log.status === 'taken') {
        existing.taken += 1;
      }

      if (log.status === 'missed') {
        existing.missed += 1;
      }

      if (log.status === 'skipped') {
        existing.skipped += 1;
      }

      existing.adherence = Math.round((existing.taken / existing.total) * 100);
    });

    return Array.from(medicationMap.values()).sort((a, b) => b.total - a.total);
  }, [doseLogs]);

  const adherenceMessage = useMemo(() => {
    if (statistics.total === 0) {
      return 'Start recording your scheduled doses to build your adherence report.';
    }

    if (statistics.adherence >= 90) {
      return 'Your recorded medication adherence is very consistent for this period.';
    }

    if (statistics.adherence >= 75) {
      return 'Your recorded adherence is progressing well. Keep following your medication schedule.';
    }

    if (statistics.adherence >= 50) {
      return 'Some scheduled doses were not recorded as taken during this period.';
    }

    return 'Several scheduled doses were missed or skipped during this period.';
  }, [statistics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="analytics-outline" size={30} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingText}>Building your report...</Text>
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
            onRefresh={refreshReports}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Health Reports</Text>

            <Text style={styles.headerSubtitle}>Medication adherence</Text>
          </View>

          <Pressable
            onPress={() => {
              // PDF export will
              // be connected later.
            }}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.periodContainer}>
          <Pressable
            onPress={() => setSelectedPeriod('7days')}
            style={[styles.periodButton, selectedPeriod === '7days' && styles.periodButtonActive]}
          >
            <Text
              style={[styles.periodText, selectedPeriod === '7days' && styles.periodTextActive]}
            >
              7 Days
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedPeriod('30days')}
            style={[styles.periodButton, selectedPeriod === '30days' && styles.periodButtonActive]}
          >
            <Text
              style={[styles.periodText, selectedPeriod === '30days' && styles.periodTextActive]}
            >
              30 Days
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedPeriod('all')}
            style={[styles.periodButton, selectedPeriod === 'all' && styles.periodButtonActive]}
          >
            <Text style={[styles.periodText, selectedPeriod === 'all' && styles.periodTextActive]}>
              All Time
            </Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />

            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable
              onPress={() => {
                setLoading(true);
                loadReports();
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.adherenceCard}>
          <View style={styles.adherenceTop}>
            <View>
              <Text style={styles.adherenceLabel}>ADHERENCE SCORE</Text>

              <Text style={styles.periodLabel}>{getPeriodTitle(selectedPeriod)}</Text>
            </View>

            <View style={styles.trendBadge}>
              <Ionicons name="pulse-outline" size={15} color={colors.secondary} />

              <Text style={styles.trendText}>MedTrack</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{statistics.adherence}</Text>

              <Text style={styles.scorePercent}>%</Text>
            </View>

            <View style={styles.scoreContent}>
              <Text style={styles.scoreTitle}>Medication adherence</Text>

              <Text style={styles.scoreDescription}>{adherenceMessage}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${statistics.adherence}%`,
                },
              ]}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dose summary</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.totalIcon]}>
              <Ionicons name="calendar-outline" size={19} color={colors.primary} />
            </View>

            <Text style={styles.summaryNumber}>{statistics.total}</Text>

            <Text style={styles.summaryLabel}>Total doses</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.takenIcon]}>
              <Ionicons name="checkmark" size={20} color={colors.success} />
            </View>

            <Text style={styles.summaryNumber}>{statistics.taken}</Text>

            <Text style={styles.summaryLabel}>Taken</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.missedIcon]}>
              <Ionicons name="close" size={20} color={colors.danger} />
            </View>

            <Text style={styles.summaryNumber}>{statistics.missed}</Text>

            <Text style={styles.summaryLabel}>Missed</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.skippedIcon]}>
              <Ionicons name="play-skip-forward" size={18} color={colors.warning} />
            </View>

            <Text style={styles.summaryNumber}>{statistics.skipped}</Text>

            <Text style={styles.summaryLabel}>Skipped</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Medication performance</Text>

          <Text style={styles.sectionMeta}>{medicationReports.length} medications</Text>
        </View>

        {medicationReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bar-chart-outline" size={28} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>No report data yet</Text>

            <Text style={styles.emptyText}>
              Taken, missed and skipped doses will appear here as you use MedTrack.
            </Text>
          </View>
        ) : (
          medicationReports.map((medication) => (
            <Pressable
              key={medication.medicationId}
              onPress={() =>
                navigation.navigate('MedicationDetails', {
                  medicationId: medication.medicationId,
                })
              }
              style={({ pressed }) => [styles.medicationCard, pressed && styles.pressed]}
            >
              <View style={styles.medicationTop}>
                <View style={styles.medicationIcon}>
                  <Ionicons name="medical-outline" size={21} color={colors.primary} />
                </View>

                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName} numberOfLines={1}>
                    {medication.name}
                  </Text>

                  <Text style={styles.medicationDosage}>
                    {medication.dosage || 'Dosage not specified'}
                  </Text>
                </View>

                <View style={styles.medicationScore}>
                  <Text style={styles.medicationScoreNumber}>{medication.adherence}%</Text>

                  <Text style={styles.medicationScoreLabel}>adherence</Text>
                </View>
              </View>

              <View style={styles.medicationProgress}>
                <View
                  style={[
                    styles.medicationProgressFill,
                    {
                      width: `${medication.adherence}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.medicationStats}>
                <View style={styles.smallStat}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: colors.success,
                      },
                    ]}
                  />

                  <Text style={styles.smallStatText}>{medication.taken} taken</Text>
                </View>

                <View style={styles.smallStat}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: colors.danger,
                      },
                    ]}
                  />

                  <Text style={styles.smallStatText}>{medication.missed} missed</Text>
                </View>

                <View style={styles.smallStat}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: colors.warning,
                      },
                    ]}
                  />

                  <Text style={styles.smallStatText}>{medication.skipped} skipped</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Recent activity</Text>

          <Text style={styles.sectionMeta}>Latest records</Text>
        </View>

        {doseLogs.length === 0 ? (
          <View style={styles.activityEmpty}>
            <Text style={styles.activityEmptyText}>No dose activity for this period.</Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            {doseLogs.slice(0, 5).map((log, index) => (
              <View key={log.id}>
                <View style={styles.activityRow}>
                  <View
                    style={[
                      styles.activityIcon,
                      {
                        backgroundColor: `${getStatusColor(log.status)}15`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(log.status)}
                      size={20}
                      color={getStatusColor(log.status)}
                    />
                  </View>

                  <View style={styles.activityContent}>
                    <Text style={styles.activityMedication} numberOfLines={1}>
                      {log.medications?.name ?? 'Medication'}
                    </Text>

                    <Text style={styles.activityDate}>
                      {formatDate(log.scheduled_for)} • {formatTime(log.scheduled_for)}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.activityStatus,
                      {
                        color: getStatusColor(log.status),
                      },
                    ]}
                  >
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </Text>
                </View>

                {index < Math.min(doseLogs.length, 5) - 1 && (
                  <View style={styles.activityDivider} />
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="bulb-outline" size={22} color={colors.primary} />
          </View>

          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>MedTrack Insight</Text>

            <Text style={styles.insightText}>
              This report is based on the doses recorded in MedTrack. Use it to understand your
              routine, not to change a prescribed medication or dosage.
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>MedTrack • Health Reports</Text>
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 60,
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
    fontSize: 16,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },

  periodContainer: {
    marginTop: 23,
    padding: 5,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
  },

  periodButton: {
    flex: 1,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  periodButtonActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  periodText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  periodTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  adherenceCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
  },

  adherenceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  adherenceLabel: {
    color: '#8EB9EF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  periodLabel: {
    marginTop: 4,
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  trendBadge: {
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  trendText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  scoreRow: {
    marginTop: 21,
    flexDirection: 'row',
    alignItems: 'center',
  },

  scoreCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 8,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  scoreNumber: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '900',
  },

  scorePercent: {
    marginTop: 7,
    color: '#CFE0F7',
    fontSize: 11,
    fontWeight: '800',
  },

  scoreContent: {
    flex: 1,
    marginLeft: 17,
  },

  scoreTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  scoreDescription: {
    marginTop: 6,
    color: '#C6D8EF',
    fontSize: 12,
    lineHeight: 17,
  },

  progressTrack: {
    marginTop: 19,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.13)',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },

  sectionTitle: {
    marginTop: 26,
    marginBottom: 11,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },

  summaryCard: {
    width: '48.5%',
    padding: 15,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalIcon: {
    backgroundColor: colors.primaryLight,
  },

  takenIcon: {
    backgroundColor: '#EAF9F1',
  },

  missedIcon: {
    backgroundColor: '#FFF0EF',
  },

  skippedIcon: {
    backgroundColor: '#FFF6E8',
  },

  summaryNumber: {
    marginTop: 13,
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },

  summaryLabel: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  sectionHeader: {
    marginTop: 28,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitleNoMargin: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  sectionMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  medicationCard: {
    marginBottom: 10,
    padding: 15,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  medicationTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  medicationIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medicationInfo: {
    flex: 1,
    marginLeft: 11,
  },

  medicationName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  medicationDosage: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  medicationScore: {
    alignItems: 'flex-end',
  },

  medicationScoreNumber: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },

  medicationScoreLabel: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 11,
  },

  medicationProgress: {
    marginTop: 13,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },

  medicationProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  medicationStats: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  smallStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  smallStatText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  activityCard: {
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activityRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },

  activityIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityContent: {
    flex: 1,
    marginLeft: 11,
  },

  activityMedication: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  activityDate: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  activityStatus: {
    fontSize: 12,
    fontWeight: '800',
  },

  activityDivider: {
    height: 1,
    marginLeft: 50,
    backgroundColor: colors.border,
  },

  activityEmpty: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activityEmptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },

  insightCard: {
    marginTop: 25,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  insightContent: {
    flex: 1,
    marginLeft: 11,
  },

  insightTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  insightText: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  emptyCard: {
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 13,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 6,
    maxWidth: 260,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },

  errorCard: {
    marginTop: 14,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFD7D3',
    backgroundColor: '#FFF4F3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorText: {
    flex: 1,
    marginHorizontal: 9,
    color: colors.textSecondary,
    fontSize: 12,
  },

  retryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
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

  footerText: {
    marginTop: 26,
    color: colors.textLight,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.72,
  },
});
