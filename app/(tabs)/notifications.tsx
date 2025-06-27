import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationManager from '@/components/NotificationManager';

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <NotificationManager />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});