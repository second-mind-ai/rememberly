import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, AlertTriangle, Crown } from 'lucide-react-native';
import { theme } from '@/lib/theme';

interface GuestBadgeProps {
  notesUsed: number;
  maxNotes: number;
  onPress?: () => void;
  showWarning?: boolean;
}

export function GuestBadge({ notesUsed, maxNotes, onPress, showWarning = false }: GuestBadgeProps) {
  const isNearLimit = notesUsed >= maxNotes - 1;
  const isAtLimit = notesUsed >= maxNotes;

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isAtLimit && styles.containerAtLimit,
        isNearLimit && !isAtLimit && styles.containerNearLimit
      ]} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[
          styles.iconContainer,
          isAtLimit && styles.iconContainerAtLimit,
          isNearLimit && !isAtLimit && styles.iconContainerNearLimit
        ]}>
          <User size={14} color={isAtLimit ? '#ffffff' : '#6B7280'} strokeWidth={2} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[
            styles.text,
            isAtLimit && styles.textAtLimit,
            isNearLimit && !isAtLimit && styles.textNearLimit
          ]}>
            Guest
          </Text>
          <Text style={[
            styles.usage,
            isAtLimit && styles.usageAtLimit,
            isNearLimit && !isAtLimit && styles.usageNearLimit
          ]}>
            {notesUsed}/{maxNotes}
          </Text>
        </View>
        {showWarning && (isNearLimit || isAtLimit) && (
          <View style={styles.warningContainer}>
            <AlertTriangle 
              size={12} 
              color={isAtLimit ? '#ffffff' : '#F59E0B'} 
              strokeWidth={2} 
            />
          </View>
        )}
        {onPress && (
          <View style={[
            styles.upgradeIndicator,
            isAtLimit && styles.upgradeIndicatorAtLimit
          ]}>
            <Crown size={10} color={isAtLimit ? '#ffffff' : '#6B7280'} strokeWidth={2} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 32,
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  containerNearLimit: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  containerAtLimit: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerNearLimit: {
    backgroundColor: '#F59E0B',
  },
  iconContainerAtLimit: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    flexDirection: 'column',
    gap: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#6B7280',
    lineHeight: 12,
  },
  textNearLimit: {
    color: '#92400E',
  },
  textAtLimit: {
    color: '#ffffff',
  },
  usage: {
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#9CA3AF',
    lineHeight: 10,
  },
  usageNearLimit: {
    color: '#B45309',
  },
  usageAtLimit: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  warningContainer: {
    marginLeft: 2,
  },
  upgradeIndicator: {
    marginLeft: 2,
    opacity: 0.6,
  },
  upgradeIndicatorAtLimit: {
    opacity: 1,
  },
}); 