import React, { useEffect, useState } from 'react';

import { registerRootComponent } from 'expo';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyAppearance } from './src/theme/colors';

const STORAGE_KEY = 'medtrack.preferences.v1';

// The look (light or dark) must be chosen BEFORE any screen is loaded,
// because screens read their colours the moment they load. So this small
// component reads the saved choice first, applies it, and only then loads
// the real app.
function Root() {
  const [LoadedApp, setLoadedApp] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      let setting = 'light';

      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        if (saved) {
          setting = JSON.parse(saved).appearance ?? 'light';
        }
      } catch (error) {
        console.warn('Could not read the saved appearance:', error);
      }

      applyAppearance(setting);

      // Loaded only now, after the colours are ready.
      const AppComponent = require('./App').default;

      if (active) {
        setLoadedApp(() => AppComponent);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!LoadedApp) {
    return null;
  }

  return React.createElement(LoadedApp);
}

registerRootComponent(Root);