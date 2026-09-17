import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import NearbyPharmaciesScreen from './screens/NearbyPharmaciesScreen';
import MedicationsScreen from './screens/MedsScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
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
          {/* Authentication */}
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

          {/* Main app */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
          />


          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
          />

          <Stack.Screen name="Pharmacy" component={NearbyPharmaciesScreen} />
            <Stack.Screen
            name="Medications"
            component={MedicationsScreen}
          />




        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}