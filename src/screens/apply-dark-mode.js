// apply-dark-mode.js
//
// Run ONCE from the project folder that contains package.json:
//
//     node apply-dark-mode.js
//
// It makes the small edits that dark mode needs across your screens and
// prints exactly what it changed. Safe to run twice: it skips anything that
// is already done. Commit your work in git first so you can review the
// changes with `git diff`.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcDir = path.join(root, 'src');

if (!fs.existsSync(path.join(root, 'package.json')) || !fs.existsSync(srcDir)) {
  console.error('Run this from the folder that contains package.json and src/.');
  process.exit(1);
}

const report = [];
const problems = [];

// ---------- file helpers (keep Windows CRLF line endings intact) ----------

function readFile(file) {
  const raw = fs.readFileSync(file, 'utf8');

  const crlf = raw.includes('\r\n');

  return { text: crlf ? raw.replace(/\r\n/g, '\n') : raw, crlf };
}

function writeFile(file, text, crlf) {
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8');
}

function listJsFiles(dir) {
  let results = [];

  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'theme' && entry.name !== 'i18n') {
        results = results.concat(listJsFiles(full));
      }
    } else if (entry.name.endsWith('.js')) {
      results.push(full);
    }
  });

  return results;
}

const rel = (file) => path.relative(root, file).replace(/\\/g, '/');

// Adds names to the existing `import { ... } from '.../theme/colors'` line,
// or adds a new import line if the file has none.
function ensureColorImports(text, file, names) {
  const pattern = /import\s*\{([^}]*)\}\s*from\s*'((?:\.\.?\/)+theme\/colors)'\s*;/;

  const match = text.match(pattern);

  if (match) {
    const existing = match[1]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const merged = [...existing];

    names.forEach((name) => {
      if (!merged.includes(name)) {
        merged.push(name);
      }
    });

    if (merged.length === existing.length) {
      return text;
    }

    return text.replace(pattern, `import { ${merged.join(', ')} } from '${match[2]}';`);
  }

  let importPath = path
    .relative(path.dirname(file), path.join(srcDir, 'theme', 'colors'))
    .replace(/\\/g, '/');

  if (!importPath.startsWith('.')) {
    importPath = `./${importPath}`;
  }

  const lines = text.split('\n');

  let lastImport = -1;

  lines.forEach((line, index) => {
    if (/^import\s/.test(line) || /^\}\s*from\s/.test(line)) {
      lastImport = index;
    }
  });

  lines.splice(lastImport + 1, 0, `import { ${names.join(', ')} } from '${importPath}';`);

  return lines.join('\n');
}

// ---------- 1. colours typed directly into screens ----------

function lightness(hex) {
  let value = hex.slice(1);

  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const channels = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16) / 255);

  return (Math.max(...channels) + Math.min(...channels)) / 2;
}

const BACKGROUND_KEYS = ['background', 'bg', 'backgroundColor'];
const BORDER_KEYS = ['border', 'borderColor'];
const TEXT_KEYS = ['fg', 'color'];

function propertyFor(key) {
  if (BACKGROUND_KEYS.includes(key)) return 'backgroundColor';
  if (BORDER_KEYS.includes(key)) return 'borderColor';
  return 'color';
}

function needsTranslation(key, hex) {
  const value = lightness(hex);

  if (TEXT_KEYS.includes(key)) {
    return value <= 0.38;
  }

  if (BORDER_KEYS.includes(key)) {
    return value >= 0.75;
  }

  return value >= 0.75;
}

