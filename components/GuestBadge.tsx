import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, AlertTriangle } from 'lucide-react-native';
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
    >
      <View style={styles.content}>
        <User size={16} color={isAtLimit ? '#ffffff' : '#6B7280'} strokeWidth={2} />
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
        {showWarning && (isNearLimit || isAtLimit) && (
          <AlertTriangle 
            size={14} 
            color={isAtLimit ? '#ffffff' : '#F59E0B'} 
            strokeWidth={2} 
            style={styles.warningIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  containerNearLimit: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  containerAtLimit: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#6B7280',
  },
  textNearLimit: {
    color: '#92400E',
  },
  textAtLimit: {
    color: '#ffffff',
  },
  usage: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#6B7280',
    marginLeft: 2,
  },
  usageNearLimit: {
    color: '#92400E',
  },
  usageAtLimit: {
    color: '#ffffff',
  },
  warningIcon: {
    marginLeft: 2,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.xs,
  },
  closeButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  closeText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
}); 