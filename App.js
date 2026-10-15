import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Wrong Directory</Text>
      <Text style={styles.description}>
        Metro dev server was started from the monorepo root directory instead of the frontend project.
      </Text>
      <View style={styles.codeBox}>
        <Text style={styles.command}>npm run start:dev</Text>
      </View>
      <Text style={styles.subtext}>
        (or: cd frontend &amp;&amp; npx expo start --dev-client)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  codeBox: {
    backgroundColor: '#1E293B',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 14,
  },
  command: {
    fontSize: 18,
    fontWeight: '700',
    color: '#38BDF8',
    fontFamily: 'monospace',
  },
  subtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
