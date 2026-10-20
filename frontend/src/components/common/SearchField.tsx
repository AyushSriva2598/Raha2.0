import React from 'react';
import { StyleSheet, TextInput, View, StyleProp, ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { Colors, Radii, Typography } from '@/constants/theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchField({ value, onChangeText, placeholder, style }: SearchFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Search size={20} color={Colors.text3} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text3}
        style={styles.input}
        accessibilityLabel={placeholder}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.body,
    color: Colors.ink,
    paddingVertical: 8,
  },
});
