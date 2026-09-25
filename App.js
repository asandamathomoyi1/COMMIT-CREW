
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import MedicationsScreen from './screens/MedsScreen';
import AddMedicationScreen from './screens/AddMedication';
import NearbyPharmaciesScreen from './screens/NearbyPharmaciesScreen';
import ProfileScreen from './screens/ProfileScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import EditEmergencyInfoScreen from './screens/Editemergencyinfoscreen';
import PharmacyDealsScreen from './screens/PharmacydealsScreen';

import { EmergencyInfoProvider } from './screens/Emergencyinfocontext';
import { MedicationsProvider } from './context/MedicationsContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <MedicationsProvider>
      <EmergencyInfoProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: '#ffffff',
                },
              }}
            >
              <Stack.Screen
                name="Splash"
                component={SplashScreen}
              />

              <Stack.Screen
                name="Login"
                component={LoginScreen}
              />

              <Stack.Screen
                name="SignUp"
                component={SignupScreen}
              />

              <Stack.Screen
                name="Home"
                component={HomeScreen}
              />

              <Stack.Screen
                name="Medications"
                component={MedicationsScreen}
              />

              <Stack.Screen
                name="AddMedication"
                component={AddMedicationScreen}
              />

              <Stack.Screen
                name="Pharmacy"
                component={NearbyPharmaciesScreen}
              />

              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
              />

              <Stack.Screen
                name="Emergency"
                component={EmergencyScreen}
              />

              <Stack.Screen
                name="EditEmergencyInfo"
                component={EditEmergencyInfoScreen}
              
              />
              
            <Stack.Screen
                name="PharmacyDeals"
                component={PharmacyDealsScreen}
              
              />
              
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </EmergencyInfoProvider>
    </MedicationsProvider>
  );
}

