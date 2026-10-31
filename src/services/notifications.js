import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import { getUserFast } from './currentUser';


let Notifications = null;
let Device = null;

try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.log('expo-notifications could not be loaded:', error?.message);
}

try {
  Device = require('expo-device');
} catch (error) {
  Device = null;
}

export const REMINDER_TYPE = 'medication-reminder';
export const SNOOZE_TYPE = 'medication-snooze';
export const REMINDER_CATEGORY_ID = 'medication-reminder-actions';
export const ACTION_TAKEN = 'DOSE_TAKEN';
export const ACTION_SNOOZE = 'DOSE_SNOOZE';

const SNOOZE_MINUTES = 10;
const PREFS_CACHE_KEY = 'medtrack:notification-preferences';

const DEFAULT_PREFERENCES = {
  medication_reminders: true,
  missed_dose_alerts: true,
  refill_alerts: true,
  sound_enabled: true,
  vibration_enabled: true,
};

export function isNotificationsAvailable() {
  return Boolean(Notifications);
}

/*
|--------------------------------------------------------------------------
| CHANNELS (Android)
|--------------------------------------------------------------------------
| Android locks sound/vibration once a channel exists, so one channel is
| created for every sound/vibration combination and the right one is chosen
| per reminder.
|--------------------------------------------------------------------------
*/

export function getChannelId(preferences = DEFAULT_PREFERENCES) {
  const sound = preferences.sound_enabled !== false ? 'sound' : 'silent';
  const vibration = preferences.vibration_enabled !== false ? 'vibrate' : 'still';

  return `medtrack-reminders-${sound}-${vibration}`;
}

export async function configureNotificationChannels() {
  if (!Notifications || Platform.OS !== 'android') {
    return;
  }

  const combos = [
    { sound: true, vibration: true },
    { sound: true, vibration: false },
    { sound: false, vibration: true },
    { sound: false, vibration: false },
  ];

  // Remove the channels created when the app used its old name.
  for (const sound of ['sound', 'silent']) {
    for (const vibration of ['vibrate', 'still']) {
      try {
        await Notifications.deleteNotificationChannelAsync(`dosewise-reminders-${sound}-${vibration}`);
      } catch (error) {
        // Nothing to remove on a fresh install.
      }
    }
  }

  for (const combo of combos) {
    await Notifications.setNotificationChannelAsync(
      getChannelId({ sound_enabled: combo.sound, vibration_enabled: combo.vibration }),
      {
        name: `Medication Reminders (${combo.sound ? 'sound' : 'silent'}${
          combo.vibration ? ', vibration' : ''
        })`,
        description: 'Reminders for your scheduled medications.',
        importance: Notifications.AndroidImportance.MAX,
        sound: combo.sound ? 'default' : null,
        enableVibrate: combo.vibration,
        vibrationPattern: combo.vibration ? [0, 500, 250, 500, 250, 500] : [0],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        enableLights: true,
        lightColor: '#0866E8',
      }
    );
  }
}

async function configureCategories() {
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
      {
        identifier: ACTION_TAKEN,
        buttonTitle: 'Taken',
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: `Snooze ${SNOOZE_MINUTES} min`,
        options: { opensAppToForeground: true },
      },
    ]);
  } catch (error) {
    console.log('Notification categories unavailable:', error?.message);
  }
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/*
|--------------------------------------------------------------------------
| PERMISSIONS
|--------------------------------------------------------------------------
*/

export async function hasNotificationPermission() {
  if (!Notifications) {
    return false;
  }

  try {
    const permissions = await Notifications.getPermissionsAsync();
    return permissions.status === 'granted';
  } catch (error) {
    console.error('Notification permission check error:', error);
    return false;
  }
}

