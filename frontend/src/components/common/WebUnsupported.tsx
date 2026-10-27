import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

// Maps and the 3D view are native-only. In a browser tab they show this instead of crashing.
export function WebUnsupported({ what }: { what: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        {what} needs the Raha app on a phone. Open the dev app and scan the QR code from the terminal.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.bg },
  text: { fontFamily: Typography.family.regular, fontSize: Typography.sizes.body, lineHeight: 24, color: Colors.text2, textAlign: 'center', maxWidth: 420 },
});
