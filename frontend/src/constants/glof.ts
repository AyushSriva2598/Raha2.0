import { RiskColors, Colors } from '@/constants/theme';
import type { GlofLevel } from '@/types';

export const GLOF_LEVEL_LABEL: Record<GlofLevel, string> = {
  NORMAL: 'Normal',
  WATCH: 'Watch',
  ADVISORY: 'Advisory',
  WARNING: 'Warning',
  EVACUATE: 'Evacuate',
};

export const GLOF_LEVEL_COLOR: Record<GlofLevel, string> = RiskColors;

/** Text colour that keeps >= 4.5:1 contrast on the level colour. */
export const GLOF_LEVEL_TEXT: Record<GlofLevel, string> = {
  NORMAL: Colors.ink,
  WATCH: Colors.ink,
  ADVISORY: Colors.ink,
  WARNING: '#FFFFFF',
  EVACUATE: '#FFFFFF',
};

export const GLOF_NO_LEVEL_COLOR = '#C9B8B4';
