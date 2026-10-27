import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Flag } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

// Map markers drawn as views: a coral-ringed "you" marker with a soft halo, and a coral flag pin
// with a small tail. Wrap each in a Marker with tracksViewChanges handled by the caller.

export function YouPin() {
  return (
    <View style={styles.halo}>
      <View style={styles.ring}>
        <View style={styles.core} />
      </View>
    </View>
  );
}

export function DestinationPin() {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.pinHead}>
        <Flag size={16} color="#FFFFFF" strokeWidth={2.6} />
      </View>
      <View style={styles.pinTail} />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(214, 69, 58, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  core: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.coral },
  pinWrap: { alignItems: 'center' },
  pinHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.coral,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2A22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  pinTail: {
    width: 0,
    height: 0,
    marginTop: -3,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.coral,
  },
});