function patchInlineColours(file) {
  const { text, crlf } = readFile(file);

  const lines = text.split('\n');

  const firstStyleBlock = lines.findIndex((line) => line.includes('StyleSheet.create('));

  const inlineEnd = firstStyleBlock === -1 ? lines.length : firstStyleBlock;

  let changes = 0;

  const pattern = /\b(background|bg|backgroundColor|border|borderColor|fg|color)(\s*:\s*)'(#[0-9A-Fa-f]{3,8})'/g;

  for (let index = 0; index < inlineEnd; index += 1) {
    if (lines[index].includes('themeColor(')) {
      continue;
    }

    lines[index] = lines[index].replace(pattern, (whole, key, separator, hex) => {
      if (!needsTranslation(key, hex)) {
        return whole;
      }

      changes += 1;

      return `${key}${separator}themeColor('${hex}', '${propertyFor(key)}')`;
    });

    // `bg: colors.white` (used for buttons in the admin screens)
    lines[index] = lines[index].replace(/\b(bg)(\s*:\s*)colors\.white\b/g, (whole, key, separator) => {
      changes += 1;

      return `${key}${separator}themeColor(colors.white, 'backgroundColor')`;
    });

    // Status bar text colour follows the look
    lines[index] = lines[index].replace(/barStyle="dark-content"/g, () => {
      changes += 1;

      return 'barStyle={theme.barStyle}';
    });
  }

  if (!changes) {
    return;
  }

  let next = lines.join('\n');

  const names = [];

  if (next.includes('themeColor(')) names.push('themeColor');
  if (next.includes('theme.barStyle')) names.push('theme');

  next = ensureColorImports(next, file, names);

  writeFile(file, next, crlf);

  report.push(`${rel(file)}: ${changes} colour edit(s)`);
}

// ---------- generic exact-text patch with a clear failure message ----------

function patchExact(file, label, edits) {
  if (!fs.existsSync(file)) {
    problems.push(`${label}: file not found (${rel(file)})`);

    return;
  }

  const { text, crlf } = readFile(file);

  let next = text;

  let applied = 0;

  let alreadyDone = 0;

  for (const edit of edits) {
    if (edit.skipIfPresent && next.includes(edit.skipIfPresent)) {
      alreadyDone += 1;

      continue;
    }

    const count = next.split(edit.find).length - 1;

    if (count !== 1) {
      problems.push(
        `${label}: could not find "${edit.find.split('\n')[0].trim()}" exactly once (found ${count}).`
      );

      continue;
    }

    next = next.replace(edit.find, () => edit.replace);

    applied += 1;
  }

  if (applied) {
    writeFile(file, next, crlf);

    report.push(`${label}: ${applied} edit(s) applied`);
  } else if (alreadyDone) {
    report.push(`${label}: already done`);
  }
}

// ---------- 2. Settings screen: add the Appearance row and picker ----------

const settingsFile = path.join(srcDir, 'screens', 'SettingsScreen.js');