export async function requestNotificationPermissions() {
  if (!Notifications) {
    return false;
  }

  try {
    await configureNotificationChannels();

    const current = await Notifications.getPermissionsAsync();

    if (current.status === 'granted') {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync();

    return requested.status === 'granted';
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| PREFERENCES
|--------------------------------------------------------------------------
*/

export async function loadNotificationPreferences() {
  try {
    const { data: userData } = await getUserFast();
    const user = userData?.user;

    if (user) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const prefs = {
          medication_reminders: data.medication_reminders ?? true,
          missed_dose_alerts: data.missed_dose_alerts ?? true,
          refill_alerts: data.refill_alerts ?? true,
          sound_enabled: data.sound_enabled ?? true,
          vibration_enabled: data.vibration_enabled ?? true,
        };

        await AsyncStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(prefs));

        return prefs;
      }
    }
  } catch (error) {
    console.log('Could not load notification preferences from server:', error?.message);
  }

  try {
    const cached = await AsyncStorage.getItem(PREFS_CACHE_KEY);

    if (cached) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(cached) };
    }
  } catch (error) {
    // ignore
  }

  return { ...DEFAULT_PREFERENCES };
}

/*
|--------------------------------------------------------------------------
| TIME HELPERS
|--------------------------------------------------------------------------
*/

function parseMedicationTime(time) {
  const parts = String(time ?? '')
    .trim()
    .split(':');

  if (parts.length < 2) {
    throw new Error(`Invalid medication time: ${time}`);
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`Invalid medication time: ${time}`);
  }

  return { hour, minute };
}

function localDateString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function buildReminderBody(medicationName, dosage) {
  if (dosage && String(dosage).trim().length > 0) {
    return `It's time to take ${medicationName} — ${dosage}.`;
  }

  return `It's time to take ${medicationName}.`;
}

/*
|--------------------------------------------------------------------------
| SCHEDULE
|--------------------------------------------------------------------------
*/

export async function scheduleMedicationReminder(params, preferences) {
  if (!Notifications) {
    throw new Error('Notifications are not available on this device.');
  }

  const { medicationId, medicationName, dosage, scheduleId, time } = params;

  if (!medicationId) {
    throw new Error('Medication ID is required.');
  }

  if (!medicationName || medicationName.trim().length === 0) {
    throw new Error('Medication name is required.');
  }

  const granted = await requestNotificationPermissions();

  if (!granted) {
    throw new Error('Notification permission was not granted.');
  }

  const prefs = preferences ?? (await loadNotificationPreferences());
  const { hour, minute } = parseMedicationTime(time);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medication Reminder',
      body: buildReminderBody(medicationName, dosage),
      sound: prefs.sound_enabled !== false ? 'default' : false,
      priority: Notifications.AndroidNotificationPriority?.MAX,
      categoryIdentifier: REMINDER_CATEGORY_ID,
      data: {
        type: REMINDER_TYPE,
        medicationId,
        medicationName,
        dosage: dosage ?? null,
        scheduleId: scheduleId ?? null,
        time,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? getChannelId(prefs) : undefined,
    },
  });
}

export async function scheduleMedicationReminders(reminders) {
  if (!Notifications) {
    throw new Error('Notifications are not available on this device.');
  }

  const prefs = await loadNotificationPreferences();

  // Respect the "Medication reminders" switch in Settings.
  if (!prefs.medication_reminders) {
    return [];
  }

  const scheduledIds = [];

  try {
    for (const reminder of reminders) {
      scheduledIds.push(await scheduleMedicationReminder(reminder, prefs));
    }

    return scheduledIds;
  } catch (error) {
    await cancelNotifications(scheduledIds);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| CANCEL
|--------------------------------------------------------------------------
*/

export async function cancelNotification(notificationId) {
  if (!Notifications || !notificationId) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelNotifications(notificationIds) {
  if (!Notifications) {
    return;
  }

  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.error(`Unable to cancel notification ${id}:`, error);
    }
  }
}

async function cancelWhere(predicate) {
  if (!Notifications) {
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduled) {
    const data = notification.content?.data;

    if (predicate(data)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      } catch (error) {
        console.error(`Unable to cancel reminder ${notification.identifier}:`, error);
      }
    }
  }
}

export async function cancelMedicationReminders(medicationId) {
  if (!medicationId) {
    return;
  }

  await cancelWhere(
    (data) =>
      (data?.type === REMINDER_TYPE || data?.type === SNOOZE_TYPE) &&
      data?.medicationId === medicationId
  );
}

