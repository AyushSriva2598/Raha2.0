import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Radii } from '@/constants/theme';

export interface PillProps {
  label: string;
  icon?: React.ReactNode;
  variant?: 'danger' | 'watch' | 'safe' | 'neutral' | 'active' | 'white' | 'low' | 'coral';
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Pill({
  label,
  icon,
  variant = 'neutral',
  size = 'md',
  selected = false,
  onPress,
  style,
  textStyle,
}: PillProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'danger':
        return styles.dangerContainer;
      case 'watch':
        return styles.watchContainer;
      case 'safe':
        return styles.safeContainer;
      case 'low':
        return styles.lowContainer;
      case 'active':
        return styles.activeContainer;
      case 'white':
        return styles.whiteContainer;
      case 'coral':
        return selected ? styles.coralSelected : styles.coralContainer;
      case 'neutral':
      default:
        return selected ? styles.activeContainer : styles.neutralContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'danger':
        return styles.dangerText;
      case 'watch':
        return styles.watchText;
      case 'safe':
        return styles.safeText;
      case 'low':
        return styles.lowText;
      case 'active':
        return styles.activeText;
      case 'white':
        return styles.whiteText;
      case 'coral':
        return selected ? styles.activeText : styles.coralText;
      case 'neutral':
      default:
        return selected ? styles.activeText : styles.neutralText;
    }
  };

  const content = (
    <View style={[styles.base, styles[size], getContainerStyle(), style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, styles[`${size}Text`], getTextStyle(), textStyle]}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.chip,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  lg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    fontFamily: Typography.family.bold,
    textAlign: 'center',
  },
  smText: {
    fontSize: Typography.sizes.caption,
  },
  mdText: {
    fontSize: Typography.sizes.caption,
  },
  lgText: {
    fontSize: Typography.sizes.meta,
  },

  // Color variants
  neutralContainer: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
  },
  neutralText: {
    color: Colors.text2,
  },
  activeContainer: {
    backgroundColor: Colors.coral,
    borderColor: Colors.coral,
  },
  coralContainer: {
    backgroundColor: 'transparent',
    borderColor: Colors.coral,
  },
  coralSelected: {
    backgroundColor: Colors.coral,
    borderColor: Colors.coral,
  },
  coralText: {
    color: Colors.coralDeep,
  },
  activeText: {
    color: Colors.surface,
  },
  dangerContainer: {
    backgroundColor: Colors.dangerTint,
    borderColor: Colors.danger,
    borderStyle: 'dashed',
  },
  dangerText: {
    color: Colors.dangerDark,
  },
  watchContainer: {
    backgroundColor: '#FFF4E5',
    borderColor: Colors.watch,
  },
  watchText: {
    color: Colors.watchText,
  },
  safeContainer: {
    backgroundColor: Colors.safeTint,
    borderColor: Colors.safe,
  },
  safeText: {
    color: Colors.safeDark,
  },
  lowContainer: {
    backgroundColor: '#FEF9E7',
    borderColor: Colors.low,
  },
  lowText: {
    color: '#8A6D05',
  },
  whiteContainer: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  whiteText: {
    color: Colors.ink,
  },
});
