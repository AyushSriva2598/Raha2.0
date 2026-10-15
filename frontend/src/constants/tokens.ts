// Stitch Design Tokens for Glacial Threat Early Warning (Raha / Avalon)
// Derived from Stitch DESIGN (1).md and PRD Section 8

export const Colors = {
  // Brand Surfaces & Atmosphere
  firn: '#F6FAFC', // App background - crisp snowfield
  glacierMist: '#E4EFF6', // Cards, sheets, container surfaces
  surfaceLowest: '#FFFFFF',
  surfaceContainerLow: '#EDF4FF',
  surfaceContainer: '#E2EFFF',
  surfaceContainerHigh: '#D8EAFF',
  surfaceContainerHighest: '#CDE5FF',
  secondaryContainer: '#D0E5F9', // Active pill / subtle accents

  // Typography & Foundations
  moraineInk: '#0E2A3F', // Primary text, contrast icons, dark indicators
  slateFog: '#5A6E7F', // Secondary text, metadata, inactive items
  borderSubtle: '#D3E3EE', // 1px clean crisp border
  outlineVariant: '#C0C7D2',

  // Interactive & Safety Catalyst
  meltwater: '#1E78B8', // Primary actions, user location pin, active links
  cirqueTeal: '#12A59B', // Universal safety signal: verified route, shelters, clear status
  cirqueTealDark: '#00665F',

  // Alert State Levels (Strict 4-tier taxonomy)
  clear: '#12A59B', // Clear status
  watch: '#E3A82B', // Larch Gold - neutral watch notice
  watchLight: '#FFF8E6',
  warning: '#D9622B', // Ember - elevated outburst risk
  warningLight: '#FDF1E9',
  alarmRed: '#D1303A', // Evacuate / SOS
  alarmRedHeader: '#B3222C', // Urgent Evacuate Hero Background
  alarmRedLight: '#FDEDED',

  // Cartography
  mapLand: '#EEF3F5',
  mapWater: '#BFDDF0',
  mapLakeDeep: '#9ACBE8',
  mapRoadCasing: '#DCE7ED',

  // Dark Overlay / Night Mode Accents
  darkBg: '#0A1A28',
  darkSurface: '#12293D',
  darkText: '#E8F1F7',

  // Emergency UI & Mission Control (Screenshot Specification)
  emergencyRed: '#D1303A',
  emergencyRedDark: '#B3222C',
  emergencyRedLight: '#FDEDED',
  emergencyRedBorder: '#FCA5A5',
  bedrockGreen: '#008767',
  bedrockGreenLight: '#E8F5E9',
  bedrockGreenBorder: '#A7F3D0',
  highGroundBlue: '#1C64F2',
  highGroundBlueLight: '#EFF6FF',
  highGroundBlueBorder: '#BFDBFE',
  missionVoid: '#0B0E12',
  missionPaper: '#12161B',
  missionRaise: '#1A1F26',
  missionLine: '#262D36',
  missionLineSubtle: 'rgba(255, 255, 255, 0.07)',
  waterCyan: '#3D9BFF',
  cardBorder: '#E5E7EB',
  cardBgLight: '#FFFFFF',
  canvasBgLight: '#F9FAFB',
  pillBg: '#F3F4F6',
  pillBorder: '#E5E7EB',
  statusPillBlue: '#DBEAFE',
  statusPillBlueText: '#1E40AF',
  statusPillGray: '#F3F4F6',
  statusPillGrayText: '#4B5563',
  badgeWarningBg: '#FEF3C7',
  badgeWarningText: '#92400E',
  badgeCriticalBg: '#FEE2E2',
  badgeCriticalText: '#B91C1C',
  badgeOnlineBg: '#DCFCE7',
  badgeOnlineText: '#15803D',
} as const;

export const Typography = {
  // Scales
  scale12: 12,
  scale14: 14,
  scale16: 16,
  scale18: 18,
  scale20: 20,
  scale24: 24,
  scale32: 32,
  scale38: 38,

  // Font Families
  serif: 'InstrumentSerif_400Regular',
  sansRegular: 'Hind_400Regular',
  sansMedium: 'Hind_500Medium',
  sansSemiBold: 'Hind_600SemiBold',
  sansBold: 'Hind_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutterMobile: 16,
  marginMobile: 20,
} as const;

export const Radii = {
  sm: 4,
  md: 8,
  lg: 12,
  button: 14,
  card: 20,
  sheet: 28,
  full: 9999,
} as const;

export const Shadows = {
  subtle: {
    shadowColor: Colors.moraineInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: Colors.moraineInk,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sheet: {
    shadowColor: Colors.moraineInk,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  urgent: {
    shadowColor: Colors.alarmRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;