export async function cancelAllMedicationReminders() {
  await cancelWhere((data) => data?.type === REMINDER_TYPE || data?.type === SNOOZE_TYPE);
}

export async function getScheduledMedicationReminders() {
  if (!Notifications) {
    return [];
  }

  const notifications = await Notifications.getAllScheduledNotificationsAsync();

  return notifications.filter((notification) => notification.content?.data?.type === REMINDER_TYPE);
}

export async function rescheduleMedicationReminders(medicationId, reminders) {
  await cancelMedicationReminders(medicationId);

  if (!reminders || reminders.length === 0) {
    return [];
  }

  return scheduleMedicationReminders(reminders);
}

/*
|--------------------------------------------------------------------------
| SYNC FROM DATABASE  (the part that makes reminders reliable)
|--------------------------------------------------------------------------
*/

export async function syncMedicationReminders() {
  if (!Notifications) {
    return { scheduled: 0, status: 'unavailable' };
  }

  const { data: userData } = await getUserFast();
  const user = userData?.user;

  if (!user) {
    await cancelAllMedicationReminders();
    return { scheduled: 0, status: 'signed-out' };
  }

  const prefs = await loadNotificationPreferences();

  await configureNotificationChannels();
  await configureCategories();

  if (!prefs.medication_reminders) {
    await cancelAllMedicationReminders();
    return { scheduled: 0, status: 'disabled' };
  }

  const granted = await requestNotificationPermissions();

  if (!granted) {
    return { scheduled: 0, status: 'permission-denied' };
  }

  const { data, error } = await supabase
    .from('medication_schedules')
    .select(
      `
        id,
        medication_id,
        dose_time,
        is_active,
        medications (
          id,
          name,
          dosage,
          is_active,
          start_date,
          end_date
        )
      `
    )
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  const today = localDateString();

  const reminders = [];

  for (const row of data ?? []) {
    const medication = Array.isArray(row.medications) ? row.medications[0] : row.medications;

    if (!medication || !medication.is_active) {
      continue;
    }

    if (medication.end_date && today > medication.end_date) {
      continue;
    }

    // Medications that have not started yet are picked up by the next sync.
    if (medication.start_date && today < medication.start_date) {
      continue;
    }

    reminders.push({
      medicationId: medication.id,
      medicationName: medication.name,
      dosage: medication.dosage,
      scheduleId: row.id,
      time: row.dose_time,
    });
  }

  await cancelAllMedicationReminders();

  let scheduled = 0;

  for (const reminder of reminders) {
    try {
      await scheduleMedicationReminder(reminder, prefs);
      scheduled += 1;
    } catch (scheduleError) {
      console.error('Unable to schedule reminder:', scheduleError);
    }
  }

  return { scheduled, status: 'ok' };
}

/*
|--------------------------------------------------------------------------
| TEST + DIAGNOSTICS
|--------------------------------------------------------------------------
*/

export async function sendTestNotification(seconds = 5) {
  if (!Notifications) {
    throw new Error('Notifications are not available on this device.');
  }

  const granted = await requestNotificationPermissions();

  if (!granted) {
    throw new Error(
      'Notification permission was not granted. Enable notifications for MedTrack in your phone settings.'
    );
  }

  const prefs = await loadNotificationPreferences();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'MedTrack test reminder',
      body: 'Reminders are working. MedTrack will alert you when it is time for your medication.',
      sound: prefs.sound_enabled !== false ? 'default' : false,
      categoryIdentifier: REMINDER_CATEGORY_ID,
      data: { type: 'medtrack-test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: Platform.OS === 'android' ? getChannelId(prefs) : undefined,
    },
  });
}

