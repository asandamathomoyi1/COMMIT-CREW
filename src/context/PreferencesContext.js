// src/context/PreferencesContext.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LANGUAGES, WEEK_START_OPTIONS, translate } from '../i18n/translations';

const STORAGE_KEY = 'medtrack.preferences.v1';

const APPEARANCE_OPTIONS = ['light', 'dark', 'system'];

const DEFAULTS = {
  language: 'en',
  weekStartsOn: 'monday',
  appearance: 'light',
};

const PreferencesContext = createContext({
  ...DEFAULTS,
  locale: 'en-ZA',
  languageName: 'English',
  setLanguage: () => {},
  setWeekStartsOn: () => {},
  setAppearance: () => {},
  t: (key, params) => translate('en', key, params),
});

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULTS);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        if (saved && active) {
          const parsed = JSON.parse(saved);

          setPreferences({
            language: LANGUAGES.some((item) => item.code === parsed.language)
              ? parsed.language
              : DEFAULTS.language,

            weekStartsOn: WEEK_START_OPTIONS.includes(parsed.weekStartsOn)
              ? parsed.weekStartsOn
              : DEFAULTS.weekStartsOn,

            appearance: APPEARANCE_OPTIONS.includes(parsed.appearance)
              ? parsed.appearance
              : DEFAULTS.appearance,
          });
        }
      } catch (error) {
        console.warn('Could not load saved preferences:', error);
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((changes) => {
    setPreferences((current) => {
      const next = { ...current, ...changes };

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((error) => {
        console.warn('Could not save preferences:', error);
      });

      return next;
    });
  }, []);

  const value = useMemo(() => {
    const current = LANGUAGES.find((item) => item.code === preferences.language) ?? LANGUAGES[0];

    return {
      language: preferences.language,
      weekStartsOn: preferences.weekStartsOn,
      appearance: preferences.appearance,
      locale: current.locale,
      languageName: current.name,
      setLanguage: (language) => update({ language }),
      setWeekStartsOn: (weekStartsOn) => update({ weekStartsOn }),
      setAppearance: (appearance) => update({ appearance }),
      t: (key, params) => translate(preferences.language, key, params),
    };
  }, [preferences, update]);

  // Wait for the saved choice so the app never flashes English first.
  if (!loaded) {
    return null;
  }

  return React.createElement(PreferencesContext.Provider, { value }, children);
}

export function usePreferences() {
  return useContext(PreferencesContext);
}