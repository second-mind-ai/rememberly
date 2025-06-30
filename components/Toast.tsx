import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CheckCircle, XCircle, Info, X } from 'lucide-react-native';
import { theme } from '@/lib/theme';

interface ToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  onHide: () => void;
  duration?: number;
}

const { width } = Dimensions.get('window');

export function Toast({
  visible,
  message,
  type,
  onHide,
  duration = 3000,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.animation.duration.fast,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timeout = setTimeout(() => {
        handleHide();
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [visible, duration]);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: theme.animation.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    const iconProps = { size: 20, strokeWidth: 2 };
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} color={theme.colors.success.main} />;
      case 'error':
        return <XCircle {...iconProps} color={theme.colors.error.main} />;
      case 'info':
        return <Info {...iconProps} color={theme.colors.info.main} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success.light;
      case 'error':
        return theme.colors.error.light;
      case 'info':
        return theme.colors.info.light;
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success.dark;
      case 'error':
        return theme.colors.error.dark;
      case 'info':
        return theme.colors.info.dark;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <View style={styles.content}>
        {getIcon()}
        <Text style={[styles.message, { color: getTextColor() }]}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={handleHide}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={getTextColor()} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: theme.spacing.md,
    right: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.base,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
});