export async function getReminderDiagnostics() {
  const available = isNotificationsAvailable();

  if (!available) {
    return { available: false, permission: false, scheduledCount: 0, isDevice: false };
  }

  const permission = await hasNotificationPermission();
  const scheduled = await getScheduledMedicationReminders();

  return {
    available: true,
    permission,
    scheduledCount: scheduled.length,
    isDevice: Device?.isDevice ?? true,
  };
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION TAP / ACTION HANDLING
|--------------------------------------------------------------------------
*/

async function snoozeReminder(data) {
  const prefs = await loadNotificationPreferences();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medication Reminder (snoozed)',
      body: buildReminderBody(data.medicationName, data.dosage),
      sound: prefs.sound_enabled !== false ? 'default' : false,
      categoryIdentifier: REMINDER_CATEGORY_ID,
      data: { ...data, type: SNOOZE_TYPE },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_MINUTES * 60,
      repeats: false,
      channelId: Platform.OS === 'android' ? getChannelId(prefs) : undefined,
    },
  });
}

async function recordTakenFromReminder(data) {
  const { data: userData } = await getUserFast();
  const user = userData?.user;

  if (!user || !data.medicationId) {
    return false;
  }

  const { hour, minute } = parseMedicationTime(data.time);

  const scheduledFor = new Date();
  scheduledFor.setHours(hour, minute, 0, 0);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let existing = supabase
    .from('dose_logs')
    .select('id')
    .eq('user_id', user.id)
    .gte('scheduled_for', start.toISOString())
    .lte('scheduled_for', end.toISOString())
    .limit(1);

  if (data.scheduleId) {
    existing = existing.eq('schedule_id', data.scheduleId);
  } else {
    existing = existing.eq('medication_id', data.medicationId);
  }

  const { data: existingRows } = await existing;

  if (existingRows && existingRows.length > 0) {
    return false;
  }

  const { error } = await supabase.from('dose_logs').insert({
    user_id: user.id,
    medication_id: data.medicationId,
    schedule_id: data.scheduleId ?? null,
    scheduled_for: scheduledFor.toISOString(),
    status: 'taken',
    taken_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }

  const { data: medication } = await supabase
    .from('medications')
    .select('current_quantity')
    .eq('id', data.medicationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (medication && medication.current_quantity !== null && medication.current_quantity > 0) {
    await supabase
      .from('medications')
      .update({
        current_quantity: medication.current_quantity - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.medicationId)
      .eq('user_id', user.id);
  }

  return true;
}

/**
 * Handles a tap on a reminder (or one of its action buttons).
 * `onOpenMedication(medicationId)` lets the caller navigate.
 */
export async function handleReminderResponse(response, onOpenMedication) {
  const data = response?.notification?.request?.content?.data;

  if (!data || (data.type !== REMINDER_TYPE && data.type !== SNOOZE_TYPE)) {
    return;
  }

  try {
    if (response.actionIdentifier === ACTION_SNOOZE) {
      await snoozeReminder(data);
      return;
    }

    if (response.actionIdentifier === ACTION_TAKEN) {
      await recordTakenFromReminder(data);
    }
  } catch (error) {
    console.error('Reminder action error:', error);
  }

  if (onOpenMedication && data.medicationId) {
    onOpenMedication(data.medicationId);
  }
}

/**
 * Subscribes to reminder taps. Also processes the tap that cold-started the app.
 * Returns an unsubscribe function.
 */
export function subscribeToReminderResponses(onOpenMedication) {
  if (!Notifications) {
    return () => {};
  }

  const handled = new Set();

  const handle = (response) => {
    const id = `${response?.notification?.request?.identifier}:${response?.actionIdentifier}`;

    if (handled.has(id)) {
      return;
    }

    handled.add(id);
    handleReminderResponse(response, onOpenMedication);
  };

  Notifications.getLastNotificationResponseAsync?.()
    .then((response) => {
      if (response) {
        handle(response);
      }
    })
    .catch(() => {});

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);

  return () => subscription.remove();
}

/*
|--------------------------------------------------------------------------
| INIT
|--------------------------------------------------------------------------
*/

export async function initializeNotifications() {
  if (!Notifications) {
    return;
  }

  try {
    await configureNotificationChannels();
    await configureCategories();

    if (Device && Device.isDevice === false) {
      console.log('MedTrack notifications: running on a simulator/emulator.');
    }
  } catch (error) {
    console.error('Notification initialization error:', error);
  }
}
