import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, X, Star, CheckCircle, ArrowRight } from 'lucide-react-native';
import { theme } from '@/lib/theme';

interface SignUpPopupProps {
  visible: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onSignIn: () => void;
}

export function SignUpPopup({ visible, onClose, onSignUp, onSignIn }: SignUpPopupProps) {
  const features = [
    'Unlimited notes and reminders',
    'AI-powered summaries',
    'Cloud sync across devices',
    'Advanced search and filters',
    'Custom categories and tags',
    'Priority support',
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#1e40af', '#3b82f6', '#60a5fa']}
            style={styles.gradient}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#ffffff" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.logoContainer}>
                <Brain size={48} color="#ffffff" strokeWidth={2} />
              </View>
              
              <Text style={styles.title}>Upgrade to Rememberly Pro</Text>
              <Text style={styles.subtitle}>
                You&apos;ve reached the guest limit. Sign up to unlock unlimited features!
              </Text>

              <View style={styles.featuresContainer}>
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <CheckCircle size={20} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onSignUp}
                >
                  <Star size={20} color="#ffffff" strokeWidth={2} />
                  <Text style={styles.primaryButtonText}>Create Free Account</Text>
                  <ArrowRight size={20} color="#ffffff" strokeWidth={2} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onSignIn}
                >
                  <Text style={styles.secondaryButtonText}>Already have an account? Sign in</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.disclaimer}>
                Your guest notes will be preserved when you sign up
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  gradient: {
    padding: 24,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#ffffff',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 16,
  },
}); 