patchExact(settingsFile, 'SettingsScreen.js', [
  {
    skipIfPresent: 'appearanceOpen',
    find: "import { colors } from '../theme/colors';",
    replace: "import { colors, themeColor, reloadApp, canReloadApp } from '../theme/colors';",
  },
  {
    skipIfPresent: 'appearanceOpen',
    find: `  const { t, language, languageName, setLanguage, weekStartsOn, setWeekStartsOn } =
    usePreferences();
`,
    replace: `  const {
    t,
    language,
    languageName,
    setLanguage,
    weekStartsOn,
    setWeekStartsOn,
    appearance,
    setAppearance,
  } = usePreferences();
`,
  },
  {
    skipIfPresent: 'appearanceOpen',
    find: `  const [languageOpen, setLanguageOpen] = useState(false);
`,
    replace: `  const [languageOpen, setLanguageOpen] = useState(false);

  const [appearanceOpen, setAppearanceOpen] = useState(false);
`,
  },
  {
    skipIfPresent: "icon=\"moon-outline\"",
    find: `        <View style={styles.card}>
          <SettingRow
            icon="language-outline"`,
    replace: `        <View style={styles.card}>
          <SettingRow
            icon="moon-outline"
            title={t('settings.appearance')}
            subtitle={t('settings.appearanceSub')}
            rightText={
              {
                light: t('settings.appearanceLight'),
                dark: t('settings.appearanceDark'),
                system: t('settings.appearanceSystem'),
              }[appearance]
            }
            onPress={() => setAppearanceOpen(true)}
          />

          <View style={styles.divider} />

          <SettingRow
            icon="language-outline"`,
  },
  {
    skipIfPresent: 'visible={appearanceOpen}',
    find: `        <OptionPicker
          visible={languageOpen}`,
    replace: `        <OptionPicker
          visible={appearanceOpen}
          title={t('settings.chooseAppearance')}
          options={[
            { value: 'light', label: t('settings.appearanceLight') },
            { value: 'dark', label: t('settings.appearanceDark') },
            { value: 'system', label: t('settings.appearanceSystem') },
          ]}
          selected={appearance}
          cancelLabel={t('common.cancel')}
          onClose={() => setAppearanceOpen(false)}
          onSelect={(mode) => {
            setAppearanceOpen(false);

            if (mode === appearance) {
              return;
            }

            setAppearance(mode);

            Alert.alert(
              t('settings.appearanceReloadTitle'),
              canReloadApp ? t('settings.appearanceReloading') : t('settings.appearanceRestart'),
              [{ text: t('common.ok'), onPress: () => reloadApp() }]
            );
          }}
        />

        <OptionPicker
          visible={languageOpen}`,
  },
  {
    skipIfPresent: "themeColor('#D8E0EA'",
    find: "            false: '#D8E0EA',",
    replace: "            false: themeColor('#D8E0EA', 'backgroundColor'),",
  },
  {
    skipIfPresent: 'ios_backgroundColor={themeColor',
    find: 'ios_backgroundColor="#D8E0EA"',
    replace: "ios_backgroundColor={themeColor('#D8E0EA', 'backgroundColor')}",
  },
]);

// ---------- 3. Navigation: dark background behind the screens ----------

patchExact(path.join(srcDir, 'navigation', 'AppNavigator.js'), 'AppNavigator.js', [
  {
    skipIfPresent: 'navigationTheme',
    find: "import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';",
    replace: `import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';`,
  },
  {
    skipIfPresent: 'navigationTheme',
    find: "import { colors } from '../theme/colors';",
    replace: "import { colors, theme } from '../theme/colors';",
  },
  {
    skipIfPresent: 'const navigationTheme',
    find: 'const Stack = createNativeStackNavigator();',
    replace: `const Stack = createNativeStackNavigator();

const baseNavigationTheme = theme.isDark ? DarkTheme : DefaultTheme;

const navigationTheme = {
  ...baseNavigationTheme,

  colors: {
    ...baseNavigationTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};`,
  },
  {
    skipIfPresent: 'theme={navigationTheme}',
    find: '<NavigationContainer ref={navigationRef}>',
    replace: '<NavigationContainer ref={navigationRef} theme={navigationTheme}>',
  },
]);

// ---------- 4. Translations for the new Appearance texts ----------

const newKeys = {
  en: {
    'settings.appearanceDark': 'Dark',
    'settings.appearanceSystem': 'Match my phone',
    'settings.chooseAppearance': 'Choose appearance',
    'settings.appearanceReloadTitle': 'Appearance changed',
    'settings.appearanceReloading': 'MedTrack will reload to apply the new look.',
    'settings.appearanceRestart': 'Close and reopen MedTrack to apply the new look.',
    'common.ok': 'OK',
  },
  zu: {
    'settings.appearanceDark': 'Okumnyama',
    'settings.appearanceSystem': 'Landela ifoni yami',
    'settings.chooseAppearance': 'Khetha ukubukeka',
    'settings.appearanceReloadTitle': 'Ukubukeka kushintshile',
    'settings.appearanceReloading': 'I-MedTrack izoqala kabusha ukuze isebenzise ukubukeka okusha.',
    'settings.appearanceRestart':
      'Vala bese uvula kabusha i-MedTrack ukuze isebenzise ukubukeka okusha.',
    'common.ok': 'Kulungile',
  },
  af: {
    'settings.appearanceDark': 'Donker',
    'settings.appearanceSystem': 'Volg my foon',
    'settings.chooseAppearance': 'Kies voorkoms',
    'settings.appearanceReloadTitle': 'Voorkoms verander',
    'settings.appearanceReloading': 'MedTrack sal herlaai om die nuwe voorkoms toe te pas.',
    'settings.appearanceRestart':
      'Maak MedTrack toe en maak dit weer oop om die nuwe voorkoms toe te pas.',
    'common.ok': 'OK',
  },
};

