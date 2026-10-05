import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import MedicationsScreen from './screens/MedsScreen';
import AddMedicationScreen from './screens/AddMedication';
import NearbyPharmaciesScreen from './screens/NearbyPharmaciesScreen.jsx';
import ProfileScreen from './screens/ProfileScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import EditEmergencyInfoScreen from './screens/Editemergencyinfoscreen';
import CommunityScreen from './screens/CommunityScreen';
import CreatePostScreen from './screens/CreatePostScreen';

import { EmergencyInfoProvider } from './screens/Emergencyinfocontext';
import { MedicationsProvider } from './context/MedicationsContext';
import { CommunityProvider } from './context/CommunityContext';

const Stack = createNativeStackNavigator();

// Minimal placeholder so the Notifications route doesn't crash.
// Replace with a real screen when you build it.
function NotificationsScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F7FC',
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0B1220' }}>
        Notifications
      </Text>
      <Text style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
        Coming soon
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <MedicationsProvider>
      <EmergencyInfoProvider>
        <CommunityProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#ffffff' },
                }}
              >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignupScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Medications" component={MedicationsScreen} />
                <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
                <Stack.Screen name="Pharmacy" component={NearbyPharmaciesScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Emergency" component={EmergencyScreen} />
                <Stack.Screen
                  name="EditEmergencyInfo"
                  component={EditEmergencyInfoScreen}
                />

                <Stack.Screen
                  name="Community"
                  component={CommunityScreen}
                  options={{ headerShown: false }}
                />

                <Stack.Screen
                  name="CreatePost"
                  component={CreatePostScreen}
                  options={{ headerShown: false, presentation: 'modal' }}
                />

                <Stack.Screen
                  name="Notifications"
                  component={NotificationsScreen}
                  options={{ headerShown: false }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </CommunityProvider>
      </EmergencyInfoProvider>
    </MedicationsProvider>
  );
}