// src/theme/colors.js
import { Appearance, DevSettings, StyleSheet } from 'react-native';

import { darkColors, lightColors, translateColor, translateStyles } from './darkColors';

// The palette every screen reads from. It starts as the light palette and
// applyAppearance() switches it to dark BEFORE any screen is loaded, so every
// screen picks up the right colours.
export const colors = { ...lightColors };

// Describes the look that is active right now.
export const theme = {
  hookActive: true, // false only if dark mode could not hook into StyleSheet
  setting: 'light', // what the user chose: 'light' | 'dark' | 'system'
  mode: 'light', // what is actually showing: 'light' | 'dark'
  isDark: false,
  barStyle: 'dark-content', // for React Native's <StatusBar barStyle>
  statusBarStyle: 'dark', // for expo-status-bar's <StatusBar style>
};

let styleTranslationInstalled = false;

// In dark mode, every StyleSheet.create call in the app passes through the
// colour translator, so hard-coded light colours become dark ones.
function installStyleTranslation() {
  if (styleTranslationInstalled) {
    return;
  }

  const originalCreate = StyleSheet.create;

  const translatedCreate = (styles) => originalCreate(translateStyles(styles));

  try {
    StyleSheet.create = translatedCreate;

    styleTranslationInstalled = true;
  } catch (error) {
    try {
      Object.defineProperty(StyleSheet, 'create', {
        value: translatedCreate,
        configurable: true,
        writable: true,
      });

      styleTranslationInstalled = true;
    } catch (secondError) {
      console.warn('Dark mode could not hook into StyleSheet:', secondError);
    }
  }
}

// Creates a style with a white background and checks it came out dark.
function styleTranslationWorks() {
  const probe = StyleSheet.create({ probe: { backgroundColor: '#FFFFFF' } });

  return probe.probe.backgroundColor === darkColors.surface;
}

export function resolveMode(setting) {
  if (setting === 'dark') {
    return 'dark';
  }

  if (setting === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }

  return 'light';
}

// Call once, at start-up, before the screens are loaded.
export function applyAppearance(setting = 'light') {
  const mode = resolveMode(setting);

  const isDark = mode === 'dark';

  theme.setting = setting;
  theme.mode = mode;
  theme.isDark = isDark;
  theme.barStyle = isDark ? 'light-content' : 'dark-content';
  theme.statusBarStyle = isDark ? 'light' : 'dark';

  Object.assign(colors, isDark ? darkColors : lightColors);

  theme.hookActive = true;

  if (isDark) {
    installStyleTranslation();

    theme.hookActive = styleTranslationWorks();

    if (theme.hookActive) {
      console.log('MedTrack dark mode: active');
    } else {
      console.warn(
        'MedTrack dark mode: the style hook is NOT active, so cards will stay white. Please report this.'
      );
    }
  }

  return mode;
}

// For a colour typed directly into a component instead of a style sheet.
export function themeColor(value, property = 'backgroundColor') {
  return theme.isDark ? translateColor(property, value) : value;
}

// The look is decided when the app starts, so changing it needs a reload.
// A reload is only possible while developing (Expo Go); a finished app
// asks the user to reopen it instead.
export const canReloadApp = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export function reloadApp() {
  if (!canReloadApp) {
    return;
  }

  try {
    DevSettings.reload();
  } catch (error) {
    console.warn('Could not reload the app:', error);
  }
}
