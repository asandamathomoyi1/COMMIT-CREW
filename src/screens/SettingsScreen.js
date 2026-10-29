import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import {
  getReminderDiagnostics,
  sendTestNotification,
  syncMedicationReminders,
} from '../services/notifications';
import { colors } from '../theme/colors';
import { usePreferences } from '../context/PreferencesContext';
import { LANGUAGES, WEEK_START_OPTIONS } from '../i18n/translations';

const defaultPreferences = {
  medication_reminders: true,
  missed_dose_alerts: true,
  refill_alerts: true,
  sound_enabled: true,
  vibration_enabled: true,
};

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  disabled = false,
  rightText,
}) {
  const hasSwitch = typeof value === 'boolean' && onValueChange;

  return (
    <Pressable
      disabled={disabled || Boolean(hasSwitch)}
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && !hasSwitch && styles.pressed]}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>

        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>

      {hasSwitch ? (
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
          trackColor={{
            false: '#D8E0EA',
            true: '#A9CBF8',
          }}
          thumbColor={value ? colors.primary : '#F7F9FC'}
          ios_backgroundColor="#D8E0EA"
        />
      ) : (
        <View style={styles.settingRight}>
          {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}

          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </View>
      )}
    </Pressable>
  );
}

function OptionPicker({ visible, title, options, selected, onSelect, onClose, cancelLabel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <Pressable style={pickerStyles.sheet} onPress={() => {}}>
          <Text style={pickerStyles.title}>{title}</Text>

          {options.map((option) => {
            const isSelected = option.value === selected;

            return (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                style={[pickerStyles.option, isSelected && pickerStyles.optionSelected]}
              >
                <Text
                  style={[pickerStyles.optionText, isSelected && pickerStyles.optionTextSelected]}
                >
                  {option.label}
                </Text>

                {isSelected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}

          <Pressable onPress={onClose} style={pickerStyles.cancel}>
            <Text style={pickerStyles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,27,58,0.45)',
    justifyContent: 'flex-end',
  },

  sheet: {
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
  },

  title: {
    marginBottom: 12,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  option: {
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionSelected: {
    backgroundColor: colors.primaryLight,
  },

  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  optionTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },

  cancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },

  cancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default function SettingsScreen({ navigation }) {
  const { t, language, languageName, setLanguage, weekStartsOn, setWeekStartsOn } =
    usePreferences();

  const [languageOpen, setLanguageOpen] = useState(false);

  const [weekOpen, setWeekOpen] = useState(false);

  const [preferences, setPreferences] = useState(defaultPreferences);

  const [loading, setLoading] = useState(true);

  const [savingKey, setSavingKey] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');

  const loadPreferences = useCallback(async () => {
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
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setPreferences(defaultPreferences);

        return;
      }

      setPreferences({
        medication_reminders: data.medication_reminders ?? true,

        missed_dose_alerts: data.missed_dose_alerts ?? true,

        refill_alerts: data.refill_alerts ?? true,

        sound_enabled: data.sound_enabled ?? true,

        vibration_enabled: data.vibration_enabled ?? true,
      });
    } catch (error) {
      console.error('Settings loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load your settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const [diagnostics, setDiagnostics] = useState(null);
  const [testing, setTesting] = useState(false);

  const refreshDiagnostics = useCallback(async () => {
    try {
      setDiagnostics(await getReminderDiagnostics());
    } catch (error) {
      console.log('Reminder diagnostics error:', error?.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDiagnostics();
    }, [refreshDiagnostics])
  );

  const sendTestReminder = async () => {
    try {
      setTesting(true);

      await sendTestNotification(5);

      Alert.alert(
        'Test reminder scheduled',
        'A test reminder will appear in about 5 seconds. You can lock your phone or leave the app to check that it rings.'
      );
    } catch (error) {
      Alert.alert('Reminders are not working yet', error?.message ?? 'Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const resyncReminders = async () => {
    try {
      setTesting(true);

      const result = await syncMedicationReminders();

      await refreshDiagnostics();

      const messages = {
        ok: `${result.scheduled} reminder(s) are scheduled on this phone.`,
        disabled: 'Dose reminders are switched off above.',
        'permission-denied':
          'Notification permission is off. Enable notifications for MedTrack in your phone settings.',
        unavailable: 'Notifications are not available on this device.',
        'signed-out': 'Please sign in first.',
      };

      Alert.alert('Reminders refreshed', messages[result.status] ?? 'Done.');
    } catch (error) {
      Alert.alert('Unable to refresh reminders', error?.message ?? 'Please try again.');
    } finally {
      setTesting(false);
    }
  };

  const updatePreference = async (key, value) => {
    const previousValue = preferences[key];

    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    try {
      setSavingKey(key);

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired.');
      }

      // Update the existing row; if the user has no row yet, create it.
      const { data: updatedRows, error } = await supabase
        .from('notification_preferences')
        .update({
          [key]: value,
        })
        .eq('user_id', user.id)
        .select('user_id');

      if (error) {
        throw error;
      }

      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabase.from('notification_preferences').insert({
          ...defaultPreferences,
          ...preferences,
          [key]: value,
          user_id: user.id,
        });

        if (insertError) {
          throw insertError;
        }
      }

      // Apply the change to the reminders that are scheduled on this phone.
      if (['medication_reminders', 'sound_enabled', 'vibration_enabled'].includes(key)) {
        await syncMedicationReminders();
        await refreshDiagnostics();
      }
    } catch (error) {
      setPreferences((current) => ({
        ...current,
        [key]: previousValue,
      }));

      console.error('Preference update error:', error);

      Alert.alert('Unable to save setting', error?.message ?? 'Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  const showComingSoon = (title) => {
    Alert.alert(title, `We will build the ${title} feature in the next stages of MedTrack.`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="settings-outline" size={30} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingText}>{t('settings.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('settings.title')}</Text>

            <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="options-outline" size={27} color={colors.primary} />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{t('settings.heroTitle')}</Text>

            <Text style={styles.heroText}>{t('settings.heroText')}</Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />

            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable
              onPress={() => {
                setLoading(true);
                loadPreferences();
              }}
            >
              <Text style={styles.retryText}>{t('settings.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{t('settings.remindersTitle')}</Text>

        <Text style={styles.sectionDescription}>{t('settings.remindersDesc')}</Text>

        <View style={styles.card}>
          <SettingRow
            icon="alarm-outline"
            title={t('settings.doseReminders')}
            subtitle={t('settings.doseRemindersSub')}
            value={preferences.medication_reminders}
            disabled={savingKey === 'medication_reminders'}
            onValueChange={(value) => updatePreference('medication_reminders', value)}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="alert-circle-outline"
            title={t('settings.missedAlerts')}
            subtitle={t('settings.missedAlertsSub')}
            value={preferences.missed_dose_alerts}
            disabled={savingKey === 'missed_dose_alerts'}
            onValueChange={(value) => updatePreference('missed_dose_alerts', value)}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="layers-outline"
            title={t('settings.refillAlerts')}
            subtitle={t('settings.refillAlertsSub')}
            value={preferences.refill_alerts}
            disabled={savingKey === 'refill_alerts'}
            onValueChange={(value) => updatePreference('refill_alerts', value)}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('settings.alertBehaviour')}</Text>

        <View style={styles.card}>
          <SettingRow
            icon="volume-high-outline"
            title={t('settings.sound')}
            subtitle={t('settings.soundSub')}
            value={preferences.sound_enabled}
            disabled={savingKey === 'sound_enabled'}
            onValueChange={(value) => updatePreference('sound_enabled', value)}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="phone-portrait-outline"
            title={t('settings.vibration')}
            subtitle={t('settings.vibrationSub')}
            value={preferences.vibration_enabled}
            disabled={savingKey === 'vibration_enabled'}
            onValueChange={(value) => updatePreference('vibration_enabled', value)}
          />
        </View>

        <View style={styles.notificationNotice}>
          <Ionicons name="information-circle-outline" size={21} color={colors.primary} />

          <Text style={styles.notificationNoticeText}>
            {diagnostics
              ? !diagnostics.available
                ? 'Reminders are not available on this device.'
                : !diagnostics.permission
                  ? 'Notification permission is OFF, so reminders cannot ring. Enable notifications for MedTrack in your phone settings.'
                  : `Reminders are active: ${diagnostics.scheduledCount} scheduled on this phone. If they arrive late on Android, set MedTrack to "Unrestricted" in battery settings and allow alarms & reminders.`
              : 'Checking reminder status...'}
          </Text>
        </View>

        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            title={t('settings.testReminder')}
            subtitle={t('settings.testReminderSub')}
            onPress={testing ? undefined : sendTestReminder}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="refresh-outline"
            title={t('settings.refreshReminders')}
            subtitle={t('settings.refreshRemindersSub')}
            onPress={testing ? undefined : resyncReminders}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('settings.appPrefs')}</Text>

        <View style={styles.card}>
          <SettingRow
            icon="moon-outline"
            title={t('settings.appearance')}
            subtitle={t('settings.appearanceSub')}
            rightText={t('settings.appearanceLight')}
            onPress={() => showComingSoon(t('settings.appearance'))}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="language-outline"
            title={t('settings.language')}
            subtitle={t('settings.languageSub')}
            rightText={languageName}
            onPress={() => setLanguageOpen(true)}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="calendar-outline"
            title={t('settings.weekStart')}
            subtitle={t('settings.weekStartSub')}
            rightText={t(`day.${weekStartsOn}`)}
            onPress={() => setWeekOpen(true)}
          />
        </View>

        <OptionPicker
          visible={languageOpen}
          title={t('settings.chooseLanguage')}
          options={LANGUAGES.map((item) => ({ value: item.code, label: item.name }))}
          selected={language}
          cancelLabel={t('common.cancel')}
          onClose={() => setLanguageOpen(false)}
          onSelect={(code) => {
            setLanguage(code);
            setLanguageOpen(false);
          }}
        />

        <OptionPicker
          visible={weekOpen}
          title={t('settings.chooseWeekStart')}
          options={WEEK_START_OPTIONS.map((day) => ({ value: day, label: t(`day.${day}`) }))}
          selected={weekStartsOn}
          cancelLabel={t('common.cancel')}
          onClose={() => setWeekOpen(false)}
          onSelect={(day) => {
            setWeekStartsOn(day);
            setWeekOpen(false);
          }}
        />

        <Text style={styles.sectionTitle}>{t('settings.privacySection')}</Text>

        <View style={styles.card}>
          <SettingRow
            icon="lock-closed-outline"
            title={t('settings.accountSecurity')}
            subtitle={t('settings.accountSecuritySub')}
            onPress={() => navigation.navigate('PrivacySecurity')}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="shield-checkmark-outline"
            title={t('settings.healthPrivacy')}
            subtitle={t('settings.healthPrivacySub')}
            onPress={() => navigation.navigate('PrivacySecurity')}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="people-outline"
            title={t('settings.caregiver')}
            subtitle={t('settings.caregiverSub')}
            onPress={() => navigation.navigate('Caregiver')}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('settings.aboutSection')}</Text>

        <View style={styles.card}>
          <SettingRow
            icon="help-circle-outline"
            title={t('settings.help')}
            subtitle={t('settings.helpSub')}
            onPress={() => navigation.navigate('HelpSupport')}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="information-circle-outline"
            title={t('settings.aboutApp')}
            subtitle={t('settings.aboutAppSub')}
            onPress={() =>
              Alert.alert(
                'MedTrack',
                'MedTrack helps you organise medication schedules, record doses and understand your medication routine.\n\nMedTrack does not replace professional medical advice.'
              )
            }
          />
        </View>

        <View style={styles.safetyCard}>
          <View style={styles.safetyIcon}>
            <Ionicons name="medical-outline" size={21} color={colors.secondary} />
          </View>

          <View style={styles.safetyContent}>
            <Text style={styles.safetyTitle}>{t('settings.safetyTitle')}</Text>

            <Text style={styles.safetyText}>{t('settings.safetyText')}</Text>
          </View>
        </View>

        <Text style={styles.versionText}>MedTrack</Text>
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

  heroCard: {
    marginTop: 23,
    padding: 17,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 51,
    height: 51,
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
    marginTop: 27,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  sectionDescription: {
    marginTop: 5,
    marginBottom: 11,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  card: {
    marginTop: 11,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  settingRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  settingTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  settingSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  rightText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginLeft: 54,
    backgroundColor: colors.border,
  },

  notificationNotice: {
    marginTop: 13,
    padding: 13,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  notificationNoticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  safetyCard: {
    marginTop: 26,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  safetyIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  safetyContent: {
    flex: 1,
    marginLeft: 11,
  },

  safetyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  safetyText: {
    marginTop: 4,
    color: colors.textSecondary,
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

  versionText: {
    marginTop: 24,
    color: colors.textLight,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.72,
  },
});