(function patchTranslations() {
  const file = path.join(srcDir, 'i18n', 'translations.js');

  if (!fs.existsSync(file)) {
    problems.push('translations.js: file not found (src/i18n/translations.js)');

    return;
  }

  const { text, crlf } = readFile(file);

  if (text.includes("'settings.appearanceDark'")) {
    report.push('translations.js: already done');

    return;
  }

  const lines = text.split('\n');

  const output = [];

  let language = null;

  let added = 0;

  lines.forEach((line) => {
    const header = line.match(/^const (en|zu|af) = \{/);

    if (header) {
      language = header[1];
    }

    output.push(line);

    if (language && line.includes("'settings.appearanceLight'")) {
      Object.keys(newKeys[language]).forEach((key) => {
        output.push(`  '${key}': '${newKeys[language][key]}',`);

        added += 1;
      });
    }
  });

  if (added !== 21) {
    problems.push(`translations.js: expected to add 21 texts but added ${added}.`);

    return;
  }

  writeFile(file, output.join('\n'), crlf);

  report.push('translations.js: 21 texts added (7 per language)');
})();

// ---------- 5. app.json: let the phone's light/dark setting through ----------

(function patchAppJson() {
  const file = path.join(root, 'app.json');

  if (!fs.existsSync(file)) {
    problems.push('app.json: file not found');

    return;
  }

  const { text, crlf } = readFile(file);

  if (text.includes('"userInterfaceStyle": "automatic"')) {
    report.push('app.json: already done');

    return;
  }

  if (!text.includes('"userInterfaceStyle": "light"')) {
    problems.push('app.json: could not find "userInterfaceStyle": "light".');

    return;
  }

  writeFile(
    file,
    text.replace('"userInterfaceStyle": "light"', '"userInterfaceStyle": "automatic"'),
    crlf
  );

  report.push('app.json: userInterfaceStyle set to "automatic"');
})();

// ---------- 1b. Notification icon tiles (colour chosen inside a condition) ----------

(function patchNotificationTiles() {
  const file = path.join(srcDir, 'screens', 'NotificationsScreen.js');

  if (!fs.existsSync(file)) {
    return;
  }

  const { text, crlf } = readFile(file);

  if (text.includes("themeColor('#FFF0EF'")) {
    report.push('NotificationsScreen.js: already done');

    return;
  }

  const find =
    "tone === 'danger' ? '#FFF0EF' : tone === 'warning' ? '#FFF7E8' : colors.primaryLight;";

  if (text.split(find).length - 1 !== 1) {
    problems.push('NotificationsScreen.js: could not find the notification tile colours.');

    return;
  }

  let next = text.replace(
    find,
    () =>
      "tone === 'danger'\n      ? themeColor('#FFF0EF', 'backgroundColor')\n      : tone === 'warning'\n        ? themeColor('#FFF7E8', 'backgroundColor')\n        : colors.primaryLight;"
  );

  next = ensureColorImports(next, file, ['themeColor']);

  writeFile(file, next, crlf);

  report.push('NotificationsScreen.js: 2 colour edit(s)');
})();

// ---------- 1 (run last, so Settings is not double-edited) ----------

listJsFiles(srcDir).forEach(patchInlineColours);

// ---------- summary ----------

console.log('\nDark mode installer\n-------------------');

report.forEach((line) => console.log(`  done   ${line}`));

if (!report.length) {
  console.log('  nothing to change (everything is already applied)');
}

if (problems.length) {
  console.log('\nThese need attention:');

  problems.forEach((line) => console.log(`  CHECK  ${line}`));

  process.exitCode = 1;
} else {
  console.log('\nAll edits applied. Now run:  npx expo start -c');
}