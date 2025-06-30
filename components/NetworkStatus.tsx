import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkStatus() {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Don't show anything if connected
  if (isConnected && isInternetReachable !== false) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WifiOff size={16} color="#ffffff" strokeWidth={2} />
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
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
}); 