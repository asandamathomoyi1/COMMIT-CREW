import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { theme } from './src/theme/colors';

import { initializeNotifications } from './src/services/notifications';

export default function App() {
  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <AuthProvider>
          <StatusBar style={theme.statusBarStyle} />
          <AppNavigator />
        </AuthProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}