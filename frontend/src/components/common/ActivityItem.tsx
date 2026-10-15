import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  AlertTriangle,
  FileText,
  Newspaper,
  Navigation,
  Info,
} from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows } from '@/constants/theme';

export type ActivityType = 'alert' | 'report' | 'news' | 'trip' | 'system';

export interface ActivityItemData {
  id: string;
  type: ActivityType;
  title: string;
  meta: string;
  timestamp: string;
  unread?: boolean;
}

export interface ActivityItemProps {
  item: ActivityItemData;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ActivityItem({ item, onPress, style }: ActivityItemProps) {
  const getIconAndBg = () => {
    switch (item.type) {
      case 'alert':
        return {
          icon: <AlertTriangle size={22} color={Colors.dangerDark} />,
          bg: Colors.activity.alert,
        };
      case 'report':
        return {
          icon: <FileText size={22} color={Colors.watchTextAlt} />,
          bg: Colors.activity.report,
        };
      case 'news':
        return {
          icon: <Newspaper size={22} color={Colors.you} />,
          bg: Colors.activity.news,
        };
      case 'trip':
        return {
          icon: <Navigation size={22} color={Colors.safe} />,
          bg: Colors.activity.trip,
        };
      case 'system':
      default:
        return {
          icon: <Info size={22} color={Colors.text2} />,
          bg: Colors.activity.system,
        };
    }
  };

  const { icon, bg } = getIconAndBg();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        Shadows.card,
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.meta}, ${item.timestamp}`}>
      {/* 46px tinted icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: bg }]}>
        {icon}
        {item.unread && <View style={styles.unreadDot} />}
      </View>

      {/* Middle info */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.meta}
        </Text>
      </View>

      {/* Right time */}
      <Text style={styles.time}>{item.timestamp}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.88,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.sizes.bodyLarge, // 17 bold
    color: Colors.ink,
    lineHeight: 22,
  },
  meta: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.meta, // 14
    color: Colors.text2,
    marginTop: 2,
  },
  time: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.sizes.caption, // 13
    color: Colors.text3,
  },
});
