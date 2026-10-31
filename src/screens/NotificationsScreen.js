import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Linking,
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
import { hasNotificationPermission, requestNotificationPermissions } from '../services/notifications';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme/colors';

const MISSED_LOOKBACK_DAYS = 3;

function formatTime(time) {
  return time?.slice(0, 5) ?? '';
}

function formatWhen(dateString) {
  const date = new Date(dateString);

  const today = new Date();

  const isToday = date.toDateString() === today.toDateString();

  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  const day = isToday
    ? 'Today'
    : date.toDateString() === yesterday.toDateString()
      ? 'Yesterday'
      : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${day} at ${time}`;
}

function AlertCard({ icon, tone, title, text, onPress }) {
  const toneColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.primary;

  const toneBackground =
    tone === 'danger' ? '#FFF0EF' : tone === 'warning' ? '#FFF7E8' : colors.primaryLight;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.alertCard, pressed && styles.pressed]}
    >
      <View style={[styles.alertIcon, { backgroundColor: toneBackground }]}>
        <Ionicons name={icon} size={20} color={toneColor} />
      </View>

      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{title}</Text>

        <Text style={styles.alertText}>{text}</Text>
      </View>

      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textLight} /> : null}
    </Pressable>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [permissionGranted, setPermissionGranted] = useState(true);
  const [lowSupply, setLowSupply] = useState([]);
  const [missed, setMissed] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  const load = useCallback(async () => {
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

      const since = new Date();

      since.setDate(since.getDate() - MISSED_LOOKBACK_DAYS);

      since.setHours(0, 0, 0, 0);

      const startOfToday = new Date();

      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();

      endOfToday.setHours(23, 59, 59, 999);

      const [permission, medResult, missedResult, scheduleResult, todayLogResult] =
        await Promise.all([
          hasNotificationPermission(),

          supabase
            .from('medications')
            .select('id, name, current_quantity, refill_threshold')
            .eq('user_id', user.id)
            .eq('is_active', true),

          supabase
            .from('dose_logs')
            .select('id, medication_id, scheduled_for, medications ( id, name )')
            .eq('user_id', user.id)
            .eq('status', 'missed')
            .gte('scheduled_for', since.toISOString())
            .order('scheduled_for', { ascending: false })
            .limit(20),

          supabase
            .from('medication_schedules')
            .select('id, medication_id, dose_time, medications ( id, name, is_active )')
            .eq('user_id', user.id)
            .eq('is_active', true),

          supabase
            .from('dose_logs')
            .select('schedule_id')
            .eq('user_id', user.id)
            .gte('scheduled_for', startOfToday.toISOString())
            .lte('scheduled_for', endOfToday.toISOString()),
        ]);

      if (medResult.error) throw medResult.error;
      if (missedResult.error) throw missedResult.error;
      if (scheduleResult.error) throw scheduleResult.error;

      setPermissionGranted(permission);

      setLowSupply(
        (medResult.data ?? []).filter(
          (medication) =>
            medication.current_quantity !== null &&
            medication.refill_threshold !== null &&
            medication.current_quantity <= medication.refill_threshold
        )
      );

      setMissed(
        (missedResult.data ?? []).map((item) => ({
          ...item,
          medications: Array.isArray(item.medications)
            ? (item.medications[0] ?? null)
            : item.medications,
        }))
      );

      const doneScheduleIds = new Set((todayLogResult.data ?? []).map((log) => log.schedule_id));

      const now = new Date();

      const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      setUpcoming(
        (scheduleResult.data ?? [])
          .map((item) => ({
            ...item,
            medications: Array.isArray(item.medications)
              ? (item.medications[0] ?? null)
              : item.medications,
          }))
          .filter(
            (item) =>
              item.medications?.is_active &&
              !doneScheduleIds.has(item.id) &&
              item.dose_time.slice(0, 5) > nowTime
          )
          .sort((a, b) => a.dose_time.localeCompare(b.dose_time))
      );
    } catch (error) {
      console.error('Notifications loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load your notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const enableNotifications = async () => {
    const granted = await requestNotificationPermissions();

    if (granted) {
      setPermissionGranted(true);
    } else {
      Linking.openSettings().catch(() => {});
    }
  };

  const openMedication = (medicationId) => {
    navigation.navigate('MedicationDetails', { medicationId });
  };

  const isEmpty =
    permissionGranted && lowSupply.length === 0 && missed.length === 0 && upcoming.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Notifications"
        subtitle="Reminders and alerts"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
        >
          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />

              <Text style={styles.errorText}>{errorMessage}</Text>

              <Pressable onPress={load}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {!permissionGranted ? (
            <AlertCard
              icon="notifications-off-outline"
              tone="danger"
              title="Phone reminders are off"
              text="MedTrack can't remind you to take your medication until notifications are allowed. Tap to turn them on."
              onPress={enableNotifications}
            />
          ) : null}

          {missed.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Missed doses</Text>

              {missed.map((item) => (
                <AlertCard
                  key={item.id}
                  icon="alert-circle-outline"
                  tone="danger"
                  title={`${item.medications?.name ?? 'Medication'} was missed`}
                  text={formatWhen(item.scheduled_for)}
                  onPress={
                    item.medications?.id ? () => openMedication(item.medications.id) : undefined
                  }
                />
              ))}
            </>
          ) : null}

          {lowSupply.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Refill needed</Text>

              {lowSupply.map((medication) => (
                <AlertCard
                  key={medication.id}
                  icon="medkit-outline"
                  tone="warning"
                  title={`${medication.name} is running low`}
                  text={`${medication.current_quantity} doses remaining`}
                  onPress={() => openMedication(medication.id)}
                />
              ))}
            </>
          ) : null}

          {upcoming.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Coming up today</Text>

              {upcoming.map((item) => (
                <AlertCard
                  key={item.id}
                  icon="time-outline"
                  tone="primary"
                  title={item.medications?.name ?? 'Medication'}
                  text={`Reminder at ${formatTime(item.dose_time)}`}
                  onPress={() => openMedication(item.medication_id)}
                />
              ))}
            </>
          ) : null}

          {isEmpty ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="checkmark-done-outline" size={30} color={colors.secondary} />
              </View>

              <Text style={styles.emptyTitle}>You're all caught up</Text>

              <Text style={styles.emptyText}>
                No missed doses, refills or reminders waiting for you right now.
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />

            <Text style={styles.settingsText}>Reminder settings</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 48 },

  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  alertCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  alertContent: { flex: 1, marginHorizontal: 12 },

  alertTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },

  alertText: { marginTop: 3, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },

  emptyCard: {
    marginTop: 20,
    padding: 28,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: { marginTop: 14, color: colors.text, fontSize: 16, fontWeight: '800' },

  emptyText: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  settingsButton: {
    marginTop: 22,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  settingsText: { color: colors.primary, fontSize: 14, fontWeight: '800' },

  errorCard: {
    marginBottom: 14,
    padding: 13,
    borderRadius: 15,
    backgroundColor: '#FFF4F3',
    borderWidth: 1,
    borderColor: '#FFD7D3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorText: { flex: 1, marginHorizontal: 9, color: colors.textSecondary, fontSize: 12 },

  retryText: { color: colors.primary, fontSize: 12, fontWeight: '800' },

  pressed: { opacity: 0.75 },
});
