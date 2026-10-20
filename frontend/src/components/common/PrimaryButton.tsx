import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Radii, Shadows } from '@/constants/theme';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outlineCoral' | 'safe' | 'danger' | 'watch' | 'outline' | 'neutral';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  variant = 'filled',
  icon,
  disabled = false,
  loading = false,
  height = 56,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'filled':
        return styles.filled;
      case 'outlineCoral':
        return styles.outlineCoral;
      case 'danger':
        return styles.danger;
      case 'watch':
        return styles.watch;
      case 'outline':
        return styles.outline;
      case 'neutral':
        return styles.neutral;
      case 'safe':
        return styles.safe;
      default:
        return styles.filled;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'watch':
        return styles.watchText;
      case 'outline':
        return styles.outlineText;
      case 'outlineCoral':
        return styles.outlineCoralText;
      case 'danger':
      case 'safe':
      case 'neutral':
      default:
        return styles.whiteText;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { height, minHeight: 48 },
        getVariantStyle(),
        variant === 'outlineCoral' ? null : Shadows.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'watch' ? Colors.watchText : Colors.surface}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.bodyLarge,
    letterSpacing: 0.2,
  },
  filled: {
    backgroundColor: Colors.coral,
  },
  outlineCoral: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.coral,
  },
  outlineCoralText: {
    color: Colors.coralDeep,
  },
  safe: {
    backgroundColor: Colors.safe,
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  watch: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: Colors.watch,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  neutral: {
    backgroundColor: Colors.ink,
  },
  whiteText: {
    color: Colors.surface,
  },
  watchText: {
    color: Colors.watchText,
  },
  outlineText: {
    color: Colors.ink,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
