import React, { useCallback, useState } from 'react';

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

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

function MenuItem({ icon, title, subtitle, onPress, danger = false, badge }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
    >
      <View style={[styles.menuIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      </View>

      <View style={styles.menuContent}>
        <View style={styles.menuTitleRow}>
          <Text style={[styles.menuTitle, danger && styles.dangerText]}>{title}</Text>

          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.menuSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const { isAdmin } = useAuth();
  const [profile, setProfile] = useState({
    full_name: null,
    email: null,
    avatar_url: null,
  });

  const [stats, setStats] = useState({
    activeMedications: 0,
    dosesTaken: 0,
    totalDoses: 0,
    adherence: 0,
  });

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const getParentNavigation = () => {
    return navigation.getParent?.();
  };

  const openParentScreen = (screenName) => {
    const parent = getParentNavigation();

    if (parent) {
      parent.navigate(screenName);
      return;
    }

    navigation.navigate(screenName);
  };

  const loadProfile = useCallback(async () => {
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

      const [profileResult, medicationResult, doseResult] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            `
              full_name,
              email,
              avatar_url
            `
          )
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('medications')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('user_id', user.id)
          .eq('is_active', true),

        supabase.from('dose_logs').select('status').eq('user_id', user.id),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (medicationResult.error) {
        throw medicationResult.error;
      }

      if (doseResult.error) {
        throw doseResult.error;
      }

      const doseLogs = doseResult.data ?? [];

      const totalDoses = doseLogs.length;

      const dosesTaken = doseLogs.filter((dose) => dose.status === 'taken').length;

      const adherence = totalDoses > 0 ? Math.round((dosesTaken / totalDoses) * 100) : 0;

      setProfile({
        full_name: profileResult.data?.full_name ?? user.user_metadata?.full_name ?? null,

        email: profileResult.data?.email ?? user.email ?? null,

        avatar_url: profileResult.data?.avatar_url ?? null,
      });

      setStats({
        activeMedications: medicationResult.count ?? 0,

        dosesTaken,

        totalDoses,

        adherence,
      });
    } catch (error) {
      console.error('Profile loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load your profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const refreshProfile = async () => {
    setRefreshing(true);
    await loadProfile();
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out of MedTrack?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);

            const { error } = await supabase.auth.signOut();

            if (error) {
              throw error;
            }
          } catch (error) {
            console.error('Logout error:', error);

            Alert.alert('Unable to log out', error?.message ?? 'Please try again.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const displayName = profile.full_name?.trim() || 'MedTrack User';

  const displayEmail = profile.email || 'No email available';

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase() || 'M';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="person-outline" size={30} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProfile}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.pageEyebrow}>MY ACCOUNT</Text>

            <Text style={styles.pageTitle}>Profile</Text>
          </View>

          <Pressable
            onPress={() => openParentScreen('Notifications')}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />

            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable onPress={loadProfile}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.onlineBadge}>
                <Ionicons name="checkmark" size={11} color={colors.white} />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>

              <Text style={styles.profileEmail} numberOfLines={1}>
                {displayEmail}
              </Text>

              <View style={styles.memberBadge}>
                <Ionicons name="shield-checkmark" size={13} color={colors.secondary} />

                <Text style={styles.memberBadgeText}>MedTrack account</Text>
              </View>
            </View>

            <Pressable
              onPress={() => openParentScreen('EditProfile')}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.activeMedications}</Text>

              <Text style={styles.statLabel}>Active meds</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.dosesTaken}</Text>

              <Text style={styles.statLabel}>Doses taken</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statNumber, styles.adherenceNumber]}>{stats.adherence}%</Text>

              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          </View>
        </View>

        <View style={styles.healthSummary}>
          <View style={styles.healthIcon}>
            <Ionicons name="heart-outline" size={22} color={colors.secondary} />
          </View>

          <View style={styles.healthContent}>
            <Text style={styles.healthTitle}>Your medication journey</Text>

            <Text style={styles.healthText}>
              {stats.totalDoses > 0
                ? `${stats.dosesTaken} of ${stats.totalDoses} recorded doses were taken.`
                : 'Start recording your doses to build your adherence history.'}
            </Text>
          </View>

          <Ionicons name="analytics-outline" size={23} color={colors.secondary} />
        </View>

        {isAdmin ? (
          <>
            <Text style={styles.sectionTitle}>Administration</Text>

            <View style={styles.menuCard}>
              <MenuItem
                icon="shield-checkmark-outline"
                title="Admin Console"
                subtitle="Manage users, moderate the community and monitor activity logs."
                onPress={() => openParentScreen('AdminDashboard')}
              />
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Health & Care</Text>

        <View style={styles.menuCard}>
          <MenuItem
            icon="people-outline"
            title="Caregiver & Family"
            subtitle="Manage trusted people who can support your medication routine."
            onPress={() => openParentScreen('Caregiver')}
          />

          <View style={styles.divider} />

          <MenuItem
            icon="call-outline"
            title="Emergency Contacts"
            subtitle="Add people you can contact quickly during an emergency."
            onPress={() => openParentScreen('Emergency')}
          />

          <View style={styles.divider} />

          <MenuItem
            icon="medical-outline"
            title="Find a Pharmacy"
            subtitle="Search pharmacies near you, with hours and directions."
            onPress={() => openParentScreen('Pharmacies')}
          />

          <View style={styles.divider} />

          <MenuItem
            icon="document-text-outline"
            title="Health Reports"
            subtitle="View and export your medication adherence reports."
            onPress={() => openParentScreen('Reports')}
          />
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.menuCard}>
          <MenuItem
            icon="notifications-outline"
            title="Medication Reminders"
            subtitle="Control reminder notifications, sounds and vibration."
            onPress={() => openParentScreen('Settings')}
          />

          <View style={styles.divider} />

          <MenuItem
            icon="lock-closed-outline"
            title="Privacy & Security"
            subtitle="Manage account security and your health-data preferences."
            onPress={() => openParentScreen('PrivacySecurity')}
          />

          <View style={styles.divider} />

          <MenuItem
            icon="settings-outline"
            title="App Settings"
            subtitle="Appearance, language and MedTrack preferences."
            onPress={() => openParentScreen('Settings')}
          />
        </View>

        <Text style={styles.sectionTitle}>Support</Text>

        <View style={styles.menuCard}>
          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help using MedTrack and find answers to common questions."
            onPress={() => openParentScreen('HelpSupport')}
          />

          <View style={styles.divider} />

          <MenuItem
            icon="information-circle-outline"
            title="About MedTrack"
            subtitle="Learn more about the app and its purpose."
            onPress={() => Alert.alert('MedTrack empowers students and busy professionals living with chronic conditions such as diabetes, asthma, epilepsy, and others to confidently manage their health. It ensures users stay on top of their medication schedules and provides quick access to nearby open pharmacies or clinics when supplies run low or urgent assistance is needed.')}
          />
        </View>

        <Pressable
          disabled={loggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && !loggingOut && styles.logoutPressed,
            loggingOut && styles.disabled,
          ]}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Ionicons name="log-out-outline" size={21} color={colors.danger} />
          )}

          <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Log Out'}</Text>
        </Pressable>

        <Text style={styles.versionText}>MedTrack • Medication & Health Companion</Text>

        <Text style={styles.disclaimerText}>
          MedTrack supports medication tracking and does not replace professional medical advice.
        </Text>
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
    paddingTop: 12,
    paddingBottom: 110,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  pageEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  pageTitle: {
    marginTop: 3,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
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

  profileCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
  },

  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarOuter: {
    position: 'relative',
  },

  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },

  onlineBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.primaryDark,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },

  profileName: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },

  profileEmail: {
    marginTop: 4,
    color: '#C8D8EE',
    fontSize: 13,
  },

  memberBadge: {
    marginTop: 9,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    height: 27,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  memberBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  editButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    marginTop: 19,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
  },

  adherenceNumber: {
    color: '#5EE5C7',
  },

  statLabel: {
    marginTop: 4,
    color: '#BFD0E7',
    fontSize: 12,
    fontWeight: '600',
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  healthSummary: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  healthIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  healthContent: {
    flex: 1,
    marginHorizontal: 11,
  },

  healthTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  healthText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  sectionTitle: {
    marginTop: 25,
    marginBottom: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  menuCard: {
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  menuItem: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerIcon: {
    backgroundColor: '#FFF0EF',
  },

  menuContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  dangerText: {
    color: colors.danger,
  },

  menuSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  badge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },

  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    marginLeft: 54,
    backgroundColor: colors.border,
  },

  logoutButton: {
    marginTop: 27,
    height: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#F7C7C3',
    backgroundColor: '#FFF8F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },

  logoutPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  versionText: {
    marginTop: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },

  disclaimerText: {
    marginTop: 6,
    paddingHorizontal: 25,
    color: colors.textLight,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
  },

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

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.55,
  },
});
