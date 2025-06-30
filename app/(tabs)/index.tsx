import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotesStore } from '@/lib/store';
import { useGuestMode } from '@/lib/guestContext';
import { getCurrentUser, signOut } from '@/lib/auth';
import { Brain, Plus, FileText, Link2, Image, LogOut, User } from 'lucide-react-native';
import { NoteCard } from '@/components/NoteCard';
import { theme } from '@/lib/theme';
import { GuestBadge } from '@/components/GuestBadge';
import { SignUpPopup } from '@/components/SignUpPopup';

export default function HomeScreen() {
  const { notes, loading, fetchNotes, error } = useNotesStore();
  const { isGuestMode, guestUsage, loading: guestLoading } = useGuestMode();
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignUpPopup, setShowSignUpPopup] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    checkAuth();
    fetchNotes();
  }, []);

  async function checkAuth() {
    const { user } = await getCurrentUser();
    if (isMounted.current) {
      setUser(user);
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchNotes();
    } finally {
      setRefreshing(false);
    }
  }, [fetchNotes]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  function handleGuestBadgePress() {
    if (guestUsage.notes >= guestUsage.maxNotes) {
      setShowSignUpPopup(true);
    }
  }

  function handleCreateNote() {
    if (isGuestMode && guestUsage.notes >= guestUsage.maxNotes) {
      setShowSignUpPopup(true);
      return;
    }
    router.push('/(tabs)/create');
  }

  const recentNotes = notes.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[600]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>
              {isGuestMode ? 'Welcome to Rememberly!' : 'Welcome back!'}
            </Text>
            <Text style={styles.userEmail}>
              {isGuestMode ? 'Guest Mode' : user?.email}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {isGuestMode ? (
              <View style={styles.guestHeaderContainer}>
                <GuestBadge
                  notesUsed={guestUsage.notes}
                  maxNotes={guestUsage.maxNotes}
                  onPress={handleGuestBadgePress}
                  showWarning={true}
                />
                <TouchableOpacity 
                  style={styles.guestUserButton}
                  onPress={() => setShowSignUpPopup(true)}
                >
                  <User size={20} color="#6B7280" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                <LogOut size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Capture</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#EFF6FF' }]}
              onPress={handleCreateNote}
            >
              <LinearGradient
                colors={['#2563EB', '#3B82F6']}
                style={styles.actionIcon}
              >
                <FileText size={24} color="#ffffff" strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.actionTitle}>Text Note</Text>
              <Text style={styles.actionSubtitle}>AI-powered analysis</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#F0FDF4' }]}
              onPress={handleCreateNote}
            >
              <LinearGradient
                colors={['#059669', '#10B981']}
                style={styles.actionIcon}
              >
                <Link2 size={24} color="#ffffff" strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.actionTitle}>Save URL</Text>
              <Text style={styles.actionSubtitle}>Smart summaries</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#FEF3C7' }]}
              onPress={handleCreateNote}
            >
              <LinearGradient
                colors={['#D97706', '#F59E0B']}
                style={styles.actionIcon}
              >
                <Image size={24} color="#ffffff" strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.actionTitle}>Upload File</Text>
              <Text style={styles.actionSubtitle}>Auto-organized</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading || guestLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading notes...</Text>
            </View>
          ) : recentNotes.length > 0 ? (
            <View style={styles.notesContainer}>
              {recentNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Brain size={48} color="#9CA3AF" strokeWidth={2} />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptySubtitle}>
                {isGuestMode 
                  ? 'Create your first note to get started (3 note limit in guest mode)'
                  : 'Create your first note and let AI organize it perfectly'
                }
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateNote}
              >
                <Plus size={20} color={theme.colors.text.inverse} strokeWidth={2} />
                <Text style={styles.createButtonText}>Create Note</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Guest Mode Info */}
      {isGuestMode && (
        <View style={styles.guestInfoContainer}>
          <View style={styles.guestInfo}>
            <Brain size={20} color="#6B7280" strokeWidth={2} />
            <Text style={styles.guestInfoText}>
              You&apos;re in guest mode. Sign up to unlock unlimited notes and features.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => setShowSignUpPopup(true)}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign Up Popup */}
      <SignUpPopup
        visible={showSignUpPopup}
        onClose={() => setShowSignUpPopup(false)}
        onSignUp={() => {
          setShowSignUpPopup(false);
          router.push('/auth/signup');
        }}
        onSignIn={() => {
          setShowSignUpPopup(false);
          router.push('/auth/login');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestUserButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  actionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  notesContainer: {
    gap: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  createButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  errorContainer: {
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.error.dark,
    textAlign: 'center',
  },
  guestInfoContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  guestInfoText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B7280',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#ffffff',
  },
});