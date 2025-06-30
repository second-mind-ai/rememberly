import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { theme } from '@/lib/theme';

export function NetworkStatus() {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Don't show anything if connected
  if (isConnected && isInternetReachable !== false) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WifiOff size={16} color={theme.colors.text.inverse} strokeWidth={2} />
      <Text style={styles.text}>
        {!isConnected
          ? 'No internet connection'
          : 'Limited connectivity'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.error.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  text: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
  },
}); 