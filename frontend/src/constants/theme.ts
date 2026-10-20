import { Platform } from 'react-native';

/**
 * Raha Design System Tokens
 * Strict adherence to Atkinson Hyperlegible typography and high-contrast emergency palette.
 */

export const Colors = {
  // Core UI tokens
  ink: '#2A1B1A',          // text, icons (warm near-black)
  text2: '#5E4A47',        // secondary text
  text3: '#7A625E',        // tertiary, timestamps
  bg: '#FDF3F0',           // page background: blush
  surface: '#FFFFFF',      // sheets, cards
  border: '#F3D9D3',       // hairlines

  // Brand: coral on blush (alert tiers below stay separate and always carry label + icon)
  coral: '#D6453A',        // filled buttons, active tab, chips
  coralDeep: '#A8322B',    // pressed, full-screen SOS gradient end
  coralSoft: '#FBD9D2',    // blush cards, selected chips
  coralTint: '#FEEAE6',    // quiet fills
  onCoral: '#FFFFFF',

  // Safety & Hazard tokens
  danger: '#C62828',       // alerts, SOS, banner
  dangerDark: '#B3261E',   // danger text on light
  dangerTint: '#FDECEA',   // zone card background
  safe: '#1B7F4B',         // safe route, primary action
  safeDark: '#0F5C35',     // safe text on light
  safeTint: '#E3F4EA',     // selected route, icon bg
  safeTintAlt: '#F1FAF5',  // alternative safe card tint
  watch: '#F08A24',        // Watch/Advisory lake zones
  watchText: '#92400E',    // amber text
  watchTextAlt: '#B45309', // amber meta text
  low: '#E3B505',          // low-risk lake zones
  you: '#2563EB',          // user location dot

  // Activity item badge tints
  activity: {
    alert: '#FDECEA',
    report: '#FFF3D6',
    news: '#E8EEF9',
    trip: '#E3F4EA',
    system: '#F2F4F7',
  },

  // Route colors
  routes: {
    safest: '#1B7F4B',
    safestCasing: '#FFFFFF',
    balanced: '#B45309',
    shortest: '#B3261E',
  },

  // Map lake zones & flood path
  floodPath: {
    fill: '#7EDBE861', // 38% teal (#7EDBE8)
    stroke: '#46B4CE',
  },

  // Backward compatibility shims for themed hooks
  light: {
    text: '#14213D',
    background: '#FFFFFF',
    backgroundElement: '#FDF3F0',
    backgroundSelected: '#E3F4EA',
    textSecondary: '#475467',
  },
  dark: {
    text: '#FFFFFF',
    background: '#14213D',
    backgroundElement: '#1F2E4D',
    backgroundSelected: '#0F5C35',
    textSecondary: '#667085',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

/**
 * 5-tier Risk level taxonomy
 */
export const RiskColors = {
  NORMAL: '#12B76A',
  WATCH: '#EAAA08',
  ADVISORY: '#F79009',
  WARNING: '#D92D20',
  EVACUATE: '#912018',
} as const;

export type RiskLevel = keyof typeof RiskColors;

/**
 * Map lake circles by alert severity
 */
export const LakeCircleColors = {
  NORMAL: '#E3B505',
  WATCH: '#F08A24',
  ADVISORY: '#F08A24',
  WARNING: '#C62828',
  EVACUATE: '#C62828',
} as const;

export const Typography = {
  family: {
    regular: 'AtkinsonHyperlegible_400Regular',
    bold: 'AtkinsonHyperlegible_700Bold',
  },
  // Minimum text size 13. Body 16-17. Never light weights.
  sizes: {
    caption: 13,
    meta: 14,
    body: 16,
    bodyLarge: 17,
    title: 20,
    heading: 24,
    hero: 30,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    regular: Typography.family.regular,
    bold: Typography.family.bold,
    sans: Typography.family.regular,
    serif: 'serif',
    rounded: Typography.family.regular,
    mono: 'monospace',
  },
  default: {
    regular: Typography.family.regular,
    bold: Typography.family.bold,
    sans: Typography.family.regular,
    serif: 'serif',
    rounded: Typography.family.regular,
    mono: 'monospace',
  },
  web: {
    regular: 'Atkinson Hyperlegible, sans-serif',
    bold: 'Atkinson Hyperlegible, sans-serif',
    sans: 'Atkinson Hyperlegible, sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
});

export const Radii = {
  chip: 9999,
  full: 9999,
  tile: 16,
  card: 20,
  cardLarge: 24,
  button: 20,
  pill: 9999,
  sheet: 28, // sheets radius 28 top
} as const;

export const Spacing = {
  // Raha tokens
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  sidePadding: 16, // Screen side padding 16-20

  // Compatibility tokens
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Shadows = {
  sheet: {
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 12,
  },
  card: {
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  sos: {
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 84, android: 84 }) ?? 84;
export const MaxContentWidth = 800;
