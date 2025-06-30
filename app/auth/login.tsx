import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn } from '@/lib/auth';
import { useNotesStore } from '@/lib/store';
import { Brain } from 'lucide-react-native';
import { theme } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { isGuestMode } = useNotesStore();

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: theme.animation.duration.slow,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  async function handleSignIn() {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        // Provide more user-friendly error messages
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else if (signInError.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment before trying again.');
        } else {
          setError(signInError.message);
        }
      } else {
        // Success - migration will be handled automatically by guest context
        if (isGuestMode) {
          Alert.alert(
            'Welcome back!',
            'Signing you in... Your guest notes will be automatically migrated.',
            [{ text: 'OK' }]
          );
        }
        // AuthGuard will handle redirection automatically
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Logo and Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Brain size={48} color={theme.colors.primary[600]} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>Welcome to Rememberly</Text>
            <Text style={styles.subtitle}>Your AI-powered memory assistant</Text>
            {isGuestMode && (
              <View style={styles.guestInfo}>
                <Text style={styles.guestInfoText}>
                  Sign in to access your saved notes and unlock unlimited features
                </Text>
              </View>
            )}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.lg,
  },
  errorContainer: {
    backgroundColor: theme.colors.error.light,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error.dark,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
  },
  inputContainer: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  input: {
    height: 56,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    ...theme.shadows.sm,
  },
  button: {
    height: 56,
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  linkText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.primary[600],
  },
  guestInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
  },
  guestInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
  },
});