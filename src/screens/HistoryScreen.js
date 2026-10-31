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

import { useFocusEffect } from '@react-navigation/native';

import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { colors } from '../theme/colors';

export default function HistoryScreen({ navigation }) {
  const [doseLogs, setDoseLogs] = useState([]);

  const [selectedFilter, setSelectedFilter] = useState('all');

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const loadHistory = useCallback(async () => {
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

      const { data, error } = await supabase
        .from('dose_logs')
        .select(
          `
            id,
            medication_id,
            schedule_id,
            scheduled_for,
            status,
            taken_at,
            medications (
              id,
              name,
              dosage,
              medication_form
            )
          `
        )
        .eq('user_id', user.id)
        .order('scheduled_for', {
          ascending: false,
        })
        .limit(200);

      if (error) {
        throw error;
      }

      const cleaned = (data ?? []).map((item) => ({
        ...item,

        medications: Array.isArray(item.medications)
          ? (item.medications[0] ?? null)
          : item.medications,
      }));

      setDoseLogs(cleaned);
    } catch (error) {
      console.error('History loading error:', error);

      setErrorMessage(error?.message ?? 'MedTrack could not load your medication history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const filteredLogs = useMemo(() => {
    if (selectedFilter === 'all') {
      return doseLogs;
    }

    return doseLogs.filter((log) => log.status === selectedFilter);
  }, [doseLogs, selectedFilter]);

  const stats = useMemo(() => {
    const taken = doseLogs.filter((log) => log.status === 'taken').length;

    const skipped = doseLogs.filter((log) => log.status === 'skipped').length;

    const missed = doseLogs.filter((log) => log.status === 'missed').length;

    const total = doseLogs.length;

    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

    return {
      taken,
      skipped,
      missed,
      total,
      adherence,
    };
  }, [doseLogs]);

  const groupedLogs = useMemo(() => {
    const groups = [];

    filteredLogs.forEach((log) => {
      const date = new Date(log.scheduled_for);

      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      const existing = groups.find((group) => group.dateKey === dateKey);

      if (existing) {
        existing.logs.push(log);
      } else {
        groups.push({
          dateKey,
          title: formatDateTitle(date),
          logs: [log],
        });
      }
    });

    return groups;
  }, [filteredLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const openMedication = (medicationId) => {
    navigation.navigate('MedicationDetails', {
      medicationId,
    });
  };

  const getStatusDetails = (status) => {
    if (status === 'taken') {
      return {
        label: 'Taken',
        icon: 'checkmark-circle',
        color: colors.success,
        background: colors.secondaryLight,
      };
    }

    if (status === 'skipped') {
      return {
        label: 'Skipped',
        icon: 'remove-circle',
        color: colors.warning,
        background: '#FFF7E8',
      };
    }

    return {
      label: 'Missed',
      icon: 'alert-circle',
      color: colors.danger,
      background: '#FFF0F0',
    };
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatTakenTime = (takenAt) => {
    if (!takenAt) {
      return null;
    }

    return new Date(takenAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="time-outline" size={30} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingText}>Loading your medication history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>

        <View style={styles.headerTextArea}>
          <Text style={styles.headerEyebrow}>MEDTRACK</Text>

          <Text style={styles.headerTitle}>Medication History</Text>
        </View>

        <Pressable onPress={handleRefresh} style={styles.headerButton}>
          <Ionicons name="refresh-outline" size={21} color={colors.primary} />
        </Pressable>
      </View>

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
        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={23} color={colors.danger} />

            <View style={styles.errorTextArea}>
              <Text style={styles.errorTitle}>Unable to load history</Text>

              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryEyebrow}>ADHERENCE SUMMARY</Text>

                  <Text style={styles.summaryTitle}>Your medication record</Text>
                </View>

                <View style={styles.adherenceCircle}>
                  <Text style={styles.adherenceNumber}>{stats.adherence}%</Text>

                  <Text style={styles.adherenceLabel}>taken</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View
                    style={[
                      styles.statIcon,
                      {
                        backgroundColor: colors.secondaryLight,
                      },
                    ]}
                  >
                    <Ionicons name="checkmark" size={17} color={colors.success} />
                  </View>

                  <Text style={styles.statNumber}>{stats.taken}</Text>

                  <Text style={styles.statLabel}>Taken</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <View
                    style={[
                      styles.statIcon,
                      {
                        backgroundColor: '#FFF7E8',
                      },
                    ]}
                  >
                    <Ionicons name="remove" size={17} color={colors.warning} />
                  </View>

                  <Text style={styles.statNumber}>{stats.skipped}</Text>

                  <Text style={styles.statLabel}>Skipped</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <View
                    style={[
                      styles.statIcon,
                      {
                        backgroundColor: '#FFF0F0',
                      },
                    ]}
                  >
                    <Ionicons name="close" size={17} color={colors.danger} />
                  </View>

                  <Text style={styles.statNumber}>{stats.missed}</Text>

                  <Text style={styles.statLabel}>Missed</Text>
                </View>
              </View>

              <Text style={styles.summaryNote}>
                Based on {stats.total} recorded {stats.total === 1 ? 'dose' : 'doses'}.
              </Text>
            </View>

            <Text style={styles.filterHeading}>FILTER HISTORY</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <FilterButton
                label="All"
                count={stats.total}
                selected={selectedFilter === 'all'}
                onPress={() => setSelectedFilter('all')}
              />

              <FilterButton
                label="Taken"
                count={stats.taken}
                selected={selectedFilter === 'taken'}
                onPress={() => setSelectedFilter('taken')}
              />

              <FilterButton
                label="Skipped"
                count={stats.skipped}
                selected={selectedFilter === 'skipped'}
                onPress={() => setSelectedFilter('skipped')}
              />

              <FilterButton
                label="Missed"
                count={stats.missed}
                selected={selectedFilter === 'missed'}
                onPress={() => setSelectedFilter('missed')}
              />
            </ScrollView>

            {groupedLogs.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={35} color={colors.primary} />
                </View>

                <Text style={styles.emptyTitle}>
                  {doseLogs.length === 0 ? 'No dose history yet' : `No ${selectedFilter} doses`}
                </Text>

                <Text style={styles.emptyText}>
                  {doseLogs.length === 0
                    ? 'When you take, skip or miss scheduled medication, your records will appear here.'
                    : 'There are no records matching this filter.'}
                </Text>
              </View>
            ) : (
              groupedLogs.map((group) => (
                <View key={group.dateKey} style={styles.dateSection}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateTitle}>{group.title}</Text>

                    <Text style={styles.dateCount}>
                      {group.logs.length} {group.logs.length === 1 ? 'record' : 'records'}
                    </Text>
                  </View>

                  <View style={styles.historyCard}>
                    {group.logs.map((log, index) => {
                      const status = getStatusDetails(log.status);

                      const actualTakenTime = formatTakenTime(log.taken_at);

                      return (
                        <Pressable
                          key={log.id}
                          disabled={!log.medications}
                          onPress={() => {
                            if (log.medications) {
                              openMedication(log.medications.id);
                            }
                          }}
                          style={[
                            styles.historyItem,

                            index !== group.logs.length - 1 && styles.historyItemBorder,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusIcon,
                              {
                                backgroundColor: status.background,
                              },
                            ]}
                          >
                            <Ionicons name={status.icon} size={21} color={status.color} />
                          </View>

                          <View style={styles.historyInformation}>
                            <Text style={styles.medicationName}>
                              {log.medications?.name ?? 'Medication'}
                            </Text>

                            <Text style={styles.medicationDetails}>
                              {log.medications?.dosage ?? ''}
                              {log.medications?.medication_form
                                ? ` • ${log.medications.medication_form}`
                                : ''}
                            </Text>

                            <View style={styles.timeInformation}>
                              <Ionicons name="time-outline" size={13} color={colors.textLight} />

                              <Text style={styles.timeText}>
                                Scheduled {formatTime(log.scheduled_for)}
                              </Text>
                            </View>

                            {log.status === 'taken' && actualTakenTime && (
                              <Text style={styles.actualTime}>Taken at {actualTakenTime}</Text>
                            )}

                            {log.notes && <Text style={styles.notesText}>{log.notes}</Text>}
                          </View>

                          <View style={styles.rightArea}>
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor: status.background,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color: status.color,
                                  },
                                ]}
                              >
                                {status.label}
                              </Text>
                            </View>

                            {log.medications && (
                              <Ionicons
                                name="chevron-forward"
                                size={17}
                                color={colors.textLight}
                                style={{
                                  marginTop: 12,
                                }}
                              />
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />

              <Text style={styles.infoText}>
                Your history reflects recorded MedTrack activity. Adherence percentages are for
                tracking your routine and are not medical advice.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterButton({ label, count, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterButton, selected && styles.filterButtonSelected]}
    >
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>

      <View style={[styles.filterCount, selected && styles.filterCountSelected]}>
        <Text style={[styles.filterCountText, selected && styles.filterCountTextSelected]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function formatDateTitle(date) {
  const today = new Date();

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const difference = Math.round((todayStart.getTime() - dateStart.getTime()) / 86400000);

  if (difference === 0) {
    return 'Today';
  }

  if (difference === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  headerButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextArea: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  headerTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 45,
  },

  summaryCard: {
    marginTop: 8,
    padding: 18,
    borderRadius: 23,
    backgroundColor: colors.primaryDark,
  },

  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryEyebrow: {
    color: '#8DB9F5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  summaryTitle: {
    marginTop: 5,
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  adherenceCircle: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  adherenceNumber: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },

  adherenceLabel: {
    marginTop: 1,
    color: '#B9D2F3',
    fontSize: 11,
    fontWeight: '700',
  },

  statsRow: {
    marginTop: 19,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statNumber: {
    marginTop: 6,
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  statLabel: {
    marginTop: 2,
    color: '#C5D8F2',
    fontSize: 11,
    fontWeight: '600',
  },

  statDivider: {
    width: 1,
    height: 47,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  summaryNote: {
    marginTop: 14,
    color: '#9DBDE7',
    fontSize: 11,
    textAlign: 'center',
  },

  filterHeading: {
    marginTop: 26,
    marginBottom: 10,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  filterRow: {
    gap: 8,
    paddingRight: 10,
  },

  filterButton: {
    height: 39,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  filterButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  filterTextSelected: {
    color: colors.white,
  },

  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 7,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  filterCountText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },

  filterCountTextSelected: {
    color: colors.white,
  },

  dateSection: {
    marginTop: 24,
  },

  dateHeader: {
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  dateCount: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '600',
  },

  historyCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  historyItem: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  statusIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyInformation: {
    flex: 1,
    marginLeft: 11,
  },

  medicationName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  medicationDetails: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  timeInformation: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  timeText: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '600',
  },

  actualTime: {
    marginTop: 4,
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },

  notesText: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  rightArea: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  emptyCard: {
    marginTop: 28,
    padding: 30,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 15,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 7,
    maxWidth: 260,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  infoCard: {
    marginTop: 27,
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  errorCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFF0F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorTextArea: {
    flex: 1,
    marginLeft: 10,
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

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
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
