import React, { useEffect } from 'react';

import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from './MainTabs';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import AddMedicationScreen from '../screens/AddMedicationScreen';
import MedicationDetailsScreen from '../screens/MedicationDetailsScreen';
import EditMedicationScreen from '../screens/EditMedicationScreen';

import SettingsScreen from '../screens/SettingsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import PrescriptionScannerScreen from '../screens/PrescriptionScannerScreen';
import PharmaciesScreen from '../screens/PharmaciesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';

import CaregiverScreen from '../screens/CaregiverScreen';
import CaregiverPatientScreen from '../screens/CaregiverPatientScreen';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminModerationScreen from '../screens/admin/AdminModerationScreen';
import AdminLogsScreen from '../screens/admin/AdminLogsScreen';

import { useAuth } from '../context/AuthContext';
import { syncMedicationReminders, subscribeToReminderResponses } from '../services/notifications';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

export default function AppNavigator() {
  const { session, loading, isAdmin } = useAuth();

  const userId = session?.user?.id;

  // Rebuild every medication reminder from the database whenever a user signs in,
  // so reminders survive reinstalls, new phones and cleared app data.
  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    syncMedicationReminders().catch((error) => {
      console.log('Reminder sync error:', error?.message);
    });

    const openMedication = (medicationId, attempt = 0) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('MedicationDetails', { medicationId });
        return;
      }

      // Cold start from a notification tap: wait for the navigator to mount.
      if (attempt < 10) {
        setTimeout(() => openMedication(medicationId, attempt + 1), 400);
      }
    };

    const unsubscribe = subscribeToReminderResponses((medicationId) => openMedication(medicationId));

    return unsubscribe;
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,

          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />

            <Stack.Screen
              name="AddMedication"
              component={AddMedicationScreen}
              options={{
                animation: 'slide_from_bottom',
              }}
            />

            <Stack.Screen
              name="MedicationDetails"
              component={MedicationDetailsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="EditMedication"
              component={EditMedicationScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="Emergency"
              component={EmergencyScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="Caregiver"
              component={CaregiverScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="CaregiverPatient"
              component={CaregiverPatientScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="AIAssistant"
              component={AIAssistantScreen}
              options={{
                animation: 'slide_from_bottom',
              }}
            />

            <Stack.Screen
              name="PrescriptionScanner"
              component={PrescriptionScannerScreen}
              options={{
                animation: 'slide_from_bottom',
              }}
            />

            <Stack.Screen
              name="Pharmacies"
              component={PharmaciesScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="PrivacySecurity"
              component={PrivacySecurityScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen
              name="HelpSupport"
              component={HelpSupportScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />

            {isAdmin ? (
              <>
                <Stack.Screen
                  name="AdminDashboard"
                  component={AdminDashboardScreen}
                  options={{ animation: 'slide_from_right' }}
                />

                <Stack.Screen
                  name="AdminUsers"
                  component={AdminUsersScreen}
                  options={{ animation: 'slide_from_right' }}
                />

                <Stack.Screen
                  name="AdminModeration"
                  component={AdminModerationScreen}
                  options={{ animation: 'slide_from_right' }}
                />

                <Stack.Screen
                  name="AdminLogs"
                  component={AdminLogsScreen}
                  options={{ animation: 'slide_from_right' }}
                />
              </>
            ) : null}
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />

            <Stack.Screen name="Signup" component={SignupScreen} />

            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
