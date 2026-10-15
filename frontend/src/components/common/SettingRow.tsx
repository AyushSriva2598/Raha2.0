import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';

export interface SettingRowProps {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  destructive?: boolean;
}

export function SettingRow({
  label,
  sublabel,
  icon,
  rightElement,
  showChevron = true,
  onPress,
  style,
  destructive = false,
}: SettingRowProps) {
  const content = (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.textContainer}>
        <Text
          style={[styles.label, destructive && styles.destructiveLabel]}
          numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.sublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {rightElement ? (
        <View style={styles.rightElement}>{rightElement}</View>
      ) : showChevron && onPress ? (
        <ChevronRight size={20} color={Colors.text3} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
  },
  destructiveLabel: {
    color: Colors.danger,
  },
  sublabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption,
    color: Colors.text2,
    marginTop: 2,
  },
  rightElement: {
    marginLeft: Spacing.sm,
  },
});
