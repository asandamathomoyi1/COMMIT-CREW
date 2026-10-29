// src/theme/darkColors.js
// Pure colour logic for dark mode. No React Native imports, so it is
// easy to test. colors.js uses it to build the palette and translate
// hard-coded colours.

export const lightColors = {
  primary: '#0866E8',
  primaryDark: '#073B92',
  primaryLight: '#EAF3FF',

  secondary: '#08B89C',
  secondaryLight: '#E8FAF6',

  background: '#F6F9FD',
  surface: '#FFFFFF',
  surfaceSoft: '#F0F5FB',

  text: '#0B1B3A',
  textSecondary: '#66758F',
  textLight: '#94A0B5',

  border: '#E3EAF3',

  success: '#12B76A',
  warning: '#F79009',
  danger: '#F04438',

  white: '#FFFFFF',
  black: '#000000',
};

// Only the colours that need to change are listed. Brand and status
// colours (primary, secondary, success, warning, danger) stay the same
// because they already read well on dark surfaces, and `white` stays white
// because it is also used for text and icons on coloured buttons.
const darkOverrides = {
  primaryDark: '#0D47A8',
  primaryLight: '#16294A',

  secondaryLight: '#0F2F2B',

  background: '#0B1220',
  surface: '#141C2E',
  surfaceSoft: '#1B2640',

  text: '#EAF0FA',
  textSecondary: '#A3B1C9',
  textLight: '#7B8AA5',

  border: '#26324A',
};

export const darkColors = { ...lightColors, ...darkOverrides };

const DARK_SURFACE = darkColors.surface;
const DARK_SOFT = darkColors.surfaceSoft;
const DARK_BORDER = darkColors.border;
const LIGHT_TEXT = darkColors.text;

const BACKGROUND_PROPS = new Set(['backgroundColor', 'background', 'bg']);

const BORDER_PROPS = new Set([
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderEndColor',
  'border',
]);

const TEXT_PROPS = new Set(['color', 'fg']);

// Every property name that holds a colour and may be translated.
export const COLOR_PROPS = new Set([...BACKGROUND_PROPS, ...BORDER_PROPS, ...TEXT_PROPS]);

// ---------- small colour maths ----------

function normaliseHex(value) {
  if (typeof value !== 'string' || value[0] !== '#') {
    return null;
  }

  let hex = value.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (hex.length !== 6 && hex.length !== 8) {
    return null;
  }

  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }

  return `#${hex.toUpperCase()}`;
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  const lightness = (max + min) / 2;

  if (max === min) {
    return [0, 0, lightness];
  }

  const delta = max - min;

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue;

  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return [hue * 60, saturation, lightness];
}

function hslToHex(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment < 1) {
    [red, green, blue] = [chroma, x, 0];
  } else if (segment < 2) {
    [red, green, blue] = [x, chroma, 0];
  } else if (segment < 3) {
    [red, green, blue] = [0, chroma, x];
  } else if (segment < 4) {
    [red, green, blue] = [0, x, chroma];
  } else if (segment < 5) {
    [red, green, blue] = [x, 0, chroma];
  } else {
    [red, green, blue] = [chroma, 0, x];
  }

  const match = lightness - chroma / 2;

  const toHex = (channel) =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase();
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// ---------- the translation ----------

// Light-mode tints that dark mode turned into dark tints. If one of these
// is used as a TEXT colour it was sitting on a dark/coloured background, so
// it must go back to its light value to stay readable.
const darkTintToLight = {
  [darkColors.primaryLight]: lightColors.primaryLight,
  [darkColors.secondaryLight]: lightColors.secondaryLight,
  [darkColors.surfaceSoft]: lightColors.surfaceSoft,
  [darkColors.border]: lightColors.border,
  [darkColors.background]: lightColors.background,
  [darkColors.surface]: lightColors.white,
};

// Exact brand colours need a lighter version when used as TEXT.
const textOverrides = {
  [lightColors.primary]: '#5B9DFF',
  [darkColors.primaryDark]: '#9DC1FF',
};

// Exact matches with the light palette go to the matching dark palette
// colour, chosen by what the colour is used for.
function tokenLookup(tokens) {
  const lookup = {};

  tokens.forEach((token) => {
    if (darkColors[token] !== lightColors[token]) {
      lookup[lightColors[token].toUpperCase()] = darkColors[token];
    }
  });

  return lookup;
}

const textTokens = tokenLookup(['text', 'textSecondary', 'textLight']);

const backgroundTokens = tokenLookup([
  'primaryDark',
  'primaryLight',
  'secondaryLight',
  'background',
  'surfaceSoft',
  'border',
]);

const borderTokens = tokenLookup([
  'border',
  'primaryLight',
  'secondaryLight',
  'background',
  'surfaceSoft',
]);

// Returns the dark-mode version of one colour used for one property.
// Anything that is not a plain hex colour (rgba, names) is left alone.
export function translateColor(property, value) {
  const hex = normaliseHex(value);

  if (!hex) {
    return value;
  }

  const alpha = hex.length === 9 ? hex.slice(7) : '';

  const base = hex.slice(0, 7);

  const [red, green, blue] = hexToRgb(base);

  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);

  let result = base;

  if (BACKGROUND_PROPS.has(property)) {
    if (base === '#FFFFFF') {
      result = DARK_SURFACE;
    } else if (backgroundTokens[base]) {
      result = backgroundTokens[base];
    } else if (lightness >= 0.8) {
      result =
        saturation < 0.18
          ? DARK_SOFT
          : hslToHex(hue, clamp(saturation * 0.45, 0.25, 0.5), 0.17);
    }
  } else if (BORDER_PROPS.has(property)) {
    if (base === '#FFFFFF') {
      result = DARK_BORDER;
    } else if (borderTokens[base]) {
      result = borderTokens[base];
    } else if (lightness >= 0.75) {
      result =
        saturation < 0.18
          ? DARK_BORDER
          : hslToHex(hue, clamp(saturation * 0.35, 0.2, 0.3), 0.26);
    }
  } else if (TEXT_PROPS.has(property)) {
    if (textOverrides[base]) {
      result = textOverrides[base];
    } else if (textTokens[base]) {
      result = textTokens[base];
    } else if (darkTintToLight[base]) {
      result = darkTintToLight[base];
    } else if (lightness <= 0.38) {
      result =
        saturation < 0.3 ? LIGHT_TEXT : hslToHex(hue, clamp(saturation, 0.5, 0.9), 0.72);
    }
  }

  return `${result}${alpha}`;
}

// Walks a style object and translates every colour in it.
export function translateStyle(style) {
  const next = {};

  Object.keys(style).forEach((property) => {
    const value = style[property];

    next[property] =
      typeof value === 'string' && COLOR_PROPS.has(property)
        ? translateColor(property, value)
        : value;
  });

  return next;
}

// StyleSheet.create receives { name: style, ... }.
export function translateStyles(styles) {
  const next = {};

  Object.keys(styles).forEach((name) => {
    const style = styles[name];

    next[name] =
      style && typeof style === 'object' && !Array.isArray(style) ? translateStyle(style) : style;
  });

  return next;
}

// ---------- contrast helper (used by the test) ----------

export function contrastRatio(hexA, hexB) {
  const luminance = (hex) => {
    const [r, g, b] = hexToRgb(normaliseHex(hex)).map((channel) => {
      const value = channel / 255;

      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const a = luminance(hexA);
  const b = luminance(hexB);

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}